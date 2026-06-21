// src/app/verify-role/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  ShieldAlert, 
  Key, 
  Mail, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  UploadCloud, 
  AlertCircle,
  Home,
  Check,
  Shield,
  ArrowLeft
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import Link from "next/link";
import CameraCapture from "@/components/verification/CameraCapture";
import AdvancedOTPInput from "@/components/common/AdvancedOTPInput";
import DigiLockerKycModal from "@/components/verification/DigiLockerKycModal";

interface KycDocument {
  type: "aadhaar_front" | "aadhaar_back" | "pan" | "selfie";
  url: string;
  publicId: string;
  uploadedAt: string;
}

interface KycStatus {
  status: "not_submitted" | "pending" | "approved" | "rejected";
  documents?: KycDocument[];
  submittedAt?: string;
  rejectionReason?: string;
  aadhaarNumber?: string;
  panNumber?: string;
}

function VerifyRolePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const targetRole = searchParams.get("role") || "storeManager";

  // State Management
  const [loading, setLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  
  // KYC State
  const [kyc, setKyc] = useState<KycStatus | null>(null);
  const [submittingKyc, setSubmittingKyc] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [aadhaarFront, setAadhaarFront] = useState<File | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const [activationLoading, setActivationLoading] = useState(false);
  
  // DigiLocker States
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [kycOption, setKycOption] = useState<"choice" | "manual">("choice");

  // Load Status on mount
  useEffect(() => {
    if (session?.user) {
      fetchVerificationStatus();
    }
  }, [session, targetRole]);

  const fetchVerificationStatus = async () => {
    try {
      setLoading(true);
      // Fetch KYC status
      const kycRes = await axios.get(
        targetRole === "deliveryBoy" ? "/api/delivery-boy/kyc" : "/api/user/kyc"
      );
      if (kycRes.data?.success) {
        setKyc(kycRes.data.kyc);
        setAadhaarNumber(kycRes.data.kyc?.aadhaarNumber || "");
        setPanNumber(kycRes.data.kyc?.panNumber || "");
      }
    } catch (err: any) {
      console.error("Failed to load status:", err);
      toast.error("Failed to load your verification profile.");
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    try {
      setSendingOtp(true);
      const res = await axios.post("/api/user/role-otp", {
        action: "send",
        role: targetRole,
      });
      if (res.data.success) {
        setOtpSent(true);
        toast.success(`Verification code sent to ${session?.user?.email}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to send verification code.");
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      toast.error("Please enter a valid 6-digit OTP.");
      return;
    }
    try {
      setVerifyingOtp(true);
      const res = await axios.post("/api/user/role-otp", {
        action: "verify",
        otp: otpCode,
        role: targetRole,
      });
      if (res.data.success) {
        setOtpVerified(true);
        toast.success("OTP verification successful!");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Invalid OTP code.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aadhaarNumber || aadhaarNumber.length !== 12 || isNaN(Number(aadhaarNumber))) {
      toast.error("Please enter a valid 12-digit Aadhaar number.");
      return;
    }
    if (!panNumber || !/^[A-Z]{5}\d{4}[A-Z]$/.test(panNumber.toUpperCase())) {
      toast.error("Please enter a valid PAN number format.");
      return;
    }

    if (targetRole === "deliveryBoy") {
      if (!licenseNumber || !/^[A-Z0-9-]{5,20}$/i.test(licenseNumber)) {
        toast.error("Please enter a valid Driving License number.");
        return;
      }
      if (!licenseFile) {
        toast.error("Please upload your Driving License.");
        return;
      }
    }

    if (!aadhaarFront || !aadhaarBack || !panFile || !selfieFile) {
      toast.error("Please upload all required KYC documents.");
      return;
    }

    try {
      setSubmittingKyc(true);
      setKycError(null);

      const formData = new FormData();
      formData.append("aadhaarNumber", aadhaarNumber);
      formData.append("panNumber", panNumber);
      formData.append("aadhaar_front", aadhaarFront);
      formData.append("aadhaar_back", aadhaarBack);
      formData.append("pan", panFile);
      formData.append("selfie", selfieFile);
      
      if (targetRole === "deliveryBoy" && licenseFile) {
        formData.append("licenseNumber", licenseNumber);
        formData.append("license", licenseFile);
      }

      const uploadUrl = targetRole === "deliveryBoy" ? "/api/delivery-boy/kyc" : "/api/user/kyc";
      const res = await axios.post(uploadUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        toast.success("KYC documents submitted successfully!");
        setKyc(res.data.kyc);
      }
    } catch (err: any) {
      console.error(err);
      setKycError(err.response?.data?.message || "Failed to submit documents.");
      toast.error("Failed to submit documents.");
    } finally {
      setSubmittingKyc(false);
    }
  };

  const handleActivateRole = async () => {
    try {
      setActivationLoading(true);
      const res = await axios.post("/api/user/switch-role", { role: targetRole });
      if (res.data.success) {
        toast.success(`Access granted! Entered ${targetRole === "storeManager" ? "Store Manager" : "Delivery Partner"} panel.`);
        await updateSession({ currentRole: targetRole });
        
        if (targetRole === "storeManager") {
          window.location.href = "/store-manager";
        } else if (targetRole === "deliveryBoy") {
          window.location.href = "/delivery-boy";
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Verification gate is locked. Ensure all steps are approved.");
    } finally {
      setActivationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-green-500 mb-4" />
        <p className="text-slate-400">Loading security details...</p>
      </div>
    );
  }

  const isKycApproved = kyc?.status === "approved";
  const isKycPending = kyc?.status === "pending";
  const isKycRejected = kyc?.status === "rejected";
  const showKycForm = kyc?.status === "not_submitted" || isKycRejected;

  const stepsCompleted = otpVerified && isKycApproved;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-green-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="w-16 h-16 bg-gradient-to-tr from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-green-500/20">
          <ShieldAlert className="w-8 h-8 text-white" />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-white tracking-tight">
          Security & KYC Verification
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Activating access to <span className="font-semibold text-green-400 capitalize">{targetRole === "storeManager" ? "Store Manager" : "Delivery Partner"}</span> Console.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl relative z-10">
        <div className="bg-slate-900/60 backdrop-blur-xl py-8 px-6 shadow-2xl rounded-3xl border border-slate-800/80 sm:px-10 space-y-8">
          
          {/* STEP 1: OTP VERIFICATION */}
          <div className="border border-slate-800 bg-slate-900/40 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                  otpVerified ? "bg-green-500/20 text-green-400" : "bg-slate-800 text-slate-400"
                }`}>
                  {otpVerified ? <Check className="w-4 h-4" /> : "1"}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Verify Identity (OTP)</h3>
                  <p className="text-xs text-slate-400">Verify your registered email address.</p>
                </div>
              </div>
              {otpVerified && (
                <span className="bg-green-950/40 text-green-400 border border-green-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Verified
                </span>
              )}
            </div>

            {!otpVerified && (
              <div className="pt-2">
                {!otpSent ? (
                  <button
                    onClick={sendOtp}
                    disabled={sendingOtp}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-xl transition cursor-pointer text-sm shadow-md"
                  >
                    {sendingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending Code...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send Code to {session?.user?.email}
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-300 mb-2">Enter the 6-digit code sent to your email:</p>
                    <AdvancedOTPInput
                      length={6}
                      onComplete={(code) => {
                        setOtpCode(code);
                        // Auto-verify when all digits are entered
                        setTimeout(() => {
                          setOtpCode(code);
                        }, 100);
                      }}
                      onValueChange={(code) => setOtpCode(code)}
                      disabled={verifyingOtp}
                    />
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        type="button"
                        onClick={verifyOtp}
                        disabled={verifyingOtp || otpCode.length < 6}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-xl transition cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {verifyingOtp ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Verify OTP"}
                      </button>
                    </div>
                    <button
                      onClick={sendOtp}
                      disabled={sendingOtp}
                      className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Resend Code
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: KYC VERIFICATION */}
          <div className="border border-slate-800 bg-slate-900/40 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                  isKycApproved ? "bg-green-500/20 text-green-400" : isKycPending ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-400"
                }`}>
                  {isKycApproved ? <Check className="w-4 h-4" /> : "2"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-base">KYC Document Verification</h3>
                    {showKycForm && kycOption === "manual" && (
                      <button
                        type="button"
                        onClick={() => setKycOption("choice")}
                        className="flex items-center gap-1 text-[10px] font-bold text-green-400 hover:text-green-300 transition cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">Submit identity credentials for operations clearance.</p>
                </div>
              </div>
              <span className={`border text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isKycApproved ? "bg-green-950/40 text-green-400 border-green-500/30" : 
                isKycPending ? "bg-amber-950/40 text-amber-400 border-amber-500/30" : 
                isKycRejected ? "bg-red-950/40 text-red-400 border-red-500/30" : 
                "bg-slate-850 text-slate-400 border-slate-700/50"
              }`}>
                {kyc?.status || "not_submitted"}
              </span>
            </div>

            {isKycPending && (
              <div className="pt-2 p-4 bg-amber-950/10 border border-amber-500/20 rounded-xl flex gap-3 text-amber-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold">KYC Review Pending</p>
                  <p className="mt-1 text-amber-400/80">Our compliance officers are reviewing your documents. Please wait or check back shortly.</p>
                </div>
              </div>
            )}

            {isKycRejected && (
              <div className="p-4 bg-red-950/10 border border-red-500/20 rounded-xl flex gap-3 text-red-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold">KYC Submission Rejected</p>
                  <p className="mt-1 text-red-400/80">Reason: {kyc?.rejectionReason || "Invalid details or documents."}</p>
                </div>
              </div>
            )}

            {showKycForm && kycOption === "choice" && (
              <div className="space-y-4 pt-2 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 p-5 rounded-2xl flex flex-col justify-between items-start gap-3 transition">
                    <div className="space-y-1.5">
                      <span className="px-2 py-0.5 bg-green-600 text-white text-[9px] font-black rounded uppercase tracking-wider">Fastest</span>
                      <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                        <Shield className="w-4.5 h-4.5 text-green-400" /> Verify via DigiLocker
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-normal font-semibold">
                        Link your government ID instantly to retrieve verified Aadhaar & PAN details. Auto-approved in 1 minute.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsKycModalOpen(true)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer"
                    >
                      Verify Instantly
                    </button>
                  </div>

                  <div className="border border-slate-800 bg-slate-900/40 hover:bg-slate-850/80 p-5 rounded-2xl flex flex-col justify-between items-start gap-3 transition">
                    <div className="space-y-1.5">
                      <span className="px-2 py-0.5 bg-slate-700 text-slate-350 text-[9px] font-black rounded uppercase tracking-wider">Manual</span>
                      <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                        <FileText className="w-4.5 h-4.5 text-slate-400" /> Upload Files Manually
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-normal font-semibold">
                        Upload photos of Aadhaar cards, PAN, and a selfie. Documents are reviewed by compliance within 2-3 business days.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setKycOption("manual")}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-655 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer"
                    >
                      Upload Manually
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showKycForm && kycOption === "manual" && (
              <form onSubmit={handleKycSubmit} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                      Aadhaar Number (12 digits) *
                    </label>
                    <input
                      type="text"
                      required
                      value={aadhaarNumber}
                      onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456789012"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                      PAN Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-green-500 outline-none"
                    />
                  </div>
                  {targetRole === "deliveryBoy" && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                        Driving License Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                        placeholder="DL-XXXX"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-green-500 outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300 text-xs">
                  <div className="border border-dashed border-slate-850 p-4 rounded-xl flex flex-col items-center justify-center bg-slate-900/20 text-center gap-1.5">
                    <UploadCloud className="w-6 h-6 text-slate-500" />
                    <span className="font-semibold">{aadhaarFront ? aadhaarFront.name : "Aadhaar Front *"}</span>
                    <input type="file" required accept="image/*,application/pdf" className="hidden" id="aadhaar-front-file" onChange={(e) => setAadhaarFront(e.target.files?.[0] || null)} />
                    <label htmlFor="aadhaar-front-file" className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-md cursor-pointer font-bold text-[10px]">Choose File</label>
                  </div>

                  <div className="border border-dashed border-slate-850 p-4 rounded-xl flex flex-col items-center justify-center bg-slate-900/20 text-center gap-1.5">
                    <UploadCloud className="w-6 h-6 text-slate-500" />
                    <span className="font-semibold">{aadhaarBack ? aadhaarBack.name : "Aadhaar Back *"}</span>
                    <input type="file" required accept="image/*,application/pdf" className="hidden" id="aadhaar-back-file" onChange={(e) => setAadhaarBack(e.target.files?.[0] || null)} />
                    <label htmlFor="aadhaar-back-file" className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-md cursor-pointer font-bold text-[10px]">Choose File</label>
                  </div>

                  <div className="border border-dashed border-slate-850 p-4 rounded-xl flex flex-col items-center justify-center bg-slate-900/20 text-center gap-1.5">
                    <UploadCloud className="w-6 h-6 text-slate-500" />
                    <span className="font-semibold">{panFile ? panFile.name : "PAN Card *"}</span>
                    <input type="file" required accept="image/*,application/pdf" className="hidden" id="pan-file" onChange={(e) => setPanFile(e.target.files?.[0] || null)} />
                    <label htmlFor="pan-file" className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-md cursor-pointer font-bold text-[10px]">Choose File</label>
                  </div>

                  {targetRole === "deliveryBoy" && (
                    <div className="border border-dashed border-slate-850 p-4 rounded-xl flex flex-col items-center justify-center bg-slate-900/20 text-center gap-1.5">
                      <UploadCloud className="w-6 h-6 text-slate-500" />
                      <span className="font-semibold">{licenseFile ? licenseFile.name : "Driving License *"}</span>
                      <input type="file" required accept="image/*,application/pdf" className="hidden" id="license-file" onChange={(e) => setLicenseFile(e.target.files?.[0] || null)} />
                      <label htmlFor="license-file" className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-md cursor-pointer font-bold text-[10px]">Choose File</label>
                    </div>
                  )}

                  <div className="col-span-1 md:col-span-2 border border-slate-800 p-4 rounded-xl flex flex-col items-center bg-slate-900/40 gap-3">
                    <CameraCapture
                      onCapture={(file) => setSelfieFile(file)}
                      onClear={() => setSelfieFile(null)}
                      savedFileName={selfieFile?.name}
                    />
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Or Upload Manually</span>
                      <input type="file" accept="image/*" className="hidden" id="selfie-file" onChange={(e) => setSelfieFile(e.target.files?.[0] || null)} />
                      <label htmlFor="selfie-file" className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer font-bold text-[10px] shadow-sm">
                        Choose Existing Photo
                      </label>
                    </div>
                  </div>
                </div>

                {kycError && <p className="text-red-500 text-xs font-semibold">{kycError}</p>}

                <button
                  type="submit"
                  disabled={submittingKyc}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl transition cursor-pointer text-sm shadow-md disabled:opacity-50"
                >
                  {submittingKyc ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading documents...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      Submit KYC Documents
                    </>
                  )}
                </button>
              </form>
            )}

            {isKycApproved && (
              <div className="p-4 bg-green-950/10 border border-green-500/20 rounded-xl flex gap-3 text-green-300">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-400" />
                <div className="text-xs">
                  <p className="font-bold">KYC Verification Cleared</p>
                  <p className="mt-1 text-green-400/80">Identity documents are verified. You are authorized to switch to this role.</p>
                </div>
              </div>
            )}
          </div>

          {/* STEP 3: ACTIVATION */}
          <div className="pt-4 flex flex-col md:flex-row gap-4">
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-2 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl font-bold py-3 transition text-sm cursor-pointer"
            >
              <Home className="w-4.5 h-4.5" />
              Return Home
            </Link>
            
            <button
              onClick={handleActivateRole}
              disabled={!stepsCompleted || activationLoading}
              className={`flex-[2] flex items-center justify-center gap-2 text-white font-extrabold py-3 rounded-xl transition text-sm cursor-pointer shadow-lg ${
                stepsCompleted 
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-green-500/10" 
                  : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50 border border-slate-700/50"
              }`}
            >
              {activationLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Activating Access...
                </>
              ) : (
                <>
                  <Key className="w-4.5 h-4.5" />
                  Activate & Enter Dashboard
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* DigiLocker Modal */}
      <DigiLockerKycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={async () => {
          await fetchVerificationStatus();
        }}
        role={targetRole as any}
      />
    </div>
  );
}

export default function VerifyRolePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
          <Loader2 className="w-10 h-10 animate-spin text-green-500 mb-4" />
          <p className="text-slate-400">Loading security details...</p>
        </div>
      }
    >
      <VerifyRolePageContent />
    </Suspense>
  );
}
