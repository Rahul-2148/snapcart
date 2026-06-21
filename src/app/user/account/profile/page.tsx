// src/app/user/account/profile/page.tsx
"use client";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { setUserData } from "@/redux/features/userSlice";
import Image from "next/image";
import useGetMe from "@/hooks/useGetMe";
import { useSocket } from "@/contexts/SocketContext";
import { UserIcon, Camera, X, Check, Loader2, Eye, EyeOff, Shield, ArrowLeft, AlertCircle, Upload, FileText, Key, Truck } from "lucide-react";
import { toast } from "sonner"; // Added Sonner toast
import DigiLockerKycModal from "@/components/verification/DigiLockerKycModal";
import CameraCapture from "@/components/verification/CameraCapture";
import { motion, AnimatePresence } from "framer-motion";

export default function ProfilePage() {
  useGetMe();
  const { userData } = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch<AppDispatch>();
  const socket = useSocket();

  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [gender, setGender] = useState<string>("");
  const [image, setImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [requestedRole, setRequestedRole] = useState<
    "user" | "deliveryBoy" | "admin"
  >("deliveryBoy");
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "kyc" | "delivery">("profile");

  // Shopper Manual KYC states
  const [manualAadhaarNumber, setManualAadhaarNumber] = useState("");
  const [manualPanNumber, setManualPanNumber] = useState("");
  const [aadhaarFrontFile, setAadhaarFrontFile] = useState<File | null>(null);
  const [aadhaarBackFile, setAadhaarBackFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [submittingManual, setSubmittingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [kycOption, setKycOption] = useState<"choice" | "manual">("choice");

  const handleManualKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAadhaarNumber || manualAadhaarNumber.replace(/\s+/g, "").length !== 12) {
      toast.error("Please enter a valid 12-digit Aadhaar number");
      return;
    }
    if (manualPanNumber && !/^[A-Z]{5}\d{4}[A-Z]$/.test(manualPanNumber.toUpperCase())) {
      toast.error("Please enter a valid PAN number format (e.g. ABCDE1234F)");
      return;
    }
    if (!aadhaarFrontFile || !aadhaarBackFile || !selfieFile) {
      toast.error("Aadhaar Front, Aadhaar Back, and Selfie are required for manual KYC");
      return;
    }

    try {
      setSubmittingManual(true);
      setManualError(null);
      const formData = new FormData();
      formData.append("aadhaarNumber", manualAadhaarNumber.replace(/\s+/g, ""));
      formData.append("panNumber", manualPanNumber.toUpperCase());
      formData.append("aadhaar_front", aadhaarFrontFile);
      formData.append("aadhaar_back", aadhaarBackFile);
      formData.append("selfie", selfieFile);
      if (panFile) {
        formData.append("pan", panFile);
      }

      const res = await axios.post("/api/user/kyc", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        toast.success("Manual KYC documents submitted successfully!");
        const result = await axios.get(`/api/me?timestamp=${new Date().getTime()}`);
        dispatch(setUserData(result.data.user));
        setKycOption("choice");
      }
    } catch (err: any) {
      setManualError(err.response?.data?.message || err.message || "Failed to submit manual KYC");
      toast.error("Manual KYC submission failed");
    } finally {
      setSubmittingManual(false);
    }
  };

  // Separate loading states
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isRoleRequestLoading, setIsRoleRequestLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // Password change states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userData) {
      setName(userData.name || "");
      setMobileNumber(userData.mobileNumber || "");
      setGender(userData.gender || "");
      setPreviewImage(userData.image?.url || null);
    }
  }, [userData]);

  useEffect(() => {
    if (!socket || !userData?._id) return;

    // Room join is already handled in useGetMe hook
    const handler = (data: any) => {
      if (data.userId === userData._id) {
        dispatch(setUserData(data.user));
        toast.success(`Your role change request has been ${data.status}.`);
      }
    };

    socket.on("status_updated", handler);

    return () => {
      socket.off("status_updated", handler);
    };
  }, [socket, userData?._id, dispatch]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file type
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",
        "image/gif",
      ];
      if (!validTypes.includes(file.type)) {
        toast.error(
          "Please select a valid image file (JPEG, PNG, JPG, WEBP, GIF)"
        );
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        toast.error("Image size should be less than 10MB");
        return;
      }

      setImage(file);
      setPreviewImage(URL.createObjectURL(file));
      setIsEditingImage(true);
      toast.info(
        "Image selected. Click the check mark to save or X to cancel."
      );
    }
  };

  const handleCancelImageChange = () => {
    setImage(null);
    setPreviewImage(userData?.image?.url || null);
    setIsEditingImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.info("Image change cancelled");
  };

  const handleSaveImage = async () => {
    if (!image) return;

    try {
      setIsImageLoading(true);
      const formData = new FormData();
      formData.append("image", image);

      const toastId = toast.loading("Uploading profile picture...");

      const response = await axios.patch("/api/user/edit-profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      dispatch(setUserData(response.data.user));
      toast.success("Profile picture updated successfully!", { id: toastId });
      setIsEditingImage(false);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Failed to update profile picture. Please try again."
      );
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if there are any changes
    const hasNameChange = name !== userData?.name;
    const hasMobileChange = mobileNumber !== userData?.mobileNumber;
    const hasGenderChange = gender !== (userData?.gender || "");

    if (!hasNameChange && !hasMobileChange && !hasGenderChange) {
      toast.info("No changes detected to update.");
      return;
    }

    try {
      setIsProfileLoading(true);
      const payload: Record<string, string> = {};

      if (hasNameChange) {
        payload.name = name;
      }
      if (hasMobileChange) {
        payload.mobileNumber = mobileNumber;
      }
      if (hasGenderChange) {
        payload.gender = gender;
      }

      const toastId = toast.loading("Updating profile...");

      const response = await axios.patch("/api/user/edit-profile", payload, {
        headers: { "Content-Type": "application/json" },
      });
      const mergedUser = {
        ...(userData || {}),
        ...(response.data.user || {}),
        gender:
          response.data.user?.gender !== undefined
            ? response.data.user.gender
            : gender,
      };
      dispatch(setUserData(mergedUser));
      setGender(mergedUser.gender || "");
      toast.success(response.data.message, { id: toastId });
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Failed to update profile. Please try again."
      );
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleRoleChangeRequest = async () => {
    try {
      setIsRoleRequestLoading(true);
      const toastId = toast.loading("Submitting your request...");

      const response = await axios.post("/api/user/request-role-change", {
        role: requestedRole,
      });

      toast.success(
        `Request to become a ${requestedRole} submitted successfully! You will be notified upon approval.`,
        { id: toastId }
      );

      if (socket) {
        socket.emit("role_change_request", response.data.user);
      }

      const result = await axios.get(
        `/api/me?timestamp=${new Date().getTime()}`
      );
      dispatch(setUserData(result.data.user));
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Failed to submit request. Please try again."
      );
    } finally {
      setIsRoleRequestLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("New passwords do not match");
      return;
    }

    try {
      setIsPasswordLoading(true);
      const data: any = { newPassword, confirmPassword: confirmNewPassword };
      if (userData?.hasPassword) {
        data.oldPassword = oldPassword;
      }
      const response = await axios.patch("/api/user/change-password", data);
      toast.success(response.data.message);
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const renderRoleManagement = () => {
    const userRoles = userData?.roles || [];
    const currentRole = userData?.currentRole || "user";
    
    // Check if user has deliveryBoy role in their roles array
    const isDeliveryPartner = userRoles.includes("deliveryBoy");
    const isAdmin = userRoles.includes("admin");

    if (isAdmin) {
      return (
        <div className="p-4 bg-blue-100 border-l-4 border-blue-500 text-blue-700 rounded-md">
          <p className="font-bold">Administrator Account</p>
          <p>
            You are logged in as an admin. Delivery partner requests are not
            applicable for administrator accounts.
          </p>
        </div>
      );
    }

    if (isDeliveryPartner) {
      return (
        <div className="p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-md">
          <p className="font-bold">You are a Delivery Partner!</p>
          <p>You can now see delivery requests in your dashboard.</p>
        </div>
      );
    }

    // If user doesn't have deliveryBoy or admin role, check role change request status
    if (!isDeliveryPartner && !isAdmin) {
      switch (userData?.roleChangeRequest) {
        case "pending":
          return (
            <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
              <p className="font-bold">Request Pending</p>
              <p>
                Your request to become a Delivery Boy is under review. We will
                notify you once it's processed.
              </p>
            </div>
          );
        case "approved":
          return (
            <div className="p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-md">
              <p className="font-bold">Request Approved!</p>
              <p>
                Congratulations! You are now a Delivery Partner. Please log out
                and log back in to access your new dashboard.
              </p>
            </div>
          );
        case "rejected":
          const cooldownDays = 7;
          const rejectionDate = new Date(
            userData.roleChangeRequestTimestamp || 0
          );
          const now = new Date();
          const timeDiff = now.getTime() - rejectionDate.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
          const remainingDays = cooldownDays - daysDiff;

          if (remainingDays > 0) {
            return (
              <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md">
                <p className="font-bold">Request Rejected</p>
                <p>
                  Unfortunately, your request was not approved. You can reapply
                  in {remainingDays} day(s).
                </p>
              </div>
            );
          } else {
            return (
              <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md">
                <p className="font-bold">Request Rejected</p>
                <p>
                  Unfortunately, your request was not approved. You can reapply
                  now.
                </p>
                <button
                  onClick={handleRoleChangeRequest}
                  disabled={isRoleRequestLoading}
                  className="mt-4 inline-flex items-center justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRoleRequestLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Reapply"
                  )}
                </button>
              </div>
            );
          }
        default:
          return (
            <>
              <p className="text-gray-600 mb-4">
                Want to earn by delivering groceries? Apply to become a delivery
                partner with Snapcart.
              </p>
              <button
                onClick={handleRoleChangeRequest}
                disabled={isRoleRequestLoading}
                className={`inline-flex items-center justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isRoleRequestLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Apply to be a Delivery Boy"
                )}
              </button>
            </>
          );
      }
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-8 pt-0 pb-4 sm:pb-6 md:pb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Account</h1>
        <p className="text-sm text-gray-600 mb-6 sm:mb-8">Manage your profile, password, and account preferences</p>

        {/* Sliding Tabs Switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-xl mb-6 relative border border-slate-200/50">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex-grow flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-center rounded-xl relative z-10 transition-colors cursor-pointer ${
              activeTab === "profile" ? "text-indigo-700 font-extrabold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Profile Info</span>
            {activeTab === "profile" && (
              <motion.div
                layoutId="profileActiveTabIndicator"
                className="absolute inset-0 bg-white shadow-sm rounded-xl -z-10 border border-slate-100"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={`flex-grow flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-center rounded-xl relative z-10 transition-colors cursor-pointer ${
              activeTab === "security" ? "text-indigo-700 font-extrabold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Key className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
            {activeTab === "security" && (
              <motion.div
                layoutId="profileActiveTabIndicator"
                className="absolute inset-0 bg-white shadow-sm rounded-xl -z-10 border border-slate-100"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("kyc")}
            className={`flex-grow flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-center rounded-xl relative z-10 transition-colors cursor-pointer ${
              activeTab === "kyc" ? "text-indigo-700 font-extrabold" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">KYC & Identity</span>
            {activeTab === "kyc" && (
              <motion.div
                layoutId="profileActiveTabIndicator"
                className="absolute inset-0 bg-white shadow-sm rounded-xl -z-10 border border-slate-100"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("delivery")}
            className={`flex-grow flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-center rounded-xl relative z-10 transition-colors cursor-pointer ${
              activeTab === "delivery" ? "text-indigo-700 font-extrabold" : "text-slate-500 hover:text-slate-850"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span className="hidden sm:inline">Become Partner</span>
            {activeTab === "delivery" && (
              <motion.div
                layoutId="profileActiveTabIndicator"
                className="absolute inset-0 bg-white shadow-sm rounded-xl -z-10 border border-slate-100"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {activeTab === "profile" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 sm:mb-8">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Profile Settings</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">Update your personal information</p>
                </div>
                <form onSubmit={handleUpdateProfile} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
                  <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 pb-5 sm:pb-6 border-b border-gray-100">
                    <div className="relative mx-auto sm:mx-0">
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-3 border-indigo-200 flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 to-blue-50 shadow-sm">
                        {previewImage ? (
                          <Image
                            src={previewImage}
                            alt="Profile"
                            width={96}
                            height={96}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400" />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-2 rounded-full shadow-md hover:bg-indigo-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ring-2 ring-white"
                        title="Change profile picture"
                        disabled={isImageLoading}
                      >
                        {isImageLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </button>

                      {isEditingImage && (
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex justify-center gap-1.5 bg-white rounded-lg shadow-lg p-2 border border-gray-200">
                          <button
                            type="button"
                            onClick={handleSaveImage}
                            disabled={isImageLoading}
                            className="bg-green-500 text-white p-1.5 rounded-full hover:bg-green-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-150"
                            title="Save changes"
                          >
                            {isImageLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelImageChange}
                            disabled={isImageLoading}
                            className="bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                        disabled={isImageLoading}
                      />
                    </div>

                    <div className="flex-grow w-full text-center sm:text-left">
                      <p className="text-base sm:text-lg font-semibold text-gray-900">{userData?.name}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{userData?.email}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {isEditingImage ? (
                          <span className="text-yellow-600 font-medium">✓ Save or ✕ Cancel your image</span>
                        ) : isImageLoading ? (
                          <span className="text-blue-600 inline-flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Uploading image...
                          </span>
                        ) : (
                          <span>Tap camera icon to change profile picture</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:gap-5">
                    <div>
                      <label htmlFor="name" className="block text-sm sm:text-base font-semibold text-gray-900 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base transition-all duration-150 disabled:opacity-50 disabled:bg-gray-100"
                        disabled={isProfileLoading || isImageLoading}
                      />
                    </div>
                    <div>
                      <label htmlFor="mobile" className="block text-sm sm:text-base font-semibold text-gray-900 mb-2">
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        id="mobile"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base transition-all duration-150 disabled:opacity-50 disabled:bg-gray-100"
                        disabled={isProfileLoading || isImageLoading}
                      />
                    </div>
                    <div>
                      <label htmlFor="gender" className="block text-sm sm:text-base font-semibold text-gray-900 mb-2">
                        Gender
                      </label>
                      <select
                        id="gender"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base transition-all duration-150 disabled:opacity-50 disabled:bg-gray-100 appearance-none cursor-pointer"
                        disabled={isProfileLoading || isImageLoading}
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-4 sm:pt-2 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
                    <button
                      type="submit"
                      disabled={isProfileLoading || isImageLoading}
                      className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      {isProfileLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "security" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 sm:mb-8">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Change Password</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">Keep your account secure with a strong password</p>
                </div>
                <form onSubmit={handleChangePassword} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                  {(userData as any)?.hasPassword && (
                    <div>
                      <label htmlFor="oldPassword" className="block text-sm sm:text-base font-semibold text-gray-900 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showOld ? "text" : "password"}
                          id="oldPassword"
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base transition-all duration-150 disabled:opacity-50 disabled:bg-gray-100"
                          disabled={isPasswordLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowOld(!showOld)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                          disabled={isPasswordLoading}
                        >
                          {showOld ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  <div>
                    <label htmlFor="newPassword" className="block text-sm sm:text-base font-semibold text-gray-900 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNew ? "text" : "password"}
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base transition-all duration-150 disabled:opacity-50 disabled:bg-gray-100"
                        disabled={isPasswordLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                        disabled={isPasswordLoading}
                      >
                        {showNew ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="confirmNewPassword" className="block text-sm sm:text-base font-semibold text-gray-900 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        id="confirmNewPassword"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm sm:text-base transition-all duration-150 disabled:opacity-50 disabled:bg-gray-100"
                        disabled={isPasswordLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                        disabled={isPasswordLoading}
                      >
                        {showConfirm ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="pt-4 sm:pt-2 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
                    <button
                      type="submit"
                      disabled={isPasswordLoading}
                      className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      {isPasswordLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Changing...
                        </>
                      ) : (
                        "Change Password"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "kyc" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 sm:mb-8">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">KYC & Identity Verification</h2>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">Complete verification to unlock higher transaction limits</p>
                  </div>
                  {kycOption === "manual" && userData?.kyc?.status !== "approved" && (
                    <button
                      type="button"
                      onClick={() => setKycOption("choice")}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-650 hover:text-indigo-850 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to options
                    </button>
                  )}
                </div>
                <div className="p-4 sm:p-6 space-y-4">
                  {userData?.kyc?.status === "approved" ? (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-start gap-3 text-left">
                      <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold text-green-900">KYC Verified Successfully</h4>
                        <p className="text-xs text-green-700 mt-0.5">Verified via <span className="capitalize font-semibold">{userData?.kyc?.verificationType || "manual"}</span> on {userData?.kyc?.reviewedAt ? new Date(userData.kyc.reviewedAt).toLocaleDateString("en-IN") : "Date N/A"}</p>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-slate-700 bg-white p-3 rounded-lg border border-green-150">
                          <div>Aadhaar: •••• •••• {userData?.kyc?.aadhaarNumber?.slice(-4) || "••••"}</div>
                          <div>PAN Card: {userData?.kyc?.panNumber ? `${userData.kyc.panNumber.slice(0, 5)}••••${userData.kyc.panNumber.slice(-1)}` : "Not provided"}</div>
                        </div>
                      </div>
                    </div>
                  ) : userData?.kyc?.status === "pending" ? (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-left">
                      <Loader2 className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0 animate-spin" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-900">Verification Pending Approval</h4>
                        <p className="text-xs text-amber-700 mt-0.5">Your manual document upload is being reviewed by compliance. Alternatively, complete verification instantly using DigiLocker.</p>
                        <button
                          type="button"
                          onClick={() => setIsKycModalOpen(true)}
                          className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg text-xs transition cursor-pointer"
                        >
                          Verify via DigiLocker Instantly
                        </button>
                      </div>
                    </div>
                  ) : kycOption === "manual" ? (
                    <form onSubmit={handleManualKycSubmit} className="space-y-4 text-left">
                      {manualError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>{manualError}</span>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                            12-Digit Aadhaar Number
                          </label>
                          <input
                            type="text"
                            maxLength={12}
                            value={manualAadhaarNumber}
                            onChange={(e) => setManualAadhaarNumber(e.target.value.replace(/\D/g, ""))}
                            placeholder="Enter Aadhaar Number"
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                            PAN Number (Optional)
                          </label>
                          <input
                            type="text"
                            maxLength={10}
                            value={manualPanNumber}
                            onChange={(e) => setManualPanNumber(e.target.value.toUpperCase())}
                            placeholder="ABCDE1234F"
                            className="w-full bg-slate-50 border border-slate-350 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition font-mono uppercase tracking-wider"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                            Aadhaar Front Side
                          </label>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => setAadhaarFrontFile(e.target.files?.[0] || null)}
                            className="w-full text-xs"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                            Aadhaar Back Side
                          </label>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => setAadhaarBackFile(e.target.files?.[0] || null)}
                            className="w-full text-xs"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                            PAN Card Photo (Optional)
                          </label>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => setPanFile(e.target.files?.[0] || null)}
                            className="w-full text-xs"
                          />
                        </div>
                        <div className="col-span-1 sm:col-span-2 border border-slate-100 p-4 rounded-xl flex flex-col items-center bg-slate-50 gap-3">
                          <CameraCapture
                            onCapture={(file) => setSelfieFile(file)}
                            onClear={() => setSelfieFile(null)}
                            savedFileName={selfieFile?.name}
                          />
                          <div className="flex flex-col items-center justify-center text-center">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Or Upload Selfie Manually</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              id="selfie-file"
                              onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                            />
                            <label
                              htmlFor="selfie-file"
                              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded-lg cursor-pointer font-bold text-[10px] shadow-sm transition animate-none"
                            >
                              Choose Existing Photo
                            </label>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        type="submit"
                        disabled={submittingManual}
                        className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {submittingManual ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Uploading documents...
                          </>
                        ) : (
                          "Submit Manual Documents"
                        )}
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      {userData?.kyc?.status === "rejected" && (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3 text-left">
                          <X className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="text-sm font-bold text-red-900">Verification Rejected</h4>
                            <p className="text-xs text-red-700 mt-0.5">Reason: {userData?.kyc?.rejectionReason || "Invalid documents."}</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="border border-indigo-150 bg-indigo-50/20 hover:bg-indigo-50/40 p-5 rounded-2xl flex flex-col justify-between items-start text-left gap-3 transition">
                          <div className="space-y-1.5">
                            <span className="px-2 py-0.5 bg-indigo-600 text-white text-[9px] font-black rounded uppercase tracking-wider">Fastest</span>
                            <h4 className="text-sm font-black text-slate-800">Verify via DigiLocker</h4>
                            <p className="text-[11px] text-slate-500 leading-normal font-semibold">
                              Connect your government ID instantly to retrieve verified Aadhaar & PAN details. Auto-approved in 1 minute.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsKycModalOpen(true)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-indigo-600/10 cursor-pointer"
                          >
                            Verify Instantly
                          </button>
                        </div>

                        <div className="border border-slate-200 bg-slate-50/40 hover:bg-slate-50/85 p-5 rounded-2xl flex flex-col justify-between items-start text-left gap-3 transition">
                          <div className="space-y-1.5">
                            <span className="px-2 py-0.5 bg-slate-500 text-white text-[9px] font-black rounded uppercase tracking-wider">Manual</span>
                            <h4 className="text-sm font-black text-slate-800">Upload Files Manually</h4>
                            <p className="text-[11px] text-slate-500 leading-normal font-semibold">
                              Upload photos or PDFs of Aadhaar cards, PAN, and a selfie. Documents are reviewed by compliance within 2-3 business days.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setKycOption("manual")}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-md cursor-pointer"
                          >
                            Upload Manually
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "delivery" && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 sm:mb-8">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Become a Delivery Partner</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">Earn by delivering groceries with Snapcart</p>
                </div>
                <div className="p-4 sm:p-6">
                  {renderRoleManagement()}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      <DigiLockerKycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={async () => {
          try {
            const result = await axios.get(`/api/me?timestamp=${new Date().getTime()}`);
            dispatch(setUserData(result.data.user));
          } catch (err) {
            console.error("Failed to refresh user profile:", err);
          }
        }}
      />
    </div>
  );
}
