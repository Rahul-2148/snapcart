import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { User } from "@/models/user.model";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import axios from "axios";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const stateBase64 = searchParams.get("state");

    if (!code || !stateBase64) {
      return errorResponse("Missing required OAuth parameters");
    }

    // Decode state
    let role = "user";
    try {
      const decodedState = JSON.parse(Buffer.from(stateBase64, "base64").toString("utf-8"));
      role = decodedState.role || "user";
    } catch (e) {
      console.warn("Failed to parse state parameters, using default role:", e);
    }

    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return errorResponse("Unauthorized. Please log in first.");
    }

    const clientId = process.env.DIGILOCKER_CLIENT_ID;
    const clientSecret = process.env.DIGILOCKER_CLIENT_SECRET;
    const redirectUri = process.env.DIGILOCKER_REDIRECT_URI || `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/verification/digilocker/callback`;
    const env = process.env.DIGILOCKER_ENVIRONMENT || "sandbox";

    let identityDetails = {
      aadhaarNumber: "",
      panNumber: "",
      licenseNumber: "",
      name: "",
    };

    await connectDb();

    if (!clientId || !clientSecret) {
      return errorResponse("DigiLocker secure verification is currently unavailable because the API integration credentials are not configured in .env.");
    }

    const tokenUrl = env === "production"
      ? "https://api.digitallocker.gov.in/public/oauth2/1/token"
      : "https://sandbox.digitallocker.gov.in/public/oauth2/1/token";

    // Exchange Authorization Code for Token
    const tokenParams = new URLSearchParams();
    tokenParams.append("code", code);
    tokenParams.append("grant_type", "authorization_code");
    tokenParams.append("client_id", clientId);
    tokenParams.append("client_secret", clientSecret);
    tokenParams.append("redirect_uri", redirectUri);

    const tokenRes = await axios.post(tokenUrl, tokenParams.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token } = tokenRes.data;
    if (!access_token) {
      return errorResponse("Could not retrieve access token from DigiLocker API");
    }

    // Fetch e-Aadhaar details from DigiLocker XML API
    const aadhaarApiUrl = env === "production"
      ? "https://api.digitallocker.gov.in/public/oauth2/1/xml/eaadhaar"
      : "https://sandbox.digitallocker.gov.in/public/oauth2/1/xml/eaadhaar";

    try {
      const aadhaarRes = await axios.get(aadhaarApiUrl, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const xmlData = aadhaarRes.data;
      
      // Basic parser for XML Aadhaar tags
      const nameMatch = xmlData.match(/name="([^"]+)"/) || xmlData.match(/<Poi[^>]*name="([^"]+)"/);
      const uidMatch = xmlData.match(/uid="([^"]+)"/) || xmlData.match(/<UidData[^>]*uid="([^"]+)"/);
      
      if (!uidMatch) {
        throw new Error("UID / Aadhaar number not found in e-Aadhaar XML response.");
      }

      identityDetails.name = nameMatch ? nameMatch[1] : (session.user.name || "Customer");
      identityDetails.aadhaarNumber = uidMatch[1];
    } catch (apiErr: any) {
      console.warn("e-Aadhaar XML retrieval failed, trying user details API:", apiErr);
      // Fallback to DigiLocker profile details API
      const detailsApiUrl = env === "production"
        ? "https://api.digitallocker.gov.in/public/oauth2/1/user/details"
        : "https://sandbox.digitallocker.gov.in/public/oauth2/1/user/details";

      const detailsRes = await axios.get(detailsApiUrl, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      
      if (!detailsRes.data.aadhaar_id) {
        return errorResponse("DigiLocker verification failed: User profile is not linked with Aadhaar.");
      }

      identityDetails.name = detailsRes.data.name || session.user.name || "Customer";
      identityDetails.aadhaarNumber = detailsRes.data.aadhaar_id;
    }

    // 3. Update database profiles based on target role
    const aadhaarClean = identityDetails.aadhaarNumber.replace(/\s+/g, "");
    
    // Update User model kyc field
    const user = await User.findById(session.user.id);
    if (!user) {
      return errorResponse("User not found in system");
    }

    user.kyc = {
      status: "approved",
      documents: user.kyc?.documents || [],
      submittedAt: new Date(),
      reviewedAt: new Date(),
      rejectionReason: undefined,
      aadhaarNumber: aadhaarClean,
      panNumber: identityDetails.panNumber || user.kyc?.panNumber,
      verificationType: "digilocker",
    };
    await user.save();

    // If target role is deliveryBoy, update DeliveryPartner model too
    if (role === "deliveryBoy") {
      let partner = await DeliveryPartner.findOne({ user: session.user.id });
      if (!partner) {
        partner = new DeliveryPartner({
          user: session.user.id,
          isOnline: false,
          stats: { totalDeliveries: 0, cancelledDeliveries: 0, acceptanceRate: 0, averageRating: 5 },
          earnings: { total: 0, pendingPayout: 0, currentSession: 0, cashInHand: 0 },
        });
      }

      partner.kyc = {
        status: "approved",
        documents: partner.kyc?.documents || [],
        submittedAt: new Date(),
        reviewedAt: new Date(),
        rejectionReason: undefined,
        aadhaarNumber: aadhaarClean,
        panNumber: identityDetails.panNumber || partner.kyc?.panNumber,
        licenseNumber: identityDetails.licenseNumber || partner.kyc?.licenseNumber,
      };
      await partner.save();
    }

    return successResponse();
  } catch (error: any) {
    console.error("DigiLocker callback handler error:", error);
    return errorResponse(error.message || "Failed to process DigiLocker KYC callback");
  }
}

function errorResponse(message: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>KYC Verification Failed</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; margin-top: 80px; background-color: #F8FAFC; color: #1E293B; }
          .card { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #E2E8F0; }
          h2 { color: #DC2626; margin-top: 0; }
          p { font-size: 13px; color: #64748B; line-height: 1.6; }
          button { background: #004c8c; border: none; color: white; padding: 10px 20px; border-radius: 10px; font-weight: bold; cursor: pointer; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>KYC Verification Failed</h2>
          <p>${message}</p>
          <button onclick="window.close()">Close Window</button>
        </div>
      </body>
    </html>
  `;
  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}

function successResponse() {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>KYC Verification Successful</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; margin-top: 80px; background-color: #F8FAFC; color: #1E293B; }
          .card { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #E2E8F0; }
          h2 { color: #059669; margin-top: 0; }
          p { font-size: 13px; color: #64748B; line-height: 1.6; }
          .loader { border: 3px solid #f3f3f3; border-top: 3px solid #059669; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin: 15px auto 0; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>KYC Approved Instantly</h2>
          <p>Your details have been successfully synchronized with DigiLocker secure portal. You are now verified!</p>
          <div class="loader"></div>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'DIGILOCKER_KYC_SUCCESS' }, '*');
          }
          setTimeout(function() {
            window.close();
          }, 2000);
        </script>
      </body>
    </html>
  `;
  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}
