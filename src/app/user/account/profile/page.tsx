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
import { UserIcon, Camera, X, Check, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner"; // Added Sonner toast

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
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-8 py-4 sm:py-6 md:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Account</h1>
        <p className="text-sm text-gray-600 mb-6 sm:mb-8">Manage your profile, password, and account preferences</p>

        {/* Profile Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Profile Settings</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Update your personal information</p>
          </div>
          <form onSubmit={handleUpdateProfile} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 pb-5 sm:pb-6 border-b border-gray-100">
              {/* Profile Image with Edit Button */}
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

                {/* Edit Icon/Button */}
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

                {/* Image Change Actions (Show only when editing) */}
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

                {/* Hidden file input */}
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

        {/* Password Change */}
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
                className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
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

        {/* Role Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Become a Delivery Partner</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Earn by delivering groceries with Snapcart</p>
          </div>
          <div className="p-4 sm:p-6">
          {renderRoleManagement()}
          </div>
        </div>
      </div>
    </div>
  );
}
