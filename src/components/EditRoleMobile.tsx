"use client";

import axios from "axios";
import { ArrowRight, Bike, User, UserCog, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const EditRoleMobile = () => {
  const roles = [
    {
      id: "user",
      label: "🛒 Customer",
      icon: User,
    },
    {
      id: "deliveryBoy",
      label: "🚴 Delivery Partner",
      icon: Bike,
    },
  ];
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [mobileNumber, setMobileNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const { update } = useSession();

  const router = useRouter();

  // Extract only digits from input
  const digitsOnly = mobileNumber.replace(/\D/g, "");
  // Strip leading country code 91 if user typed it
  const normalizedDigits = digitsOnly.startsWith("91") && digitsOnly.length > 10
    ? digitsOnly.slice(digitsOnly.length - 10)
    : digitsOnly;
  const isValidMobile = normalizedDigits.length === 10;

  const handleEdit = async () => {
    if (!selectedRole || !isValidMobile) return;

    setLoading(true);
    try {
      const result = await axios.post("/api/user/edit-role-mobile", {
        role: selectedRole,
        mobileNumber: normalizedDigits,
      });
      if (result.data?.success) {
        const updatedUser = result.data.user || {};
        // Update session with new role
        await update({
          currentRole: updatedUser.currentRole || selectedRole,
          roles: updatedUser.roles || ["user"],
          profileCompleted: true,
          mobileNumber: updatedUser.mobileNumber || normalizedDigits,
        } as any);

        const redirectUrl =
          (updatedUser.currentRole || selectedRole) === "deliveryBoy"
            ? "/delivery-boy"
            : "/";
        router.push(redirectUrl);
        router.refresh();
      }
    } catch (error: any) {
      console.error("Edit role error:", error);
      alert(error?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-6 w-full">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-3xl md:text-4xl font-extrabold text-center text-green-700 mt-8"
      >
        Select Your Role
      </motion.h1>

      <div className="flex flex-col md:flex-row justify-center items-center gap-6 mt-10">
        {roles.map((role) => {
          const isSelected = selectedRole === role.id;
          return (
            <motion.div
              whileTap={{ scale: 0.94 }}
              key={role.id}
              className={`flex flex-col items-center justify-center w-48 h-44 rounded-2xl border-2 transition-all cursor-pointer ${
                isSelected
                  ? "border-green-600 bg-green-100 shadow-lg"
                  : "border-gray-300 bg-white hover:border-green-400"
              }`}
              onClick={() => setSelectedRole(role.id)}
            >
              <role.icon />
              <span>{role.label}</span>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-10 flex flex-col items-center justify-center"
      >
        <label htmlFor="mobile" className="text-gray-700 font-medium mb-2">
          Enter Your Mobile Number
        </label>
        <input
          type="tel"
          id="mobile"
          className="w-64 md:w-80 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:outline-none text-gray-800"
          placeholder="10 digit mobile number"
          maxLength={15}
          onChange={(e) => setMobileNumber(e.target.value)}
          value={mobileNumber}
        />
        {mobileNumber && !isValidMobile && (
          <p className="text-red-500 text-xs mt-1">
            Enter a valid 10-digit mobile number
          </p>
        )}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        disabled={!selectedRole || !isValidMobile || loading}
        className={`inline-flex items-center justify-center gap-2 font-semibold py-3 px-8 rounded-2xl shadow-md transition-all duration-200 w-[185px] mt-20 ${
          selectedRole && isValidMobile && !loading
            ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
            : "bg-gray-300 text-gray-600 cursor-not-allowed"
        }`}
        onClick={handleEdit}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Please wait...
          </>
        ) : (
          <>
            Go to Home
            <ArrowRight />
          </>
        )}
      </motion.button>
    </div>
  );
};

export default EditRoleMobile;
