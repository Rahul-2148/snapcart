// src/proxy.ts
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

// Initialize a minimal, Edge-compatible NextAuth instance for token decryption.
// This completely avoids mongoose/database/bcrypt imports in the Edge compiler runtime.
const { auth } = NextAuth({
  trustHost: true,
  providers: [],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  callbacks: {
    async jwt({ token }) {
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.image = token.image as string;
        (session.user as any).mobileNumber = token.mobileNumber as string;
        (session.user as any).roles = JSON.parse((token.roles as string) || '["user"]');
        (session.user as any).currentRole = token.currentRole as string;
        (session.user as any).profileCompleted = token.profileCompleted as boolean ?? true;
        (session.user as any).sessionId = token.sessionId as string;
      }
      return session;
    },
  },
});

export const proxy = auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  // Read currentRole from token (defaulting to user)
  const role = (req.auth?.user as any)?.currentRole || "user";
  const pathname = nextUrl.pathname;

  // Check if profile is completed for logged-in users
  const isCompleteProfileRoute = pathname === "/complete-profile" || pathname.startsWith("/complete-profile/");
  const isCompleteProfileApi = pathname === "/api/user/complete-profile";
  const isAuthRoute = pathname.startsWith("/api/auth");

  if (isLoggedIn) {
    const profileCompleted = (req.auth?.user as any)?.profileCompleted;
    if (profileCompleted === false && !isCompleteProfileRoute && !isCompleteProfileApi && !isAuthRoute) {
      console.log(`[PROXY] Redirecting incomplete profile user to /complete-profile`);
      return NextResponse.redirect(new URL("/complete-profile", nextUrl.origin));
    }
  }

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
    "/user/cart",
    "/user/products",
    "/user/product-details",
    "/user/wishlists/public",
    "/api/auth",
    "/api/guest-cart",
    "/api/groceries",
    "/api/categories",
    "/api/banners",
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
    "/api/reviews",
    "/api/wishlist/public",
    "/api/chatbot",
    "/api/recommendations",
    "/api/ai",
    "/api/coupon",
    "/api/flash-deals",
    "/api/delivery/settings",
  ];

  const isPublicRoute = publicRoutes.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  console.log(`[PROXY] pathname: ${pathname}, isPublicRoute: ${isPublicRoute}, isLoggedIn: ${isLoggedIn}, role: ${role}`);

  if (isPublicRoute) {
    console.log(`[PROXY] Allowing public route: ${pathname}`);
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    console.log(`[PROXY] Redirecting/blocking unauthorized request to: ${pathname}`);
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.href);
    return NextResponse.redirect(loginUrl);
  }

  // Check roles permissions
  if (
    pathname.startsWith("/user") &&
    role !== "user" &&
    role !== "admin" &&
    role !== "deliveryBoy" &&
    role !== "storeManager"
  ) {
    return NextResponse.redirect(new URL("/unauthorized", nextUrl.origin));
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/unauthorized", nextUrl.origin));
  }

  if (pathname.startsWith("/api/admin") && role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    (pathname.startsWith("/deliveryBoy") || pathname.startsWith("/delivery-boy")) &&
    role !== "deliveryBoy" &&
    role !== "admin"
  ) {
    return NextResponse.redirect(new URL("/unauthorized", nextUrl.origin));
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
    return NextResponse.redirect(new URL("/unauthorized", nextUrl.origin));
  }

  if (
    pathname.startsWith("/api/store-manager") &&
    role !== "storeManager" &&
    role !== "admin"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
});

export default proxy;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
