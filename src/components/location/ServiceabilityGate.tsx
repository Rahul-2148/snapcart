// src/components/location/ServiceabilityGate.tsx
"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/redux/store";
import { setLocationPickerOpen } from "@/redux/features/locationSlice";
import { MapPin, Send, Loader2, Sparkles, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { toast } from "sonner";

interface ServiceabilityGateProps {
  children: React.ReactNode;
}

export default function ServiceabilityGate({ children }: ServiceabilityGateProps) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const {
    serviceableStatus,
    city,
    pincode,
    latitude,
    longitude,
    hasInitialized,
  } = useAppSelector((state) => state.location);

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Define routes that should be blocked when the location is not serviceable
  const isBlockedRoute =
    pathname === "/" ||
    pathname?.startsWith("/user/cart") ||
    pathname?.startsWith("/user/checkout") ||
    pathname?.startsWith("/user/products") ||
    pathname?.startsWith("/user/product-details") ||
    pathname?.startsWith("/user/wishlists");

  const handleNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post("/api/location/notify", {
        email,
        pincode: pincode || "unknown",
        city: city || "your area",
        longitude: longitude || 0,
        latitude: latitude || 0,
      });

      if (res.data.success) {
        toast.success(res.data.message);
        setIsSubscribed(true);
        setEmail("");
      }
    } catch {
      toast.error("Failed to register alert. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeLocation = () => {
    dispatch(setLocationPickerOpen(true));
  };

  // If the location checker has run and concluded the current pin is unserviceable,
  // and the user is visiting a shopping/checkout route, block with Coming Soon interface.
  if (hasInitialized && serviceableStatus === "not_serviceable" && isBlockedRoute) {
    const displayName = city ? `${city}${pincode ? ` (${pincode})` : ""}` : "your area";

    return (
      <div className="min-h-[75vh] w-full flex items-center justify-center px-4 py-12 md:py-20 bg-slate-50/50 relative overflow-hidden">
        {/* Glow backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-2xl bg-white border border-slate-100 rounded-[32px] p-6 md:p-12 shadow-2xl shadow-slate-100 flex flex-col items-center text-center relative z-10"
        >
          {/* Header Map Pin Badge */}
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-[24px] bg-green-50 flex items-center justify-center text-green-600 shadow-inner">
              <MapPin className="w-10 h-10 animate-bounce" />
            </div>
            <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-green-600 text-xs font-bold text-white flex items-center justify-center border-2 border-white">
              !
            </span>
          </div>

          <h2 className="text-2xl md:text-4xl font-extrabold text-slate-800 tracking-tight leading-tight max-w-lg">
            Coming Soon to <span className="text-green-600 underline decoration-green-200 underline-offset-4 decoration-4">{displayName}</span>!
          </h2>

          <p className="text-slate-500 text-sm md:text-base mt-4 max-w-md leading-relaxed">
            SnapCart is expanding its network of local dark stores rapidly to deliver fresh groceries in 10 minutes. We don't deliver to your current address location yet.
          </p>

          {/* Location status action bar */}
          <div className="mt-6 p-4 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 w-full max-w-md text-left">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-700">Current Pin Selected</p>
                <p className="text-[11px] text-slate-500 truncate">{city || "Unknown Area"} {pincode ? `- ${pincode}` : ""}</p>
              </div>
            </div>
            <button
              onClick={handleChangeLocation}
              className="text-xs font-bold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100/80 px-4 py-2 rounded-xl transition flex-shrink-0 flex items-center gap-1"
            >
              Change Address
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Email Demand Form */}
          <div className="w-full max-w-md mt-8 border-t border-slate-100 pt-8">
            {!isSubscribed ? (
              <form onSubmit={handleNotifySubmit} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email to request launch & get alert"
                  required
                  className="flex-1 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-6 rounded-2xl transition shadow-lg shadow-green-600/10 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Submit
                </button>
              </form>
            ) : (
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-4 rounded-2xl flex items-start gap-3 text-left shadow-inner"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold">Launch Request Registered!</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    We've saved your location demand for {displayName}. We will email you the moment our dark store goes live in your area!
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Service features checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10 w-full pt-8 border-t border-slate-100 text-slate-700">
            <div className="flex flex-col items-center">
              <span className="text-xl">⚡</span>
              <span className="text-xs font-bold text-slate-800 mt-1">10 Min Delivery</span>
              <span className="text-[10px] text-slate-400 mt-0.5 leading-normal">Superfast dark store packing</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl">🍎</span>
              <span className="text-xs font-bold text-slate-800 mt-1">Fresh Groceries</span>
              <span className="text-[10px] text-slate-400 mt-0.5 leading-normal">Quality checks on all items</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl">🏷️</span>
              <span className="text-xs font-bold text-slate-800 mt-1">Great Discounts</span>
              <span className="text-[10px] text-slate-400 mt-0.5 leading-normal">Save big on daily essentials</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
