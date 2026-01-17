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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    // Registration logic here
    setLoading(true);
    try {
      const result = await axios.post("/api/auth/register", {
        name,
        email,
        password,
      });
      // console.log(result.data);
      setLoading(false);
      router.push("/login");
    } catch (error) {
      console.error("Registration error:", error);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-10 bg-white relative">
      <div
        className="absolute top-6 left-6 flex items-center gap-2 text-green-700 hover:text-green-800 transition-colors cursor-pointer"
        onClick={() => previousStep(1)}
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
        Create an Account
      </motion.h1>
      <p className="text-gray-600 mb-8 flex items-center">
        Join Snapcart today <Leaf className="w-5 h-5 text-green-600 ml-1" />
      </p>

      <motion.form
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex flex-col gap-5 w-full max-w-sm"
        onSubmit={handleRegister}
      >
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

        {(() => {
          const formValidation =
            name !== "" && email !== "" && password.length >= 6;
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
              ) : (
                "Register"
              )}
            </button>
          );
        })()}

        <div className="flex items-center gap-2 text-gray-400 text-sm mt-2">
          <span className="flex-1 h-px bg-gray-200"></span>
          OR
          <span className="flex-1 h-px bg-gray-200"></span>
        </div>

        <div
          className="w-full flex items-center justify-center gap-3 border border-gray-300 hover:bg-gray-50 py-3 rounded-xl text-gray-700 font-medium transition-all duration-200"
          onClick={() => signIn("google", { callbackUrl: "/" })}
        >
          <Image src={googleLogo} alt="Google Logo" width={20} height={20} />
          Continue with Google
        </div>
      </motion.form>
      <p
        className="text-gray-600 mt-6 text-sm flex items-center gap-1 cursor-pointer"
        onClick={() => router.push("/login")}
      >
        Already have an account?{" "}
        <LogIn className="w-4 h-4 text-green-600 ml-1" />
        <span className="text-green-600">Sign In</span>
      </p>
    </div>
  );
};

export default RegisterForm;
