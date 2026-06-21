import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || "user";

    const clientId = process.env.DIGILOCKER_CLIENT_ID;
    const redirectUri = process.env.DIGILOCKER_REDIRECT_URI || `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/verification/digilocker/callback`;
    const env = process.env.DIGILOCKER_ENVIRONMENT || "sandbox";

    // If client credentials are not configured, show error page
    if (!clientId) {
      return errorResponse(
        "DigiLocker secure verification is currently unavailable because the API integration credentials are not configured in .env. Please close this window and proceed with the manual document upload verification."
      );
    }

    // Official DigiLocker Authorization URL
    const baseUrl = env === "production"
      ? "https://api.digitallocker.gov.in/public/oauth2/1/authorize"
      : "https://sandbox.digitallocker.gov.in/public/oauth2/1/authorize";

    const stateObj = { role, ts: Date.now() };
    const state = Buffer.from(JSON.stringify(stateObj)).toString("base64");

    const authorizeUrl = new URL(baseUrl);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("state", state);

    return NextResponse.redirect(authorizeUrl);
  } catch (error: any) {
    console.error("DigiLocker Authorize error:", error);
    return errorResponse("Failed to initiate DigiLocker connection: " + error.message);
  }
}

function errorResponse(message: string) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>DigiLocker Unavailable</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; margin-top: 80px; background-color: #F8FAFC; color: #1E293B; }
          .card { max-width: 420px; margin: 0 auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #E2E8F0; }
          h2 { color: #DC2626; margin-top: 0; font-size: 18px; font-weight: 800; }
          p { font-size: 13px; color: #64748B; line-height: 1.6; margin-top: 15px; }
          button { background: #004c8c; border: none; color: white; padding: 10px 20px; border-radius: 10px; font-weight: bold; cursor: pointer; margin-top: 20px; transition: background 0.2s; }
          button:hover { background: #003c70; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>DigiLocker Unavailable</h2>
          <p>${message}</p>
          <button onclick="window.close()">Close Window</button>
        </div>
      </body>
    </html>
  `;
  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}
