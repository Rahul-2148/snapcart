"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";

interface BankAccount {
  _id: string;
  accountNumber: string;
  ifsc: string;
  beneficiaryName: string;
  isPrimary: boolean;
}

interface DeliveryPartner {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  user?: {
    name: string;
    email: string;
    mobileNumber: string;
  };
  gender?: string;
  profileImage?: string;
  rating: number;
  totalDeliveries: number;
}

export default function DeliveryBoyProfilePage() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<DeliveryPartner | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [revealedAccounts, setRevealedAccounts] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    profileImage: "",
  });

  useEffect(() => {
    if (status === "authenticated") {
      fetchProfile();
      fetchBankAccounts();
    }
  }, [status]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/delivery-boy/profile");
      const data = await res.json();
      if (data.success) {
        setProfile(data.partner);
        setFormData({
          name: data.partner.user?.name || data.partner.name || "",
          email: data.partner.user?.email || data.partner.email || "",
          phone: data.partner.user?.mobileNumber || data.partner.phone || "",
          gender: data.partner.gender || "",
          profileImage: data.partner.profileImage || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const res = await fetch("/api/delivery-boy/bank-details");
      const data = await res.json();
      if (data.success && data.banks) {
        setBankAccounts(data.banks);
      }
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/delivery-boy/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setProfile(data.partner);
        setIsEditing(false);
        toast.success("Profile updated successfully!");
      } else {
        toast.error(data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (status === "loading") {
    return <div className="p-6">Loading...</div>;
  }

  if (status !== "authenticated") {
    return (
      <div className="p-6">
        <p className="text-red-600">Please login as a delivery partner</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">My Profile</h1>
            <p className="text-gray-600 text-sm">Manage your delivery partner account</p>
          </div>
          <Link href="/delivery-boy" className="text-blue-600 hover:text-blue-800 font-semibold">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {profile && (
          <div className="space-y-6">
            {/* Profile Header Card */}
            <div className="bg-white p-8 rounded-lg shadow">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-4xl">
                    👤
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">{profile.user?.name || profile.name}</h2>
                    <p className="text-gray-600">{profile.user?.email || profile.email}</p>
                    <p className="text-gray-600">{profile.user?.mobileNumber || profile.phone}</p>
                    <div className="flex gap-4 mt-3">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                        ⭐ {profile.rating}/5.0
                      </span>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                        📦 {profile.totalDeliveries} Deliveries
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-6 py-2 rounded-lg font-semibold transition ${
                    isEditing
                      ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  {isEditing ? "Cancel" : "Edit Profile"}
                </button>
              </div>
            </div>

            {/* Edit Form */}
            {isEditing && (
              <div className="bg-white p-8 rounded-lg shadow">
                <h3 className="text-xl font-bold mb-6">Edit Profile Information</h3>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your full name"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your email"
                        disabled
                      />
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your phone number"
                      />
                    </div>

                    {/* Gender */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Gender
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-lg font-semibold transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bank Details Card */}
            <div className="bg-white p-8 rounded-lg shadow">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Bank Details for Payouts</h3>
                <Link
                  href="/delivery-boy/bank-details"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition"
                >
                  Manage Bank Details
                </Link>
              </div>

              {bankAccounts.length > 0 ? (
                <div className="space-y-4">
                  {bankAccounts.map((bank) => (
                    <div
                      key={bank._id}
                      className={`p-4 rounded-lg ${
                        bank.isPrimary
                          ? "bg-green-50 border-2 border-green-500"
                          : "bg-gray-50 border border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-lg">{bank.beneficiaryName}</h4>
                            {bank.isPrimary && (
                              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-bold">
                                PRIMARY
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <p className="text-sm text-gray-600">Account Number</p>
                              <div className="flex items-center gap-2">
                                <p className="font-mono">
                                  {revealedAccounts.has(bank._id)
                                    ? bank.accountNumber
                                    : `••••••••${bank.accountNumber.slice(-4)}`}
                                </p>
                                <button
                                  onClick={() => {
                                    const newRevealed = new Set(revealedAccounts);
                                    if (newRevealed.has(bank._id)) {
                                      newRevealed.delete(bank._id);
                                    } else {
                                      newRevealed.add(bank._id);
                                    }
                                    setRevealedAccounts(newRevealed);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                                >
                                  {revealedAccounts.has(bank._id) ? "Hide" : "Show"}
                                </button>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">IFSC Code</p>
                              <p className="font-mono">{bank.ifsc}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="text-sm text-gray-600 mt-4">
                    💰 Weekly payouts are processed to your primary bank account every Friday
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg text-center">
                  <p className="text-yellow-800 font-semibold mb-4">No bank details added yet</p>
                  <p className="text-yellow-700 text-sm mb-4">
                    Add your bank details to receive weekly payouts
                  </p>
                  <Link
                    href="/delivery-boy/bank-details"
                    className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                  >
                    Add Bank Details
                  </Link>
                </div>
              )}
            </div>

            {/* Account Settings */}
            <div className="bg-white p-8 rounded-lg shadow">
              <h3 className="text-xl font-bold mb-6">Account Settings</h3>
              <div className="space-y-4">
                <Link
                  href="/delivery-boy/assignments"
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">My Assignments</p>
                      <p className="text-gray-600 text-sm">View all your order assignments</p>
                    </div>
                    <span className="text-2xl">→</span>
                  </div>
                </Link>

                <Link
                  href="/delivery-boy"
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">Earnings & Payouts</p>
                      <p className="text-gray-600 text-sm">View your earnings and payout history</p>
                    </div>
                    <span className="text-2xl">→</span>
                  </div>
                </Link>

                <button className="w-full p-4 border border-red-200 rounded-lg hover:bg-red-50 transition text-left">
                  <div>
                    <p className="font-semibold text-red-600">Logout</p>
                    <p className="text-gray-600 text-sm">Sign out from your account</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
