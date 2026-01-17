// src/app/user/checkout/page.tsx
"use client";

import { extractCityStateFromLabel } from "@/lib/utils/extractCityStateFromLabel";
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
} from "lucide-react";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

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

  const [address, setAddress] = useState({
    fullName: "",
    mobile: "",
    city: "",
    state: "",
    pincode: "",
    fullAddress: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [onlinePaymentType, setOnlinePaymentType] = useState<
    "stripe" | "razorpay" | null
  >(null);
  const { status } = useSession();
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addressValidated, setAddressValidated] = useState(false);

  /* ================= REDIRECT IF NOT AUTHENTICATED ================= */
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" && !isGuest) {
      router.replace("/login?redirect=/user/checkout");
    }
  }, [status, router, isGuest]);

  /* ================= Hydrate cart on page load ================= */
  useEffect(() => {
    const loadCart = async () => {
      try {
        const cart = await fetchCartApi();
        dispatch(
          setCart({
            items: cart.items,
            cartId: cart.cartId,
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

  /* ================= Set user name & mobile ================= */
  useEffect(() => {
    if (!userData) return;
    setAddress((prev) => ({
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

  /* ================= Get current coordinates ================= */
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.error("Error getting location:", err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  /* ================= Fetch address from coordinates ================= */
  useEffect(() => {
    const fetchAddress = async () => {
      if (!position) return;
      try {
        const response = await axios.get(
          `/api/geocode?lat=${position[0]}&lon=${position[1]}`
        );
        setAddress((prev) => ({
          ...prev,
          city: response.data.address?.city || "",
          state: response.data.address?.state || "",
          pincode: response.data.address?.postcode || "",
          fullAddress: response.data.display_name || "",
        }));
      } catch (err) {
        console.error("Error fetching address:", err);
      }
    };
    fetchAddress();
  }, [position]);

  /* ================= Search address by query ================= */
  const handleSearchQuery = async () => {
    if (!searchQuery) return;
    setSearchLoading(true);

    try {
      const { OpenStreetMapProvider } = await import("leaflet-geosearch");
      const provider = new OpenStreetMapProvider();
      const results = await provider.search({ query: searchQuery });

      if (!results.length) {
        toast.error("No location found");
        return;
      }

      const r = results[0];
      const raw = r.raw as any;
      const addr = raw.address || {};
      const labelFallback = extractCityStateFromLabel(r.label);

      setPosition([r.y, r.x]);
      setAddress((prev) => ({
        ...prev,
        city:
          addr.city ||
          addr.town ||
          addr.village ||
          addr.suburb ||
          labelFallback.city ||
          "",
        state:
          addr.state ||
          addr.region ||
          addr.state_district ||
          labelFallback.state ||
          "",
        pincode: addr.postcode || "",
        fullAddress: r.label,
      }));
      toast.success("Location updated");
    } catch (err) {
      toast.error("Failed to search location");
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    toast.loading("Getting your location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        toast.dismiss();
        toast.success("Location updated");
      },
      (err) => {
        toast.dismiss();
        toast.error("Failed to get location");
        console.error("Error getting location:", err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  /* ================= Create Order ================= */
  const createOrder = async () => {
    try {
      const payload = {
        paymentMethod,
        onlinePaymentType:
          paymentMethod === "online" ? onlinePaymentType : undefined,
        deliveryAddress: address,

        orderItems: cartItems.map((item) => ({
          variantId: item.variant._id,
          quantity: item.quantity,
          priceAtAdd: item.priceAtAdd,
        })),
        couponDiscount,
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

    setLoading(true);
    try {
      const orderData = await createOrder();

      if (!orderData || !orderData.success || !orderData.orderId) {
        throw new Error(
          orderData?.message ||
            "Order ID not received from server or order creation failed"
        );
      }

      const orderId = orderData.orderId;

      console.log("Order ID before navigation:", orderId);

      if (paymentMethod === "cod") {
        dispatch(clearCart());
        toast.success("Order placed successfully!");
        router.push(`/user/orders/${orderId}`);
        return;
      }

      if (paymentMethod === "online" && onlinePaymentType === "razorpay") {
        router.push(`/user/payment/razorpay/${orderId}`);
        return;
      }

      if (paymentMethod === "online" && onlinePaymentType === "stripe") {
        router.push(`/user/payment/stripe/${orderId}`);
        return;
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
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <MapPin size={20} className="text-green-700" /> Delivery Address
            </h2>
            {addressValidated && (
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <Check size={14} />
                <span>Address verified</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="relative">
              <User
                size={18}
                className="absolute left-3 top-3 text-green-600 pointer-events-none"
              />
              <input
                type="text"
                value={address.fullName}
                placeholder="Full Name *"
                className="pl-10 w-full border rounded-lg p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                onChange={(e) =>
                  setAddress({ ...address, fullName: e.target.value })
                }
              />
            </div>

            <div className="relative">
              <Phone
                size={18}
                className="absolute left-3 top-3 text-green-600 pointer-events-none"
              />
              <input
                type="tel"
                value={address.mobile}
                placeholder="Mobile Number *"
                className="pl-10 w-full border rounded-lg p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                onChange={(e) =>
                  setAddress({ ...address, mobile: e.target.value })
                }
              />
              {address.mobile && !/^[0-9]{10}$/.test(address.mobile) && (
                <p className="text-red-500 text-xs mt-1">
                  Enter valid 10-digit mobile number
                </p>
              )}
            </div>

            <div className="relative">
              <Home
                size={18}
                className="absolute left-3 top-3 text-green-600 pointer-events-none"
              />
              <textarea
                value={address.fullAddress}
                placeholder="Full Address *"
                rows={3}
                className="pl-10 w-full border rounded-lg p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none resize-none"
                onChange={(e) =>
                  setAddress({ ...address, fullAddress: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="relative">
                <Building
                  size={18}
                  className="absolute left-3 top-3 text-green-600 pointer-events-none"
                />
                <input
                  type="text"
                  value={address.city}
                  placeholder="City *"
                  className="pl-10 w-full border rounded-lg p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                  onChange={(e) =>
                    setAddress({ ...address, city: e.target.value })
                  }
                />
              </div>
              <div className="relative">
                <Flag
                  size={18}
                  className="absolute left-3 top-3 text-green-600 pointer-events-none"
                />
                <input
                  type="text"
                  value={address.state}
                  placeholder="State *"
                  className="pl-10 w-full border rounded-lg p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                  onChange={(e) =>
                    setAddress({ ...address, state: e.target.value })
                  }
                />
              </div>
              <div className="relative">
                <Hash
                  size={18}
                  className="absolute left-3 top-3 text-green-600 pointer-events-none"
                />
                <input
                  type="text"
                  value={address.pincode}
                  placeholder="Pincode *"
                  className="pl-10 w-full border rounded-lg p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                  onChange={(e) =>
                    setAddress({ ...address, pincode: e.target.value })
                  }
                />
                {address.pincode && !/^[0-9]{6}$/.test(address.pincode) && (
                  <p className="text-red-500 text-xs mt-1">
                    Enter valid 6-digit pincode
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <input
                type="text"
                placeholder="Search city or area..."
                className="flex-1 border rounded-lg p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchQuery()}
              />
              <button
                className="bg-green-600 text-white px-5 rounded-lg hover:bg-green-700 transition-all font-medium flex items-center justify-center disabled:opacity-50"
                onClick={handleSearchQuery}
                disabled={searchLoading}
              >
                {searchLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  "Search"
                )}
              </button>
            </div>

            <div className="relative mt-6 h-[300px] rounded-xl border border-gray-200 overflow-hidden">
              <MapView
                position={position ?? [28.6139, 77.209]} // Default to Delhi
                radius={2000}
                onPositionChange={(newPos) => setPosition(newPos)}
                handleCurrentLocation={handleCurrentLocation}
              />
            </div>
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
                className={`flex items-center gap-4 w-full border rounded-lg p-4 transition-all ${
                  paymentMethod === "cod"
                    ? "border-green-600 bg-green-50 shadow-sm"
                    : "hover:bg-gray-50"
                }`}
                onClick={() => {
                  setPaymentMethod("cod");
                  setOnlinePaymentType(null);
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
                    Pay when you receive your order
                  </p>
                </div>
                {paymentMethod === "cod" && (
                  <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            </div>

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
            <h3 className="font-semibold text-lg mb-4">Order Summary</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total MRP</span>
                <span>₹{totalMRP.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>₹{subTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee</span>
                <span className={deliveryFee === 0 ? "text-green-600" : ""}>
                  {deliveryFee === 0 ? "FREE" : `+₹${deliveryFee.toFixed(2)}`}
                </span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon Discount</span>
                  <span className="font-medium">
                    -₹{couponDiscount.toFixed(2)}
                  </span>
                </div>
              )}

              {savings > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Total Savings</span>
                  <span className="font-medium">-₹{savings.toFixed(2)}</span>
                </div>
              )}

              <hr className="my-3 border-gray-200" />

              <div className="flex justify-between font-bold text-lg pt-2">
                <span>Final Total</span>
                <span className="text-green-700">₹{finalTotal.toFixed(2)}</span>
              </div>

              <div className="mt-4 text-xs text-gray-500 space-y-1">
                <p>• Free delivery on orders above ₹500</p>
                <p>• Estimated delivery: 30-45 minutes</p>
                <p>• Easy returns within 30 minutes of delivery</p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              className={`mt-6 w-full ${
                addressValidated
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-400 cursor-not-allowed"
              } text-white py-3 rounded-full font-semibold transition-all flex items-center justify-center`}
              onClick={handlePayment}
              disabled={!addressValidated || loading}
            >
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5" />
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

            <p className="text-xs text-gray-500 text-center mt-3">
              By placing your order, you agree to our{" "}
              <a href="/terms" className="text-green-600 hover:underline">
                Terms & Conditions
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
