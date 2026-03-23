// src/lib/server/email.ts

export async function sendNewsletterVerificationEmail(email: string, verifyUrl: string) {
  const subject = "Confirm your subscription to Snapcart";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6">
      <h2>Confirm your subscription</h2>
      <p>Thanks for subscribing to Snapcart. Please confirm your email by clicking the button below:</p>
      <p>
        <a href="${verifyUrl}" style="display:inline-block;padding:10px 16px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px">Confirm Subscription</a>
      </p>
      <p>If you didn't request this, you can ignore this email.</p>
    </div>
  `;
  await transporter.sendMail({ from: NO_REPLY_ADDRESS, to: email, subject, html });
}

export async function sendNewsletterUnsubscribeEmail(email: string, unsubscribeUrl: string) {
  const subject = "Manage your Snapcart subscription";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6">
      <h2>Manage subscription</h2>
      <p>You can unsubscribe any time using the link below:</p>
      <p>
        <a href="${unsubscribeUrl}" style="display:inline-block;padding:10px 16px;background:#ef4444;color:#fff;text-decoration:none;border-radius:6px">Unsubscribe</a>
      </p>
    </div>
  `;
  await transporter.sendMail({ from: NO_REPLY_ADDRESS, to: email, subject, html });
}
// src/lib/server/email.ts
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { buildAppUrl } from "@/lib/config/urls";

// Create reusable transporter
const transporter: Transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Build a sensible default no-reply address
// Prefer brand-consistent default no-reply
const NO_REPLY_ADDRESS =
  process.env.EMAIL_NO_REPLY || "no-reply@mail.snapcart.com";

// Email template wrapper
const emailTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SnapCart</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f7fa;
        }
        .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 32px;
            font-weight: 700;
        }
        .header p {
            color: #d1fae5;
            margin: 5px 0 0 0;
            font-size: 14px;
        }
        .content {
            padding: 40px 30px;
            color: #374151;
            line-height: 1.6;
        }
        .content h2 {
            color: #10b981;
            margin-top: 0;
            font-size: 24px;
        }
        .button {
            display: inline-block;
            padding: 14px 32px;
            margin: 20px 0;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: #ffffff;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            box-shadow: 0 4px 6px rgba(16, 185, 129, 0.25);
        }
        .button:hover {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
        }
        .info-box {
            background-color: #f0fdf4;
            border-left: 4px solid #10b981;
            padding: 16px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .order-details {
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .order-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .order-item:last-child {
            border-bottom: none;
        }
        .total {
            font-weight: 700;
            font-size: 18px;
            color: #10b981;
        }
        .footer {
            background-color: #1f2937;
            color: #9ca3af;
            padding: 30px;
            text-align: center;
            font-size: 13px;
        }
        .footer a {
            color: #10b981;
            text-decoration: none;
        }
        .social-links {
            margin: 15px 0;
        }
        .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #10b981;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="header">
            <h1>🛒 SnapCart</h1>
            <p>Your Trusted Grocery Partner</p>
        </div>
        ${content}
        <div class="footer">
            <p><strong>SnapCart - Fresh Groceries Delivered</strong></p>
            <div class="social-links">
                <a href="#">Facebook</a> | 
                <a href="#">Twitter</a> | 
                <a href="#">Instagram</a>
            </div>
            <p>
                Questions? Contact us at <a href="mailto:support@snapcart.com">support@snapcart.com</a><br>
                or call us at +91-1800-123-4567
            </p>
            <p style="margin-top: 20px; font-size: 11px; color: #6b7280;">
                © ${new Date().getFullYear()} SnapCart. All rights reserved.<br>
                This email was sent to you because you have an account with SnapCart.<br>
                This is an automatically generated email. Replies to <strong>${NO_REPLY_ADDRESS}</strong> are not monitored.
            </p>
        </div>
    </div>
</body>
</html>
`;

// Welcome email template
export async function sendWelcomeEmail(
  email: string,
  name: string,
): Promise<void> {
  const content = `
    <div class="content">
        <h2>Welcome to SnapCart, ${name}! 🎉</h2>
        <p>Thank you for creating an account with us. We're thrilled to have you as part of the SnapCart family!</p>
        
        <div class="info-box">
            <strong>🎁 Special Welcome Offer</strong><br>
            Get <strong>20% OFF</strong> on your first order! Use code: <strong>WELCOME20</strong>
        </div>
        
        <p>With SnapCart, you can:</p>
        <ul>
            <li>🥬 Browse thousands of fresh products</li>
            <li>🚚 Get fast delivery to your doorstep</li>
            <li>💰 Save with exclusive deals and offers</li>
            <li>📱 Track your orders in real-time</li>
        </ul>
        
        <div style="text-align: center;">
            <a href="${buildAppUrl()}" class="button">
                Start Shopping Now
            </a>
        </div>
        
        <p style="margin-top: 30px;">
            If you have any questions, our support team is always here to help!
        </p>
        
        <p>
            Best regards,<br>
            <strong>The SnapCart Team</strong>
        </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"SnapCart" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Welcome to SnapCart - Your Account is Ready! 🎉",
    html: emailTemplate(content),
    replyTo: NO_REPLY_ADDRESS,
  });
}

// Order confirmation email template
export async function sendOrderConfirmationEmail(
  email: string,
  name: string,
  orderData: {
    orderNumber: string;
    orderDate: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      imageUrl?: string;
    }>;
    subTotal: number;
    deliveryFee: number;
    codHandlingCharge?: number;
    couponDiscount: number;
    finalTotal: number;
    currency: string;
    deliveryAddress: {
      fullName: string;
      mobile: string;
      fullAddress: string;
      city: string;
      state: string;
      pincode: string;
    };
    paymentMethod: string;
  },
): Promise<void> {
  const itemsHtml = orderData.items
    .map((item) => {
      const itemTotal = (item.price * item.quantity).toFixed(2);
      const imageHtml = item.imageUrl
        ? `<img src="${item.imageUrl}" alt="${item.name}" style="width:48px;height:48px;border-radius:8px;object-fit:cover;border:1px solid #e5e7eb;" />`
        : ``;

      return `
    <div class="order-item" style="align-items:center;">
        <div style="display:flex;align-items:center;gap:12px;">
            ${imageHtml}
            <div>
                <div style="font-weight:600;color:#111827;">${item.name}</div>
                <div style="font-size:12px;color:#6b7280;">Qty: ${item.quantity}</div>
            </div>
        </div>
        <span>${orderData.currency} ${itemTotal}</span>
    </div>
  `;
    })
    .join("");

  const content = `
    <div class="content">
        <h2>Order Confirmed! 🎊</h2>
        <p>Hi ${name},</p>
        <p>Thank you for your order! We've received it and are getting it ready for delivery.</p>
        
        <div class="info-box">
            <strong>Order Number:</strong> #${orderData.orderNumber}<br>
            <strong>Order Date:</strong> ${orderData.orderDate}
        </div>
        
        <div class="order-details">
            <h3 style="margin-top: 0; color: #374151;">Order Summary</h3>
            ${itemsHtml}
            
            <div class="order-item" style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #e5e7eb;">
                <span>Subtotal</span>
                <span>${orderData.currency} ${orderData.subTotal.toFixed(2)}</span>
            </div>
            ${
              orderData.couponDiscount > 0
                ? `
            <div class="order-item">
                <span>Discount</span>
                <span style="color: #10b981;">-${orderData.currency} ${orderData.couponDiscount.toFixed(2)}</span>
            </div>`
                : ""
            }
            <div class="order-item">
                <span>Delivery Fee</span>
                <span>${orderData.deliveryFee === 0 ? "FREE" : `${orderData.currency} ${orderData.deliveryFee.toFixed(2)}`}</span>
            </div>
            <div class="order-item total">
                <span>Total Amount</span>
                <span>${orderData.currency} ${orderData.finalTotal.toFixed(2)}</span>
            </div>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Delivery Address</h3>
            <p style="margin: 5px 0;"><strong>${orderData.deliveryAddress.fullName}</strong></p>
            <p style="margin: 5px 0;">${orderData.deliveryAddress.fullAddress}</p>
            <p style="margin: 5px 0;">${orderData.deliveryAddress.city}, ${orderData.deliveryAddress.state} - ${orderData.deliveryAddress.pincode}</p>
            <p style="margin: 5px 0;">📱 ${orderData.deliveryAddress.mobile}</p>
        </div>
        
        <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Payment Method:</strong> ${orderData.paymentMethod === "cod" ? "Cash on Delivery (COD)" : "Online Payment"}
        </div>
        
        <div style="text-align: center;">
            <a href="${buildAppUrl(`/user/orders/${orderData.orderNumber}`)}" class="button">
                Track Your Order
            </a>
        </div>
        
        <p style="margin-top: 30px;">
            We'll send you another email when your order is on its way!
        </p>
        
        <p>
            Best regards,<br>
            <strong>The SnapCart Team</strong>
        </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"SnapCart" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Order Confirmation - #${orderData.orderNumber}`,
    html: emailTemplate(content),
    replyTo: NO_REPLY_ADDRESS,
  });
}

// Order status update email
export async function sendOrderStatusEmail(
  email: string,
  name: string,
  orderNumber: string,
  status: string,
  statusMessage: string,
): Promise<void> {
  const statusEmoji: Record<string, string> = {
    confirmed: "✅",
    packed: "📦",
    shipped: "🚚",
    "out-for-delivery": "🛵",
    delivered: "🎉",
    cancelled: "❌",
  };

  const content = `
    <div class="content">
        <h2>Order Update ${statusEmoji[status] || "📋"}</h2>
        <p>Hi ${name},</p>
        <p>${statusMessage}</p>
        
        <div class="info-box">
            <strong>Order Number:</strong> #${orderNumber}<br>
            <strong>Current Status:</strong> ${status.replace("-", " ").toUpperCase()}
        </div>
        
        <div style="text-align: center;">
            <a href="${buildAppUrl(`/user/orders/${orderNumber}`)}" class="button">
                View Order Details
            </a>
        </div>
        
        <p>
            Best regards,<br>
            <strong>The SnapCart Team</strong>
        </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"SnapCart" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Order #${orderNumber} - ${status.replace("-", " ").toUpperCase()}`,
    html: emailTemplate(content),
    replyTo: NO_REPLY_ADDRESS,
  });
}

// Password reset email template
export async function sendPasswordResetEmail(
  email: string,
  name: string,
): Promise<void> {
  const content = `
    <div class="content">
        <h2>Password Changed Successfully 🔒</h2>
        <p>Hi ${name},</p>
        <p>This email confirms that your SnapCart account password has been successfully changed.</p>
        
        <div class="info-box">
            <strong>⏰ Changed On:</strong> ${new Date().toLocaleString(
              "en-IN",
              {
                dateStyle: "full",
                timeStyle: "short",
              },
            )}<br>
            <strong>📧 Account Email:</strong> ${email}
        </div>
        
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <strong>⚠️ Didn't make this change?</strong><br>
            If you didn't request this password change, please contact our support team immediately to secure your account.
        </div>
        
        <div style="text-align: center;">
            <a href="${buildAppUrl("/login")}" class="button">
                Login to Your Account
            </a>
        </div>
        
        <p style="margin-top: 30px;">
            <strong>Security Tips:</strong>
        </p>
        <ul>
            <li>Never share your password with anyone</li>
            <li>Use a strong, unique password</li>
            <li>Enable two-factor authentication if available</li>
            <li>Be cautious of phishing emails</li>
        </ul>
        
        <p>
            Best regards,<br>
            <strong>The SnapCart Team</strong>
        </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"SnapCart" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Password Changed Successfully - SnapCart",
    html: emailTemplate(content),
    replyTo: NO_REPLY_ADDRESS,
  });
}

// Generic email sender
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
): Promise<void> {
  await transporter.sendMail({
    from: `"SnapCart" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: emailTemplate(htmlContent),
    replyTo: NO_REPLY_ADDRESS,
  });
}

// Send raw HTML without applying the default Snapcart header/footer wrapper.
// Use when the caller already provides a full HTML document or custom wrapper.
export async function sendEmailRaw(
  to: string,
  subject: string,
  htmlContent: string,
): Promise<void> {
  await transporter.sendMail({
    from: `"SnapCart" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: htmlContent,
    replyTo: NO_REPLY_ADDRESS,
  });
}

// Strongly-typed default export object
interface EmailService {
  sendWelcomeEmail(email: string, name: string): Promise<void>;
  sendOrderConfirmationEmail(
    email: string,
    name: string,
    orderData: {
      orderNumber: string;
      orderDate: string;
      items: Array<{ name: string; quantity: number; price: number }>;
      subTotal: number;
      deliveryFee: number;
      codHandlingCharge?: number;
      couponDiscount: number;
      finalTotal: number;
      currency: string;
      deliveryAddress: {
        fullName: string;
        mobile: string;
        fullAddress: string;
        city: string;
        state: string;
        pincode: string;
      };
      paymentMethod: string;
    },
  ): Promise<void>;
  sendOrderStatusEmail(
    email: string,
    name: string,
    orderNumber: string,
    status: string,
    statusMessage: string,
  ): Promise<void>;
  sendPasswordResetEmail(email: string, name: string): Promise<void>;
  sendEmail(to: string, subject: string, htmlContent: string): Promise<void>;
}

// Send newsletter campaign to subscribers
export async function sendNewsletterCampaign(
  email: string,
  subject: string,
  htmlContent: string,
  unsubscribeUrl: string,
  metadata?: {
    fromName?: string;
    replyTo?: string;
    previewText?: string;
  }
) {
  const fromName = metadata?.fromName || "Snapcart Newsletter";
  const fromAddress = `${fromName} <${NO_REPLY_ADDRESS}>`;
  const replyTo = metadata?.replyTo;

  const fullHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
      ${htmlContent}
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <div style="text-align: center; color: #6b7280; font-size: 12px;">
        <p>You received this email because you subscribed to Snapcart newsletter.</p>
        <p>
          <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    </div>
  `;

  const mailOptions: any = {
    from: fromAddress,
    to: email,
    subject,
    html: fullHtml,
  };

  if (replyTo) {
    mailOptions.replyTo = replyTo;
  }

  await transporter.sendMail(mailOptions);
}

const emailService = {
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendPasswordResetEmail,
  sendEmail,
} satisfies EmailService;

export default emailService;
