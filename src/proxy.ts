// It is a middleware used to protect routes and redirect unauthenticated users to the login page.

import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export const proxy = async (req: NextRequest) => {
  const { pathname } = req.nextUrl;
  const publicRoutes = ["/login", "/register", "/api/auth"];
  if (publicRoutes.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Check if the user has the required role to access the route
  const role = token.role;
  if (
    pathname.startsWith("/user") &&
    role !== "user" &&
    role !== "admin" &&
    role !== "deliveryBoy"
  ) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  if (pathname.startsWith("/deliveryBoy") && role !== "deliveryBoy") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }

  return NextResponse.next();
};
// this matcher is used to match all the routes except the static files like images and css
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
