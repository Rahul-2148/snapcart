// src/app/user/account/profile/page.tsx
"use client";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { setUserData } from "@/redux/features/userSlice";
import Image from "next/image";
import useGetMe from "@/hooks/useGetMe";
import useSocket from "@/hooks/useSocket";
import { UserIcon, Camera, X, Check, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner"; // Added Sonner toast

export default function ProfilePage() {
  useGetMe();
  const { userData } = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch<AppDispatch>();
  const socket = useSocket(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  );

  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
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
      setPreviewImage(userData.image?.url || null);
    }
  }, [userData]);

  useEffect(() => {
    if (!socket || !userData?._id) return;

    socket.emit("join_user_room", userData._id);

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

    if (!hasNameChange && !hasMobileChange) {
      toast.info("No changes detected to update.");
      return;
    }

    try {
      setIsProfileLoading(true);
      const formData = new FormData();

      if (hasNameChange) {
        formData.append("name", name);
      }
      if (hasMobileChange) {
        formData.append("mobileNumber", mobileNumber);
      }

      const toastId = toast.loading("Updating profile...");

      const response = await axios.patch("/api/user/edit-profile", formData);
      dispatch(setUserData(response.data.user));
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
    if (userData?.role === "admin") {
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

    if (userData?.role === "deliveryBoy") {
      return (
        <div className="p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-md">
          <p className="font-bold">You are a Delivery Partner!</p>
          <p>You can now see delivery requests in your dashboard.</p>
        </div>
      );
    }

    if (userData?.role === "user") {
      switch (userData.roleChangeRequest) {
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
    <div className="bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">My Account</h1>

        {/* Profile Settings */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-6">
            Profile Settings
          </h2>
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
              {/* Profile Image with Edit Button */}
              <div className="relative">
                <div className="relative w-24 h-24 rounded-full border-2 border-gray-200 flex items-center justify-center overflow-hidden bg-gray-100">
                  {previewImage ? (
                    <Image
                      src={previewImage}
                      alt="Profile"
                      width={96}
                      height={96}
                      className="w-24 h-24 object-cover"
                    />
                  ) : (
                    <UserIcon className="w-10 h-10 text-gray-400" />
                  )}
                </div>

                {/* Edit Icon/Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Change profile picture"
                  disabled={isImageLoading}
                >
                  {isImageLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>

                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                  disabled={isImageLoading}
                />

                {/* Image Change Actions (Show only when editing) */}
                {isEditingImage && (
                  <div className="absolute -bottom-10 left-0 right-0 flex justify-center space-x-2">
                    <button
                      type="button"
                      onClick={handleSaveImage}
                      disabled={isImageLoading}
                      className="bg-green-500 text-white p-1 rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
                      className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-grow text-center sm:text-left">
                <p className="text-lg font-semibold">{userData?.name}</p>
                <p className="text-sm text-gray-500">{userData?.email}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click the camera icon to change profile picture
                </p>
                {isEditingImage && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Click ✓ to save or ✕ to cancel
                  </p>
                )}
                {isImageLoading && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Uploading image...
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-600"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                  disabled={isProfileLoading || isImageLoading}
                />
              </div>
              <div>
                <label
                  htmlFor="mobile"
                  className="block text-sm font-medium text-gray-600"
                >
                  Mobile Number
                </label>
                <input
                  type="tel"
                  id="mobile"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="mt-1 block w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                  disabled={isProfileLoading || isImageLoading}
                />
              </div>
            </div>
            <div className="text-right">
              <button
                type="submit"
                disabled={isProfileLoading || isImageLoading}
                className="inline-flex items-center justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProfileLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-6">
            Change Password
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-6">
            {(userData as any)?.hasPassword && (
              <div>
                <label
                  htmlFor="oldPassword"
                  className="block text-sm font-medium text-gray-600"
                >
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showOld ? "text" : "password"}
                    id="oldPassword"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="mt-1 block w-full px-4 py-2 pr-10 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                    disabled={isPasswordLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showOld ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-600"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full px-4 py-2 pr-10 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                  disabled={isPasswordLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showNew ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label
                htmlFor="confirmNewPassword"
                className="block text-sm font-medium text-gray-600"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  id="confirmNewPassword"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="mt-1 block w-full px-4 py-2 pr-10 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                  disabled={isPasswordLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirm ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <div className="text-right">
              <button
                type="submit"
                disabled={isPasswordLoading}
                className="inline-flex items-center justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPasswordLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            Become a Delivery Partner
          </h2>
          {renderRoleManagement()}
        </div>
      </div>
    </div>
  );
}
