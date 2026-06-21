"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  Wallet,
  Clock,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Gift,
  HelpCircle,
  Sparkles,
  Ticket,
  ArrowLeft,
  ChevronDown,
  Lock,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";
import useGetMe from "@/hooks/useGetMe";
import { setUserData } from "@/redux/features/userSlice";
import DigiLockerKycModal from "@/components/verification/DigiLockerKycModal";
import { Shield } from "lucide-react";

interface ITransaction {
  _id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  giftCardCode?: string;
  giftCardPin?: string;
}

interface IScratchCard {
  _id: string;
  status: "unscratched" | "scratched";
  rewardType?: "cashback" | "voucher" | "better_luck";
  value: number;
  voucherCode?: string;
  voucherTitle?: string;
  earnedForOrder: string;
  createdAt: string;
}

export default function WalletPage() {
  const { data: session } = useSession();
  useGetMe();
  const { userData } = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch<AppDispatch>();
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [balance, setBalance] = useState(0);
  const [coins, setCoins] = useState(0);
  const [scratchCards, setScratchCards] = useState<IScratchCard[]>([]);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [scratchingCardId, setScratchingCardId] = useState<string | null>(null);
  const [revealedReward, setRevealedReward] = useState<{
    rewardType: "cashback" | "voucher" | "better_luck";
    cashbackEarned: number;
    voucherTitle?: string;
    voucherCode?: string;
  } | null>(null);

  // Gift Card states
  const [isRedeemOpen, setIsRedeemOpen] = useState(true);
  const [cardCode, setCardCode] = useState("");
  const [pin, setPin] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Buy Gift Card states
  const [isBuyOpen, setIsBuyOpen] = useState(true);
  const [buyAmount, setBuyAmount] = useState<number>(250);
  const [purchasing, setPurchasing] = useState(false);
  const [purchasedVoucher, setPurchasedVoucher] = useState<any | null>(null);
  const [paymentStep, setPaymentStep] = useState<"idle" | "processing" | "success">("idle");
  const [gateway, setGateway] = useState<"stripe" | "razorpay">("stripe");

  // Direct Wallet Add Money states
  const [addAmount, setAddAmount] = useState<number>(500);
  const [addGateway, setAddGateway] = useState<"stripe" | "razorpay">("stripe");
  const [addingMoney, setAddingMoney] = useState(false);
  const [addMoneyStep, setAddMoneyStep] = useState<"idle" | "processing">("idle");

  // Purchased Vouchers states
  const [purchasedCards, setPurchasedCards] = useState<any[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [isPurchasedListOpen, setIsPurchasedListOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"wallet" | "gift_cards" | "rewards">("wallet");
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const fetchPurchasedCards = async () => {
    try {
      setLoadingCards(true);
      const res = await axios.get("/api/user/gift-cards");
      if (res.data.success) {
        setPurchasedCards(res.data.giftCards || []);
      }
    } catch (error) {
      console.error("Error fetching purchased gift cards:", error);
    } finally {
      setLoadingCards(false);
    }
  };

  // Load Razorpay Checkout SDK script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Buy Gift Card handlers
  const handleBuyGiftCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const minAmt = gateway === "stripe" ? 50 : 1;
    if (buyAmount < minAmt) {
      toast.error(`Minimum purchase amount for ${gateway === "stripe" ? "Stripe" : "Razorpay"} is ₹${minAmt}`);
      return;
    }

    const isKycApproved = (userData as any)?.kyc?.status === "approved";
    if (!isKycApproved && buyAmount > 10000) {
      toast.error("Voucher purchase limit is ₹10,000 for unverified users. Complete DigiLocker KYC first.");
      setIsKycModalOpen(true);
      return;
    }

    try {
      setPurchasing(true);
      setPaymentStep("processing");

      if (gateway === "stripe") {
        const res = await axios.post("/api/user/gift-cards/purchase", {
          amount: buyAmount,
          gateway: "stripe",
        });

        if (res.data.success && res.data.url) {
          // Redirect directly to Stripe payment page
          window.location.href = res.data.url;
        } else {
          throw new Error("Could not retrieve payment session URL.");
        }
      } else if (gateway === "razorpay") {
        // Load script
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          throw new Error("Razorpay SDK failed to load. Check your network.");
        }

        const res = await axios.post("/api/user/gift-cards/purchase", {
          amount: buyAmount,
          gateway: "razorpay",
        });

        if (res.data.success && res.data.orderId) {
          const options = {
            key: res.data.keyId,
            amount: res.data.amount,
            currency: "INR",
            name: "SnapCart",
            description: `SnapCart Gift Voucher - ₹${buyAmount}`,
            order_id: res.data.orderId,
            handler: async function (response: any) {
              verifyRazorpayPurchase(
                response.razorpay_payment_id,
                response.razorpay_order_id,
                response.razorpay_signature
              );
            },
            prefill: {
              email: session?.user?.email || "",
              name: session?.user?.name || "",
            },
            theme: {
              color: "#10B981", // Emerald Green matching SnapCart
            },
            modal: {
              ondismiss: function () {
                setPaymentStep("idle");
                setPurchasing(false);
                toast.error("Payment modal cancelled.");
              },
            },
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        } else {
          throw new Error("Could not initiate Razorpay order.");
        }
      }
    } catch (err: any) {
      setPaymentStep("idle");
      toast.error(err.response?.data?.message || err.message || "Failed to initiate payment");
      setPurchasing(false);
    }
  };

  const verifyRazorpayPurchase = async (
    paymentId: string,
    orderId: string,
    signature: string
  ) => {
    try {
      setPaymentStep("processing");
      const res = await axios.post("/api/user/gift-cards/verify-razorpay", {
        razorpayPaymentId: paymentId,
        razorpayOrderId: orderId,
        razorpaySignature: signature,
        amount: buyAmount,
      });

      if (res.data.success) {
        setPaymentStep("success");
        setPurchasedVoucher(res.data.giftCard);
        toast.success("Payment verified! Your Gift Voucher has been generated.");
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
        fetchWalletAndRewards();
        fetchPurchasedCards();
      }
    } catch (err: any) {
      setPaymentStep("idle");
      toast.error(err.response?.data?.message || "Failed to verify Razorpay signature");
    } finally {
      setPurchasing(false);
    }
  };

  const verifyPurchasedVoucher = async (sessionId: string) => {
    try {
      setPaymentStep("processing");
      setIsBuyOpen(true);
      
      const res = await axios.post("/api/user/gift-cards/verify-purchase", {
        sessionId,
      });

      if (res.data.success) {
        setPaymentStep("success");
        setPurchasedVoucher(res.data.giftCard);
        toast.success("Payment verified! Your Gift Voucher has been generated.");
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
        window.history.replaceState({}, "", "/user/account/wallet");
        fetchWalletAndRewards();
        fetchPurchasedCards();
      }
    } catch (err: any) {
      setPaymentStep("idle");
      toast.error(err.response?.data?.message || "Failed to verify Stripe payment");
      window.history.replaceState({}, "", "/user/account/wallet");
    }
  };

  // Direct Add Money handlers
  const handleAddMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    const minAmt = addGateway === "stripe" ? 50 : 1;
    if (addAmount < minAmt) {
      toast.error(`Minimum deposit amount for ${addGateway === "stripe" ? "Stripe" : "Razorpay"} is ₹${minAmt}`);
      return;
    }

    const isKycApproved = (userData as any)?.kyc?.status === "approved";
    if (!isKycApproved && addAmount > 10000) {
      toast.error("Deposit limit is ₹10,000 for unverified users. Complete DigiLocker KYC first.");
      setIsKycModalOpen(true);
      return;
    }

    try {
      setAddingMoney(true);
      setAddMoneyStep("processing");

      if (addGateway === "stripe") {
        const res = await axios.post("/api/user/wallet/add", {
          amount: addAmount,
          gateway: "stripe",
        });

        if (res.data.success && res.data.url) {
          window.location.href = res.data.url;
        } else {
          throw new Error("Could not retrieve payment session URL.");
        }
      } else if (addGateway === "razorpay") {
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) {
          throw new Error("Razorpay SDK failed to load. Check your network.");
        }

        const res = await axios.post("/api/user/wallet/add", {
          amount: addAmount,
          gateway: "razorpay",
        });

        if (res.data.success && res.data.orderId) {
          const options = {
            key: res.data.keyId,
            amount: res.data.amount,
            currency: "INR",
            name: "SnapCart Wallet",
            description: `Deposit ₹${addAmount} to Wallet`,
            order_id: res.data.orderId,
            handler: async function (response: any) {
              verifyDirectDeposit(
                response.razorpay_payment_id,
                response.razorpay_order_id,
                response.razorpay_signature
              );
            },
            prefill: {
              email: session?.user?.email || "",
              name: session?.user?.name || "",
            },
            theme: {
              color: "#10B981",
            },
            modal: {
              ondismiss: function () {
                setAddMoneyStep("idle");
                setAddingMoney(false);
                toast.error("Payment modal cancelled.");
              },
            },
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        } else {
          throw new Error("Could not initiate Razorpay order.");
        }
      }
    } catch (err: any) {
      setAddMoneyStep("idle");
      toast.error(err.response?.data?.message || err.message || "Failed to initiate payment");
      setAddingMoney(false);
    }
  };

  const verifyDirectDeposit = async (
    paymentId: string,
    orderId: string,
    signature: string
  ) => {
    try {
      setAddMoneyStep("processing");
      const res = await axios.post("/api/user/wallet/verify-razorpay", {
        razorpayPaymentId: paymentId,
        razorpayOrderId: orderId,
        razorpaySignature: signature,
        amount: addAmount,
      });

      if (res.data.success) {
        setAddMoneyStep("idle");
        toast.success(`₹${addAmount} successfully added to your wallet!`);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
        fetchWalletAndRewards();
      }
    } catch (err: any) {
      setAddMoneyStep("idle");
      toast.error(err.response?.data?.message || "Failed to verify direct deposit");
    } finally {
      setAddingMoney(false);
    }
  };

  const verifyStripeDeposit = async (sessionId: string) => {
    try {
      setAddMoneyStep("processing");
      const res = await axios.post("/api/user/wallet/verify-stripe", {
        sessionId,
      });

      if (res.data.success) {
        setAddMoneyStep("idle");
        toast.success("Payment verified! Wallet balance updated.");
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
        window.history.replaceState({}, "", "/user/account/wallet");
        fetchWalletAndRewards();
      }
    } catch (err: any) {
      setAddMoneyStep("idle");
      toast.error(err.response?.data?.message || "Failed to verify Stripe deposit");
      window.history.replaceState({}, "", "/user/account/wallet");
    }
  };

  const handleInstantRedeem = async (card?: any) => {
    const target = card || purchasedVoucher;
    if (!target) return;
    try {
      setRedeeming(true);
      const res = await axios.post("/api/user/gift-cards/redeem", {
        code: target.code,
        pin: target.pin,
      });

      if (res.data.success) {
        toast.success(`Redeemed! ₹${target.amount} added to your wallet.`);
        setBalance(res.data.balance);
        if (!card) {
          setPurchasedVoucher(null);
          setPaymentStep("idle");
          setIsBuyOpen(false);
        }
        fetchWalletAndRewards();
        fetchPurchasedCards();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to redeem voucher");
    } finally {
      setRedeeming(false);
    }
  };

  const handleCardCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); // Keep only digits
    if (value.length > 16) {
      value = value.substring(0, 16);
    }
    // Format as XXXX XXXX XXXX XXXX
    const formatted = value.match(/.{1,4}/g)?.join(" ") || value;
    setCardCode(formatted);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); // Keep only digits
    if (value.length <= 6) {
      setPin(value);
    }
  };

  const handleRedeemGiftCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawCode = cardCode.replace(/\s/g, "");
    if (rawCode.length !== 16) {
      toast.error("Please enter a valid 16-digit card code");
      return;
    }
    if (pin.length !== 6) {
      toast.error("Please enter a 6-digit PIN");
      return;
    }

    try {
      setRedeeming(true);
      const res = await axios.post("/api/user/gift-cards/redeem", {
        code: rawCode,
        pin,
      });

      if (res.data.success) {
        toast.success(res.data.message || "Gift card redeemed successfully!");
        setBalance(res.data.balance);
        setCardCode("");
        setPin("");
        setIsRedeemOpen(false);
        // Trigger confetti
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
        
        // Refresh wallet and transaction history
        fetchWalletAndRewards();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to redeem gift card");
    } finally {
      setRedeeming(false);
    }
  };

  useEffect(() => {
    fetchWalletAndRewards();
    fetchPurchasedCards();

    // Check Stripe checkout redirect query params
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment_status");
    const depositStatus = params.get("deposit_status");
    const sessionId = params.get("session_id");

    if (paymentStatus === "success" && sessionId) {
      verifyPurchasedVoucher(sessionId);
    } else if (paymentStatus === "cancelled") {
      toast.error("Voucher purchase payment cancelled.");
      window.history.replaceState({}, "", "/user/account/wallet");
    } else if (depositStatus === "success" && sessionId) {
      verifyStripeDeposit(sessionId);
    } else if (depositStatus === "cancelled") {
      toast.error("Wallet deposit payment cancelled.");
      window.history.replaceState({}, "", "/user/account/wallet");
    }
  }, []);

  const fetchWalletAndRewards = async () => {
    try {
      setLoading(true);
      const [walletRes, rewardsRes] = await Promise.all([
        axios.get("/api/user/wallet"),
        axios.get("/api/user/rewards"),
      ]);

      if (walletRes.data.success) {
        setBalance(walletRes.data.balance);
        setTransactions(walletRes.data.transactions || []);
      }
      if (rewardsRes.data.success) {
        setCoins(rewardsRes.data.coins);
        setScratchCards(rewardsRes.data.scratchCards || []);
      }
    } catch (error) {
      console.error("Error loading wallet details:", error);
      toast.error("Failed to load wallet and rewards");
    } finally {
      setLoading(false);
    }
  };

  const handleScratch = async (cardId: string) => {
    if (scratchingCardId) return; // Prevent double-clicks
    setScratchingCardId(cardId);
    setRevealedReward(null);

    try {
      const res = await axios.post("/api/user/rewards", { scratchCardId: cardId });
      if (res.data.success) {
        const { rewardType, cashbackEarned, voucherTitle, voucherCode } = res.data;
        
        setRevealedReward({
          rewardType,
          cashbackEarned,
          voucherTitle,
          voucherCode,
        });
        
        // Update balance
        setBalance(res.data.balance);
        
        // Confetti feedback & toasts
        if (rewardType === "cashback") {
          toast.success(`Congratulations! You won ₹${cashbackEarned} Cashback!`);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);
        } else if (rewardType === "voucher") {
          toast.success(`Awesome! You won a ${voucherTitle}!`);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 5000);
        } else {
          toast.info("Better luck next time!");
        }
        
        setTimeout(() => {
          // Mark as scratched in local state
          setScratchCards((prev) =>
            prev.map((c) =>
              c._id === cardId
                ? {
                    ...c,
                    status: "scratched" as const,
                    rewardType,
                    value: cashbackEarned,
                    voucherTitle,
                    voucherCode,
                  }
                : c
            )
          );
          setScratchingCardId(null);
          setRevealedReward(null);
          // Refetch transaction logs
          fetchWalletAndRewards();
        }, 4000);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to scratch card");
      setScratchingCardId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Loading wallet & rewards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-4 pb-12">
      <AnimatePresence>
        {showConfetti && <ConfettiEffect />}
      </AnimatePresence>
      {/* Back button */}
      <Link
        href="/user/account"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-6 transition"
      >
        <ArrowLeft size={14} />
        Back to account
      </Link>

      {/* Sliding Tabs Switcher */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-md mb-6 relative border border-slate-200/50">
        <button
          onClick={() => setActiveTab("wallet")}
          className={`flex-1 py-2 text-xs font-bold text-center rounded-xl relative z-10 transition-colors cursor-pointer ${
            activeTab === "wallet" ? "text-green-700 font-extrabold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          My Wallet
          {activeTab === "wallet" && (
            <motion.div
              layoutId="activeTabIndicator"
              className="absolute inset-0 bg-white shadow-sm rounded-xl -z-10 border border-slate-100"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("gift_cards")}
          className={`flex-1 py-2 text-xs font-bold text-center rounded-xl relative z-10 transition-colors cursor-pointer ${
            activeTab === "gift_cards" ? "text-green-700 font-extrabold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Gift Cards
          {activeTab === "gift_cards" && (
            <motion.div
              layoutId="activeTabIndicator"
              className="absolute inset-0 bg-white shadow-sm rounded-xl -z-10 border border-slate-100"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab("rewards")}
          className={`flex-1 py-2 text-xs font-bold text-center rounded-xl relative z-10 transition-colors cursor-pointer ${
            activeTab === "rewards" ? "text-green-700 font-extrabold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Loyalty & Rewards
          {activeTab === "rewards" && (
            <motion.div
              layoutId="activeTabIndicator"
              className="absolute inset-0 bg-white shadow-sm rounded-xl -z-10 border border-slate-100"
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
        </button>
      </div>

      {activeTab === "wallet" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            {/* Main Wallet Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 to-emerald-700 text-white p-6 shadow-xl shadow-green-600/10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-8 translate-x-8" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-500/20 rounded-full blur-xl translate-y-8 -translate-x-8" />

              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-green-100">
                    SnapCart Wallet
                  </span>
                  <h2 className="text-4xl font-black mt-2">₹{balance.toFixed(2)}</h2>
                  <p className="text-[11px] text-green-50 mt-1">100% safe checkout balance</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-white/10 flex justify-between text-xs text-green-100 font-medium">
                <span>Used directly at checkout page</span>
                <span className="flex items-center gap-1">
                  Instant refunds & rewards <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Direct Add Money Card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm mb-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Add Money to Wallet</h3>
                  <p className="text-[10px] text-slate-400">Instantly fund your wallet balance</p>
                </div>
              </div>

              {addMoneyStep === "processing" ? (
                <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
                  <Loader2 className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Contacting Payment Gateway...</h4>
                    <p className="text-[9px] text-slate-400 mt-0.5">Please do not refresh or press back</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddMoney} className="space-y-4">
                  {/* Preset Buttons */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Select Amount
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[100, 500, 1000, 2000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAddAmount(val)}
                          className={`py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            addAmount === val
                              ? "bg-green-600 text-white border-green-600 shadow-sm"
                              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          +₹{val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Input */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Enter Custom Amount (₹)
                      </label>
                      <span className="text-[8px] font-bold text-green-600">
                        Min: ₹{addGateway === "stripe" ? 50 : 1}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={addGateway === "stripe" ? 50 : 1}
                        value={addAmount}
                        onChange={(e) => setAddAmount(Number(e.target.value))}
                        className="w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 outline-none focus:border-green-500 focus:bg-white transition-all"
                        required
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-xs">
                        ₹
                      </div>
                    </div>
                    {addAmount > 10000 && (userData as any)?.kyc?.status !== "approved" && (
                      <div className="mt-1.5 p-2 bg-red-50 border border-red-200 rounded-lg text-[9px] text-red-600 font-semibold flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        <span>Deposits above ₹10,000 require instant KYC via DigiLocker.</span>
                      </div>
                    )}
                  </div>

                  {/* Gateway selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Select Payment Gateway
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAddGateway("stripe")}
                        className={`p-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                          addGateway === "stripe"
                            ? "border-green-500 bg-green-50/20 text-green-700"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span className="text-[10px] uppercase font-black">Stripe Checkout</span>
                        <span className="text-[8px] text-slate-400">Cards & global payments</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddGateway("razorpay")}
                        className={`p-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                          addGateway === "razorpay"
                            ? "border-green-500 bg-green-50/20 text-green-700"
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span className="text-[10px] uppercase font-black">Razorpay Gateway</span>
                        <span className="text-[8px] text-slate-400">UPI, Netbanking & Cards</span>
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={addingMoney}
                    className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Coins className="w-4 h-4" />
                    Pay ₹{addAmount} & Add to Wallet
                  </button>

                  {/* Help note for Razorpay test mode */}
                  {addGateway === "razorpay" && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[9px] text-slate-500 leading-relaxed font-semibold">
                      <p className="text-slate-700 font-bold mb-0.5">💡 Testing UPI in Razorpay Test Mode:</p>
                      In the Razorpay popup, select "UPI", enter test ID <span className="font-mono bg-slate-200 px-1 py-0.2 rounded text-slate-800 font-black">success@razorpay</span>, and click Pay. Ensure UPI is enabled in your Razorpay Dashboard (Settings → Payment Methods) if not visible.
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Transaction Logs */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" /> Transaction History
              </h3>

              {transactions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No wallet transactions recorded yet
                </div>
              ) : (
                <div className="space-y-4 max-h-[380px] overflow-y-auto premium-scroll pr-1">
                  {transactions.map((tx) => {
                    const isExpanded = expandedTxId === tx._id;
                    
                    return (
                      <div
                        key={tx._id}
                        className="border-b border-slate-50 last:border-b-0 py-2.5 transition-colors duration-150 hover:bg-slate-50/50 rounded-xl px-2 -mx-2"
                      >
                        <div
                          onClick={() => setExpandedTxId(isExpanded ? null : tx._id)}
                          className="flex justify-between items-center cursor-pointer animate-none"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                tx.type === "credit"
                                  ? "bg-green-50 text-green-600"
                                  : "bg-rose-50 text-rose-600"
                              }`}
                            >
                              {tx.type === "credit" ? (
                                <ArrowDownLeft className="w-5 h-5" />
                              ) : (
                                <ArrowUpRight className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 line-clamp-1">{tx.description}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <div>
                              <span
                                className={`text-sm font-extrabold block ${
                                  tx.type === "credit" ? "text-green-600" : "text-slate-800"
                                }`}
                              >
                                {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toFixed(2)}
                              </span>
                              <span className="block text-[8px] text-slate-400 uppercase tracking-wide font-bold">
                                {tx.status}
                              </span>
                            </div>
                            <ChevronDown
                              className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </div>
 
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden mt-3 space-y-2"
                            >
                              <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 font-mono text-[10px] text-slate-500 space-y-2">
                                <div className="flex justify-between">
                                  <span>Transaction ID:</span>
                                  <span className="font-extrabold text-slate-700 select-all">{tx._id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Date & Time:</span>
                                  <span className="font-extrabold text-slate-700">
                                    {new Date(tx.createdAt).toLocaleString("en-IN", {
                                      day: "numeric",
                                      month: "long",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                      hour12: true,
                                    })}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Type / Action:</span>
                                  <span className={`font-extrabold uppercase ${tx.type === "credit" ? "text-green-600" : "text-rose-600"}`}>
                                    {tx.type}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Amount:</span>
                                  <span className="font-extrabold text-slate-700">₹{tx.amount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Status:</span>
                                  <span className={`font-extrabold uppercase ${tx.status === "completed" ? "text-green-600" : "text-slate-600"}`}>
                                    {tx.status}
                                  </span>
                                </div>
                                <div className="border-t border-slate-200/50 pt-2 text-[10px] text-slate-600 leading-normal">
                                  <span className="font-bold text-slate-400">Description:</span>{" "}
                                  <span className="text-slate-600 font-medium">{tx.description}</span>
                                </div>
                              </div>

                              {tx.giftCardCode && (
                                <div className="p-3 bg-green-50/40 border border-green-100 rounded-xl space-y-2">
                                  <p className="text-[9px] font-bold text-green-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <Gift className="w-3.5 h-3.5 text-green-600" /> Redeemed Gift Card Details
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-green-100/50 flex justify-between items-center shadow-xs">
                                      <span className="text-slate-400 font-semibold">Code:</span>
                                      <div className="flex items-center gap-1">
                                        <span className="font-bold text-slate-700 tracking-wider font-mono">
                                          {tx.giftCardCode.match(/.{1,4}/g)?.join(" ") || tx.giftCardCode}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(tx.giftCardCode || "");
                                            toast.success("Code copied!");
                                          }}
                                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="bg-white px-2.5 py-1.5 rounded-lg border border-green-100/50 flex justify-between items-center shadow-xs">
                                      <span className="text-slate-400 font-semibold">PIN:</span>
                                      <div className="flex items-center gap-1">
                                        <span className="font-bold text-slate-700 tracking-widest font-mono">{tx.giftCardPin}</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(tx.giftCardPin || "");
                                            toast.success("PIN copied!");
                                          }}
                                          className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
                                        >
                                          <Copy className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "gift_cards" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Redeem & Buy */}
          <div className="md:col-span-2 space-y-6">
            {/* Gift Card Redemption Box */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <button
                onClick={() => setIsRedeemOpen(!isRedeemOpen)}
                className="w-full flex items-center justify-between text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">Have a Gift Card?</h3>
                    <p className="text-[10px] text-slate-400">Claim to instantly add funds to your wallet</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: isRedeemOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isRedeemOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <form onSubmit={handleRedeemGiftCard} className="space-y-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          16-Digit Gift Card Code
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={cardCode}
                            onChange={handleCardCodeChange}
                            placeholder="0000 0000 0000 0000"
                            className="w-full text-sm font-semibold tracking-wider placeholder:tracking-normal bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-500 focus:bg-white transition-all uppercase"
                            disabled={redeeming}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          6-Digit PIN
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            value={pin}
                            onChange={handlePinChange}
                            placeholder="••••••"
                            maxLength={6}
                            className="w-full text-sm font-semibold tracking-widest placeholder:tracking-normal bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-green-500 focus:bg-white transition-all"
                            disabled={redeeming}
                          />
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                            <Lock className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={redeeming || cardCode.replace(/\s/g, "").length !== 16 || pin.length !== 6}
                        className="w-full py-2.5 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {redeeming ? (
                          <>
                            <Loader2 className="w-4 h-4 border-white" />
                            Verifying Card...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Redeem Into Wallet
                          </>
                        )}
                      </button>
                    </form>

                    {/* FAQs Section */}
                    <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4 text-slate-400" />
                        Frequently Asked Questions
                      </h4>
                      <div className="space-y-2.5 max-h-[200px] overflow-y-auto premium-scroll pr-1">
                        {faqs.map((faq, index) => (
                          <FAQItem key={index} q={faq.q} a={faq.a} />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Buy Gift Card Box */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <button
                onClick={() => {
                  setIsBuyOpen(!isBuyOpen);
                  setPaymentStep("idle");
                  setPurchasedVoucher(null);
                }}
                className="w-full flex items-center justify-between text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-extrabold text-slate-800">Buy a Gift Voucher</h3>
                      <span className="px-1.5 py-0.5 text-[8px] font-bold bg-amber-500 text-white rounded uppercase tracking-wide">
                        New
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">Instant generation & email sharing</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: isBuyOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isBuyOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    {paymentStep === "idle" && (
                      <form onSubmit={handleBuyGiftCard} className="space-y-4 pt-2">
                        {/* Predefined Amounts */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Select Amount
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {[100, 250, 500, 1000].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setBuyAmount(val)}
                                className={`py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                  buyAmount === val
                                    ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                ₹{val}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Amount */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Custom Amount (₹)
                            </label>
                            <span className="text-[8px] font-bold text-amber-600">
                              Min: ₹{gateway === "stripe" ? 50 : 1}
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              min={gateway === "stripe" ? 50 : 1}
                              value={buyAmount}
                              onChange={(e) => setBuyAmount(Number(e.target.value))}
                              className="w-full text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 outline-none focus:border-amber-500 focus:bg-white transition-all"
                              required
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-extrabold text-xs">
                              ₹
                            </div>
                          </div>
                          {buyAmount > 10000 && (userData as any)?.kyc?.status !== "approved" && (
                            <div className="mt-1.5 p-2 bg-red-50 border border-red-200 rounded-lg text-[9px] text-red-600 font-semibold flex items-center gap-1">
                              <Shield className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                              <span>Amounts above ₹10,000 require instant KYC via DigiLocker.</span>
                            </div>
                          )}
                        </div>

                        {/* Select Payment Mode */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Select Payment Gateway
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setGateway("stripe")}
                              className={`p-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                                gateway === "stripe"
                                  ? "border-amber-500 bg-amber-50/20 text-amber-700"
                                  : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600"
                              }`}
                            >
                              <span className="text-[10px] uppercase font-black">Stripe Checkout</span>
                              <span className="text-[8px] text-slate-400">Cards & global payments</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setGateway("razorpay")}
                              className={`p-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                                gateway === "razorpay"
                                  ? "border-amber-500 bg-amber-50/20 text-amber-700"
                                  : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600"
                              }`}
                            >
                              <span className="text-[10px] uppercase font-black">Razorpay Gateway</span>
                              <span className="text-[8px] text-slate-400">UPI, Netbanking & Cards</span>
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                        >
                          <Wallet className="w-4 h-4" />
                          Pay ₹{buyAmount} & Generate Voucher
                        </button>
                      </form>
                    )}

                    {paymentStep === "processing" && (
                      <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Contacting Payment Gateway...</h4>
                          <p className="text-[9px] text-slate-400 mt-0.5">Please do not refresh or press back</p>
                        </div>
                      </div>
                    )}

                    {paymentStep === "success" && purchasedVoucher && (
                      <div className="space-y-4 pt-2">
                        {/* Premium Voucher Display */}
                        <div className="relative border-2 border-dashed border-green-300 bg-green-50/25 p-5 rounded-2xl overflow-hidden shadow-inner flex flex-col items-center text-center">
                          <div className="absolute top-1/2 left-0 w-4 h-4 bg-white border-r border-green-200 rounded-full -translate-y-1/2 -translate-x-2.5" />
                          <div className="absolute top-1/2 right-0 w-4 h-4 bg-white border-l border-green-200 rounded-full -translate-y-1/2 translate-x-2.5" />

                          <span className="text-[9px] font-black text-green-700 uppercase tracking-widest bg-green-100 px-2.5 py-0.5 rounded-full">
                            Voucher Generated Successfully
                          </span>
                          
                          <div className="my-3">
                            <span className="text-xs text-slate-400 font-bold block uppercase tracking-wider">Value</span>
                            <span className="text-3xl font-black text-green-600">₹{purchasedVoucher.amount}</span>
                          </div>

                          <div className="w-full space-y-2.5 bg-white p-3 rounded-xl border border-green-100 shadow-sm font-mono text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">Code</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-800 tracking-wider">
                                  {purchasedVoucher.code.match(/.{1,4}/g)?.join(" ") || purchasedVoucher.code}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(purchasedVoucher.code);
                                    toast.success("Code copied!");
                                  }}
                                  className="p-1 hover:bg-slate-50 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                              <span className="text-[9px] text-slate-400 font-bold uppercase">6-Digit PIN</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-800 tracking-widest">
                                  {purchasedVoucher.pin}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(purchasedVoucher.pin);
                                    toast.success("PIN copied!");
                                  }}
                                  className="p-1 hover:bg-slate-50 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>

                          <p className="text-[9px] text-slate-400 mt-2">
                            Expires: {new Date(purchasedVoucher.expiresAt).toLocaleDateString("en-IN")}
                          </p>
                        </div>

                        {/* Redeem instantly option */}
                        <button
                          onClick={() => handleInstantRedeem()}
                          disabled={redeeming}
                          className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                        >
                          {redeeming ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Redeem Instantly Into My Wallet
                        </button>

                        <button
                          onClick={() => {
                            setPaymentStep("idle");
                            setPurchasedVoucher(null);
                          }}
                          className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-bold text-center block hover:underline transition cursor-pointer"
                        >
                          Buy Another Voucher
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* My Purchased Vouchers Box */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <button
                onClick={() => setIsPurchasedListOpen(!isPurchasedListOpen)}
                className="w-full flex items-center justify-between text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">My Purchased Vouchers</h3>
                    <p className="text-[10px] text-slate-400">
                      {purchasedCards.length} {purchasedCards.length === 1 ? "voucher" : "vouchers"} purchased
                    </p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: isPurchasedListOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isPurchasedListOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    {loadingCards ? (
                      <div className="py-6 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : purchasedCards.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-4">
                        <Gift className="w-7 h-7 text-slate-300 mb-1.5" />
                        <p className="font-bold">No vouchers purchased yet</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">Vouchers you buy will appear here to copy & share!</p>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2 max-h-[300px] overflow-y-auto premium-scroll pr-1">
                        {purchasedCards.map((card) => {
                          const isRedeemed = card.status === "redeemed";
                          const isExpired = card.status === "expired" || new Date() > new Date(card.expiresAt);
                          
                          let statusColor = "bg-green-100 text-green-700";
                          let statusText = "Active";
                          if (isRedeemed) {
                            statusColor = "bg-slate-100 text-slate-500";
                            statusText = "Redeemed";
                          } else if (isExpired) {
                            statusColor = "bg-rose-100 text-rose-700";
                            statusText = "Expired";
                          }

                          return (
                            <div
                              key={card._id}
                              className={`p-3 rounded-2xl border transition-all ${
                                isRedeemed ? "bg-slate-50/50 border-slate-100" : "bg-white border-slate-200 shadow-sm"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase">
                                    {new Date(card.createdAt).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric"
                                    })}
                                  </span>
                                  <span className="text-sm font-black text-slate-800">₹{card.amount}</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${statusColor}`}>
                                  {statusText}
                                </span>
                              </div>

                              <div className="space-y-1.5 bg-slate-50 p-2 rounded-xl border border-slate-100 font-mono text-[11px] mb-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">Code</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`font-extrabold tracking-wider ${isRedeemed ? "line-through text-slate-400" : "text-slate-700"}`}>
                                      {card.code.match(/.{1,4}/g)?.join(" ") || card.code}
                                    </span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(card.code);
                                        toast.success("Code copied!");
                                      }}
                                      className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center border-t border-slate-100 pt-1.5">
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">PIN</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`font-extrabold tracking-widest ${isRedeemed ? "line-through text-slate-400" : "text-slate-700"}`}>
                                      {card.pin}
                                    </span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(card.pin);
                                        toast.success("PIN copied!");
                                      }}
                                      className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {isRedeemed ? (
                                <div className="text-[9px] text-slate-400 font-medium italic">
                                  Redeemed by: {card.redeemedBy?.name || "Other User"} on {new Date(card.redeemedAt).toLocaleDateString("en-IN")}
                                </div>
                              ) : isExpired ? (
                                <div className="text-[9px] text-rose-400 font-medium">
                                  Expired on {new Date(card.expiresAt).toLocaleDateString("en-IN")}
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[9px] text-slate-400 font-medium">
                                    Expires: {new Date(card.expiresAt).toLocaleDateString("en-IN")}
                                  </span>
                                  <button
                                    onClick={() => handleInstantRedeem(card)}
                                    disabled={redeeming}
                                    className="py-1 px-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-[9px] flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                                  >
                                    {redeeming ? (
                                      <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <Check className="w-2.5 h-2.5" />
                                    )}
                                    Redeem Now
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {activeTab === "rewards" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: SnapCoins Balance */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-inner">
                  <Coins className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">SnapCoins Balance</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Earned from placing orders</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-amber-500">{coins}</span>
                <span className="text-xs text-slate-400 block font-bold">Coins</span>
              </div>
            </div>

            {/* Help guidelines for rewards */}
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 text-xs text-slate-500 space-y-3">
              <h4 className="font-extrabold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" /> How SnapCoins Rewards Work
              </h4>
              <ul className="list-disc pl-4 space-y-2 leading-relaxed text-slate-600">
                <li>Every ₹100 spent on successful delivery orders grants you <strong>1 SnapCoin</strong> automatically.</li>
                <li>SnapCoins can be accumulated and are tracked as your loyalty balance on the account.</li>
                <li>Along with SnapCoins, placing orders unlocks interactive scratchcards which yield randomized cashbacks credited instantly into your checkout wallet.</li>
              </ul>
            </div>
          </div>

          {/* Column 2: Scratchcards list */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Gift className="w-5 h-5 text-green-600" />
                  <h3 className="text-base font-bold text-slate-800">My Scratchcards</h3>
                </div>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Scratch cards to win cashbacks credited directly into your checkout wallet.
                </p>

                <div className="space-y-4">
                  {scratchCards.length === 0 ? (
                    <div className="text-center py-10 text-slate-300 text-xs border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-4">
                      <Ticket className="w-8 h-8 text-slate-200 mb-2" />
                      <p className="font-bold text-slate-400">No Scratchcards available</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Place orders to earn scratchcards!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto premium-scroll pr-1">
                      {scratchCards.map((card) => {
                        const isUnscratched = card.status === "unscratched";
                        const isScratching = scratchingCardId === card._id;

                        return (
                          <div
                            key={card._id}
                            className={`relative rounded-2xl p-4 border transition-all duration-200 overflow-hidden flex items-center justify-between ${
                              isUnscratched
                                ? "bg-gradient-to-br from-slate-100 to-slate-200 border-slate-200 shadow-sm cursor-pointer hover:border-green-400"
                                : "bg-green-50/20 border-green-100/50"
                            }`}
                            onClick={() => isUnscratched && handleScratch(card._id)}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                  isUnscratched
                                    ? "bg-slate-300/50 text-slate-600"
                                    : "bg-green-100 text-green-600"
                                }`}
                              >
                                <Gift className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800">
                                  {isUnscratched ? "Tap to Scratch!" : "Scratched ✅"}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  Order: #{card.earnedForOrder.slice(-6)}
                                </p>
                              </div>
                            </div>

                            {/* Scratching Overlays */}
                            <AnimatePresence>
                              {isScratching && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="absolute inset-0 bg-slate-800/95 flex flex-col items-center justify-center z-10 text-white p-3 text-center"
                                >
                                  {revealedReward === null ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <Loader2 className="w-5 h-5 animate-spin text-green-400" />
                                      <span className="text-[10px] font-bold">Scratching...</span>
                                    </div>
                                  ) : (
                                    <motion.div
                                      initial={{ scale: 0.8, rotate: -3 }}
                                      animate={{ scale: 1, rotate: 0 }}
                                      className="flex flex-col items-center space-y-1 w-full"
                                    >
                                      {revealedReward.rewardType === "cashback" && (
                                        <>
                                          <Sparkles className="w-5 h-5 text-yellow-400 animate-bounce" />
                                          <span className="text-sm font-black text-green-400">+₹{revealedReward.cashbackEarned}</span>
                                          <span className="text-[9px] text-slate-300">Added to Wallet</span>
                                        </>
                                      )}
                                      {revealedReward.rewardType === "voucher" && (
                                        <>
                                          <Gift className="w-5 h-5 text-amber-400 animate-pulse" />
                                          <span className="text-[10px] font-extrabold text-amber-300 line-clamp-1 w-full">{revealedReward.voucherTitle}</span>
                                          <div className="bg-slate-700/80 border border-slate-600 px-2 py-0.5 rounded text-[9px] font-mono select-all tracking-wider text-green-300 flex items-center gap-1 mt-1">
                                            {revealedReward.voucherCode}
                                          </div>
                                          <span className="text-[8px] text-slate-300">Click to copy code!</span>
                                        </>
                                      )}
                                      {revealedReward.rewardType === "better_luck" && (
                                        <>
                                          <span className="text-xl mb-0.5">🥺</span>
                                          <span className="text-[10px] font-extrabold text-slate-300">Better Luck Next Time!</span>
                                          <span className="text-[8px] text-slate-400">Keep ordering to try again</span>
                                        </>
                                      )}
                                    </motion.div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Value Display */}
                            {!isUnscratched && (
                              <div className="text-right flex-shrink-0 ml-3">
                                {(!card.rewardType || card.rewardType === "cashback") && (
                                  <>
                                    <span className="text-sm font-black text-green-600">
                                      +₹{card.value}
                                    </span>
                                    <span className="text-[8px] text-slate-400 block font-bold">
                                      CASHBACK
                                    </span>
                                  </>
                                )}
                                {card.rewardType === "voucher" && (
                                  <div className="flex flex-col items-end space-y-1">
                                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 max-w-[140px] truncate text-right">
                                      {card.voucherTitle}
                                    </span>
                                    <div className="flex items-center gap-1 font-mono text-[9px]">
                                      <span className="font-extrabold text-slate-700 select-all bg-slate-100 px-1 rounded">
                                        {card.voucherCode}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(card.voucherCode || "");
                                          toast.success("Code copied!");
                                        }}
                                        className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
                                      >
                                        <Copy className="w-2.5 h-2.5" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {card.rewardType === "better_luck" && (
                                  <>
                                    <span className="text-xs font-bold text-slate-400 italic">
                                      Better luck
                                    </span>
                                    <span className="text-[8px] text-slate-400 block font-bold">
                                      TRY AGAIN
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Banner Help Info */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex items-start gap-2 text-[10px] text-slate-400">
                <HelpCircle className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Every ₹100 shopping rewards 1 SnapCoin. Scratchcard payouts are randomized cashbacks that never expire.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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

// FAQs Data
const faqs = [
  {
    q: "How do I get a SnapCart Gift Card?",
    a: "SnapCart Gift Cards are issued through corporate campaigns, support refunds, or promotional event rewards. Currently, they are generated directly by authorized administrators."
  },
  {
    q: "Can I redeem multiple Gift Cards?",
    a: "Yes! There is no limit on how many gift cards you can redeem. The full amount of each card is immediately added to your wallet balance."
  },
  {
    q: "What is the validity of a Gift Card?",
    a: "SnapCart Gift Cards are typically valid for 1 year (365 days) from the date of generation, unless stated otherwise in the campaign."
  },
  {
    q: "Can I transfer wallet balance to my bank account?",
    a: "No, the balance credited from gift cards is promotional checkout balance and can only be used to purchase groceries on SnapCart. It is non-transferable and non-refundable."
  }
];

// Interactive FAQ Accordion Component
function FAQItem({ q, a }: { q: string; a: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className="w-full px-3 py-2 flex items-center justify-between text-left cursor-pointer"
      >
        <span className="text-[11px] font-extrabold text-slate-600 leading-snug">{q}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="px-3 pb-2.5 text-[10px] text-slate-500 leading-relaxed font-medium">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Confetti Particle Burst Effect Component
function ConfettiEffect() {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    const colors = [
      "#10B981", // Emerald
      "#34D399", // Emerald Light
      "#FBBF24", // Amber
      "#60A5FA", // Blue Light
      "#F472B6", // Pink Light
      "#A78BFA", // Purple Light
    ];
    const generated = Array.from({ length: 80 }).map((_, i) => {
      const xStart = Math.random() * 100;
      const xEnd = xStart + (Math.random() * 30 - 15);
      const delay = Math.random() * 1.5;
      const duration = Math.random() * 2.5 + 1.5;
      const size = Math.random() * 6 + 6;
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const rotation = 360 * (Math.random() * 4 - 2);
      return {
        id: i,
        xStart,
        xEnd,
        delay,
        duration,
        size,
        randomColor,
        rotation,
      };
    });
    setParticles(generated);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.randomColor,
            left: `${p.xStart}%`,
            top: "-5%",
          }}
          initial={{ y: -20, opacity: 1, scale: 0.5, rotate: 0 }}
          animate={{
            y: "105vh",
            x: `${p.xEnd}%`,
            opacity: [1, 1, 0],
            scale: [0.5, 1.2, 0.6],
            rotate: p.rotation,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

// Simple dynamic loader helper
function Loader2({ className }: { className?: string }) {
  return <div className={`w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin ${className}`} />;
}
