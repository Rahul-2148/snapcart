"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bike, Phone, ShoppingBasket, Loader2, Check } from "lucide-react";
import axios from "axios";
import { motion } from "motion/react";
import { signOut } from "next-auth/react";

export default function CompleteProfile() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string>("user");
  const [mobileNumber, setMobileNumber] = useState("");
  const [gender, setGender] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Redirect if not authenticated
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    // Redirect if profile already completed
    if (status === "authenticated" && session?.user?.profileCompleted !== false) {
      router.push("/");
      return;
    }
  }, [status, session, router]);

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRole || !mobileNumber.trim()) {
      alert("Please select a role and enter mobile number");
      return;
    }

    setLoading(true);
    try {
      console.log("📝 Completing profile...", { selectedRole, mobileNumber });

      const result = await axios.post("/api/user/complete-profile", {
        role: selectedRole,
        mobileNumber,
        gender,
      });

      console.log("✅ Profile completed:", result.data);

      if (result.data?.success) {
        const updatedUser = result.data.user || {};

        // Update session with new role and profile status
        await update({
          currentRole: updatedUser.currentRole || selectedRole,
          roles: updatedUser.roles || ["user"],
          profileCompleted: true,
          mobileNumber: updatedUser.mobileNumber || mobileNumber,
        } as any);

        // Redirect based on updated role
        const redirectUrl =
          (updatedUser.currentRole || selectedRole) === "deliveryBoy"
            ? "/delivery-boy"
            : "/";
        router.push(redirectUrl);
      }
    } catch (error: any) {
      console.error("❌ Profile completion error:", error);
      alert(error.response?.data?.message || "Failed to complete profile");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (status === "unauthenticated" || session?.user?.profileCompleted !== false) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600">
            Hi {session?.user?.name}! Please select how you want to use Snapcart
          </p>
        </div>

        <form onSubmit={handleComplete} className="space-y-6">
          {/* Role Selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">
              Select Your Role
            </label>

            <div
              onClick={() => setSelectedRole("user")}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedRole === "user"
                  ? "border-green-600 bg-green-50"
                  : "border-gray-300 hover:border-green-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBasket className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-gray-800">🛒 Customer</p>
                  <p className="text-sm text-gray-600">
                    Order groceries for yourself
                  </p>
                </div>
              </div>
            </div>

            <div
              onClick={() => setSelectedRole("deliveryBoy")}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedRole === "deliveryBoy"
                  ? "border-green-600 bg-green-50"
                  : "border-gray-300 hover:border-green-400"
              }`}
            >
              <div className="flex items-center gap-3">
                <Bike className="w-6 h-6 text-orange-600" />
                <div>
                  <p className="font-semibold text-gray-800">
                    🚴 Delivery Partner
                  </p>
                  <p className="text-sm text-gray-600">
                    Deliver orders and earn
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Number */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Mobile Number
            </label>
            <div className="relative">
              <Phone className="absolute top-1/2 left-3 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                placeholder="+91 enter your mobile"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
                onChange={(e) => setMobileNumber(e.target.value)}
                value={mobileNumber}
                required
              />
            </div>
          </div>

          {/* Gender Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              Gender (Optional)
            </label>
            <select
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 appearance-none bg-white"
              onChange={(e) => setGender(e.target.value)}
              value={gender}
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!selectedRole || !mobileNumber.trim() || loading}
            className={`w-full font-semibold py-3 rounded-lg transition-all duration-200 shadow-md inline-flex items-center justify-center gap-2 ${
              selectedRole && mobileNumber.trim() && !loading
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-300 text-gray-600 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Complete Profile
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
