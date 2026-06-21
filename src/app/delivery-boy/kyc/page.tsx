"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CameraCapture from "@/components/verification/CameraCapture";
import { Shield, Lock, FileText, Check, CheckCircle2 } from "lucide-react";
import DigiLockerKycModal from "@/components/verification/DigiLockerKycModal";

interface KycDocument {
  type: "aadhaar_front" | "aadhaar_back" | "pan" | "license" | "selfie";
  url: string;
  publicId: string;
  uploadedAt: string;
}

interface KycStatus {
  status: "not_submitted" | "pending" | "approved" | "rejected";
  documents?: KycDocument[];
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  licenseNumber?: string;
}

export default function DeliveryBoyKycPage() {
  const [kyc, setKyc] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);

  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  const [aadhaarFront, setAadhaarFront] = useState<File | null>(null);
  const [aadhaarBack, setAadhaarBack] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const fetchKyc = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/delivery-boy/kyc");
      const data = await res.json();
      if (res.ok) {
        setKyc(data.kyc);
        setAadhaarNumber(data.kyc?.aadhaarNumber || "");
        setPanNumber(data.kyc?.panNumber || "");
        setLicenseNumber(data.kyc?.licenseNumber || "");
      }
    } catch (err) {
      console.error("Failed to load KYC", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKyc();
  }, []);

  const handleSubmit = async () => {
    try {
      setError(null);
      setSubmitting(true);

      const formData = new FormData();
      if (aadhaarNumber) formData.append("aadhaarNumber", aadhaarNumber);
      if (panNumber) formData.append("panNumber", panNumber);
      if (licenseNumber) formData.append("licenseNumber", licenseNumber);

      if (aadhaarFront) formData.append("aadhaar_front", aadhaarFront);
      if (aadhaarBack) formData.append("aadhaar_back", aadhaarBack);
      if (panFile) formData.append("pan", panFile);
      if (licenseFile) formData.append("license", licenseFile);
      if (selfieFile) formData.append("selfie", selfieFile);

      const res = await fetch("/api/delivery-boy/kyc", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to submit KYC");
        return;
      }
      await fetchKyc();
    } catch (err) {
      console.error("KYC submission failed", err);
      setError("Failed to submit KYC");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">KYC Verification</h1>
            <p className="text-gray-600">Submit documents to get verified.</p>
          </div>
          <Link
            href="/delivery-boy"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            Loading...
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold capitalize ${
                    kyc?.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : kyc?.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : kyc?.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {kyc?.status || "not_submitted"}
                </span>
                {kyc?.submittedAt && (
                  <span className="text-sm text-gray-500">
                    Submitted: {new Date(kyc.submittedAt).toLocaleDateString("en-IN")}
                  </span>
                )}
              </div>
              {kyc?.rejectionReason && (
                <p className="text-sm text-red-600 mt-2">
                  Reason: {kyc.rejectionReason}
                </p>
              )}
            </div>

            {kyc?.status !== "approved" && kyc?.status !== "pending" && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3 text-left">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 border border-indigo-100">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Verify via DigiLocker Instantly</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                      Retrieve government-signed credentials (Aadhaar, PAN) instantly to get verified without waiting.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsKycModalOpen(true)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md whitespace-nowrap cursor-pointer"
                >
                  Verify instantly using DigiLocker
                </button>
              </div>
            )}

            {kyc?.status === "approved" || kyc?.status === "pending" ? (
              <div className="space-y-6">
                {/* Verified Details Portfolio Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4 text-left">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <Lock className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-lg font-bold text-slate-850">Verified logistics Credentials</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                      <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Aadhaar Card</p>
                      <p className="text-sm font-bold text-slate-700 mt-1 font-mono tracking-wide">
                        •••• •••• {kyc?.aadhaarNumber?.slice(-4) || "••••"}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full mt-2 uppercase tracking-wide">
                        <Check className="w-3 h-3" /> Linked
                      </span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                      <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">PAN Card</p>
                      <p className="text-sm font-bold text-slate-700 mt-1 font-mono tracking-wide">
                        {kyc?.panNumber ? `${kyc.panNumber.slice(0, 5)}••••${kyc.panNumber.slice(-1)}` : "Not Provided"}
                      </p>
                      {kyc?.panNumber && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full mt-2 uppercase tracking-wide">
                          <Check className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                      <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Driving License</p>
                      <p className="text-sm font-bold text-slate-700 mt-1 font-mono tracking-wide">
                        {kyc?.licenseNumber ? `${kyc.licenseNumber.slice(0, 4)}••••${kyc.licenseNumber.slice(-2)}` : "Not Provided"}
                      </p>
                      {kyc?.licenseNumber && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full mt-2 uppercase tracking-wide">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submitted Files Gallery Grid */}
                {kyc?.documents && kyc.documents.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4 text-left">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <h2 className="text-lg font-bold text-slate-850">Submitted Document Files</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-2">
                      {kyc.documents.map((doc) => {
                        const labelMap: Record<string, string> = {
                          aadhaar_front: "Aadhaar Front Side",
                          aadhaar_back: "Aadhaar Back Side",
                          pan: "PAN Card",
                          license: "Driving License",
                          selfie: "Selfie Liveness Photo",
                        };
                        const label = labelMap[doc.type] || doc.type;
                        const isPdf = doc.url.toLowerCase().endsWith(".pdf") || doc.url.includes("/raw/upload/");
                        return (
                          <div key={doc.type} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-between text-center gap-3">
                            <div className="w-full h-32 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-150 relative">
                              {isPdf ? (
                                <div className="flex flex-col items-center justify-center text-slate-500 p-2">
                                  <span className="text-3xl">📄</span>
                                  <span className="text-[10px] font-bold mt-1 truncate max-w-full">PDF Document</span>
                                </div>
                              ) : (
                                <img
                                  src={doc.url}
                                  alt={label}
                                  className="w-full h-full object-cover transition hover:scale-105"
                                />
                              )}
                            </div>
                            <div className="w-full">
                              <p className="text-xs font-bold text-slate-700">{label}</p>
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-block text-[10px] font-extrabold text-blue-600 hover:text-blue-800 uppercase tracking-wider underline cursor-pointer"
                              >
                                View Document ↗
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                  <h2 className="text-lg font-semibold">Document Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Aadhaar Number</label>
                      <input
                        value={aadhaarNumber}
                        onChange={(e) => setAadhaarNumber(e.target.value)}
                        className="w-full border rounded px-3 py-2 text-sm"
                        placeholder="XXXX XXXX XXXX"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">PAN Number</label>
                      <input
                        value={panNumber}
                        onChange={(e) => setPanNumber(e.target.value)}
                        className="w-full border rounded px-3 py-2 text-sm"
                        placeholder="ABCDE1234F"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">License Number</label>
                      <input
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        className="w-full border rounded px-3 py-2 text-sm"
                        placeholder="DL-XXXX"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                  <h2 className="text-lg font-semibold">Upload Documents</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Aadhaar Front</label>
                      <input type="file" accept="image/*,application/pdf" onChange={(e) => setAadhaarFront(e.target.files?.[0] || null)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Aadhaar Back</label>
                      <input type="file" accept="image/*,application/pdf" onChange={(e) => setAadhaarBack(e.target.files?.[0] || null)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">PAN Card</label>
                      <input type="file" accept="image/*,application/pdf" onChange={(e) => setPanFile(e.target.files?.[0] || null)} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Driving License</label>
                      <input type="file" accept="image/*,application/pdf" onChange={(e) => setLicenseFile(e.target.files?.[0] || null)} />
                    </div>
                    <div className="col-span-1 md:col-span-2 border border-slate-100 p-4 rounded-xl flex flex-col items-center bg-slate-50 gap-3">
                      <CameraCapture
                        onCapture={(file) => setSelfieFile(file)}
                        onClear={() => setSelfieFile(null)}
                        savedFileName={selfieFile?.name}
                      />
                      <div className="flex flex-col items-center justify-center text-center">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">Or Upload Manually</span>
                        <input type="file" accept="image/*" className="hidden" id="selfie-file" onChange={(e) => setSelfieFile(e.target.files?.[0] || null)} />
                        <label htmlFor="selfie-file" className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg cursor-pointer font-bold text-[10px] shadow-sm">
                          Choose Existing Photo
                        </label>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Images or PDFs up to 5MB.</p>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit KYC"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
      <DigiLockerKycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={async () => {
          await fetchKyc();
        }}
        role="deliveryBoy"
      />
    </div>
  );
}
