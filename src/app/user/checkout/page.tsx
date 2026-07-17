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
  ShoppingBag,
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

const SubstituteChoiceSelector = ({
  item,
  choice,
  onChange,
}: {
  item: any;
  choice: { option: "none" | "similar" | "specific"; variantId: string | null; name: string };
  onChange: (newChoice: { option: "none" | "similar" | "specific"; variantId: string | null; name: string }) => void;
}) => {
  const [substitutes, setSubstitutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const categoryId = item.variant.grocery?.category;

  useEffect(() => {
    if (choice.option === "specific" && substitutes.length === 0) {
      const fetchSubstitutes = async () => {
        setLoading(true);
        try {
          const res = await axios.get(`/api/checkout/substitutes?categoryId=${categoryId}`);
          const suggestions = (res.data.substitutes || []).filter(
            (s: any) => s.variantId !== item.variant._id
          );
          setSubstitutes(suggestions);
        } catch (err) {
          console.error("Failed to load substitutes", err);
        } finally {
          setLoading(false);
        }
      };
      fetchSubstitutes();
    }
  }, [choice.option, categoryId, item.variant._id, substitutes.length]);

  return (
    <div className="mt-3 p-4 bg-gradient-to-r from-emerald-50/20 to-teal-50/5 dark:from-emerald-950/10 dark:to-slate-900/5 rounded-2xl border border-emerald-250 dark:border-emerald-800 border-l-4 border-l-emerald-600 dark:border-l-emerald-500 text-left shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-extrabold text-emerald-850 dark:text-emerald-405 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse fill-emerald-500/20" />
          If Out of Stock
        </span>
        <span className="text-[9px] font-extrabold text-emerald-850 dark:text-emerald-350 bg-emerald-100/70 dark:bg-emerald-900/40 px-2.5 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-850/30">
          Substitution Preference
        </span>
      </div>

      {/* Grid of Options */}
      <div className="grid grid-cols-3 gap-2">
        {/* Option 1: Refund */}
        <button
          type="button"
          onClick={() => onChange({ option: "none", variantId: null, name: "" })}
          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${choice.option === "none"
              ? "bg-emerald-500/10 border-2 border-emerald-600 text-emerald-950 dark:text-emerald-250 ring-1 ring-emerald-500/20 font-bold shadow-sm"
              : "bg-white dark:bg-slate-900 border border-slate-350 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-450 font-semibold"
            }`}
        >
          <X className={`w-4 h-4 mb-1 ${choice.option === "none" ? "text-emerald-600 stroke-[3px]" : "text-gray-400"}`} />
          <span className="text-[11px] font-bold block leading-tight">Refund</span>
          <span className="text-[8px] font-medium text-gray-400 dark:text-gray-505 block mt-0.5 leading-none">Don't replace</span>
        </button>

        {/* Option 2: Similar */}
        <button
          type="button"
          onClick={() => onChange({ option: "similar", variantId: null, name: "" })}
          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${choice.option === "similar"
              ? "bg-emerald-500/10 border-2 border-emerald-600 text-emerald-950 dark:text-emerald-250 ring-1 ring-emerald-500/20 font-bold shadow-sm"
              : "bg-white dark:bg-slate-900 border border-slate-350 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-450 font-semibold"
            }`}
        >
          <svg className={`w-4 h-4 mb-1 ${choice.option === "similar" ? "text-emerald-600 stroke-[3px]" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5" />
          </svg>
          <span className="text-[11px] font-bold block leading-tight">Similar</span>
          <span className="text-[8px] font-medium text-gray-400 dark:text-gray-505 block mt-0.5 leading-none">Auto-replace</span>
        </button>

        {/* Option 3: Specific Alternative */}
        <button
          type="button"
          onClick={() => onChange({ option: "specific", variantId: choice.variantId, name: choice.name })}
          className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${choice.option === "specific"
              ? "bg-emerald-500/10 border-2 border-emerald-600 text-emerald-950 dark:text-emerald-250 ring-1 ring-emerald-500/20 font-bold shadow-sm"
              : "bg-white dark:bg-slate-900 border border-slate-350 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-450 font-semibold"
            }`}
        >
          <svg className={`w-4 h-4 mb-1 ${choice.option === "specific" ? "text-emerald-600 stroke-[3px]" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2h-2a2 2 0 00-2 2" />
          </svg>
          <span className="text-[11px] font-bold block leading-tight">Custom</span>
          <span className="text-[8px] font-medium text-gray-400 dark:text-gray-550 block mt-0.5 leading-none">Choose item</span>
        </button>
      </div>

      {/* Description / Actions Area */}
      <div className="mt-3 border-t border-emerald-200/50 dark:border-emerald-900/30 pt-2.5">
        {choice.option === "none" && (
          <div className="flex items-start gap-2 text-[11px] text-slate-605 dark:text-slate-400 leading-snug">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1.5 flex-shrink-0" />
            <p>If this item is unavailable, it will be cancelled and the amount will be refunded directly to your wallet.</p>
          </div>
        )}

        {choice.option === "similar" && (
          <div className="flex items-start gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 leading-snug">
            <Check className="w-4 h-4 text-emerald-650 flex-shrink-0 stroke-[2.5px]" />
            <p>Our packer will replace this item with a similar brand of equivalent value, size, and weight to prevent delays.</p>
          </div>
        )}

        {choice.option === "specific" && (
          <div className="text-xs">
            {loading ? (
              <p className="text-slate-500 flex items-center gap-2 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Loading category alternatives...
              </p>
            ) : substitutes.length > 0 ? (
              <div className="space-y-2">
                <label className="block text-[9px] font-extrabold text-emerald-850 dark:text-emerald-405 uppercase tracking-wide">
                  Select Specific Substitute:
                </label>

                {/* Horizontal Scrolling alternative items list */}
                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                  {substitutes.map((s) => {
                    const isSelected = choice.variantId === s.variantId;
                    const displayPrice = typeof s.price === "object" ? s.price.selling : s.price;
                    const displayMrp = typeof s.price === "object" ? s.price.mrp : null;

                    return (
                      <button
                        key={s.variantId}
                        type="button"
                        onClick={() => onChange({ option: "specific", variantId: s.variantId, name: s.name })}
                        className={`flex-shrink-0 snap-start w-52 p-3 rounded-xl border text-left transition-all relative ${isSelected
                            ? "bg-emerald-500/10 border-2 border-emerald-600 text-emerald-950 dark:text-emerald-200 font-bold shadow-sm"
                            : "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:border-emerald-450"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate leading-snug">
                              {s.name?.split(" - ")[0]}
                            </p>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              Pack: {s.label}
                            </p>
                            <p className="text-xs font-extrabold text-emerald-700 dark:text-emerald-450 mt-1 flex items-center gap-1.5">
                              ₹{displayPrice}
                              {displayMrp && displayMrp > displayPrice && (
                                <span className="text-[9px] font-normal text-slate-400 dark:text-slate-500 line-through">
                                  ₹{displayMrp}
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Selected Radio circle */}
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-700"
                            }`}>
                            {isSelected && (
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-amber-700 dark:text-amber-500 font-medium text-[11px] py-1 bg-amber-50/50 dark:bg-amber-950/15 border border-amber-200/50 rounded-xl px-3 mt-2">
                ⚠️ No other alternative products found in this category.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const Checkout = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { userData } = useSelector((state: RootState) => state.user);
  const selectedStore = useSelector((state: RootState) => state.location.selectedStore);
  const reduxLatitude = useSelector((state: RootState) => state.location.latitude);
  const reduxLongitude = useSelector((state: RootState) => state.location.longitude);
  const reduxCity = useSelector((state: RootState) => state.location.city);
  const reduxStateName = useSelector((state: RootState) => state.location.state);
  const reduxPincode = useSelector((state: RootState) => state.location.pincode);
  const reduxFullAddress = useSelector((state: RootState) => state.location.fullAddress);
  const {
    cartItems,
    subTotal,
    totalMRP,
    savings,
    deliveryFee,
    finalTotal,
    couponDiscount,
    isGuest,
    isGoldMember,
    goldDiscount,
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
  const isAddressComplete =
    addressValidated &&
    !!address.street &&
    address.street.trim() !== "" &&
    selectedSavedAddress !== null;
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWallet, setUseWallet] = useState<boolean>(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);

  const [substituteChoices, setSubstituteChoices] = useState<
    Record<
      string,
      { option: "none" | "similar" | "specific"; variantId: string | null; name: string }
    >
  >({});

  useEffect(() => {
    if (cartItems.length > 0) {
      const initial: any = {};
      cartItems.forEach((item) => {
        initial[item.variant._id] = {
          option: "none",
          variantId: null,
          name: "",
        };
      });
      setSubstituteChoices((prev) => {
        const updated = { ...initial };
        Object.keys(prev).forEach((key) => {
          if (prev[key]) updated[key] = prev[key];
        });
        return updated;
      });
    }
  }, [cartItems]);

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
            isGoldMember: cart.isGoldMember,
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
        const list = response.data.addresses || [];
        setSavedAddresses(list);
        if (list.length > 0) {
          const defaultAddr = list.find((addr: any) => addr.isDefault) || list[0];
          setSelectedSavedAddress(defaultAddr._id);
          setAddress({
            fullName: defaultAddr.fullName || userData?.name || "",
            mobile: defaultAddr.mobile || userData?.mobileNumber || "",
            alternateMobile: defaultAddr.alternateMobile || "",
            city: defaultAddr.city,
            state: defaultAddr.state,
            pincode: defaultAddr.zipCode,
            fullAddress: defaultAddr.fullAddress || defaultAddr.street,
            street: defaultAddr.street,
            landmark: defaultAddr.label || "",
            type: defaultAddr.type || "home",
            customLabel: defaultAddr.customLabel || "",
          });
          if (defaultAddr.latitude && defaultAddr.longitude) {
            setPosition([defaultAddr.latitude, defaultAddr.longitude]);
          }
        }
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
    if (selectedSavedAddress) return;
    if (reduxLatitude && reduxLongitude) {
      setPosition([reduxLatitude, reduxLongitude]);
      setAddress((prev: any) => ({
        ...prev,
        city: reduxCity || prev.city,
        state: reduxStateName || prev.state,
        pincode: reduxPincode || prev.pincode,
        fullAddress: reduxFullAddress || prev.fullAddress,
      }));
    }
  }, [reduxLatitude, reduxLongitude, reduxCity, reduxStateName, reduxPincode, reduxFullAddress, selectedSavedAddress]);

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

  const handleCompleteCurrentAddress = () => {
    setEditingAddress({
      fullName: address.fullName || userData?.name || "",
      mobile: address.mobile || userData?.mobileNumber || "",
      alternateMobile: address.alternateMobile || "",
      city: address.city,
      state: address.state,
      zipCode: address.pincode,
      street: address.street || "",
      label: address.landmark || "",
      fullAddress: address.fullAddress,
      latitude: position ? position[0] : undefined,
      longitude: position ? position[1] : undefined,
    });
    setIsPickerModalOpen(true);
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
        orderItems: cartItems.map((item) => {
          const choice = substituteChoices[item.variant._id] || { option: "none", variantId: null, name: "" };
          return {
            variantId: item.variant._id,
            quantity: item.quantity,
            priceAtAdd: item.priceAtAdd,
            substituteOption: choice.option,
            substituteVariantId: choice.variantId,
            substituteName: choice.name,
          };
        }),
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
        orderItems: cartItems.map((item) => {
          const choice = substituteChoices[item.variant._id] || { option: "none", variantId: null, name: "" };
          return {
            variantId: item.variant._id,
            quantity: item.quantity,
            priceAtAdd: item.priceAtAdd,
            substituteOption: choice.option,
            substituteVariantId: choice.variantId,
            substituteName: choice.name,
          };
        }),
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
    if (!isAddressComplete) {
      toast.error("Please complete your delivery address details first");
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
        {/* Column 1 (Left) */}
        <div className="space-y-6">
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
                  {/* Warning for Incomplete Address */}
                  {!isAddressComplete && (
                    <div className="mb-4 p-4 bg-rose-50 rounded-2xl border border-rose-200 flex gap-3 text-left">
                      <AlertCircle className="w-5.5 h-5.5 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">Address Details Incomplete</h4>
                        <p className="text-[11px] text-rose-700 mt-1 leading-normal">
                          House / Flat / Floor / Building details are required to deliver your order. Please complete and save this address.
                        </p>
                        <button
                          type="button"
                          onClick={handleCompleteCurrentAddress}
                          className="mt-2.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer shadow-md shadow-rose-600/10"
                        >
                          Complete & Save Address Details
                        </button>
                      </div>
                    </div>
                  )}

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
                  {address.street && (
                    <p className="text-sm font-bold text-slate-700 mt-2">
                      {address.street}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {address.fullAddress}
                  </p>

                  {/* Change button */}
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddressDrawerOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-2xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition shadow-md shadow-green-600/10 cursor-pointer"
                    >
                      Change Address
                    </button>
                    {!isAddressComplete && (
                      <button
                        type="button"
                        onClick={handleCompleteCurrentAddress}
                        className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md shadow-rose-600/10 cursor-pointer"
                      >
                        Complete Details
                      </button>
                    )}
                  </div>
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

          {/* ================= Review Order Items & Substitutes ================= */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 text-left"
          >
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
              <ShoppingBag size={22} className="text-green-600" /> Review Items & Substitutes
            </h2>
            <div className="space-y-4 divide-y divide-gray-100">
              {cartItems.map((item, index) => (
                <div key={item.variant._id} className={`pt-4 ${index === 0 ? "pt-0 border-t-0" : ""}`}>
                  <div className="flex items-start gap-3">
                    <img
                      src={item.variant.grocery?.images?.[0]?.url || "/placeholder-image.png"}
                      alt={item.variant.grocery?.name}
                      className="w-16 h-16 rounded-xl border border-gray-150 object-cover flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-gray-800 truncate">
                        {item.variant.grocery?.name}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Pack: {item.variant.label} · Qty: {item.quantity}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {(() => {
                          const categoryObj = item.variant.grocery?.category as any;
                          const categoryName = (categoryObj && typeof categoryObj === "object" ? categoryObj.name : "").toLowerCase();
                          const isVegOrFruit = categoryName.includes("vegetable") || categoryName.includes("fruit") || categoryName.includes("veg") || categoryName.includes("frut");
                          const basePrice = item.priceAtAdd?.selling ?? item.variant.price.selling;
                          const discountedPrice = isGoldMember 
                            ? (isVegOrFruit ? Math.round(basePrice * 0.9 * 100) / 100 : Math.round(basePrice * 0.95 * 100) / 100)
                            : basePrice;
                          const originalMRP = item.priceAtAdd?.mrp ?? item.variant.price.mrp;
                          
                          return (
                            <>
                              <span className="text-sm font-bold text-green-700">
                                ₹{(discountedPrice * item.quantity).toFixed(2)}
                              </span>
                              {(originalMRP > discountedPrice) && (
                                <span className="text-xs font-normal text-gray-400 line-through">
                                  ₹{(originalMRP * item.quantity).toFixed(2)}
                                </span>
                              )}
                              {isGoldMember && (
                                <span className="bg-amber-100 text-amber-800 border border-amber-350 text-[10px] font-black px-1.5 py-0.5 rounded whitespace-nowrap flex items-center gap-0.5 shadow-sm">
                                  👑 GOLD {isVegOrFruit ? "10%" : "5%"} OFF
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Substitute Choice Selector */}
                  <SubstituteChoiceSelector
                    item={item}
                    choice={
                      substituteChoices[item.variant._id] || {
                        option: "none",
                        variantId: null,
                        name: "",
                      }
                    }
                    onChange={(newChoice) =>
                      setSubstituteChoices((prev) => ({
                        ...prev,
                        [item.variant._id]: newChoice,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </motion.div>
        </div>

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
                    className={`flex items-center gap-4 w-full border rounded-lg p-4 transition-all ${paymentMethod === "online" && onlinePaymentType === "razorpay"
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
                    className={`flex items-center gap-4 w-full border rounded-lg p-4 transition-all ${paymentMethod === "online" && onlinePaymentType === "stripe"
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
                    className={`flex items-center gap-4 w-full border rounded-lg p-4 transition-all ${paymentMethod === "cod"
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

            {isGoldMember && (
              <div className="mb-4 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 dark:from-amber-950/20 dark:to-slate-900/5 border border-amber-250 dark:border-amber-900/60 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👑</span>
                  <div className="text-left">
                    <p className="text-xs font-black text-amber-950 dark:text-amber-200 uppercase tracking-wider leading-none">Snapcart Gold Member</p>
                    <p className="text-[9px] font-semibold text-amber-700 dark:text-amber-400 mt-1">Benefits auto-applied to this order</p>
                  </div>
                </div>
                <span className="text-[9px] font-black bg-amber-500/20 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">ACTIVE</span>
              </div>
            )}

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

              {((pricing ? pricing.goldDiscount : goldDiscount) > 0) && (
                <div className="flex justify-between text-amber-700 font-bold bg-amber-50 dark:bg-amber-950/20 px-2 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/60">
                  <span className="flex items-center gap-1">👑 Snapcart Gold Discount</span>
                  <span>-₹{(pricing ? pricing.goldDiscount : goldDiscount).toFixed(2)}</span>
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
                  {(pricing ? pricing.deliveryFee : deliveryFee) === 0 ? (
                    (pricing ? pricing.isGold : isGoldMember) ? "FREE (Gold Benefit)" : "FREE"
                  ) : `+₹${(pricing ? pricing.deliveryFee : deliveryFee).toFixed(2)}`}
                </span>
              </div>

              {(pricing ? pricing.isGold : isGoldMember) ? (
                <div className="flex justify-between text-gray-600">
                  <span>Packaging & Handling Fee</span>
                  <span className="text-green-600 font-bold">
                    <span className="text-gray-400 line-through mr-1.5">₹4.00</span>
                    FREE
                  </span>
                </div>
              ) : (
                pricing && pricing.packagingFee > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Packaging & Handling Fee</span>
                    <span className="text-gray-800">+₹{pricing.packagingFee.toFixed(2)}</span>
                  </div>
                )
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
              className={`mt-6 w-full ${isAddressComplete && checkoutServiceableStatus === "serviceable"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-400 cursor-not-allowed"
                } text-white py-3 rounded-full font-semibold transition-all flex items-center justify-center`}
              onClick={handlePayment}
              disabled={!isAddressComplete || checkoutServiceableStatus !== "serviceable" || loading}
            >
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : checkoutServiceableStatus === "checking" ? (
                "Checking Serviceability..."
              ) : checkoutServiceableStatus === "not_serviceable" ? (
                "Out of Delivery Area"
              ) : !isAddressComplete ? (
                "Complete Address to Order"
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
                Please select a delivery address location
              </p>
            )}

            {addressValidated && !isAddressComplete && (
              <p className="text-rose-600 text-sm text-center mt-2 font-medium">
                House / Flat / Floor / Building details are required to place your order.
              </p>
            )}

            {addressValidated && isAddressComplete && checkoutServiceableStatus === "not_serviceable" && (
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
                        className={`w-full text-left p-4 border rounded-2xl transition-all duration-200 cursor-pointer relative group ${isSelected
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
