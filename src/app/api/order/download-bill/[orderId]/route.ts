// src/app/api/order/download-bill/[orderId]/route.ts
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import "@/models/orderItem.model";
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) => {
  try {
    const { orderId } = await params;

    await connectDb();

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const order = await Order.findById(orderId).populate({
      path: "orderItems",
      populate: {
        path: "grocery",
        model: "Grocery",
      },
    });

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    // Check if order belongs to user
    if (order.userId.toString() !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Only allow download if order is delivered
    if (order.orderStatus !== "delivered") {
      return NextResponse.json(
        { message: "Bill can only be downloaded for delivered orders" },
        { status: 400 }
      );
    }

    // Generate HTML for the bill
    const htmlContent = generateBillHTML(order);

    // Launch puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });
    await browser.close();

    // Return PDF as response
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bill-${order.orderNumber}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating bill:", error);
    return NextResponse.json(
      { message: `Error generating bill: ${error.message}` },
      { status: 500 }
    );
  }
};

function generateBillHTML(order: any): string {
  const currency = order.currency || "INR";
  const items: any[] = order.orderItems || [];

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Bill - ${order.orderNumber}</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f8f9fa;
                color: #333;
            }
            .bill-container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #ff6b35, #f7931e);
                color: white;
                padding: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: bold;
            }
            .header p {
                margin: 5px 0 0 0;
                opacity: 0.9;
            }
            .bill-details {
                padding: 30px;
                border-bottom: 1px solid #eee;
            }
            .bill-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
            }
            .bill-row strong {
                font-weight: 600;
            }
            .items-section {
                padding: 30px;
            }
            .items-section h2 {
                margin-top: 0;
                color: #ff6b35;
                font-size: 20px;
                border-bottom: 2px solid #ff6b35;
                padding-bottom: 10px;
            }
            .item-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 0;
                border-bottom: 1px solid #f0f0f0;
            }
            .item-image {
                width: 50px;
                height: 50px;
                margin-right: 15px;
                border-radius: 4px;
                overflow: hidden;
                flex-shrink: 0;
            }
            .item-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .item-info {
                flex: 1;
            }
            .item-name {
                font-weight: 600;
                font-size: 16px;
            }
            .item-details {
                color: #666;
                font-size: 14px;
                margin-top: 4px;
            }
            .item-price {
                text-align: right;
                font-weight: 600;
            }
            .summary-section {
                background: #f8f9fa;
                padding: 30px;
                border-top: 2px solid #ff6b35;
            }
            .summary-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                font-size: 16px;
            }
            .total-row {
                border-top: 2px solid #333;
                padding-top: 15px;
                margin-top: 15px;
                font-size: 18px;
                font-weight: bold;
                color: #ff6b35;
            }
            .footer {
                background: #333;
                color: white;
                padding: 20px;
                text-align: center;
                font-size: 12px;
            }
            .footer p {
                margin: 0;
            }
            .savings {
                color: #28a745;
            }
            .discount {
                color: #dc3545;
            }
        </style>
    </head>
    <body>
        <div class="bill-container">
            <div class="header">
                <h1>SnapCart Grocery</h1>
                <p>Order Invoice</p>
            </div>

            <div class="bill-details">
                <div class="bill-row">
                    <span><strong>Order Number:</strong> ${
                      order.orderNumber
                    }</span>
                    <span><strong>Date:</strong> ${new Date(
                      order.createdAt
                    ).toLocaleDateString("en-IN")}</span>
                </div>
                <div class="bill-row">
                    <span><strong>Payment Method:</strong> ${
                      order.paymentMethod === "online"
                        ? `Online (${order.onlinePaymentType?.toUpperCase()})`
                        : order.paymentMethod.toUpperCase()
                    }</span>
                    <span><strong>Status:</strong> Delivered</span>
                </div>
                <div style="margin-top: 20px;">
                    <strong>Delivery Address:</strong><br>
                    ${order.deliveryAddress.fullName}<br>
                    ${order.deliveryAddress.fullAddress}<br>
                    ${order.deliveryAddress.city}, ${
    order.deliveryAddress.state
  } - ${order.deliveryAddress.pincode}<br>
                    Phone: ${order.deliveryAddress.mobile}
                </div>
            </div>

            <div class="items-section">
                <h2>Order Items</h2>
                ${items
                  .map(
                    (item: any) => `
                    <div class="item-row">
                        ${
                          item.grocery?.images?.[0]?.url
                            ? `<div class="item-image"><img src="${item.grocery.images[0].url}" alt="${item.groceryName}" /></div>`
                            : '<div class="item-image" style="background:#f0f0f0; display:flex; align-items:center; justify-content:center; color:#666;">No Image</div>'
                        }
                        <div class="item-info">
                            <div class="item-name">${item.groceryName}</div>
                            <div class="item-details">
                                Quantity: ${item.quantity}
                                ${
                                  item.variant ? ` (${item.variant.label})` : ""
                                }
                            </div>
                        </div>
                        <div class="item-price">
                            ${currency} ${(
                      item.price.sellingPrice * item.quantity
                    ).toFixed(2)}
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>

            <div class="summary-section">
                <div class="summary-row">
                    <span>Subtotal:</span>
                    <span>${currency} ${order.subTotal.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Delivery Fee:</span>
                    <span>${currency} ${order.deliveryFee.toFixed(2)}</span>
                </div>
                ${
                  order.couponDiscount
                    ? `
                <div class="summary-row discount">
                    <span>Coupon Discount:</span>
                    <span>-${currency} ${order.couponDiscount.toFixed(2)}</span>
                </div>
                `
                    : ""
                }
                <div class="summary-row savings">
                    <span>Savings:</span>
                    <span>-${currency} ${order.savings.toFixed(2)}</span>
                </div>
                <div class="summary-row total-row">
                    <span>Total Amount:</span>
                    <span>${currency} ${order.finalTotal.toFixed(2)}</span>
                </div>
            </div>

            <div class="footer">
                <p>Thank you for shopping with SnapCart Grocery!</p>
                <p>For any queries, contact us at support@snapcart.com</p>
            </div>
        </div>
    </body>
    </html>
  `;

  return html;
}
