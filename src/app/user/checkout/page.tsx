// src/app/user/checkout/page.tsx
"use client";

import { extractCityStateFromLabel } from "@/lib/utils/extractCityStateFromLabel";
import { checkCodAvailability } from "@/lib/utils/codHelper";
import { RootState, AppDispatch } from "@/redux/store";
import { fetchCartApi } from "@/hooks/cart.api";
import { setCart, clearCart } from "@/redux/features/cartSlice";
import axios from "axios";
import {
  ArrowLeft,
  Building,
  CreditCard,
  Flag,
  Hash,
  Home,
  Loader2,
  MapPin,
  Phone,
  Truck,
  User,
  Wallet,
  Shield,
  Check,
  BookmarkPlus,
  ChevronRight,
  Briefcase,
  AlertCircle,
  Info,
  Send,
  Sparkles,
  Plus,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import dynamic from "next/dynamic";
import AddressPickerModal from "@/components/location/AddressPickerModal";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import DigiLockerKycModal from "@/components/verification/DigiLockerKycModal";
import { setUserData } from "@/redux/features/userSlice";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });
import { loadStripe } from "@stripe/stripe-js";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const Checkout = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { userData } = useSelector((state: RootState) => state.user);
  const selectedStore = useSelector((state: RootState) => state.location.selectedStore);
  const reduxLocation = useSelector((state: RootState) => state.location);
  const {
    cartItems,
    subTotal,
    totalMRP,
    savings,
    deliveryFee,
    finalTotal,
    couponDiscount,
    isGuest,
  } = useSelector((state: RootState) => state.cart);

  const [address, setAddress] = useState<any>({
    fullName: "",
    mobile: "",
    alternateMobile: "",
    city: "",
    state: "",
    pincode: "",
    fullAddress: "",
    street: "",
    landmark: "",
    type: "home",
    customLabel: "",
  });

  const [position, setPosition] = useState<[number, number] | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [onlinePaymentType, setOnlinePaymentType] = useState<
    "stripe" | "razorpay" | null
  >(null);
  const { status } = useSession();
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addressValidated, setAddressValidated] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWallet, setUseWallet] = useState<boolean>(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);

  // Advanced Map-Pin Address triggers
  const [isAddressDrawerOpen, setIsAddressDrawerOpen] = useState(false);
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [codSettings, setCodSettings] = useState<{
    isEnabled: boolean;
    flatCharge: number;
    minOrderValue: number;
    maxOrderValue: number;
  } | null>(null);
  const [codInfo, setCodInfo] = useState<any>({
    isCodAvailable: true,
    totalCodCharge: 0,
    blockedProducts: [],
    recommendation: "",
  });

  const baseTotalToPay = pricing ? pricing.baseFinalTotal : (finalTotal + (paymentMethod === "cod" ? codInfo?.totalCodCharge || 0 : 0));
  const walletDeduction = pricing ? pricing.walletDeduction : (useWallet ? Math.min(walletBalance, baseTotalToPay) : 0);
  const remainingTotalToPay = pricing ? pricing.finalTotal : (baseTotalToPay - walletDeduction);

  /* ================= Serviceability & Notify States ================= */
  const [checkoutServiceableStatus, setCheckoutServiceableStatus] = useState<
    "checking" | "serviceable" | "limited" | "not_serviceable" | "unknown"
  >("unknown");
  const [nearestStoreInfo, setNearestStoreInfo] = useState<any | null>(null);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [isNotifying, setIsNotifying] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  /* ================= Real-time Serviceability & Pricing Calculation ================= */
  const fetchPricing = async () => {
    if (!position) return;
    try {
      const response = await axios.post("/api/checkout/calculate", {
        deliveryAddress: {
          ...address,
          location: { lat: position[0], lng: position[1] },
        },
        paymentMethod,
        useWallet,
      });
      if (response.data.success) {
        const p = response.data.pricing;
        setPricing(p);
        setCheckoutServiceableStatus(p.serviceableStatus);
        setNearestStoreInfo(p.nearestStore ? {
          _id: p.nearestStore.id,
          name: p.nearestStore.name,
          distanceKm: p.distanceKm,
          estimatedDeliveryMinutes: p.nearestStore.estimatedDeliveryMinutes
        } : null);

        setCodInfo({
          isCodAvailable: p.codEligible,
          totalCodCharge: p.codHandlingCharge,
          blockedProducts: p.items.filter((item: any) => item.codStatus === "not-allowed").map((item: any) => item.groceryName),
          recommendation: p.codDisabledReason || (p.codHandlingCharge > 0 ? `Pay online to save ₹${p.codHandlingCharge.toFixed(2)} COD fee!` : ""),
        });

        // Auto-fallback from COD to online payment if COD is unavailable
        if (!p.codEligible && paymentMethod === "cod") {
          setPaymentMethod("online");
          setOnlinePaymentType("razorpay"); // Default online
          toast.warning("Cash on Delivery is not available for this cart or address. Switched to online payment.");
        }
      }
    } catch (error) {
      console.error("Error fetching pricing breakdown:", error);
    }
  };

  useEffect(() => {
    setIsSubscribed(false); // Reset subscriber feedback on position change
    if (!position) return;
    
    const handler = setTimeout(() => {
      fetchPricing();
    }, 400);

    return () => clearTimeout(handler);
  }, [position, paymentMethod, useWallet, address.pincode, address.street, address.fullAddress, cartItems]);

  const handleNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyEmail || !notifyEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsNotifying(true);
    try {
      const res = await axios.post("/api/location/notify", {
        email: notifyEmail,
        pincode: address.pincode || "unknown",
        city: address.city || "your area",
        longitude: position ? position[1] : 0,
        latitude: position ? position[0] : 0,
      });

      if (res.data.success) {
        toast.success(res.data.message);
        setIsSubscribed(true);
        setNotifyEmail("");
      }
    } catch {
      toast.error("Failed to register alert. Please try again.");
    } finally {
      setIsNotifying(false);
    }
  };

  /* ================= REDIRECT IF NOT AUTHENTICATED ================= */
  useEffect(() => {
    if (status === "loading") return;
    // Require login to proceed to checkout - even guests must login
    if (status === "unauthenticated") {
      router.replace("/login?redirect=/user/checkout");
    }
  }, [status, router]);

  /* ================= Hydrate cart on page load ================= */
  useEffect(() => {
    const loadCart = async () => {
      try {
        const cart = await fetchCartApi();
        dispatch(
          setCart({
            items: cart.items,
            cartId: cart.cart?._id,
            isGuest: cart.isGuest ?? false,
          })
        );
      } catch (err) {
        console.error(err);
      } finally {
        setHydrated(true);
      }
    };

    if (!hydrated) loadCart();
  }, [dispatch, hydrated]);
  /* ================= Fetch saved addresses ================= */
  useEffect(() => {
    const fetchSavedAddresses = async () => {
      if (!userData || userData.currentRole !== "user") return;
      try {
        const response = await axios.get("/api/user/addresses");
        setSavedAddresses(response.data.addresses || []);
      } catch (error) {
        console.error("Error fetching saved addresses:", error);
      }
    };
    fetchSavedAddresses();
  }, [userData]);

  /* ================= Fetch wallet balance ================= */
  useEffect(() => {
    const fetchWallet = async () => {
      if (!userData || userData.currentRole !== "user") return;
      try {
        const response = await axios.get("/api/user/wallet");
        if (response.data.success) {
          setWalletBalance(response.data.balance || 0);
        }
      } catch (error) {
        console.error("Error fetching wallet balance:", error);
      }
    };
    fetchWallet();
  }, [userData]);

  /* ================= Set user name & mobile ================= */
  useEffect(() => {
    if (!userData) return;
    setAddress((prev: any) => ({
      ...prev,
      fullName: userData.name,
      mobile: userData.mobileNumber ?? "",
    }));
  }, [userData]);

  /* ================= Validate address fields ================= */
  useEffect(() => {
    const isAddressValid =
      address.fullName.trim() !== "" &&
      address.mobile.trim() !== "" &&
      /^[0-9]{10}$/.test(address.mobile) &&
      address.city.trim() !== "" &&
      address.state.trim() !== "" &&
      address.pincode.trim() !== "" &&
      /^[0-9]{6}$/.test(address.pincode) &&
      address.fullAddress.trim() !== "";

    setAddressValidated(isAddressValid);
  }, [address]);

  /* ================= Pre-fill location from Redux ================= */
  useEffect(() => {
    if (reduxLocation.latitude && reduxLocation.longitude) {
      setPosition([reduxLocation.latitude, reduxLocation.longitude]);
      setAddress((prev: any) => ({
        ...prev,
        city: reduxLocation.city || prev.city,
        state: reduxLocation.state || prev.state,
        pincode: reduxLocation.pincode || prev.pincode,
        fullAddress: reduxLocation.fullAddress || prev.fullAddress,
      }));
    }
  }, [reduxLocation]);

  /* ================= Handle Saved Address Selection ================= */
  const handleSelectSavedAddress = async (addressId: string) => {
    const savedAddr = savedAddresses.find((addr) => addr._id === addressId);
    if (!savedAddr) return;

    setSelectedSavedAddress(addressId);
    setAddress({
      fullName: savedAddr.fullName || userData?.name || "",
      mobile: savedAddr.mobile || userData?.mobileNumber || "",
      alternateMobile: savedAddr.alternateMobile || "",
      city: savedAddr.city,
      state: savedAddr.state,
      pincode: savedAddr.zipCode,
      fullAddress: savedAddr.fullAddress || savedAddr.street,
      street: savedAddr.street,
      landmark: savedAddr.label || "",
      type: savedAddr.type || "home",
      customLabel: savedAddr.customLabel || "",
    });

    if (savedAddr.latitude && savedAddr.longitude) {
      setPosition([savedAddr.latitude, savedAddr.longitude]);
      toast.success("Address selected");
    } else {
      // Fallback geocode
      const queryStr = `${savedAddr.street}, ${savedAddr.city}, ${savedAddr.state}, ${savedAddr.zipCode}`;
      try {
        const { OpenStreetMapProvider } = await import("leaflet-geosearch");
        const provider = new OpenStreetMapProvider();
        const results = await provider.search({ query: queryStr });
        if (results.length > 0) {
          setPosition([results[0].y, results[0].x]);
          toast.success("Address selected and mapped");
        } else {
          const fallbackQuery = `${savedAddr.city}, ${savedAddr.state}, ${savedAddr.zipCode}`;
          const fallbackResults = await provider.search({ query: fallbackQuery });
          if (fallbackResults.length > 0) {
            setPosition([fallbackResults[0].y, fallbackResults[0].x]);
            toast.success("Address selected and mapped (approximate)");
          } else {
            toast.warning("Could not find address on map. Please adjust pin manually.");
          }
        }
      } catch (err) {
        console.error("Geocoding fallback failed:", err);
        toast.warning("Address selected but map matching failed.");
      }
    }
  };

  /* ================= Handle Picker Confirm Callback ================= */
  const handleConfirmPickerAddress = (savedAddress: any) => {
    setSavedAddresses((prev) => {
      const exists = prev.some((a) => a._id === savedAddress._id);
      if (exists) {
        return prev.map((a) => (a._id === savedAddress._id ? savedAddress : a));
      } else {
        return [...prev, savedAddress];
      }
    });

    handleSelectSavedAddress(savedAddress._id);
    setIsPickerModalOpen(false);
    setIsAddressDrawerOpen(false);
  };

  /* ================= Create Order (COD or Fully Paid with Wallet) ================= */
  const createOrder = async () => {
    try {
      const isFullyPaid = remainingTotalToPay === 0;
      const payload = {
        paymentMethod: isFullyPaid ? "cod" : paymentMethod,
        onlinePaymentType:
          paymentMethod === "online" ? onlinePaymentType : undefined,
        deliveryAddress: {
          ...address,
          location: position ? { lat: position[0], lng: position[1] } : undefined,
        },
        storeId: nearestStoreInfo?._id || undefined,
        orderItems: cartItems.map((item) => ({
          variantId: item.variant._id,
          quantity: item.quantity,
          priceAtAdd: item.priceAtAdd,
        })),
        couponDiscount,
        useWallet,
      };

      const response = await axios.post("/api/order/create", payload);
      return response.data;
    } catch (error: any) {
      console.error("Create order error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to create order",
      };
    }
  };

  /* ================= Create Payment Session (Online only) ================= */
  const createPaymentSession = async () => {
    try {
      const payload = {
        deliveryAddress: {
          ...address,
          location: position ? { lat: position[0], lng: position[1] } : undefined,
        },
        onlinePaymentType,
        storeId: nearestStoreInfo?._id || undefined,
        useWallet,
      };

      const response = await axios.post("/api/payment/session/create", payload);
      return response.data;
    } catch (error: any) {
      console.error("Create payment session error:", error);
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to create payment session",
      };
    }
  };

  /* ================= Handle Payment ================= */
  const handlePayment = async () => {
    if (!addressValidated) {
      toast.error("Please fill all address fields correctly");
      return;
    }

    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (baseTotalToPay > 50000 && userData?.kyc?.status !== "approved") {
      toast.error("Checkout orders above ₹50,000 require KYC verification. Please complete your DigiLocker KYC.");
      setIsKycModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      if (paymentMethod === "cod" || remainingTotalToPay === 0) {
        const orderData = await createOrder();

        if (!orderData || !orderData.success || !orderData.orderId) {
          throw new Error(
            orderData?.message ||
              "Order ID not received from server or order creation failed"
          );
        }

        const orderId = orderData.orderId;
        dispatch(clearCart());
        toast.success("Order placed successfully!");
        router.push(`/user/orders/${orderId}`);
        return;
      }

      if (paymentMethod === "online") {
        const sessionData = await createPaymentSession();

        if (!sessionData || !sessionData.success || !sessionData.paymentSessionId) {
          throw new Error(
            sessionData?.message ||
              "Payment session ID not received from server"
          );
        }

        const paymentSessionId = sessionData.paymentSessionId;

        if (onlinePaymentType === "razorpay") {
          router.push(`/user/payment/razorpay/${paymentSessionId}`);
          return;
        }

        if (onlinePaymentType === "stripe") {
          router.push(`/user/payment/stripe/${paymentSessionId}`);
          return;
        }
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Failed to process payment");
      setLoading(false);
    }
  };

  /* ================= If cart is empty ================= */
  if (hydrated && cartItems.length === 0) {
    return (
      <div className="w-[90%] mx-auto mt-20 text-center">
        <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">
          Add some groceries to continue shopping
        </p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="inline-block bg-green-600 text-white px-6 py-3 rounded-full font-medium hover:bg-green-700 transition"
          onClick={() => router.push("/")}
        >
          Continue Shopping
        </motion.button>
      </div>
    );
  }

  return (
    <div className="w-[92%] md:w-[80%] mx-auto py-10 relative">
      <motion.button
        whileTap={{ scale: 0.97 }}
        className="absolute left-0 top-2 flex items-center gap-2 text-green-700 hover:text-green-800 font-semibold cursor-pointer"
        onClick={() => router.push("/user/cart")}
      >
        <ArrowLeft size={18} />
        <span>Back to cart</span>
      </motion.button>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-3xl md:text-4xl font-bold text-green-700 text-center mb-10"
      >
        Checkout
      </motion.h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* ================= Delivery Address ================= */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <MapPin size={22} className="text-green-600" /> Delivery Address
            </h2>
            {addressValidated && checkoutServiceableStatus === "serviceable" && (
              <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold flex items-center gap-1 border border-green-100">
                <Check size={12} />
                Serviceable
              </span>
            )}
          </div>

          <div className="space-y-4">
            {addressValidated ? (
              <div className="p-5 border border-slate-100 bg-slate-50/50 rounded-2xl relative overflow-hidden transition-all duration-200 text-left">
                {/* Type Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-xl bg-green-50 text-green-700 text-xs font-bold capitalize flex items-center gap-1.5 border border-green-100/50">
                    {address.type === "work" ? (
                      <Briefcase size={12} />
                    ) : address.type === "home" ? (
                      <Home size={12} />
                    ) : (
                      <MapPin size={12} />
                    )}
                    {address.type === "others" ? (address.customLabel || "Other") : (address.type || "Delivery Location")}
                  </span>
                  {address.landmark && (
                    <span className="text-xs text-slate-500 font-medium truncate max-w-[180px]">
                      📍 {address.landmark}
                    </span>
                  )}
                </div>

                {/* Recipient Details */}
                <h4 className="text-base font-bold text-slate-800 flex flex-wrap items-center gap-1.5">
                  {address.fullName}
                  <span className="text-xs font-semibold text-slate-400">• {address.mobile}</span>
                  {address.alternateMobile && (
                    <span className="text-xs font-medium text-slate-400">(Alt: {address.alternateMobile})</span>
                  )}
                </h4>

                {/* Address details */}
                <p className="text-sm font-bold text-slate-700 mt-2">
                  {address.street}
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {address.fullAddress}
                </p>

                {/* Change button */}
                <button
                  type="button"
                  onClick={() => setIsAddressDrawerOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-4.5 py-2 rounded-2xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition shadow-md shadow-green-600/10 cursor-pointer"
                >
                  Change Address
                </button>
              </div>
            ) : (
              <div className="p-6 border border-dashed border-slate-300 bg-slate-50/50 rounded-2xl text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
                  <MapPin size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No Address Selected</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-normal">
                  Pinpoint your location on the map to unlock hyper-fast 10-minute grocery delivery!
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddressDrawerOpen(true)}
                  className="mt-4 px-5 py-2.5 rounded-2xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition shadow-lg shadow-green-600/10 cursor-pointer"
                >
                  Select / Add Address
                </button>
              </div>
            )}

            {/* Real-time Serviceability Notification Form */}
            {checkoutServiceableStatus === "not_serviceable" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl border border-rose-200 bg-rose-50/50 shadow-inner text-center relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl -z-10 translate-x-6 -translate-y-6"></div>
                <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 mx-auto mb-3">
                  <MapPin className="w-6 h-6 animate-pulse" />
                </div>
                
                <h3 className="text-base font-bold text-rose-900">
                  Coming Soon to this Location!
                </h3>
                <p className="text-xs text-rose-700 mt-1 max-w-sm mx-auto">
                  We don't deliver here yet. Register your email to request launch and get notified as soon as we open a dark store near you!
                </p>

                {!isSubscribed ? (
                  <form
                    onSubmit={handleNotifySubmit}
                    className="mt-4 flex flex-col sm:flex-row gap-2 max-w-sm mx-auto"
                  >
                    <input
                      type="email"
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      placeholder="Enter email address"
                      required
                      className="flex-1 px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 transition"
                    />
                    <button
                      type="submit"
                      disabled={isNotifying}
                      className="flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer shadow-md shadow-rose-600/10 active:scale-95 transition"
                    >
                      {isNotifying ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Notify Me
                    </button>
                  </form>
                ) : (
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-xl text-xs font-semibold max-w-sm mx-auto flex items-center gap-1.5 justify-center"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                    <span>Registered for alerts! We'll keep you posted.</span>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ================= Payment & Order Summary ================= */}
        <div className="space-y-6">
          {/* Payment Method */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-green-600" />
              Payment Method
            </h2>

            {/* Wallet Option */}
            <div className="mb-6 p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                    <Wallet className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">SnapCart Wallet</h4>
                    <p className="text-xs text-slate-500 font-medium">Balance: ₹{walletBalance.toFixed(2)}</p>
                  </div>
                </div>
                {walletBalance > 0 ? (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useWallet}
                      onChange={(e) => setUseWallet(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                ) : (
                  <span className="text-[10px] bg-slate-100 text-slate-400 font-bold px-2 py-1 rounded">EMPTY</span>
                )}
              </div>
              {useWallet && walletBalance > 0 && (
                <div className="text-xs text-green-700 bg-green-50 border border-green-100 p-2.5 rounded-lg">
                  {walletBalance >= baseTotalToPay ? (
                    <p className="font-semibold flex items-center gap-1">
                      <Check className="w-4 h-4 text-green-600" /> Full payment ₹{baseTotalToPay.toFixed(2)} covered by Wallet!
                    </p>
                  ) : (
                    <p className="font-semibold">
                      ₹{walletBalance.toFixed(2)} will be paid via Wallet. Pay remaining ₹{(baseTotalToPay - walletBalance).toFixed(2)} below.
                    </p>
                  )}
                </div>
              )}
            </div>

            {remainingTotalToPay > 0 ? (
              <>
                {/* Online Payment Recommendation */}
                {codInfo?.totalCodCharge > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 flex gap-3"
                  >
                    <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-green-900 mb-1">
                        💡 Save Money with Online Payment
                      </p>
                      <p className="text-xs text-green-700">
                        Pay with Razorpay or Stripe to save <span className="font-semibold text-green-800">₹{codInfo.totalCodCharge.toFixed(2)}</span> in COD handling charges. Your payment is 100% secure and encrypted.
                      </p>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-3">
                  {/* Razorpay Option */}
                  <button
                    className={`flex items-center gap-4 w-full border rounded-lg p-4 transition-all ${
                      paymentMethod === "online" && onlinePaymentType === "razorpay"
                        ? "border-green-600 bg-green-50 shadow-sm"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setPaymentMethod("online");
                      setOnlinePaymentType("razorpay");
                    }}
                  >
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
                      <Shield className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-700">
                        Pay with Razorpay
                      </div>
                      <p className="text-sm text-gray-500">
                        Cards, UPI, Net Banking, Wallets
                      </p>
                    </div>
                    {paymentMethod === "online" &&
                      onlinePaymentType === "razorpay" && (
                        <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                  </button>

                  {/* Stripe Option */}
                  <button
                    className={`flex items-center gap-4 w-full border rounded-lg p-4 transition-all ${
                      paymentMethod === "online" && onlinePaymentType === "stripe"
                        ? "border-green-600 bg-green-50 shadow-sm"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setPaymentMethod("online");
                      setOnlinePaymentType("stripe");
                    }}
                  >
                    <div className="flex items-center justify-center w-10 h-10 bg-purple-50 rounded-lg">
                      <Wallet className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-700">
                        Pay with Stripe
                      </div>
                      <p className="text-sm text-gray-500">
                        International & Domestic Cards
                      </p>
                    </div>
                    {paymentMethod === "online" &&
                      onlinePaymentType === "stripe" && (
                        <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                  </button>

                  {/* COD Option */}
                  <button
                    disabled={codInfo && !codInfo.isCodAvailable}
                    className={`flex items-center gap-4 w-full border rounded-lg p-4 transition-all ${
                      paymentMethod === "cod"
                        ? "border-green-600 bg-green-50 shadow-sm"
                        : "hover:bg-gray-50"
                    } ${codInfo && !codInfo.isCodAvailable ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => {
                      if (codInfo?.isCodAvailable) {
                        setPaymentMethod("cod");
                        setOnlinePaymentType(null);
                      }
                    }}
                  >
                    <div className="flex items-center justify-center w-10 h-10 bg-orange-50 rounded-lg">
                      <Truck className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-700">
                        Cash on Delivery
                      </div>
                      <p className="text-sm text-gray-500">
                        {codInfo?.isCodAvailable
                          ? "Pay when you receive your order"
                          : "Not available for some items"}
                      </p>
                    </div>
                    {paymentMethod === "cod" && (
                      <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                </div>
              </>
            ) : (
              useWallet && walletBalance >= baseTotalToPay && (
                <div className="p-6 text-center border border-dashed border-green-200 bg-green-50/20 rounded-2xl">
                  <p className="text-sm font-extrabold text-green-800">Order is fully covered by your Wallet!</p>
                  <p className="text-xs text-slate-500 mt-1.5">No additional payment method is required. Click "Pay with Wallet & Place Order" below to complete.</p>
                </div>
              )
            )}

            {/* COD Warning/Info Section */}
            {codInfo && (
              <>
                {!codInfo.isCodAvailable && (
                  <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-red-900 text-sm mb-1">
                        COD Not Available
                      </div>
                      <p className="text-sm text-red-700 mb-2">
                        The following items in your cart don't accept Cash on Delivery:
                      </p>
                      <ul className="text-sm text-red-700 space-y-1">
                        {codInfo.blockedProducts.map((product: string) => (
                          <li key={product} className="flex items-center gap-2">
                            <span className="w-1 h-1 bg-red-600 rounded-full" />
                            {product}
                          </li>
                        ))}
                      </ul>
                      <p className="text-sm text-red-700 mt-2">
                        Please select an online payment method to proceed.
                      </p>
                    </div>
                  </div>
                )}

                {codInfo.isCodAvailable && codInfo.totalCodCharge > 0 && (
                  <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200 flex gap-3">
                    <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-amber-900 text-sm mb-2">
                        COD Handling Charge
                      </div>
                      <div className="border-t border-amber-200 pt-2 mb-3">
                        <div className="flex justify-between font-semibold text-amber-900 text-sm">
                          <span>Flat COD Fee</span>
                          <span>+₹{codInfo.totalCodCharge.toFixed(2)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-amber-700">
                        {codInfo.recommendation}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Payment Info Note */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
                <p className="text-sm text-blue-700">
                  All payments are securely processed. Your payment information
                  is encrypted and never stored.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 sticky top-24"
          >
            <h3 className="font-semibold text-lg mb-4 flex items-center justify-between">
              <span>Bill Details</span>
              {pricing && (
                <span className="text-xs text-gray-500 font-normal">
                  Distance: {pricing.distanceKm?.toFixed(1) || 0} km
                </span>
              )}
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total MRP</span>
                <span className="text-gray-800">₹{(pricing ? pricing.totalMRP : totalMRP).toFixed(2)}</span>
              </div>

              {(pricing ? pricing.savings : savings) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Product Discount</span>
                  <span className="font-medium">-₹{(pricing ? pricing.savings : savings).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between font-medium border-t border-dashed border-gray-100 pt-2 text-gray-800">
                <span>Subtotal</span>
                <span>₹{(pricing ? pricing.subTotal : subTotal).toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600 flex flex-col">
                  <span>Delivery Charge</span>
                  {pricing && pricing.deliveryFee > 0 && (
                    <span className="text-[10px] text-gray-400">
                      Base: ₹{pricing.deliveryBaseFee}
                      {pricing.deliveryDistanceFee > 0 && ` + Dist: ₹${pricing.deliveryDistanceFee}`}
                      {pricing.deliverySurgeFee > 0 && ` + Surge: ₹${pricing.deliverySurgeFee}`}
                    </span>
                  )}
                </span>
                <span className={(pricing ? pricing.deliveryFee : deliveryFee) === 0 ? "text-green-600 font-bold" : "text-gray-800"}>
                  {(pricing ? pricing.deliveryFee : deliveryFee) === 0 ? "FREE" : `+₹${(pricing ? pricing.deliveryFee : deliveryFee).toFixed(2)}`}
                </span>
              </div>

              {pricing && pricing.packagingFee > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Packaging & Handling Fee</span>
                  <span className="text-gray-800">+₹{pricing.packagingFee.toFixed(2)}</span>
                </div>
              )}

              {pricing && pricing.weightSurcharge > 0 && (
                <div className="flex justify-between text-amber-700 font-medium">
                  <span className="flex items-center gap-1">
                    Heavy Item Surcharge 📦
                  </span>
                  <span>+₹{pricing.weightSurcharge.toFixed(2)}</span>
                </div>
              )}


              {paymentMethod === "cod" && (pricing ? pricing.codHandlingCharge : (codInfo?.totalCodCharge || 0)) > 0 && (
                <div className="flex justify-between text-orange-600 font-medium">
                  <span>COD Handling Charge</span>
                  <span>+₹{(pricing ? pricing.codHandlingCharge : (codInfo?.totalCodCharge || 0)).toFixed(2)}</span>
                </div>
              )}

              {(pricing ? pricing.couponDiscount : couponDiscount) > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Coupon Discount</span>
                  <span>-₹{(pricing ? pricing.couponDiscount : couponDiscount).toFixed(2)}</span>
                </div>
              )}

              {(pricing ? pricing.walletDeduction : walletDeduction) > 0 && (
                <div className="flex justify-between text-green-600 font-semibold border-t border-dashed border-gray-100 pt-2">
                  <span>Wallet Deduction</span>
                  <span>-₹{(pricing ? pricing.walletDeduction : walletDeduction).toFixed(2)}</span>
                </div>
              )}

              <hr className="my-3 border-gray-200" />

              <div className="flex justify-between font-bold text-lg pt-1">
                <span>{useWallet && (pricing ? pricing.walletDeduction : walletDeduction) > 0 ? "Remaining to Pay" : "To Pay"}</span>
                <span className="text-green-700">
                  ₹{remainingTotalToPay.toFixed(2)}
                </span>
              </div>

              <p className="text-[10px] text-gray-500 text-center mt-3">
                *Prices are inclusive of all taxes. Detailed GST Invoice available post-purchase.
              </p>

              {checkoutServiceableStatus === "serviceable" && nearestStoreInfo ? (
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-800 font-semibold flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" />
                    Delivering from <strong>{nearestStoreInfo.name}</strong>
                  </p>
                  <p className="text-[11px] text-green-700 mt-0.5">
                    Estimated delivery time: <strong>{nearestStoreInfo.estimatedDeliveryMinutes?.min || 8}-{nearestStoreInfo.estimatedDeliveryMinutes?.max || 15} mins</strong> ({nearestStoreInfo.distanceKm?.toFixed(1) || 0} km away)
                  </p>
                </div>
              ) : checkoutServiceableStatus === "not_serviceable" ? (
                <div className="mt-4 p-3 bg-rose-50 rounded-lg border border-rose-200">
                  <p className="text-xs text-rose-800 font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    No serviceable store near this location
                  </p>
                </div>
              ) : (
                <div className="mt-4 text-xs text-gray-500 space-y-1">
                  <p>• Free delivery on orders above ₹500</p>
                  <p>• Estimated delivery: 30-45 minutes</p>
                  <p>• Easy returns within 30 minutes of delivery</p>
                </div>
              )}
            </div>

            {finalTotal > 50000 && userData?.kyc?.status !== "approved" && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-left">
                <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">KYC Verification Required</h4>
                  <p className="text-[11px] text-amber-700 mt-1 leading-normal">
                    Your order total exceeds ₹50,000. Under compliance regulations, high-value checkouts require a one-time identity verification.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsKycModalOpen(true)}
                    className="mt-2.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                  >
                    Verify via DigiLocker Instantly
                  </button>
                </div>
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.95 }}
              className={`mt-6 w-full ${
                addressValidated && checkoutServiceableStatus === "serviceable"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-400 cursor-not-allowed"
              } text-white py-3 rounded-full font-semibold transition-all flex items-center justify-center`}
              onClick={handlePayment}
              disabled={!addressValidated || checkoutServiceableStatus !== "serviceable" || loading}
            >
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : checkoutServiceableStatus === "checking" ? (
                "Checking Serviceability..."
              ) : checkoutServiceableStatus === "not_serviceable" ? (
                "Out of Delivery Area"
              ) : remainingTotalToPay === 0 ? (
                "Pay with Wallet & Place Order"
              ) : paymentMethod === "cod" ? (
                "Place Order"
              ) : (
                "Pay & Place Order"
              )}
            </motion.button>

            {!addressValidated && (
              <p className="text-red-500 text-sm text-center mt-2">
                Please fill all address fields correctly
              </p>
            )}

            {addressValidated && checkoutServiceableStatus === "not_serviceable" && (
              <p className="text-rose-600 text-sm text-center mt-2 font-medium">
                SnapCart is not available at this address location yet
              </p>
            )}

            <p className="text-xs text-gray-500 text-center mt-3">
              By placing your order, you agree to our{" "}
              <a href="/terms" className="text-green-600 hover:underline">
                Terms & Conditions
              </a>
            </p>
          </motion.div>
        </div>
      </div>
      
      {/* Slide-over Saved Address Selector Drawer */}
      <AnimatePresence>
        {isAddressDrawerOpen && (
          <div className="fixed inset-0 z-[9999] flex justify-end bg-black/50 backdrop-blur-xs">
            {/* Backdrop click to close */}
            <div className="absolute inset-0 cursor-default" onClick={() => setIsAddressDrawerOpen(false)}></div>

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Select Delivery Address</h3>
                  <p className="text-xs text-slate-400">Choose from your saved addresses or add a new one</p>
                </div>
                <button
                  onClick={() => setIsAddressDrawerOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-full transition text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5.5 h-5.5" />
                </button>
              </div>

              {/* Addresses List Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {savedAddresses.length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center justify-center">
                    <MapPin className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-600">No saved addresses yet</p>
                    <p className="text-xs text-slate-400 mt-1">Add a new delivery address to place orders</p>
                  </div>
                ) : (
                  savedAddresses.map((addr) => {
                    const isSelected = selectedSavedAddress === addr._id;
                    return (
                      <div
                        key={addr._id}
                        onClick={() => {
                          handleSelectSavedAddress(addr._id);
                          setIsAddressDrawerOpen(false);
                        }}
                        className={`w-full text-left p-4 border rounded-2xl transition-all duration-200 cursor-pointer relative group ${
                          isSelected
                            ? "border-green-600 bg-green-50/20 shadow-sm"
                            : "border-slate-150 hover:border-green-300 hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0 pr-6">
                            <div className="flex items-center gap-2 mb-2">
                              {addr.type === "home" ? (
                                <Home className="w-4 h-4 text-blue-500" />
                              ) : addr.type === "work" ? (
                                <Briefcase className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <MapPin className="w-4 h-4 text-slate-400" />
                              )}
                              <span className="text-xs font-bold text-slate-700 capitalize">
                                {addr.type === "others" ? (addr.customLabel || "Other") : addr.type}
                              </span>
                              {addr.isDefault && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-bold">
                                  Default
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-slate-800">
                              {addr.fullName || userData?.name}
                              <span className="text-xs font-semibold text-slate-400 ml-1.5">• {addr.mobile || userData?.mobileNumber}</span>
                              {addr.alternateMobile && (
                                <span className="text-[10px] font-medium text-slate-400 block mt-0.5">Alt: {addr.alternateMobile}</span>
                              )}
                            </h4>
                            <p className="text-xs font-bold text-slate-600 mt-1 leading-snug">
                              {addr.street}
                            </p>
                            {addr.label && (
                              <p className="text-xs text-green-600 font-semibold mt-0.5">
                                📍 Landmark: {addr.label}
                              </p>
                            )}
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                              {addr.fullAddress}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAddress(addr);
                                setIsPickerModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                              title="Edit Address"
                            >
                              <Plus className="w-4.5 h-4.5 rotate-45 text-slate-500" />
                            </button>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action Button at bottom */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAddress(null);
                    setIsPickerModalOpen(true);
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-6 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-green-600/10"
                >
                  <Plus className="w-5 h-5" />
                  Add New Address
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unified Leaflet Map-Pin Pointing Modal */}
      <AddressPickerModal
        isOpen={isPickerModalOpen}
        onClose={() => setIsPickerModalOpen(false)}
        onConfirm={handleConfirmPickerAddress}
        initialPosition={position}
        editingAddressData={editingAddress}
      />

      {/* DigiLocker KYC modal */}
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
};

export default Checkout;
