"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
                <div>
                  <label className="text-sm text-gray-600">Selfie</label>
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => setSelfieFile(e.target.files?.[0] || null)} />
                </div>
              </div>
              <p className="text-xs text-gray-500">Images or PDFs up to 5MB.</p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                onClick={handleSubmit}
                disabled={submitting || kyc?.status === "pending" || kyc?.status === "approved"}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit KYC"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
