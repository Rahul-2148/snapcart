// src/app/user/cart/group/join/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Users, User, ArrowRight, ShoppingBasket, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

function JoinGroupOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "";

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [error, setError] = useState("");

  // Validate the code on mount
  useEffect(() => {
    if (!code) {
      setError("No invite code found. Please make sure you have a valid invitation link.");
      setCheckingSession(false);
      return;
    }

    const checkSession = async () => {
      try {
        const { data } = await axios.get(`/api/cart/group/status?code=${code.trim().toUpperCase()}`);
        if (data.success && data.groupCart) {
          if (!data.groupCart.isActive) {
            setError("This group order session has already ended or checked out.");
          } else {
            setSessionDetails(data.groupCart);
          }
        } else {
          setError("Invalid invite code. Please check the link and try again.");
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load group session details.");
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [code]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post("/api/cart/group/join", {
        code: code.trim().toUpperCase(),
        name: name.trim(),
      });

      if (data.success) {
        // Save in localStorage
        localStorage.setItem("snapcart_group_code", code.trim().toUpperCase());
        localStorage.setItem("snapcart_group_member_id", data.memberId);
        localStorage.setItem("snapcart_group_member_name", data.memberName);
        localStorage.setItem("snapcart_group_host_name", sessionDetails?.host?.name || "Host");

        toast.success(`Welcome to the group cart, ${data.memberName}!`);
        
        // Redirect to main cart page
        router.push("/user/cart");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to join group order.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium animate-pulse">Checking group invite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-emerald-50/10 to-teal-50/30 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 font-semibold text-sm mb-4">
            <ShoppingBasket className="w-4 h-4" />
            <span>Snapcart Group Order</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Shop Together, Deliver Instantly</h1>
        </div>

        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-100 border border-red-100 text-center space-y-4"
            >
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Session Unavailable</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{error}</p>
              <button
                onClick={() => router.push("/")}
                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold transition-colors duration-200"
              >
                Go to Home Page
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6"
            >
              {/* Host Invitation Info */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-50 rounded-xl flex items-start gap-3">
                <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                  {sessionDetails?.host?.name?.charAt(0).toUpperCase() || "H"}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">
                    {sessionDetails?.host?.name || "Someone"}&apos;s Shared Cart
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    You can add any items to this cart. All items will be bundled into one order, and the host will handle the checkout and payment.
                  </p>
                </div>
              </div>

              {/* Members joined */}
              {sessionDetails?.members?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Members in Group ({sessionDetails.members.length})</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {sessionDetails.members.map((member: any) => (
                      <span
                        key={member.memberId}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-full text-xs font-medium text-slate-600"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {member.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Form */}
              <form onSubmit={handleJoin} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="name-input" className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>What should we call you?</span>
                  </label>
                  <input
                    id="name-input"
                    type="text"
                    required
                    placeholder="Enter your name (e.g. Aman, Priya)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-800 placeholder-slate-400 text-sm transition-all duration-150"
                    maxLength={20}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-200 group shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Joining group order...</span>
                    </>
                  ) : (
                    <>
                      <span>Join Group Order</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function JoinGroupOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium animate-pulse">Loading invite details...</p>
        </div>
      </div>
    }>
      <JoinGroupOrderContent />
    </Suspense>
  );
}
