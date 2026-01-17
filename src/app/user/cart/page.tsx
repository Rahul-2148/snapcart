// src/app/user/cart/page.tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingBasket,
  Trash2,
  Tag,
  ChevronDown,
  X,
  Check,
  Zap,
  Percent,
  IndianRupee,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { setCart, applyCoupon, removeCoupon } from "@/redux/features/cartSlice";
import { AppDispatch, RootState } from "@/redux/store";
import type { AppliedCoupon } from "@/redux/features/cartSlice";

import {
  fetchCartApi,
  getGuestCart,
  removeFromCartApi,
  updateCartQuantityApi,
  updateGuestCartApi,
  clearCartApi,
  clearGuestCart,
} from "@/hooks/cart.api";

const CartPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { data: session, status } = useSession();

  const {
    cartItems,
    subTotal,
    totalMRP,
    savings,
    deliveryFee,
    finalTotal,
    couponDiscount,
    appliedCoupon,
    isGuest,
  } = useSelector((state: RootState) => state.cart);

  const [loading, setLoading] = useState(true);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [showAvailableCoupons, setShowAvailableCoupons] = useState(false);

  /* ================= LOAD CART ================= */
  useEffect(() => {
    const loadCart = async () => {
      setLoading(true);
      try {
        if (session?.user) {
          const userCart = await fetchCartApi();

          let appliedCouponData: AppliedCoupon | null = null;
          if (userCart.coupon) {
            const couponType = userCart.coupon.discountType?.toLowerCase();
            appliedCouponData = {
              code: userCart.coupon.code || "",
              discountValue: userCart.coupon.discountValue || 0,
              type: couponType === "percentage" ? "percentage" : "flat",
              maxDiscount: userCart.coupon.maxDiscountAmount,
              minCartValue: userCart.coupon.minCartValue,
            };
          }

          dispatch(
            setCart({
              items: userCart.items || [],
              cartId: userCart.cartId,
              isGuest: false,
              appliedCoupon: appliedCouponData,
            })
          );
        } else {
          const guestCart = await getGuestCart();

          let guestCoupon: AppliedCoupon | null = null;
          let guestDiscount = 0;
          try {
            const savedCoupon = localStorage.getItem("guest_coupon");
            if (savedCoupon) {
              const parsed = JSON.parse(savedCoupon);
              if (
                parsed.code &&
                (parsed.discountValue || parsed.discount) &&
                parsed.type
              ) {
                const dv = parsed.discountValue ?? parsed.discount;
                guestCoupon = {
                  code: parsed.code,
                  discountValue: dv,
                  type: parsed.type,
                  maxDiscount: parsed.maxDiscount,
                  minCartValue: parsed.minCartValue,
                };
                guestDiscount = dv || 0;
              }
            }
          } catch (e) {
            console.log("No valid coupon for guest");
          }

          dispatch(
            setCart({
              items: guestCart?.items || [],
              cartId: undefined,
              isGuest: true,
              appliedCoupon: guestCoupon,
            })
          );
        }
      } catch (err) {
        console.error("Cart load failed:", err);
      }
      setLoading(false);
    };

    if (status === "loading") return;
    loadCart();
  }, [dispatch, session, status]);

  /* ================= LOAD AVAILABLE COUPONS ================= */
  useEffect(() => {
    if (cartItems.length === 0) {
      setAvailableCoupons([]);
      return;
    }

    const loadAvailableCoupons = async () => {
      try {
        // Collect category and product IDs from cart items
        const categoryIds: string[] = [];
        const productIds: string[] = [];

        cartItems.forEach((item) => {
          if (
            item.variant?.grocery?.category &&
            !categoryIds.includes(item.variant.grocery.category.toString())
          ) {
            categoryIds.push(item.variant.grocery.category.toString());
          }
          if (
            item.variant?.grocery?._id &&
            !productIds.includes(item.variant.grocery._id.toString())
          ) {
            productIds.push(item.variant.grocery._id.toString());
          }
        });

        const response = await fetch("/api/coupon/available", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({
            cartTotal: Math.max(subTotal, 0),
            categoryIds,
            productIds,
            userId: session?.user?.id,
          }),
        });

        if (!response.ok) {
          console.error("Failed to load coupons:", await response.text());
          setAvailableCoupons([]);
          return;
        }

        const data = await response.json();
        if (data.success) {
          setAvailableCoupons(data.coupons || []);
        } else {
          setAvailableCoupons([]);
        }
      } catch (error) {
        console.error("Failed to load coupons:", error);
        setAvailableCoupons([]);
      }
    };

    if (showAvailableCoupons || availableCoupons.length === 0) {
      loadAvailableCoupons();
    }
  }, [subTotal, cartItems, session?.user?.id, showAvailableCoupons, availableCoupons.length]);

  /* ================= HANDLE CLEAR CART ================= */
  const handleClearCart = async () => {
    if (cartItems.length === 0) return;

    if (!confirm("Are you sure you want to clear your entire cart?")) {
      return;
    }

    try {
      if (isGuest) {
        await clearGuestCart();
        dispatch(
          setCart({
            items: [],
            cartId: undefined,
            isGuest: true,
            appliedCoupon: null,
          })
        );
        localStorage.removeItem("guest_coupon");
        toast.success("Cart cleared successfully!");
      } else {
        const response = await clearCartApi();
        if (response.success) {
          dispatch(
            setCart({
              items: [],
              cartId: response.cartId || undefined,
              isGuest: false,
              appliedCoupon: null,
            })
          );
          toast.success("Cart cleared successfully!");
        } else {
          toast.error(response.message || "Failed to clear cart");
        }
      }
    } catch (error: any) {
      toast.error(error?.message || "Something went wrong");
      console.error("Clear cart error:", error);
    }
  };

  /* ================= HANDLE APPLY COUPON ================= */
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setCouponLoading(true);
    setCouponError("");

    try {
      if (isGuest) {
        const response = await fetch("/api/coupon/available", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartTotal: subTotal }),
        });

        const data = await response.json();
        if (!data.success) throw new Error("Failed to validate coupon");

        const coupon = data.coupons?.find(
          (c: any) => c.code === couponCode.trim().toUpperCase()
        );

        if (!coupon) {
          setCouponError("Invalid coupon code");
          toast.error("Invalid coupon code");
          return;
        }

        if (coupon.minCartValue && subTotal < coupon.minCartValue) {
          setCouponError(`Minimum cart value ₹${coupon.minCartValue} required`);
          toast.error(`Minimum cart value ₹${coupon.minCartValue} required`);
          return;
        }

        let discount = 0;
        if (coupon.discountType === "PERCENTAGE") {
          discount = (subTotal * coupon.discountValue) / 100;
          if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
            discount = coupon.maxDiscountAmount;
          }
        } else {
          discount = coupon.discountValue;
        }

        const guestCoupon: AppliedCoupon = {
          code: coupon.code,
          discountValue: coupon.discountValue,
          type:
            coupon.discountType.toLowerCase() === "percentage"
              ? "percentage"
              : "flat",
          maxDiscount: coupon.maxDiscountAmount,
          minCartValue: coupon.minCartValue,
        };

        dispatch(applyCoupon(guestCoupon));
        localStorage.setItem("guest_coupon", JSON.stringify(guestCoupon));

        setCouponCode("");
        setShowCouponInput(false);
        toast.success("Coupon applied successfully!");
      } else {
        const response = await fetch("/api/coupon/apply-coupon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: couponCode.trim(),
          }),
        });

        const data = await response.json();

        if (data.success) {
          const userCart = await fetchCartApi();

          if (userCart.coupon) {
            const couponType = userCart.coupon.discountType?.toLowerCase();
            const appliedCouponData: AppliedCoupon = {
              code: userCart.coupon.code || "",
              discountValue: userCart.coupon.discountValue || 0,
              type: couponType === "percentage" ? "percentage" : "flat",
              maxDiscount: userCart.coupon.maxDiscountAmount,
              minCartValue: userCart.coupon.minCartValue,
            };

            dispatch(applyCoupon(appliedCouponData));
          }

          setCouponCode("");
          setShowCouponInput(false);
          toast.success(data.message);
        } else {
          setCouponError(data.message || "Invalid coupon code");
          toast.error(data.message);
        }
      }
    } catch (err: any) {
      setCouponError("Failed to apply coupon");
      toast.error(err.message);
      console.error("Apply coupon error:", err);
    } finally {
      setCouponLoading(false);
    }
  };

  /* ================= HANDLE REMOVE COUPON ================= */
  const handleRemoveCoupon = async () => {
    if (isGuest) {
      dispatch(removeCoupon());
      localStorage.removeItem("guest_coupon");
      toast.success("Coupon removed");
      return;
    }

    try {
      const response = await fetch("/api/coupon/remove-coupon", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        dispatch(removeCoupon());
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      toast.error(err.message);
      console.error("Remove coupon error:", err);
    }
  };

  /* ================= HANDLE AVAILABLE COUPON CLICK ================= */
  const handleAvailableCouponClick = async (coupon: any) => {
    setCouponLoading(true);
    setCouponError("");

    try {
      if (isGuest) {
        if (coupon.minCartValue && subTotal < coupon.minCartValue) {
          toast.error(`Minimum cart value ₹${coupon.minCartValue} required`);
          return;
        }

        let discount = 0;
        if (coupon.discountType === "PERCENTAGE") {
          discount = (subTotal * coupon.discountValue) / 100;
          if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
            discount = coupon.maxDiscountAmount;
          }
        } else {
          discount = coupon.discountValue;
        }

        const guestCoupon: AppliedCoupon = {
          code: coupon.code,
          discountValue: coupon.discountValue,
          type:
            coupon.discountType.toLowerCase() === "percentage"
              ? "percentage"
              : "flat",
          maxDiscount: coupon.maxDiscountAmount,
          minCartValue: coupon.minCartValue,
        };

        dispatch(applyCoupon(guestCoupon));
        localStorage.setItem("guest_coupon", JSON.stringify(guestCoupon));
        setShowAvailableCoupons(false);
        toast.success("Coupon applied successfully!");
      } else {
        const response = await fetch("/api/coupon/apply-coupon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: coupon.code,
          }),
        });

        const data = await response.json();

        if (data.success) {
          const userCart = await fetchCartApi();

          if (userCart.coupon) {
            const couponType = userCart.coupon.discountType?.toLowerCase();
            const appliedCouponData: AppliedCoupon = {
              code: userCart.coupon.code || "",
              discountValue: userCart.coupon.discountValue || 0,
              type: couponType === "percentage" ? "percentage" : "flat",
              maxDiscount: userCart.coupon.maxDiscountAmount,
              minCartValue: userCart.coupon.minCartValue,
            };

            dispatch(applyCoupon(appliedCouponData));
          }

          setShowAvailableCoupons(false);
          toast.success(data.message || "Coupon applied successfully!");
        } else {
          toast.error(data.message || "Failed to apply coupon");
        }
      }
    } catch (err) {
      toast.error("Failed to apply coupon");
      console.error("Apply coupon error:", err);
    } finally {
      setCouponLoading(false);
    }
  };

  /* ================= CART HANDLERS ================= */
  const handleIncrease = async (cartItemId: string) => {
    const item = cartItems.find((i) => i._id === cartItemId);
    if (!item) return;

    try {
      if (isGuest) {
        await updateGuestCartApi(item.variant._id, item.quantity + 1);
        const guestCart = await getGuestCart();

        // If cart became empty, remove coupon and clear guest storage
        if (!guestCart?.items || guestCart.items.length === 0) {
          dispatch(
            setCart({
              items: [],
              cartId: undefined,
              isGuest: true,
              appliedCoupon: null,
            })
          );
          try {
            localStorage.removeItem("guest_coupon");
          } catch {}
        } else {
          let guestApplied: AppliedCoupon | null = null;
          if (guestCart.coupon) {
            guestApplied = {
              code: guestCart.coupon.code,
              discountValue:
                guestCart.coupon.discountValue ??
                guestCart.coupon.discount ??
                0,
              type:
                (guestCart.coupon.discountType || "").toLowerCase() ===
                "percentage"
                  ? "percentage"
                  : "flat",
              maxDiscount:
                guestCart.coupon.maxDiscountAmount ??
                guestCart.coupon.maxDiscount,
              minCartValue: guestCart.coupon.minCartValue,
            };
          }

          dispatch(
            setCart({
              items: guestCart.items,
              isGuest: true,
              appliedCoupon: guestApplied,
            })
          );
        }

        toast.success("Quantity updated");
      } else {
        const res = await updateCartQuantityApi(cartItemId, item.quantity + 1);

        if (!res?.success) {
          toast.error(res?.message || "Failed to update quantity");
          return;
        }

        let serverAppliedCoupon: AppliedCoupon | null = null;

        // If cart is now empty, clear coupon server-side (best-effort) and locally
        if (!res.items || res.items.length === 0) {
          try {
            await fetch("/api/coupon/remove-coupon", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
            });
          } catch (e) {
            // ignore
          }
        } else if (res.coupon) {
          let dv = res.coupon.discountValue ?? res.coupon.discountAmount ?? 0;
          // if percentage and discountValue missing, reuse existing appliedCoupon percentage if available
          if (
            res.coupon.discountType?.toLowerCase() === "percentage" &&
            res.coupon.discountValue === undefined &&
            appliedCoupon?.code === res.coupon.code
          ) {
            dv = appliedCoupon?.discountValue ?? dv;
          }

          serverAppliedCoupon = {
            code: res.coupon.code,
            discountValue: dv,
            type:
              (res.coupon.discountType || "").toLowerCase() === "percentage"
                ? "percentage"
                : "flat",
            maxDiscount: res.coupon.maxDiscountAmount ?? res.coupon.maxDiscount,
            minCartValue: res.coupon.minCartValue,
          };
        }

        dispatch(
          setCart({
            items: res.items,
            cartId: res.cartId,
            isGuest: false,
            appliedCoupon: serverAppliedCoupon,
          })
        );

        toast.success(res.message);
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleDecrease = async (cartItemId: string) => {
    const item = cartItems.find((i) => i._id === cartItemId);
    if (!item || item.quantity <= 1) return;

    try {
      if (isGuest) {
        await updateGuestCartApi(item.variant._id, item.quantity - 1);
        const guestCart = await getGuestCart();
        let guestApplied: AppliedCoupon | null = null;
        if (guestCart?.coupon) {
          guestApplied = {
            code: guestCart.coupon.code,
            discountValue:
              guestCart.coupon.discountValue ?? guestCart.coupon.discount ?? 0,
            type:
              (guestCart.coupon.discountType || "").toLowerCase() ===
              "percentage"
                ? "percentage"
                : "flat",
            maxDiscount:
              guestCart.coupon.maxDiscountAmount ??
              guestCart.coupon.maxDiscount,
            minCartValue: guestCart.coupon.minCartValue,
          };
        }

        // fallback to localStorage (if coupon applied client-side)
        if (!guestApplied && typeof window !== "undefined") {
          try {
            const saved = localStorage.getItem("guest_coupon");
            if (saved) {
              const parsed = JSON.parse(saved);
              const dv = parsed.discountValue ?? parsed.discount;
              if (parsed.code && dv) {
                guestApplied = {
                  code: parsed.code,
                  discountValue: dv,
                  type: parsed.type,
                  maxDiscount: parsed.maxDiscount,
                  minCartValue: parsed.minCartValue,
                };
              }
            }
          } catch {}
        }

        if (!guestCart?.items || guestCart.items.length === 0) {
          dispatch(
            setCart({
              items: [],
              cartId: undefined,
              isGuest: true,
              appliedCoupon: null,
            })
          );
          try {
            localStorage.removeItem("guest_coupon");
          } catch {}
        } else {
          dispatch(
            setCart({
              items: guestCart.items,
              isGuest: true,
              appliedCoupon: guestApplied,
            })
          );
        }
        toast.success("Quantity updated");
      } else {
        const res = await updateCartQuantityApi(cartItemId, item.quantity - 1);

        if (!res?.success) {
          toast.error(res?.message || "Failed to update quantity");
          return;
        }

        let serverAppliedCoupon: AppliedCoupon | null = null;
        // If cart is now empty, clear coupon server-side (best-effort) and locally
        if (!res.items || res.items.length === 0) {
          try {
            await fetch("/api/coupon/remove-coupon", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
            });
          } catch (e) {
            // ignore
          }
        } else if (res.coupon) {
          let dv = res.coupon.discountValue ?? res.coupon.discountAmount ?? 0;
          // if percentage and discountValue missing, reuse existing appliedCoupon percentage if available
          if (
            res.coupon.discountType?.toLowerCase() === "percentage" &&
            res.coupon.discountValue === undefined &&
            appliedCoupon?.code === res.coupon.code
          ) {
            dv = appliedCoupon?.discountValue ?? dv;
          }

          serverAppliedCoupon = {
            code: res.coupon.code,
            discountValue: dv,
            type:
              (res.coupon.discountType || "").toLowerCase() === "percentage"
                ? "percentage"
                : "flat",
            maxDiscount: res.coupon.maxDiscountAmount ?? res.coupon.maxDiscount,
            minCartValue: res.coupon.minCartValue,
          };
        }

        dispatch(
          setCart({
            items: res.items,
            cartId: res.cartId,
            isGuest: false,
            appliedCoupon: serverAppliedCoupon,
          })
        );

        toast.success(res.message);
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleRemove = async (cartItemId: string) => {
    const item = cartItems.find((i) => i._id === cartItemId);
    if (!item) return;

    try {
      if (isGuest) {
        await updateGuestCartApi(item.variant._id, 0);
        const guestCart = await getGuestCart();
        let guestApplied: AppliedCoupon | null = null;
        if (guestCart?.coupon) {
          guestApplied = {
            code: guestCart.coupon.code,
            discountValue:
              guestCart.coupon.discountValue ?? guestCart.coupon.discount ?? 0,
            type:
              (guestCart.coupon.discountType || "").toLowerCase() ===
              "percentage"
                ? "percentage"
                : "flat",
            maxDiscount:
              guestCart.coupon.maxDiscountAmount ??
              guestCart.coupon.maxDiscount,
            minCartValue: guestCart.coupon.minCartValue,
          };
        }

        // If cart became empty, remove coupon and clear guest storage
        if (!guestCart?.items || guestCart.items.length === 0) {
          dispatch(
            setCart({
              items: [],
              cartId: undefined,
              isGuest: true,
              appliedCoupon: null,
            })
          );
          try {
            localStorage.removeItem("guest_coupon");
          } catch {}
        } else {
          // fallback to localStorage (if coupon was applied client-side)
          if (!guestApplied && typeof window !== "undefined") {
            try {
              const saved = localStorage.getItem("guest_coupon");
              if (saved) {
                const parsed = JSON.parse(saved);
                const dv = parsed.discountValue ?? parsed.discount;
                if (parsed.code && dv) {
                  guestApplied = {
                    code: parsed.code,
                    discountValue: dv,
                    type: parsed.type,
                    maxDiscount: parsed.maxDiscount,
                    minCartValue: parsed.minCartValue,
                  };
                }
              }
            } catch {}
          }

          dispatch(
            setCart({
              items: guestCart.items,
              isGuest: true,
              appliedCoupon: guestApplied,
            })
          );
        }
        toast.success("Item removed from cart");
      } else {
        const response = await removeFromCartApi(cartItemId);

        if (!response?.success) {
          toast.error(response?.message || "Failed to remove item");
          return;
        }

        let serverAppliedCoupon: AppliedCoupon | null = null;
        // If cart is now empty, clear coupon server-side (best-effort) and locally
        if (!response.items || response.items.length === 0) {
          try {
            await fetch("/api/coupon/remove-coupon", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
            });
          } catch (e) {
            // ignore
          }
        } else if (response.coupon) {
          let dv =
            response.coupon.discountValue ??
            response.coupon.discountAmount ??
            0;
          if (
            response.coupon.discountType?.toLowerCase() === "percentage" &&
            response.coupon.discountValue === undefined &&
            appliedCoupon?.code === response.coupon.code
          ) {
            dv = appliedCoupon?.discountValue ?? dv;
          }

          serverAppliedCoupon = {
            code: response.coupon.code,
            discountValue: dv,
            type:
              (response.coupon.discountType || "").toLowerCase() ===
              "percentage"
                ? "percentage"
                : "flat",
            maxDiscount:
              response.coupon.maxDiscountAmount ?? response.coupon.maxDiscount,
            minCartValue: response.coupon.minCartValue,
          };
        }

        dispatch(
          setCart({
            items: response.items,
            cartId: response.cartId,
            isGuest: false,
            appliedCoupon: serverAppliedCoupon,
          })
        );

        toast.success(response.message);
      }
    } catch (error: any) {
      toast.error(error?.message || "Something went wrong");
    }
  };

  /* ================= EMPTY CART ================= */
  if (!loading && cartItems.length === 0) {
    return (
      <div className="w-[90%] mx-auto mt-20 text-center">
        <ShoppingBasket className="w-16 h-16 mx-auto text-green-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">
          Add some groceries to continue shopping
        </p>
        <Link
          href="/"
          className="inline-block bg-green-600 text-white px-6 py-3 rounded-full font-medium hover:bg-green-700 transition"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  /* ================= MAIN UI ================= */
  return (
    <div className="w-[95%] sm:w-[90%] md:w-[85%] mx-auto mt-8 mb-24">
      {/* HEADER WITH BACK AND CLEAR BUTTON */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-green-700 font-medium"
        >
          <ArrowLeft size={18} />
          Back to home
        </Link>

        {/* CLEAR CART BUTTON - Only shows when cart has items */}
        {cartItems.length > 0 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClearCart}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-full font-medium transition-all"
          >
            <Trash2 size={16} />
            Clear Cart
          </motion.button>
        )}
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-green-700 mb-8 text-center">
        Your Shopping Cart
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CART ITEMS */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {cartItems.map((item) => {
              const discountPercent = item.variant.price.discountPercent || 0;
              const itemTotal = item.variant.price.selling * item.quantity;
              const itemSavings =
                (item.variant.price.mrp - item.variant.price.selling) *
                item.quantity;
              const itemMRP = item.variant.price.mrp * item.quantity;

              return (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md px-4 py-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Image
                        src={
                          item.variant.grocery?.images?.[0]?.url ||
                          "/placeholder.png"
                        }
                        alt={item.variant.grocery?.name || "Grocery item"}
                        width={64}
                        height={64}
                        className="object-contain"
                      />

                      <div>
                        <h4 className="font-semibold text-gray-800">
                          {item.variant.grocery?.name || "Unknown Item"}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {item.variant.label}
                        </p>

                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs line-through text-gray-400">
                            ₹{item.variant.price.mrp}
                          </span>
                          <span className="text-green-700 font-bold">
                            ₹{item.variant.price.selling}
                          </span>
                          {discountPercent > 0 && (
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">
                              {discountPercent}% OFF
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-700 mt-1">
                          ₹{item.variant.price.selling} × {item.quantity} ={" "}
                          <span className="font-semibold">
                            ₹{itemTotal.toFixed(2)}
                          </span>
                        </p>

                        {itemSavings > 0 && (
                          <div className="mt-1">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-green-700 font-medium">
                                You save:
                              </span>
                              <span className="text-xs font-bold text-green-700">
                                ₹{itemSavings.toFixed(2)}
                              </span>
                              <span className="text-xs text-gray-500">
                                (on MRP ₹{itemMRP.toFixed(2)})
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 bg-gray-100 px-3 py-1.5 rounded-full">
                        <button
                          disabled={item.quantity === 1}
                          onClick={() => handleDecrease(item._id)}
                          className="disabled:opacity-40 bg-white p-1.5 rounded-full hover:bg-green-100 border"
                        >
                          <Minus size={14} />
                        </button>

                        <span className="text-sm font-semibold">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => handleIncrease(item._id)}
                          className="bg-white p-1.5 rounded-full hover:bg-green-100 border"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemove(item._id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ORDER SUMMARY WITH COUPON SECTION */}
        <div className="space-y-6">
          {/* COUPON SECTION */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl shadow-md p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Tag className="w-5 h-5 text-green-600" />
                Apply Coupon
              </h3>
              <button
                onClick={() => setShowCouponInput(!showCouponInput)}
                className="flex items-center gap-1 text-green-600 hover:text-green-700 font-medium text-sm"
              >
                {showCouponInput ? "Hide" : "Apply Coupon"}
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    showCouponInput ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {/* Manual Coupon Input */}
            <AnimatePresence>
              {showCouponInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponError("");
                      }}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleApplyCoupon()
                      }
                      className="flex-1 rounded-lg px-3 py-2.5 text-sm bg-white border border-gray-300 focus:border-green-600 focus:ring-2 focus:ring-green-500/30 focus:ring-inset outline-none transition-all"
                    />

                    <button
                      className="bg-green-600 text-white px-5 rounded-lg hover:bg-green-700 transition-all font-medium flex items-center justify-center disabled:opacity-50"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                    >
                      {couponLoading ? "Applying..." : "Apply"}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-red-500 text-sm mb-2">{couponError}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Applied Coupon */}
            {appliedCoupon && couponDiscount > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-700">
                      {appliedCoupon.code}
                    </span>
                    <span className="text-sm text-green-600">
                      -₹{couponDiscount.toFixed(2)} applied
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Available Coupons */}
            <div className="mt-4">
              <button
                onClick={() => setShowAvailableCoupons(!showAvailableCoupons)}
                className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium text-sm"
              >
                <Zap className="w-4 h-4" />
                {showAvailableCoupons ? "Hide" : "Show"} available coupons
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    showAvailableCoupons ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {showAvailableCoupons && availableCoupons.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-2">
                      {availableCoupons.map((coupon) => (
                        <div
                          key={coupon._id || coupon.code}
                          className={`p-3 border rounded-lg cursor-pointer transition-all hover:border-green-300 ${
                            appliedCoupon?.code === coupon.code
                              ? "bg-green-50 border-green-300"
                              : "hover:bg-gray-50"
                          }`}
                          onClick={() => handleAvailableCouponClick(coupon)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-800">
                                  {coupon.code}
                                </span>
                                {coupon.discountType === "PERCENTAGE" ? (
                                  <Percent className="w-3 h-3 text-green-600" />
                                ) : (
                                  <IndianRupee className="w-3 h-3 text-green-600" />
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {coupon.description ||
                                  `${
                                    coupon.discountType === "PERCENTAGE"
                                      ? coupon.discountValue + "%"
                                      : "₹" + coupon.discountValue
                                  } discount`}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold text-green-600 block">
                                {coupon.discountType === "PERCENTAGE"
                                  ? `${coupon.discountValue}% OFF`
                                  : `₹${coupon.discountValue} OFF`}
                              </span>
                              {coupon.minCartValue && (
                                <p className="text-xs text-gray-500">
                                  Min. cart: ₹{coupon.minCartValue}
                                </p>
                              )}
                            </div>
                          </div>
                          {coupon.maxDiscountAmount &&
                            coupon.discountType === "PERCENTAGE" && (
                              <p className="text-xs text-gray-500 mt-1">
                                Max discount: ₹{coupon.maxDiscountAmount}
                              </p>
                            )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ORDER SUMMARY */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white rounded-xl shadow-md p-5 h-fit sticky top-24"
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
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              className="mt-5 w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-full font-semibold"
              onClick={() => {
                if (isGuest) {
                  router.push("/login?redirect=/user/checkout");
                } else {
                  router.push("/user/checkout");
                }
              }}
            >
              Proceed to Checkout
            </motion.button>

            <div className="mt-4 text-xs text-gray-500 space-y-1">
              <p>• Free delivery on orders above ₹500</p>
              <p>• Easy returns within 30 minutes</p>
              <p>• Best prices guaranteed</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
