// src/components/location/ComingSoonSection.tsx
"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Send, MapPin, Loader2, Sparkles } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "motion/react";

const ComingSoonSection = () => {
  const { city, pincode, latitude, longitude } = useSelector(
    (state: RootState) => state.location
  );
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

  const displayName = city ? `${city}${pincode ? ` (${pincode})` : ""}` : "your city";

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl p-6 md:p-12 text-center flex flex-col items-center justify-center"
      >
        {/* Subtle decorative radial shapes */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-green-500/5 rounded-full blur-3xl -z-10 translate-x-12 -translate-y-12"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-green-500/5 rounded-full blur-3xl -z-10 -translate-x-12 translate-y-12"></div>

        {/* Location icon header badge */}
        <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 shadow-inner mb-6 relative">
          <MapPin className="w-8 h-8" />
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-green-600 text-[10px] font-bold text-white flex items-center justify-center animate-bounce">
            !
          </span>
        </div>

        <h2 className="text-2xl md:text-4xl font-extrabold text-slate-800 tracking-tight max-w-2xl leading-tight">
          Coming Soon to <span className="text-green-600 underline decoration-green-200 underline-offset-4">{displayName}</span>!
        </h2>
        
        <p className="text-sm md:text-base text-slate-500 mt-4 max-w-xl">
          We are expanding our hyper-local dark stores rapidly to ensure 10-minute grocery delivery reaches your doorstep. Register your email below to get notified when we launch near you.
        </p>

        {/* Form panel */}
        {!isSubscribed ? (
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md mt-8 flex flex-col sm:flex-row items-stretch gap-2.5 relative"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email to request launch"
              required
              className="flex-1 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition duration-200"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-6 py-3.5 sm:py-0 rounded-2xl cursor-pointer shadow-lg shadow-green-600/20 active:scale-95 transition"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Notify Me
            </button>
          </form>
        ) : (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="mt-8 bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-2xl flex items-center gap-2 max-w-md shadow-inner"
          >
            <Sparkles className="w-5 h-5 text-green-600 flex-shrink-0 animate-pulse" />
            <p className="text-xs font-semibold text-left">
              Awesome! You are officially registered for alerts in {displayName}. We will keep you updated.
            </p>
          </motion.div>
        )}

        {/* Features Preview List */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 w-full max-w-3xl pt-8 border-t border-slate-100">
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-slate-800">⚡ 10 Mins Delivery</span>
            <span className="text-xs text-slate-400 mt-1">Superfast local courier routing</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-slate-800">🍎 Fresh Groceries</span>
            <span className="text-xs text-slate-400 mt-1">Fruits, vegetables & daily essentials</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-slate-800">🏷️ Unbeatable Offers</span>
            <span className="text-xs text-slate-400 mt-1">Direct store price overrides & coupons</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ComingSoonSection;
