"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Shield,
  FileText,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  Building,
  UserCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface DigiLockerKycModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (kyc: any) => void;
  role?: "user" | "deliveryBoy" | "admin" | "storeManager";
}

export default function DigiLockerKycModal({
  isOpen,
  onClose,
  onSuccess,
  role = "user",
}: DigiLockerKycModalProps) {
  // Step 1: Secure Portal Welcome & Consent Info
  // Step 2: Aadhaar + PIN Sign In Page
  // Step 3: SMS OTP Verification Page
  // Step 4: Document Consent & Fetch Page (takes PAN / License)
  // Step 5: Verification Checklist Animations
  // Step 6: Verification Success Screen
  const [step, setStep] = useState<1 | 6>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "DIGILOCKER_KYC_SUCCESS") {
        setLoading(false);
        setStep(6); // Success Step
        toast.success("Identity verified via DigiLocker!");
        setTimeout(() => {
          onSuccess(null);
          onClose();
        }, 2200);
      }
    };
    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [onSuccess, onClose]);

  const handlePortalConnect = () => {
    setLoading(true);
    setError(null);

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      `/api/verification/digilocker/authorize?role=${role}`,
      "DigiLocker Verification",
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
    );

    if (!popup) {
      setLoading(false);
      toast.error("Popup blocked! Please allow popups for this site to verify via DigiLocker.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative text-slate-800 border border-slate-200"
      >
        {/* Government Style Header Banner */}
        <div className="bg-[#004c8c] px-6 py-4 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center border border-white/20">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black text-orange-400 uppercase tracking-widest leading-none">Government of India</span>
              </div>
              <h3 className="font-extrabold text-sm text-white tracking-wide mt-0.5 flex items-center gap-1">
                DigiLocker Secure Portal
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Secure connection indicator bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex items-center justify-between text-[10px] text-slate-500 font-semibold tracking-wide">
          <span className="flex items-center gap-1.5 text-green-600">
            <Lock className="w-3.5 h-3.5" /> Secured via 256-bit SSL Gateway
          </span>
          <span>https://services.digilocker.gov.in</span>
        </div>

        {/* Modal content */}
        <div className="p-6 bg-white min-h-[320px] flex flex-col justify-between">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex-grow flex flex-col justify-center">
            {/* STEP 1: WELCOME / AWAITING POPUP */}
            {step === 1 && (
              <div className="space-y-5 text-center">
                {loading ? (
                  <div className="py-8 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-[#004c8c]" />
                    <p className="text-xs font-bold text-slate-800 tracking-wide">Awaiting DigiLocker Authorization...</p>
                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Please sign in and verify your credentials inside the secure popup window that opened.
                    </p>
                    <button
                      onClick={handlePortalConnect}
                      className="mt-4 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition cursor-pointer"
                    >
                      Re-open popup window
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-[#004c8c]/5 border border-[#004c8c]/15 rounded-2xl flex items-center justify-center mx-auto text-[#004c8c]">
                      <Building className="w-9 h-9" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">Direct Government Document Verification</h4>
                      <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed font-medium">
                        Authenticate instantly using your government-approved DigiLocker account to link verified identity documents.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-left text-[11px] text-slate-600 space-y-2.5 font-medium">
                      <p className="font-bold text-slate-800">Upon approval, SnapCart will retrieve:</p>
                      <p className="flex items-center gap-2">• Aadhaar Profile details (Name, DOB, Address, Photo)</p>
                      <p className="flex items-center gap-2">• PAN Card Verification Record (linked with IT department)</p>
                      {role === "deliveryBoy" && (
                        <p className="flex items-center gap-2 text-indigo-700 font-semibold">• Driving License Details (Operational Authorization)</p>
                      )}
                    </div>

                    <button
                      onClick={handlePortalConnect}
                      className="w-full flex items-center justify-center gap-1.5 bg-[#004c8c] hover:bg-[#003c70] text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md shadow-[#004c8c]/10"
                    >
                      Link DigiLocker Account
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* STEP 6: SUCCESS SCREEN */}
            {step === 6 && (
              <div className="py-8 text-center space-y-4 animate-fadeIn">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-150 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">KYC Verified Instantly!</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed font-semibold">
                    DigiLocker document retrieval was successful. Your account clearances are fully active.
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-2">
                  Returning to dashboard...
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
