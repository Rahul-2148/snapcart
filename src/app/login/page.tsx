// src/app/login/page.tsx
"use client";

import googleLogo from "@/assets/googleLogo.png";
import { Eye, EyeOff, Leaf, Loader2, Lock, LogIn, Mail } from "lucide-react";
import { motion } from "motion/react";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";

import {
  clearGuestCart,
  fetchCartApi,
  getGuestCart,
  mergeGuestCartApi,
} from "@/hooks/cart.api";
import { setCart } from "@/redux/features/cartSlice"; // ✅ Removed setIsGuest
import type { AppDispatch } from "@/redux/store";

const Login = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const { status } = useSession();

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      if (status === "authenticated") {
        try {
          await axios.get("/api/me");
          router.replace(redirectTo);
        } catch (error) {
          await signOut({ redirect: false });
        }
      }
    };
    checkUserAndRedirect();
  }, [status, router, redirectTo]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  /* ================= LOGIN HANDLER ================= */

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || password.length < 6) return;

    setLoading(true);
    setError(null);

    try {
      // 1️⃣ Get guest cart
      const guestCartRes = await getGuestCart();
      const guestItems = guestCartRes?.cart?.items || [];

      // 2️⃣ Sign in
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!res?.ok) throw new Error("Invalid credentials");

      // 3️⃣ Merge guest cart if exists
      if (guestItems.length) {
        await mergeGuestCartApi(
          guestItems.map((i: any) => ({
            variantId: i.variant._id,
            quantity: i.quantity,
            priceAtAdd: i.priceAtAdd,
          }))
        );
        await clearGuestCart();
      }

      // 4️⃣ Fetch user cart and mark as logged-in (isGuest: false)
      const userCart = await fetchCartApi();

      dispatch(
        setCart({
          items: userCart.items || [],
          cartId: userCart.cart?._id ?? null,
          isGuest: false, // ✅ mark user as logged in
        })
      );

      router.replace(redirectTo);
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= GOOGLE LOGIN ================= */

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      // First, get the Google provider to get user info
      // We'll use a popup or redirect to get the email, then check if user exists
      // For now, we'll just proceed with signIn which will create user if not exists
      // and send welcome email
      await signIn("google", { callbackUrl: redirectTo });
    } catch (error) {
      console.error("Google login error:", error);
      setError("Failed to login with Google");
    } finally {
      setGoogleLoading(false);
    }
  };

  /* ================= UI ================= */

  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-10 bg-white relative">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-extrabold text-green-700 mb-2"
      >
        Welcome Back
      </motion.h1>

      <p className="text-gray-600 mb-8 flex items-center">
        Login to your Snapcart account
        <Leaf className="w-5 h-5 text-green-600 ml-2" />
      </p>

      <motion.form
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-5 w-full max-w-sm"
        onSubmit={handleLogin}
      >
        {/* EMAIL */}
        <div className="relative">
          <Mail className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="email"
            placeholder="your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* PASSWORD */}
        <div className="relative">
          <Lock className="absolute top-1/2 left-3 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border rounded-md focus:ring-2 focus:ring-green-500"
          />
          {showPassword ? (
            <EyeOff
              onClick={() => setShowPassword(false)}
              className="absolute top-1/2 right-3 -translate-y-1/2 w-5 h-5 cursor-pointer text-gray-400"
            />
          ) : (
            <Eye
              onClick={() => setShowPassword(true)}
              className="absolute top-1/2 right-3 -translate-y-1/2 w-5 h-5 cursor-pointer text-gray-400"
            />
          )}
        </div>

        {/* ERROR */}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={loading || !email || password.length < 6}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition flex justify-center"
        >
          {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Login"}
        </button>

        {/* DIVIDER */}
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <span className="flex-1 h-px bg-gray-200" />
          OR
          <span className="flex-1 h-px bg-gray-200" />
        </div>

        {/* GOOGLE */}
        <div
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 border hover:bg-gray-50 py-3 rounded-xl cursor-pointer disabled:opacity-50"
        >
          {googleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Image src={googleLogo} alt="Google" width={20} height={20} />
              Continue with Google
            </>
          )}
        </div>
      </motion.form>

      <p
        onClick={() => router.push("/register")}
        className="text-gray-600 mt-6 text-sm flex items-center gap-1 cursor-pointer"
      >
        Want to create an account?
        <LogIn className="w-4 h-4 text-green-600 ml-1" />
        <span className="text-green-600">Sign Up</span>
      </p>
    </div>
  );
};

export default Login;
