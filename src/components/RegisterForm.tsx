import {
  ArrowLeft,
  Leaf,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Loader2,
  Bike,
  Phone,
  ArrowRight,
  ShoppingBasket,
} from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import googleLogo from "@/assets/googleLogo.png";
import axios from "axios";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const RegisterForm = ({
  previousStep,
}: {
  previousStep: (step: number) => void;
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [gender, setGender] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // Step 1: Basic info, Step 2: Role selection
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      // Move to role selection step
      setStep(2);
      return;
    }

    // Step 2: Register with role and mobile
    if (!selectedRole || !mobileNumber.trim()) {
      alert("Please select a role and enter mobile number");
      return;
    }

    setLoading(true);
    try {
      console.log("📝 Starting registration...");
      const result = await axios.post("/api/auth/register", {
        name,
        email,
        password,
        role: selectedRole,
        mobileNumber,
        gender,
      });
      
      console.log("✅ Registration successful:", result.data);
      
      // Auto sign-in after successful registration
      if (result.data.success) {
        console.log("🔐 Attempting auto sign-in...");
        
        // Determine redirect URL based on role
        let redirectUrl = "/";
        if (selectedRole === "deliveryBoy") {
          redirectUrl = "/delivery-boy";
        } else if (selectedRole === "admin") {
          redirectUrl = "/admin";
        }
        
        console.log(`📍 Redirecting to: ${redirectUrl}`);
        
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
          callbackUrl: redirectUrl,
        });
        
        console.log("Sign-in result:", signInResult);
        
        if (!signInResult?.ok) {
          // If auto sign-in fails, redirect to login
          console.log("Auto sign-in failed, redirecting to login");
          setLoading(false);
          router.push("/login");
        } else {
          router.push(redirectUrl);
        }
      }
      setLoading(false);
    } catch (error: any) {
      console.error("❌ Registration error:", error);
      setLoading(false);
      
      const errorMsg = error?.response?.data?.message || error?.message || "Registration failed";
      alert(errorMsg);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-10 bg-white relative">
      <div
        className="absolute top-6 left-6 flex items-center gap-2 text-green-700 hover:text-green-800 transition-colors cursor-pointer"
        onClick={() => (step === 2 ? setStep(1) : previousStep(1))}
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back</span>
      </div>

      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-4xl font-extrabold text-green-700 mb-2"
      >
        {step === 1 ? "Create an Account" : "Choose Your Role"}
      </motion.h1>
      <p className="text-gray-600 mb-8 flex items-center">
        {step === 1 ? (
          <>
            Join Snapcart today <Leaf className="w-5 h-5 text-green-600 ml-1" />
          </>
        ) : (
          "Select how you want to use Snapcart"
        )}
      </p>

      <motion.form
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex flex-col gap-5 w-full max-w-sm"
        onSubmit={handleRegister}
      >
        {step === 1 ? (
          <>
            <div className="relative">
              <User className="absolute top-1/2 left-3 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="your name"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
                onChange={(e) => setName(e.target.value)}
                value={name}
              />
            </div>
            <div className="relative">
              <Mail className="absolute top-1/2 left-3 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                placeholder="your email"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
                onChange={(e) => setEmail(e.target.value)}
                value={email}
              />
            </div>
            <div className="relative">
              <Lock className="absolute top-1/2 left-3 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="your password"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
                onChange={(e) => setPassword(e.target.value)}
                value={password}
              />
              {showPassword ? (
                <EyeOff
                  className="absolute top-1/2 right-3 transform -translate-y-1/2 w-5 h-5 text-gray-400 cursor-pointer"
                  onClick={() => setShowPassword(false)}
                />
              ) : (
                <Eye
                  className="absolute top-1/2 right-3 transform -translate-y-1/2 w-5 h-5 text-gray-400 cursor-pointer"
                  onClick={() => setShowPassword(true)}
                />
              )}
            </div>
            <div className="relative">
              <User className="absolute top-1/2 left-3 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 appearance-none bg-white"
                onChange={(e) => setGender(e.target.value)}
                value={gender}
              >
                <option value="">Select Gender (Optional)</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>
          </>
        ) : (
          <>
            {/* Role Selection */}
            <div className="space-y-3">
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
            <div className="relative mt-4">
              <Phone className="absolute top-1/2 left-3 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                placeholder="+91 enter your mobile"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
                onChange={(e) => setMobileNumber(e.target.value)}
                value={mobileNumber}
              />
            </div>
          </>
        )}

        {(() => {
          const formValidation =
            step === 1
              ? name !== "" && email !== "" && password.length >= 6
              : selectedRole !== null && mobileNumber.trim() !== "";
          return (
            <button
              type="submit"
              disabled={!formValidation || loading}
              className={`w-full font-semibold py-3 rounded-xl transition-all duration-200 shadow-md inline-flex items-center justify-center gap-2 ${
                formValidation
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-300 text-gray-600 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : step === 1 ? (
                <>
                  Continue <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                "Complete Sign Up"
              )}
            </button>
          );
        })()}

        {step === 1 && (
          <>
            <div className="flex items-center gap-2 text-gray-400 text-sm mt-2">
              <span className="flex-1 h-px bg-gray-200"></span>
              OR
              <span className="flex-1 h-px bg-gray-200"></span>
            </div>

            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 border border-gray-300 hover:bg-gray-50 py-3 rounded-xl text-gray-700 font-medium transition-all duration-200 cursor-pointer"
              onClick={() => signIn("google", { callbackUrl: "/" })}
            >
              <Image src={googleLogo} alt="Google Logo" width={20} height={20} />
              Continue with Google
            </button>
          </>
        )}
      </motion.form>
      {step === 1 && (
        <p
          className="text-gray-600 mt-6 text-sm flex items-center gap-1 cursor-pointer"
          onClick={() => router.push("/login")}
        >
          Already have an account?{" "}
          <LogIn className="w-4 h-4 text-green-600 ml-1" />
          <span className="text-green-600">Sign In</span>
        </p>
      )}
    </div>
  );
};

export default RegisterForm;
