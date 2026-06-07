import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { Order } from "@/models/order.model";
import { User } from "@/models/user.model";
import { generateOTP } from "@/lib/server/delivery";
import { getIO } from "@/lib/server/socket";
import nodemailer from "nodemailer";
import { isDeliveryPartner } from "@/lib/server/roles";

// Twilio SMS support (optional - install: npm i twilio)
const sendSMS = async (phone: string, otp: string, orderNumber: string) => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log("Twilio not configured, skipping SMS");
    return false;
  }

  try {
    const twilio = require("twilio")(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );

    await twilio.messages.create({
      body: `Your Snapcart delivery OTP is: ${otp}. Order #${orderNumber}. Valid for 5 minutes. Do not share with anyone.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    console.log(`SMS sent to ${phone}`);
    return true;
  } catch (error) {
    console.error("Twilio SMS error:", error);
    return false;
  }
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await isDeliveryPartner(session))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDb();
    const { action, assignmentId, otp } = await req.json();

    if (action === "generate") {
      // Generate OTP for delivery verification
      const assignment = await DeliveryAssignment.findById(assignmentId);
      if (!assignment) {
        return NextResponse.json(
          { error: "Assignment not found" },
          { status: 404 },
        );
      }

      // Verify that user is the assigned delivery partner
      if (assignment.assignedTo.toString() !== session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const newOTP = generateOTP();
      assignment.deliveryOTP = newOTP;
      assignment.otpGeneratedAt = new Date();
      assignment.otpAttempts = 0;
      await assignment.save();

      // Get customer details to send OTP via email/SMS
      const order = await Order.findById(assignment.order).populate(
        "userId",
      );
      if (order?.userId) {
        const customer = order.userId as any;
        let sentVia = [];

        // Send Email OTP
        if (customer.email) {
          try {
            const transporter = nodemailer.createTransport({
              host: process.env.SMTP_HOST,
              port: parseInt(process.env.SMTP_PORT || "587"),
              secure: false,
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              },
            });

            await transporter.sendMail({
              from: process.env.SMTP_FROM || "Snapcart <no-reply@snapcart.com>",
              to: customer.email,
              subject: `Your Snapcart Delivery OTP: ${newOTP}`,
              html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2ecc71;">Delivery Confirmation Required</h2>
                <p>Your order <strong>${assignment.orderNumber}</strong> is arriving soon!</p>
                <p>Your delivery partner <strong>Delivery Partner</strong> is on the way.</p>
                
                <div style="background-color: #f0f0f0; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                  <p style="color: #666; margin: 10px 0;">Please share this OTP with your delivery partner:</p>
                  <h1 style="color: #2ecc71; letter-spacing: 5px; margin: 20px 0; font-size: 32px;">${newOTP}</h1>
                  <p style="color: #999; font-size: 12px;">This OTP is valid for 5 minutes</p>
                </div>
                
                <p style="color: #666; font-size: 14px;">Do not share this OTP with anyone else. It's only for delivery verification.</p>
                
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">Thank you for shopping with Snapcart! 🛒</p>
              </div>
            `,
            });

            console.log(`OTP email sent to ${customer.email}`);
            sentVia.push("email");
          } catch (emailError) {
            console.error("[Email Error]", emailError);
          }
        }

        // Send SMS OTP (if phone available and Twilio configured)
        if (customer.mobileNumber || order.deliveryAddress?.mobile) {
          const phone = customer.mobileNumber || order.deliveryAddress?.mobile;
          const smsSent = await sendSMS(phone, newOTP, assignment.orderNumber);
          if (smsSent) {
            sentVia.push("SMS");
          }
        }

        return NextResponse.json({
          message: `OTP generated and sent via ${sentVia.join(" & ") || "system"}`,
          sentVia,
          expiresIn: 300, // 5 minutes
        });
      }

      return NextResponse.json({
        message: "OTP generated successfully and sent to customer email",
        expiresIn: 300, // 5 minutes
      });
    }

    if (action === "verify") {
      // Verify OTP entered by delivery partner
      const assignment = await DeliveryAssignment.findById(assignmentId);
      if (!assignment) {
        return NextResponse.json(
          { error: "Assignment not found" },
          { status: 404 },
        );
      }

      // Verify that user is the assigned delivery partner
      if (assignment.assignedTo.toString() !== session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      // Check OTP validity
      if (!assignment.deliveryOTP) {
        return NextResponse.json(
          { error: "No OTP generated for this delivery" },
          { status: 400 },
        );
      }

      // Check if OTP expired (valid for 5 minutes)
      const otpAge = Date.now() - (assignment.otpGeneratedAt?.getTime() || 0);
      if (otpAge > 5 * 60 * 1000) {
        return NextResponse.json({ error: "OTP expired" }, { status: 400 });
      }

      // Check attempt limit
      if ((assignment.otpAttempts || 0) >= 3) {
        return NextResponse.json(
          { error: "Too many OTP attempts. Please generate new OTP" },
          { status: 400 },
        );
      }

      if (assignment.deliveryOTP !== otp) {
        assignment.otpAttempts = (assignment.otpAttempts || 0) + 1;
        await assignment.save();
        return NextResponse.json(
          {
            error: "Invalid OTP",
            attemptsRemaining: 3 - (assignment.otpAttempts || 0),
          },
          { status: 400 },
        );
      }

      // OTP verified successfully
      assignment.otpVerifiedAt = new Date();
      assignment.status = "delivered";
      assignment.deliveredAt = new Date();
      assignment.timeline.push({
        status: "delivered",
        timestamp: new Date(),
        note: "OTP verified - delivery confirmed",
      });
      await assignment.save();

      // Emit Socket event
      const ioClient = getIO();
      if (ioClient) {
        ioClient.emit("delivery_otp_verified", {
          assignmentId: assignment._id.toString(),
          orderNumber: assignment.orderNumber,
        });
      }

      return NextResponse.json({
        message: "OTP verified successfully. Delivery confirmed!",
        assignment: {
          id: assignment._id,
          status: assignment.status,
          orderNumber: assignment.orderNumber,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[OTP Error]", error);
    return NextResponse.json(
      { error: "Failed to process OTP" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await isDeliveryPartner(session))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assignmentId = req.nextUrl.searchParams.get("assignmentId");
    if (!assignmentId) {
      return NextResponse.json(
        { error: "assignmentId is required" },
        { status: 400 },
      );
    }

    await connectDb();
    const assignment = await DeliveryAssignment.findById(assignmentId);
    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      hasOTP: !!assignment.deliveryOTP,
      otpVerified: !!assignment.otpVerifiedAt,
      status: assignment.status,
    });
  } catch (error) {
    console.error("[OTP Status Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch OTP status" },
      { status: 500 },
    );
  }
}
