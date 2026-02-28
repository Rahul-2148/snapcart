// src/lib/server/emailTemplates.ts

export const forgotPasswordEmail = (name: string, otp: string, resetLink: string, email: string): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
          }
          .header {
            color: #2ecc71;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .subheader {
            color: #666;
            font-size: 14px;
            margin-bottom: 30px;
          }
          .method-section {
            margin: 30px 0;
            padding: 20px;
            background: white;
            border-radius: 8px;
            border-left: 4px solid #2ecc71;
          }
          .method-title {
            color: #2ecc71;
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 15px;
            text-align: left;
          }
          .otp-box {
            background: #f0f9f7;
            border: 2px solid #2ecc71;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 4px;
            color: #2ecc71;
            font-family: 'Courier New', monospace;
          }
          .reset-button {
            background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
            color: white;
            padding: 12px 30px;
            border-radius: 6px;
            text-decoration: none;
            display: inline-block;
            margin: 15px 0;
            font-weight: bold;
            font-size: 14px;
          }
          .reset-button:hover {
            opacity: 0.9;
          }
          .timer-info {
            background: #e8f4f8;
            border-left: 4px solid #3498db;
            padding: 12px;
            margin: 15px 0;
            text-align: left;
            border-radius: 4px;
            font-size: 12px;
            color: #2c3e50;
          }
          .warning {
            background: #ffe6e6;
            border-left: 4px solid #e74c3c;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
            border-radius: 4px;
            color: #c0392b;
            font-size: 12px;
          }
          .warning ul {
            margin: 10px 0 0 0;
            padding-left: 20px;
          }
          .warning li {
            margin: 5px 0;
          }
          .footer {
            color: #999;
            font-size: 12px;
            margin-top: 30px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          .brand {
            color: #2ecc71;
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 20px;
          }
          .divider {
            border-top: 2px dashed #ddd;
            margin: 25px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="brand">🛒 Snapcart</div>
          <div class="header">Password Reset Request</div>
          <div class="subheader">Choose your preferred reset method</div>
          
          <p style="color: #666; margin: 20px 0;">Hi <strong>${name}</strong>,</p>
          
          <p style="color: #666; margin: 20px 0;">We received a request to reset your password. Use one of the methods below:</p>

          <!-- METHOD 1: OTP -->
          <div class="method-section">
            <div class="method-title">📱 Method 1: Use One-Time Passcode (OTP)</div>
            <p style="color: #555; font-size: 13px; text-align: left; margin: 10px 0;">
              Enter this 6-digit code in the verification form:
            </p>
            <div class="otp-box">${otp}</div>
            <div class="timer-info">
              ⏱️ Valid for: <strong>10 minutes</strong>
            </div>
          </div>

          <div class="divider"></div>

          <!-- METHOD 2: RESET LINK -->
          <div class="method-section">
            <div class="method-title">🔗 Method 2: Use Reset Link</div>
            <p style="color: #555; font-size: 13px; text-align: left; margin: 10px 0;">
              Click the button below to reset your password directly:
            </p>
            <a href="${resetLink}" class="reset-button">🔐 Reset Password</a>
            <div class="timer-info">
              ⏱️ Valid for: <strong>24 hours</strong>
            </div>
            <p style="color: #888; font-size: 11px; text-align: left; margin-top: 10px;">
              Or copy this link: <br/>
              <code style="word-break: break-all; font-size: 10px;">${resetLink}</code>
            </p>
          </div>

          <div class="divider"></div>

          <div class="warning">
            <strong>🔒 Security Tips:</strong>
            <ul>
              <li>Never share your OTP with anyone</li>
              <li>Snapcart will never ask for your password via email</li>
              <li>If you didn't request this, ignore this email</li>
              <li>Use a strong password (8+ characters)</li>
            </ul>
          </div>
          
          <div class="footer">
            <p style="margin: 5px 0;">This is an automated message, please do not reply to this email.</p>
            <p style="margin: 5px 0;">© 2026 Snapcart. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

// Old templates kept for backward compatibility
export const forgotPasswordEmailOTP = (name: string, otp: string, email: string): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
          }
          .header {
            color: #2ecc71;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .otp-box {
            background: white;
            border: 2px solid #2ecc71;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 5px;
            color: #2ecc71;
            font-family: 'Courier New', monospace;
          }
          .info-text {
            color: #666;
            font-size: 14px;
            margin: 20px 0;
          }
          .warning {
            background: #ffe6e6;
            border-left: 4px solid #e74c3c;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
            border-radius: 4px;
            color: #c0392b;
            font-size: 13px;
          }
          .footer {
            color: #999;
            font-size: 12px;
            margin-top: 30px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          .brand {
            color: #2ecc71;
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="brand">🛒 Snapcart</div>
          <div class="header">Password Reset Request</div>
          
          <p style="color: #666;">Hi <strong>${name}</strong>,</p>
          
          <p style="color: #666; margin-bottom: 10px;">We received a request to reset your password. Use the OTP below to reset your password:</p>
          
          <div class="otp-box">${otp}</div>
          
          <div class="info-text">
            ⏱️ This OTP is valid for <strong>10 minutes</strong> only
          </div>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong><br>
            • Never share this OTP with anyone, including Snapcart staff<br>
            • Snapcart will never ask for your OTP via email or phone<br>
            • If you did not request a password reset, ignore this email
          </div>
          
          <p style="color: #666; margin-top: 30px; font-size: 14px;">
            Alternatively, you can reset your password using the reset link sent in a separate email.
          </p>
          
          <div class="footer">
            <p style="margin: 5px 0;">This is an automated message, please do not reply to this email.</p>
            <p style="margin: 5px 0;">© 2026 Snapcart. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const forgotPasswordEmailLink = (name: string, resetLink: string, email: string): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
          }
          .header {
            color: #2ecc71;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .reset-button {
            background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
            color: white;
            padding: 14px 40px;
            border-radius: 6px;
            text-decoration: none;
            display: inline-block;
            margin: 30px 0;
            font-weight: bold;
            font-size: 16px;
            transition: transform 0.2s;
          }
          .reset-button:hover {
            transform: scale(1.05);
          }
          .info-text {
            color: #666;
            font-size: 14px;
            margin: 20px 0;
          }
          .warning {
            background: #ffe6e6;
            border-left: 4px solid #e74c3c;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
            border-radius: 4px;
            color: #c0392b;
            font-size: 13px;
          }
          .link-container {
            background: white;
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            word-break: break-all;
          }
          .link-container a {
            color: #2ecc71;
            text-decoration: none;
            font-size: 12px;
          }
          .footer {
            color: #999;
            font-size: 12px;
            margin-top: 30px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          .brand {
            color: #2ecc71;
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="brand">🛒 Snapcart</div>
          <div class="header">Reset Your Password</div>
          
          <p style="color: #666;">Hi <strong>${name}</strong>,</p>
          
          <p style="color: #666; margin-bottom: 10px;">We received a request to reset your password. Click the button below to reset it securely:</p>
          
          <a href="${resetLink}" class="reset-button">🔐 Reset Password</a>
          
          <div class="info-text">
            ⏱️ This link is valid for <strong>24 hours</strong>
          </div>
          
          <p style="color: #666; font-size: 13px; margin: 20px 0;">Or copy and paste this link in your browser:</p>
          <div class="link-container">
            <a href="${resetLink}">${resetLink}</a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong><br>
            • Click the link only if you requested a password reset<br>
            • Do not share this link with anyone<br>
            • If you did not request this, ignore this email<br>
            • Your account will remain secure until you reset your password
          </div>
          
          <p style="color: #666; margin-top: 30px; font-size: 14px;">
            You can also use the OTP sent in a separate email to reset your password if you prefer.
          </p>
          
          <div class="footer">
            <p style="margin: 5px 0;">This is an automated message, please do not reply to this email.</p>
            <p style="margin: 5px 0;">© 2026 Snapcart. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const passwordResetSuccessEmail = (name: string): string => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
          }
          .success-icon {
            font-size: 48px;
            margin-bottom: 20px;
          }
          .header {
            color: #2ecc71;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 20px;
          }
          .info-box {
            background: #e8f8f5;
            border-left: 4px solid #2ecc71;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
            border-radius: 4px;
          }
          .footer {
            color: #999;
            font-size: 12px;
            margin-top: 30px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          .brand {
            color: #2ecc71;
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="brand">🛒 Snapcart</div>
          <div class="success-icon">✅</div>
          <div class="header">Password Reset Successful</div>
          
          <p style="color: #666;">Hi <strong>${name}</strong>,</p>
          
          <p style="color: #666;">Your password has been successfully reset. You can now log in with your new password.</p>
          
          <div class="info-box">
            <strong>✓ What happens next?</strong><br>
            • Your password is securely updated<br>
            • All previous sessions have been logged out<br>
            • You can now login with your new password<br>
            • Keep your password safe and don't share it with anyone
          </div>
          
          <p style="color: #666; margin-top: 30px; font-size: 14px;">
            If you did not make this change or suspect any unauthorized activity, please contact our support team immediately.
          </p>
          
          <div class="footer">
            <p style="margin: 5px 0;">This is an automated message, please do not reply to this email.</p>
            <p style="margin: 5px 0;">© 2026 Snapcart. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};
