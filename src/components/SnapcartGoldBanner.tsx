// src/components/SnapcartGoldBanner.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { useSession } from "next-auth/react";
import axios from "axios";
import {
  Crown,
  Check,
  Loader2,
  ArrowRight,
  X,
  Shield,
  Zap,
  Truck,
  Sparkles,
  Star,
  IndianRupee,
} from "lucide-react";
import { toast } from "sonner";
import { setCart } from "@/redux/features/cartSlice";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type ModalStep = "benefits" | "processing" | "success";

// ─── Pre-computed particle data (stable across renders) ───────────────
const PARTICLE_DATA = Array.from({ length: 20 }).map((_, i) => ({
  key: i,
  width: ((i * 7 + 3) % 6) + 2,
  height: ((i * 5 + 1) % 6) + 2,
  hue: 40 + ((i * 11) % 15),
  lightness: 60 + ((i * 13) % 20),
  left: ((i * 37 + 17) % 100),
  top: ((i * 53 + 7) % 100),
  duration: 3 + ((i * 7) % 4),
  delay: ((i * 3) % 3),
}));

function GoldParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {PARTICLE_DATA.map((p) => (
        <div
          key={p.key}
          className="absolute rounded-full"
          style={{
            width: `${p.width}px`,
            height: `${p.height}px`,
            background: `hsl(${p.hue}, 100%, ${p.lightness}%)`,
            left: `${p.left}%`,
            top: `${p.top}%`,
            opacity: 0,
            animation: `goldFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Pre-computed confetti data ───────────────────────────────────────
const CONFETTI_COLORS = ["#EAB308", "#F59E0B", "#10B981", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];
const CONFETTI_DATA = Array.from({ length: 30 }).map((_, i) => ({
  key: i,
  left: ((i * 31 + 11) % 100),
  width: ((i * 5 + 2) % 8) + 4,
  height: ((i * 7 + 3) % 8) + 4,
  borderRadius: i % 2 === 0 ? "50%" : "2px",
  background: CONFETTI_COLORS[i % 7],
  duration: 1.5 + ((i * 3) % 20) / 10,
  delay: ((i * 7) % 8) / 10,
}));

function ConfettiParticles() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {CONFETTI_DATA.map((c) => (
        <div
          key={c.key}
          className="absolute"
          style={{
            left: `${c.left}%`,
            top: "-10px",
            width: `${c.width}px`,
            height: `${c.height}px`,
            borderRadius: c.borderRadius,
            background: c.background,
            animation: `confettiDrop ${c.duration}s ease-out ${c.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Benefit Card ─────────────────────────────────────────────────────
function BenefitCard({
  icon: Icon,
  title,
  description,
  gradient,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
  delay: number;
}) {
  return (
    <div
      className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800/60 hover:border-yellow-500/20 transition-all duration-300 group/card"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-lg group-hover/card:scale-110 transition-transform duration-300`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-slate-100 leading-tight">{title}</div>
        <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{description}</div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────
export default function SnapcartGoldBanner() {
  const { data: session } = useSession();
  const dispatch = useDispatch<AppDispatch>();
  const { isGoldMember } = useSelector((state: RootState) => state.cart);

  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState<ModalStep>("benefits");
  const [submitting, setSubmitting] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const processingRef = useRef<NodeJS.Timeout | null>(null);
  const razorpayScriptLoaded = useRef(false);

  const price = 49;

  // Load Razorpay checkout script on mount
  useEffect(() => {
    if (razorpayScriptLoaded.current || typeof window === "undefined") return;
    if (document.querySelector('script[src*="checkout.razorpay.com"]')) {
      razorpayScriptLoaded.current = true;
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => { razorpayScriptLoaded.current = true; };
    document.body.appendChild(script);
  }, []);

  // Cleanup processing interval
  useEffect(() => {
    return () => {
      if (processingRef.current) clearInterval(processingRef.current);
    };
  }, []);

  const openModal = () => {
    if (!session?.user?.id) {
      toast.error("Please login to join Snapcart Gold!");
      return;
    }
    setStep("benefits");
    setProcessingProgress(0);
    setShowModal(true);
  };

  const closeModal = () => {
    if (step === "processing") return;
    setShowModal(false);
    setStep("benefits");
  };

  // ─── Start Processing Animation ─────────────────────────────────────
  const startProcessing = useCallback(() => {
    setSubmitting(true);
    setStep("processing");
    setProcessingProgress(0);

    let progress = 0;
    const increment = () => {
      progress += 5 + ((progress * 7 + 3) % 10);
      if (progress >= 90) progress = 90;
      return progress;
    };
    processingRef.current = setInterval(() => {
      setProcessingProgress(increment());
    }, 300);
  }, []);

  // ─── Handle Gold Activation Success ─────────────────────────────────
  const onGoldActivated = useCallback(() => {
    if (processingRef.current) clearInterval(processingRef.current);
    setProcessingProgress(100);

    setTimeout(() => {
      setStep("success");
      dispatch(setCart({ isGoldMember: true, items: [] }));
      window.dispatchEvent(new CustomEvent("snapcart-cart-refresh"));
      setSubmitting(false);
    }, 400);
  }, [dispatch]);

  // ─── Real Razorpay Payment Flow ─────────────────────────────────────
  const handlePayNow = useCallback(async () => {
    if (!window.Razorpay) {
      toast.error("Payment gateway is loading. Please try again in a moment.");
      return;
    }

    setSubmitting(true);

    try {
      // Step 1: Create real Razorpay order on backend
      const { data } = await axios.post("/api/user/gold/subscribe");

      if (!data.success || !data.razorpayOrderId) {
        // If user is already gold
        if (data.isGoldMember) {
          onGoldActivated();
          toast.success(data.message || "You are already a Gold member!");
          return;
        }
        throw new Error(data.message || "Failed to create payment order");
      }

      // Step 2: Open Razorpay checkout popup — real payment
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Snapcart Gold",
        description: "Gold Membership — 1 Month (₹49)",
        order_id: data.razorpayOrderId,
        handler: async (response: any) => {
          // Step 3: Verify payment signature on backend
          startProcessing();
          try {
            const verifyRes = await axios.post("/api/user/gold/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.data?.success) {
              onGoldActivated();
              toast.success("Payment successful! Welcome to Snapcart Gold! 🎉");
            } else {
              throw new Error(verifyRes.data?.message || "Verification failed");
            }
          } catch (err: any) {
            if (processingRef.current) clearInterval(processingRef.current);
            setStep("benefits");
            setSubmitting(false);
            toast.error(err.response?.data?.message || "Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: data.userName || "",
          email: data.userEmail || "",
          contact: data.userPhone || "",
        },
        theme: { color: "#EAB308" },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            toast.info("Payment cancelled. You can try again anytime.");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        setSubmitting(false);
        toast.error("Payment failed: " + (response.error?.description || "Unknown error"));
      });
      rzp.open();
      setSubmitting(false); // Razorpay popup is now open, button can be re-enabled
    } catch (error: any) {
      if (processingRef.current) clearInterval(processingRef.current);
      setSubmitting(false);
      toast.error(error.response?.data?.message || error.message || "Failed to initiate payment");
    }
  }, [startProcessing, onGoldActivated]);

  return (
    <>
      {/* Global keyframes */}
      <style jsx global>{`
        @keyframes goldFloat {
          0%, 100% { opacity: 0; transform: translateY(0) scale(0.5); }
          50% { opacity: 0.8; transform: translateY(-30px) scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes crownBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-8px) rotate(-5deg); }
          75% { transform: translateY(-4px) rotate(5deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.15); }
          50% { box-shadow: 0 0 40px rgba(234, 179, 8, 0.3); }
        }
        @keyframes successScale {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes confettiDrop {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(120px) rotate(720deg); }
        }
      `}</style>

      <div className="w-[90%] md:w-[80%] mx-auto my-8 relative z-25">
        {isGoldMember ? (
          /* ─── Active Gold Member Banner ─────────────────────────── */
          <div className="relative bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 rounded-3xl overflow-hidden p-6 border border-yellow-500/30 shadow-xl shadow-yellow-950/15 flex flex-col md:flex-row items-center justify-between gap-6">
            <GoldParticles />
            <div className="absolute top-0 left-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row relative z-10">
              <div
                className="w-14 h-14 bg-gradient-to-tr from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center border border-yellow-300 shadow-lg shadow-yellow-500/30"
                style={{ animation: "crownBounce 2s ease-in-out infinite" }}
              >
                <Crown className="w-7 h-7 text-amber-950" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-yellow-300 tracking-tight flex items-center justify-center md:justify-start gap-2">
                  Snapcart Gold Active
                </h2>
                <p className="text-xs text-yellow-100/80 font-medium mt-1">
                  You&apos;re enjoying Free Delivery above ₹149 &amp; 10% Extra Discount on veggies
                  &amp; fruits!
                </p>
              </div>
            </div>
            <div
              className="bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 font-extrabold text-xs px-4 py-2 rounded-2xl tracking-wide uppercase relative z-10"
              style={{ animation: "pulseGlow 2s ease-in-out infinite" }}
            >
              👑 Premium Member
            </div>
          </div>
        ) : (
          /* ─── Subscribe Gold Banner ────────────────────────────── */
          <div className="relative bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 rounded-3xl overflow-hidden p-6 border border-slate-800 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-6 group hover:border-yellow-500/30 transition-all duration-500">
            <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-500/5 rounded-full blur-[90px] pointer-events-none group-hover:bg-yellow-500/10 transition-all duration-500" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-500/5 rounded-full blur-[90px] pointer-events-none group-hover:bg-amber-500/10 transition-all duration-500" />

            <div className="flex items-center gap-4 flex-col sm:flex-row text-center sm:text-left">
              <div className="w-14 h-14 bg-gradient-to-tr from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center border border-yellow-300 shadow-lg shadow-yellow-500/20 group-hover:scale-110 transition-all duration-500">
                <Crown className="w-7 h-7 text-amber-950 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center justify-center sm:justify-start gap-2">
                  Unlock{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400">
                    Snapcart Gold
                  </span>
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed max-w-lg">
                  Get Free Delivery above ₹149 &amp; extra 10% discount on vegetables &amp; fruits.
                  Save ₹350+ monthly!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0 w-full lg:w-auto flex-col sm:flex-row">
              <div className="text-center sm:text-right">
                <div className="text-lg font-black text-white">
                  ₹{price}<span className="text-xs text-slate-400 font-bold">/month</span>
                </div>
                <div className="text-[10px] text-yellow-400 font-bold tracking-wider uppercase mt-0.5">
                  Value Pack
                </div>
              </div>
              <button
                onClick={openModal}
                className="w-full sm:w-auto bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-500 hover:to-amber-500 text-amber-950 font-black text-xs px-6 py-3 rounded-2xl shadow-lg shadow-yellow-500/15 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Join Gold Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Premium Checkout Modal ──────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            className="relative bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            style={{ animation: "slideUp 0.3s ease-out" }}
          >
            {/* Close Button */}
            {step !== "processing" && (
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition z-20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* ─── Step 1: Benefits + Pay Button ─────────────────── */}
            {step === "benefits" && (
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center border border-yellow-300 shadow-xl shadow-yellow-500/20"
                    style={{ animation: "crownBounce 2s ease-in-out infinite" }}
                  >
                    <Crown className="w-7 h-7 text-amber-950" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Snapcart Gold</h3>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-xl font-black text-yellow-400">₹{price}</span>
                      <span className="text-xs text-slate-400 font-bold">/month</span>
                      <span className="ml-2 text-[10px] text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                        SAVE ₹350+
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 mb-6">
                  <BenefitCard icon={Truck} title="Free Delivery above ₹149" description="Save ₹25-35 per order on delivery charges" gradient="from-emerald-500 to-emerald-600" delay={0} />
                  <BenefitCard icon={Sparkles} title="Extra 10% Off on Fruits & Veggies" description="Fresh produce at even lower prices every day" gradient="from-orange-500 to-amber-500" delay={100} />
                  <BenefitCard icon={Zap} title="Priority Order Packing" description="Your orders get packed first — faster delivery" gradient="from-violet-500 to-purple-600" delay={200} />
                  <BenefitCard icon={Shield} title="No Surge Fee Protection" description="Zero surge charges during peak hours & rain" gradient="from-blue-500 to-cyan-500" delay={300} />
                </div>

                {/* Direct Pay Button — opens Razorpay */}
                <button
                  onClick={handlePayNow}
                  disabled={submitting}
                  className="w-full py-3.5 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-500 hover:to-amber-500 text-amber-950 font-black text-sm rounded-2xl shadow-lg shadow-yellow-500/15 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Please wait...</span>
                    </>
                  ) : (
                    <>
                      <IndianRupee className="w-4 h-4" />
                      <span>Pay ₹{price} &amp; Join Gold</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] text-slate-500">
                    Secure payment via Razorpay • UPI, Card, NetBanking
                  </span>
                </div>
                <p className="text-center text-[10px] text-slate-500 mt-1.5">
                  Cancel anytime • Auto-renews monthly • Instant activation
                </p>
              </div>
            )}

            {/* ─── Step 2: Processing ────────────────────────────── */}
            {step === "processing" && (
              <div className="p-10 flex flex-col items-center justify-center min-h-[320px]">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-slate-800 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center animate-pulse">
                      <Loader2 className="w-8 h-8 text-amber-950 animate-spin" />
                    </div>
                  </div>
                  <svg className="absolute inset-0 w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="36" stroke="transparent" strokeWidth="4" fill="none" />
                    <circle
                      cx="40" cy="40" r="36"
                      stroke="rgb(234, 179, 8)" strokeWidth="4" fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={`${2 * Math.PI * 36 * (1 - processingProgress / 100)}`}
                      style={{ transition: "stroke-dashoffset 0.3s ease" }}
                    />
                  </svg>
                </div>

                <h3 className="text-lg font-black text-white mb-1">Verifying Payment</h3>
                <p className="text-xs text-slate-400 mb-4 text-center">
                  Confirming your payment with Razorpay...
                </p>

                <div className="w-full max-w-[240px] h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Please don&apos;t close this window</p>
              </div>
            )}

            {/* ─── Step 3: Success ───────────────────────────────── */}
            {step === "success" && (
              <div className="p-8 flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
                <ConfettiParticles />

                <div className="relative mb-6" style={{ animation: "successScale 0.6s ease-out" }}>
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-2xl shadow-yellow-500/30">
                    <Crown className="w-12 h-12 text-amber-950" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-lg">
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  </div>
                </div>

                <h3
                  className="text-2xl font-black text-white mb-1 text-center"
                  style={{
                    background: "linear-gradient(90deg, #EAB308, #F59E0B, #EAB308, #F59E0B)",
                    backgroundSize: "200% auto",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    animation: "shimmer 3s linear infinite",
                  }}
                >
                  Welcome to Gold! 🎉
                </h3>

                <p className="text-sm text-slate-300 mb-6 text-center max-w-xs">
                  Your membership is now active. Enjoy exclusive benefits on every order!
                </p>

                <div className="w-full space-y-2 mb-6">
                  <div className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-emerald-300">Free delivery on orders above ₹149</span>
                  </div>
                  <div className="flex items-center gap-2.5 px-4 py-2.5 bg-orange-500/10 rounded-xl border border-orange-500/20">
                    <Check className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-orange-300">10% extra off on Veggies & Fruits</span>
                  </div>
                  <div className="flex items-center gap-2.5 px-4 py-2.5 bg-violet-500/10 rounded-xl border border-violet-500/20">
                    <Check className="w-4 h-4 text-violet-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-violet-300">Priority packing & no surge fees</span>
                  </div>
                </div>

                <button
                  onClick={closeModal}
                  className="w-full py-3.5 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-500 hover:to-amber-500 text-amber-950 font-black text-sm rounded-2xl shadow-lg shadow-yellow-500/15 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Star className="w-4 h-4" />
                  <span>Start Shopping with Gold</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
