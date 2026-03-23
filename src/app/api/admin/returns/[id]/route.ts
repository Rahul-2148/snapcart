// src/app/api/admin/returns/[id]/route.ts
import { auth } from "@/auth";
import { ReturnRequest } from "@/models/returnRequest.model";
import { Order } from "@/models/order.model";
import { Grocery } from "@/models/grocery.model";
import connectDb from "@/lib/server/db";
import { NextRequest, NextResponse } from "next/server";
import getSocketClient from "@/lib/server/socket";
import emailService from "@/lib/server/email";
import Stripe from "stripe";
import Razorpay from "razorpay";

let stripeClient: Stripe | null = null;
const getStripeClient = () => {
  if (stripeClient) return stripeClient;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }
  stripeClient = new Stripe(stripeSecret);
  return stripeClient;
};

let razorpayClient: Razorpay | null = null;
const getRazorpayClient = () => {
  if (razorpayClient) return razorpayClient;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET not configured");
  }
  razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return razorpayClient;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDb();

    const { id } = await params;
    const returnRequest = await ReturnRequest.findById(id);
    if (!returnRequest) {
      return NextResponse.json(
        { error: "Return request not found" },
        { status: 404 },
      );
    }

    const { status, rejectionReason, refund, replacement, notes } =
      await req.json();

    // Update status and related fields
    if (status) {
      returnRequest.status = status;

      if (status === "approved") {
        returnRequest.approvedAt = new Date();
      } else if (status === "rejected") {
        returnRequest.rejectedAt = new Date();
        returnRequest.rejectionReason = rejectionReason;
      } else if (status === "in-transit") {
        returnRequest.pickedUpAt = new Date();
      } else if (status === "received") {
        returnRequest.receivedAt = new Date();
      } else if (status === "completed") {
        returnRequest.completedAt = new Date();

        // Process refund if this is a return (not replacement) AND refund hasn't been processed yet
        if (returnRequest.requestType === "return" && !returnRequest.refund?.transactionId) {
          const order = await Order.findById(returnRequest.order);
          
          if (order && order.paymentMethod === "online") {
            try {
              let refundTransactionId: string | undefined;

              // Get the primary payment detail (most recent)
              const paymentDetail = order.paymentDetails?.[0];
              
              if (!paymentDetail?.transactionId) {
                console.warn("No transaction ID found in payment details for order:", order._id);
              }

              // Process refund through payment gateway
              if (order.onlinePaymentType === "stripe" && paymentDetail?.transactionId) {
                try {
                  const stripe = getStripeClient();
                  const refundResponse = await stripe.refunds.create({
                    charge: paymentDetail.transactionId,
                    amount: Math.round(order.finalTotal * 100), // in paise
                  });
                  refundTransactionId = refundResponse.id;
                  console.log("Stripe refund created:", refundTransactionId);
                } catch (stripeError: any) {
                  console.error("Stripe refund error:", stripeError.message);
                  // Try with payment_intent if charge fails
                  try {
                    const stripe = getStripeClient();
                    const refundResponse = await stripe.refunds.create({
                      payment_intent: paymentDetail.transactionId,
                      amount: Math.round(order.finalTotal * 100),
                    });
                    refundTransactionId = refundResponse.id;
                    console.log("Stripe refund created via payment_intent:", refundTransactionId);
                  } catch (piError) {
                    console.error("Stripe refund via payment_intent also failed:", piError);
                  }
                }
              }

              if (order.onlinePaymentType === "razorpay" && paymentDetail?.transactionId) {
                try {
                  const razorpay = getRazorpayClient();
                  const refundResponse = await razorpay.payments.refund(
                    paymentDetail.transactionId,
                    {
                      amount: Math.round(order.finalTotal * 100), // in paise
                    },
                  );
                  refundTransactionId = refundResponse.id;
                  console.log("Razorpay refund created:", refundTransactionId);
                } catch (razorpayError: any) {
                  console.error("Razorpay refund error:", razorpayError.message);
                }
              }

              // Update return with refund details
              returnRequest.refund = {
                amount: order.finalTotal,
                method: "original-payment",
                transactionId: refundTransactionId || "REFUND_PROCESSING",
                completedAt: new Date(),
              };

              // Send refund email
              const populatedUser = await returnRequest.populate("user");
              const user = populatedUser.user as any;

              const refundContent = `
                <div class="content">
                    <h2>Refund Processed! 💰</h2>
                    <p>Hi ${user.name},</p>
                    <p>Good news! Your refund has been successfully processed. The amount will be credited back to your original payment method within 3-5 business days.</p>
                    
                    <div class="info-box">
                        <strong>Refund Details:</strong><br>
                        Amount: <strong>₹${order.finalTotal.toFixed(2)}</strong><br>
                        Payment Method: <strong>${order.onlinePaymentType === "stripe" ? "Credit/Debit Card (Stripe)" : "Razorpay"}</strong><br>
                        Transaction ID: <strong>${refundTransactionId || "REFUND_PROCESSING"}</strong><br>
                        Processed Date: <strong>${new Date().toLocaleDateString("en-IN")}</strong>
                    </div>
                    
                    <p><strong>What's next?</strong></p>
                    <ul>
                        <li>✅ Check your account within 3-5 business days</li>
                        <li>✅ If you don't see the refund, please contact us with the Transaction ID above</li>
                        <li>✅ Keep this email for your records</li>
                    </ul>
                    
                    <p style="margin-top: 30px;">
                        Thank you for your business. We appreciate your understanding!<br>
                        <strong>The SnapCart Team</strong>
                    </p>
                </div>
              `;

              await emailService.sendEmail(
                user.email,
                `Refund Processed - Transaction ID: ${refundTransactionId || "REFUND_PROCESSING"}`,
                refundContent,
              );
            } catch (refundError) {
              console.error("Refund processing error:", refundError);
              // Still save with a processing status
              returnRequest.refund = {
                amount: order.finalTotal,
                method: "original-payment",
                transactionId: "REFUND_PROCESSING",
                completedAt: new Date(),
              };
              // Continue even if refund fails - admin can retry
            }
          }
        }
      }
    }

    // Update refund details if provided
    if (refund && returnRequest.requestType === "return") {
      returnRequest.refund = refund;
    }

    // Update replacement details
    if (replacement && returnRequest.requestType === "replacement") {
      returnRequest.replacement = replacement;
    }

    if (notes) {
      returnRequest.notes = notes;
    }

    console.log("Saving return with status:", status, "Return ID:", id);
    await returnRequest.save();
    console.log("Return saved successfully. Updated return:", {
      id: returnRequest._id,
      status: returnRequest.status,
      completedAt: returnRequest.completedAt,
      refund: returnRequest.refund,
    });

    // Emit real-time notification
    try {
      const ioClient = getSocketClient();
      const populatedReturn = await returnRequest.populate([
        "order",
        "orderItem",
        "user",
        "grocery",
      ]);
      (ioClient as any).emit("return:status-changed", {
        returnId: id,
        status: returnRequest.status,
        updatedAt: new Date(),
        data: populatedReturn,
      });
    } catch (error) {
      console.error("Error emitting socket event:", error);
    }

    return NextResponse.json(returnRequest);
  } catch (error) {
    console.error("Update return error:", error);
    return NextResponse.json(
      { error: "Failed to update return request" },
      { status: 500 },
    );
  }
}
