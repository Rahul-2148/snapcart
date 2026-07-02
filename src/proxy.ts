// src/proxy.ts
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Public routes accessible without logging in
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/verify-otp",
    "/reset-password",
    "/newsletter",
    "/newsletter/verified",
    "/newsletter/unsubscribed",
    "/user/careers",
    "/api/auth",
    "/api/guest-cart",
    "/api/chatbot",
    "/api/products",
    "/api/reviews",
    "/api/stores",
    "/api/groceries",
    "/api/categories",
    "/api/banners",
    "/api/vision/search",
    "/api/vision/health",
    "/api/newsletter/verify",
    "/api/newsletter/unsubscribe",
    "/api/newsletter/track/open",
    "/api/newsletter/track/click",
    "/api/payment/callback",
    "/api/payment/razorpay",
    "/api/location/notify",
    "/api/location/check-pincode",
    "/api/location/current",
    "/api/geocode",
    "/api/stores/nearby",
    "/api/stores/serviceable",
    "/api/delivery/eta",
    "/api/careers/apply",
  ];

  if (
    publicRoutes.some(
      (path) =>
        pathname === path ||
        pathname.startsWith(path + "/")
    )
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Check if the user has the required role to access the route
  let role = token.currentRole as string;

  // If role is not set, try parsing roles array
  if (!role && token.roles) {
    try {
      const rolesArray = JSON.parse(token.roles as string);
      role = rolesArray[0] || "user";
    } catch (e) {
      role = "user";
    }
  }

  role = role || "user";

  if (
    pathname.startsWith("/user") &&
    role !== "user" &&
    role !== "admin" &&
    role !== "deliveryBoy" &&
    role !== "storeManager"
  ) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (pathname.startsWith("/api/admin") && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    (pathname.startsWith("/deliveryBoy") ||
      pathname.startsWith("/delivery-boy")) &&
    role !== "deliveryBoy" &&
    role !== "admin"
  ) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (
    pathname.startsWith("/api/delivery-boy") &&
    role !== "deliveryBoy" &&
    role !== "admin"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    pathname.startsWith("/store-manager") &&
    role !== "storeManager" &&
    role !== "admin"
  ) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (
    pathname.startsWith("/api/store-manager") &&
    role !== "storeManager" &&
    role !== "admin"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
