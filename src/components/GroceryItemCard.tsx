// src/components/GroceryItemCard.tsx
"use client";

import "keen-slider/keen-slider.min.css";
import { useKeenSlider } from "keen-slider/react";
import { Minus, Plus, ShoppingCart, Star, Heart, Info, Layers, X } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  addGuestCartApi,
  addToCartApi,
  fetchCartApi,
  getGuestCart,
  updateCartQuantityApi,
  updateGuestCartApi,
} from "@/hooks/cart.api";
import { getPriceRange, hasVariablePricing } from "@/lib/utils/priceUtils";
import { setCart } from "@/redux/features/cartSlice";
import { AppDispatch, RootState } from "@/redux/store";
import axios from "axios";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import AdvancedWishlistSheet from "./AdvancedWishlistSheet";

interface IVariant {
  _id: string;
  label: string;
  variantName?: string;
  unit: { value: number; unit: string };
  price: { mrp: number; selling: number; discountPercent?: number };
  countInStock?: number;
  isDefault?: boolean;
}

interface IGrocery {
  _id: string;
  name: string;
  brand?: string;
  category: { _id: string; name: string; allowedUnits: string[] };
  images?: Array<{ url: string; publicId: string }>;
  variants?: IVariant[];
}

const generateTempCartItemId = () => {
  const randomUUIDFn = globalThis.crypto?.randomUUID;
  if (typeof randomUUIDFn === "function") {
    return randomUUIDFn.call(globalThis.crypto);
  }

  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const GroceryItemCard = ({
  grocery,
  rating,
  viewMode = "grid",
}: {
  grocery: IGrocery;
  rating?: number;
  viewMode?: "grid" | "list";
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const hoverInterval = useRef<NodeJS.Timeout | null>(null);
  const [showVariantBubble, setShowVariantBubble] = useState(false);
  const variantBubbleRef = useRef<HTMLDivElement | null>(null);
  const totalInCartRef = useRef<HTMLDivElement | null>(null);
  const [variantSheetOpen, setVariantSheetOpen] = useState(false);
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );
  const [showTotalBreakdown, setShowTotalBreakdown] = useState(false);

  // Loading states to prevent double clicks
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isUpdatingQuantity, setIsUpdatingQuantity] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistSheetOpen, setWishlistSheetOpen] = useState(false);

  const { cartItems, appliedCoupon } = useSelector(
    (state: RootState) => state.cart,
  );

  const defaultVariant =
    grocery?.variants?.find((v) => v.isDefault) || grocery?.variants?.[0];

  const selectedVariant =
    grocery?.variants?.find((v) => v._id === selectedVariantId) ||
    defaultVariant;

  const cartItem = cartItems.find(
    (item) => item.variant?._id === selectedVariant?._id,
  );
  const quantity = cartItem?.quantity ?? 0;

  // Show selected variant details after selection; otherwise fallback to default.
  const sellingPrice = selectedVariant?.price?.selling ?? 0;
  const mrpPrice = selectedVariant?.price?.mrp ?? 0;
  const stock = selectedVariant?.countInStock ?? 0;
  const isOutOfStock = stock === 0;
  const isMaxReached = quantity >= stock;

  // Check if there are multiple variants
  const hasMultipleVariants = (grocery?.variants?.length || 0) > 1;

  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    loop: true,
    slides: { perView: 1 },
  });
  const { data: session, status } = useSession();
  const isGuest = status === "unauthenticated";

  const handleMouseEnter = () => {
    if (!instanceRef.current) return;
    hoverInterval.current = setInterval(
      () => instanceRef.current?.next(),
      1000,
    );
  };

  const handleMouseLeave = () => {
    if (hoverInterval.current) {
      clearInterval(hoverInterval.current);
      hoverInterval.current = null;
    }
  };

  const getVariantCartItem = (variantId: string) =>
    cartItems.find((item) => item.variant?._id === variantId);

  const getVariantQuantity = (variantId: string) =>
    getVariantCartItem(variantId)?.quantity ?? 0;

  const syncCartToStore = (cart: any) => {
    let mappedCoupon: any = null;
    if (cart?.coupon) {
      let dv =
        cart.coupon.discountValue ??
        cart.coupon.discountAmount ??
        cart.coupon.discount ??
        0;
      if (
        (cart.coupon.discountType || "").toLowerCase() === "percentage" &&
        cart.coupon.discountValue === undefined &&
        appliedCoupon?.code === cart.coupon.code
      ) {
        dv = appliedCoupon?.discountValue ?? dv;
      }

      mappedCoupon = {
        code: cart.coupon.code,
        discountValue: dv,
        type:
          (cart.coupon.discountType || "").toLowerCase() === "percentage"
            ? "percentage"
            : "flat",
        maxDiscount: cart.coupon.maxDiscountAmount ?? cart.coupon.maxDiscount,
        minCartValue: cart.coupon.minCartValue,
      };
    }

    dispatch(
      setCart({
        items: cart?.items ?? [],
        cartId: cart?._id ?? cart?.cartId ?? null,
        isGuest: cart?.isGuest ?? false,
        appliedCoupon: mappedCoupon,
      }),
    );
  };

  /* ================= CART ACTIONS ================= */

  const handleAddToCart = async (targetVariant?: IVariant) => {
    const variantToAdd = targetVariant || selectedVariant || defaultVariant;
    if (!variantToAdd?._id || isAddingToCart) return false; // Prevent double clicks

    const targetStock = variantToAdd?.countInStock ?? 0;

    setIsAddingToCart(true);

    try {
      if (isGuest) {
        // OPTIMISTIC UPDATE (instant UI feedback like Flipkart)
        const updatedItems = [...cartItems];
        const existing = updatedItems.find(
          (i) => i.variant._id === variantToAdd._id,
        );

        if (existing) {
          if (existing.quantity < targetStock) existing.quantity += 1;
        } else {
          updatedItems.push({
            _id: generateTempCartItemId(),
            variant: variantToAdd,
            quantity: 1,
            priceAtAdd: {
              mrp: variantToAdd.price.mrp,
              selling: variantToAdd.price.selling,
            },
          });
        }

        // Update UI immediately
        dispatch(setCart({ items: updatedItems, cartId: null, isGuest: true }));
        toast.success("Item added to cart!");

        // Sync with server in background
        const res = await addGuestCartApi(variantToAdd._id, 1);
        if (!res.success) {
          // Revert if fails
          dispatch(setCart({ items: cartItems, cartId: null, isGuest: true }));
          toast.error(res.message);
          return false;
        }
      } else {
        // OPTIMISTIC UPDATE for logged-in users
        const updatedItems = [...cartItems];
        const existing = updatedItems.find(
          (i) => i.variant._id === variantToAdd._id,
        );

        if (existing) {
          if (existing.quantity < targetStock) existing.quantity += 1;
        } else {
          updatedItems.push({
            _id: generateTempCartItemId(),
            variant: variantToAdd,
            quantity: 1,
            priceAtAdd: {
              mrp: variantToAdd.price.mrp,
              selling: variantToAdd.price.selling,
            },
          });
        }

        // Update UI immediately with proper cart state
        dispatch(setCart({ items: updatedItems, isGuest: false }));
        toast.success("Item added to cart!");

        // Sync with server in background
        const res = await addToCartApi(variantToAdd._id, 1);
        syncCartToStore(res);
        if (!res.success) {
          // Show error if sync fails
          dispatch(setCart({ items: cartItems, isGuest: false }));
          toast.error(res.message || "Failed to add to cart");
          return false;
        }
      }
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
      return false;
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleIncreaseVariant = async (variant: IVariant) => {
    if (!variant?._id || isUpdatingQuantity || isAddingToCart) return;

    const variantCartItem = getVariantCartItem(variant._id);
    const variantQuantity = variantCartItem?.quantity ?? 0;
    const variantStock = variant.countInStock ?? 0;
    if (variantQuantity >= variantStock) return;

    if (!variantCartItem) {
      await handleAddToCart(variant);
      return;
    }

    setIsUpdatingQuantity(true);

    try {
      if (isGuest) {
        const updatedItems = cartItems.map((i) =>
          i._id === variantCartItem._id && i.quantity < variantStock
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );

        dispatch(setCart({ items: updatedItems, cartId: null, isGuest: true }));
        toast.success("Quantity updated!");

        const newQty =
          updatedItems.find((i) => i._id === variantCartItem._id)?.quantity ||
          1;
        const res = await updateGuestCartApi(variant._id, newQty);
        if (!res.success) {
          dispatch(setCart({ items: cartItems, cartId: null, isGuest: true }));
          toast.error(res.message);
        }
      } else {
        const res = await updateCartQuantityApi(
          variantCartItem._id,
          variantQuantity + 1,
        );
        if (res.success) {
          toast.success("Quantity updated!");
          syncCartToStore(res);
        } else {
          toast.error(res.message || "Failed to update quantity");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setIsUpdatingQuantity(false);
    }
  };

  const handleDecreaseVariant = async (variant: IVariant) => {
    if (!variant?._id || isUpdatingQuantity) return;

    const variantCartItem = getVariantCartItem(variant._id);
    if (!variantCartItem) return;

    const variantQuantity = variantCartItem.quantity;
    if (variantQuantity <= 0) return;

    setIsUpdatingQuantity(true);

    try {
      if (isGuest) {
        const updatedItems = cartItems
          .map((i) =>
            i._id === variantCartItem._id
              ? { ...i, quantity: i.quantity - 1 }
              : i,
          )
          .filter((i) => i.quantity > 0);

        dispatch(setCart({ items: updatedItems, cartId: null, isGuest: true }));

        const newQty =
          updatedItems.find((i) => i._id === variantCartItem._id)?.quantity ||
          0;
        const res = await updateGuestCartApi(variant._id, newQty);
        if (res.success) {
          if (newQty === 0) {
            toast.success("Item removed from cart!");
          } else {
            toast.success("Quantity updated!");
          }
        } else {
          dispatch(setCart({ items: cartItems, cartId: null, isGuest: true }));
          toast.error(res.message);
        }
      } else {
        const res = await updateCartQuantityApi(
          variantCartItem._id,
          variantQuantity - 1,
        );
        if (res.success) {
          if (variantQuantity - 1 === 0) {
            toast.success("Item removed from cart!");
          } else {
            toast.success("Quantity updated!");
          }
          syncCartToStore(res);
        } else {
          toast.error(res.message || "Failed to update quantity");
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setIsUpdatingQuantity(false);
    }
  };

  const handleIncrease = async () => {
    if (!selectedVariant) return;
    await handleIncreaseVariant(selectedVariant);
  };

  const handleDecrease = async () => {
    if (!selectedVariant) return;
    await handleDecreaseVariant(selectedVariant);
  };

  /* ================= LOAD CART ================= */
  useEffect(() => {
    if (status === "loading") return;

    const loadCart = async () => {
      if (status === "unauthenticated") {
        const guestCart = await getGuestCart();
        syncCartToStore({ items: guestCart?.items || [], isGuest: true });
      }

      if (status === "authenticated") {
        const cart = await fetchCartApi();
        syncCartToStore({
          items: cart?.items || [],
          cartId: cart?.cartId,
          isGuest: false,
        });
      }
    };

    loadCart();
  }, [status]);

  /* ================= CHECK WISHLIST STATUS ================= */
  useEffect(() => {
    let isMounted = true;

    if (status !== "authenticated" || !grocery?._id) {
      setIsWishlisted(false);
      return;
    }

    const checkWishlistStatus = async () => {
      try {
        const res = await fetch("/api/wishlist", { cache: "no-store" });
        const data = await res.json();
        if (data?.success && isMounted) {
          const saved = (data.collections || []).some(
            (c: any) =>
              Array.isArray(c?.items) &&
              c.items.some((i: any) => i.grocery === grocery._id),
          );
          setIsWishlisted(saved);
        }
      } catch {
        if (isMounted) setIsWishlisted(false);
      }
    };

    checkWishlistStatus();
    return () => {
      isMounted = false;
    };
  }, [status, grocery?._id]);

  const openWishlistSheet = () => {
    if (status !== "authenticated") {
      toast.error("Please log in to use wishlist");
      return;
    }
    setWishlistSheetOpen(true);
  };

  const handleWishlistUpdate = () => {
    // Refresh wishlist status after adding/removing from sheet
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/wishlist", { cache: "no-store" });
        const data = await res.json();
        if (data?.success) {
          const saved = (data.collections || []).some(
            (c: any) =>
              Array.isArray(c?.items) &&
              c.items.some((i: any) => i.grocery === grocery._id),
          );
          setIsWishlisted(saved);
        }
      } catch {
        // Silent fail
      }
    };
    checkStatus();
  };

  const getVariantDisplayName = (variant?: IVariant | null) => {
    if (!variant) return "";
    return variant.variantName
      ? `${variant.variantName} - ${variant.label}`
      : variant.label;
  };

  const activeVariantLabel = getVariantDisplayName(
    selectedVariant || defaultVariant,
  );
  const productVariantIds = useMemo(
    () => new Set((grocery?.variants || []).map((variant) => variant._id)),
    [grocery?.variants],
  );
  const productTotalQuantity = useMemo(
    () =>
      cartItems
        .filter((item) => item?.variant?._id && productVariantIds.has(item.variant._id))
        .reduce((sum, item) => sum + (item.quantity || 0), 0),
    [cartItems, productVariantIds],
  );
  const totalInCartBreakdown = useMemo(
    () =>
      (grocery?.variants || [])
        .map((variant) => {
          const qty =
            cartItems.find((item) => item?.variant?._id === variant._id)
              ?.quantity ?? 0;
          return {
            id: variant._id,
            name: variant.variantName
              ? `${variant.variantName} - ${variant.label}`
              : variant.label,
            qty,
          };
        })
        .filter((entry) => entry.qty > 0),
    [grocery?.variants, cartItems],
  );
  const handleCardAddClick = async () => {
    if (hasMultipleVariants) {
      setVariantSheetOpen(true);
      return;
    }

    await handleAddToCart();
  };

  useEffect(() => {
    if (variantSheetOpen && !selectedVariantId && defaultVariant?._id) {
      setSelectedVariantId(defaultVariant._id);
    }
  }, [variantSheetOpen, selectedVariantId, defaultVariant?._id]);

  useEffect(() => {
    if (!showTotalBreakdown) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        totalInCartRef.current &&
        !totalInCartRef.current.contains(event.target as Node)
      ) {
        setShowTotalBreakdown(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showTotalBreakdown]);

  // Rating handling for homepage and other views where rating prop isn't passed
  const [computedRating, setComputedRating] = useState<number | null>(
    typeof rating === "number" ? rating : null,
  );
  const [reviewCount, setReviewCount] = useState<number>(0);

  useEffect(() => {
    if ((computedRating === null || reviewCount === 0) && grocery?._id) {
      axios
        .get(`/api/reviews/${grocery._id}`)
        .then((res) => {
          const avg = res?.data?.data?.averageRating ?? 0;
          const total = res?.data?.data?.totalReviews ?? 0;
          setReviewCount(total);
          setComputedRating((prev) => (prev === null ? avg : prev));
        })
        .catch(() => {
          setReviewCount(0);
          setComputedRating((prev) => (prev === null ? 0 : prev));
        });
    }
  }, [computedRating, reviewCount, grocery?._id]);

  // Rating badge mapping (image ribbon) with tiered colors
  const trustThreshold = 10;
  const getRatingBadgeData = (r: number, count: number) => {
    if (count < trustThreshold) return null;
    if (r >= 4.5)
      return { label: "Top Rated", color: "from-yellow-500 to-yellow-600" }; // Gold
    if (r >= 4.0)
      return { label: "Highly Rated", color: "from-blue-500 to-blue-600" }; // Blue
    if (r >= 3.5)
      return { label: "Well Rated", color: "from-purple-500 to-purple-600" }; // Purple
    if (r >= 3.0)
      return { label: "Decent", color: "from-gray-500 to-gray-600" }; // Gray
    // Hide Mixed and Low Rated to keep cards positive
    return null;
  };
  const badgeData =
    typeof computedRating === "number"
      ? getRatingBadgeData(computedRating, reviewCount)
      : null;

  const isListView = viewMode === "list";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all overflow-visible border border-gray-100 flex flex-col h-full min-h-[320px] sm:min-h-[340px] ${
        isListView
          ? "md:flex-row md:items-stretch md:gap-4 md:min-h-[220px] md:h-auto"
          : ""
      }`}
    >
      {/* IMAGE */}
      <div
        className={`relative overflow-hidden ${
          isListView
            ? "md:w-64 md:flex-shrink-0 md:rounded-l-2xl md:rounded-r-none"
            : "rounded-t-2xl"
        }`}
      >
        <Link
          href={`/user/product-details/${grocery?._id}`}
          className="block w-full h-full"
          aria-label={`${grocery?.name} details`}
        >
          <div
            ref={sliderRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`keen-slider relative bg-gray-50 h-32 sm:h-36 md:h-40 ${
              isListView ? "w-full md:w-64" : "w-full"
            }`}
          >
            {grocery?.images?.map((img) => (
              <div key={img.publicId} className="keen-slider__slide relative">
                <Image
                  src={img.url}
                  alt={grocery?.name}
                  fill
                  className="object-contain p-4"
                />
              </div>
            ))}
          </div>
        </Link>

        {/* DISCOUNT RIBBON - Top Left Corner */}
        {mrpPrice > 0 && mrpPrice > (sellingPrice as number) && (
          <div className="discount-ribbon">
            {Math.round(((mrpPrice - (sellingPrice as number)) / mrpPrice) * 100)}% OFF
          </div>
        )}

        {badgeData && (
          <div
            className={`absolute ${mrpPrice > (sellingPrice as number) ? 'top-10' : 'top-2'} left-2 z-20 px-2 py-1 rounded-full text-[10px] font-semibold text-white bg-gradient-to-r ${badgeData.color} shadow-sm`}
          >
            {badgeData.label}
          </div>
        )}

        {/* WISHLIST HEART BUTTON - Top Right Corner */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openWishlistSheet();
          }}
          disabled={wishlistLoading}
          className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title={isWishlisted ? "Saved in wishlist" : "Add to wishlist"}
        >
          {wishlistLoading ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
          ) : (
            <Heart
              className={`w-4 h-4 transition-all ${
                isWishlisted
                  ? "fill-red-500 text-red-500 scale-110"
                  : "text-gray-600 hover:text-red-500 hover:scale-110"
              }`}
            />
          )}
        </motion.button>

        {/* SIMILAR ITEMS & INFO BUTTONS - Bottom Left Corner */}
        <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setInfoSheetOpen(true);
            }}
            className="p-1 rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:bg-white text-gray-600 hover:text-emerald-600 hover:scale-105 transition-all"
            title="Product Details"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          {grocery?.category?._id && (
            <Link
              href={`/user/products?category=${grocery.category._id}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-full bg-white/90 backdrop-blur-sm shadow-md hover:bg-white text-gray-600 hover:text-emerald-600 hover:scale-105 transition-all"
              title="Similar Items"
            >
              <Layers className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* RATING OVERLAY - Flipkart style at bottom of image */}
        {typeof computedRating === "number" && computedRating > 0 && (
          <div className="absolute bottom-2 right-2 z-10 bg-white/95 backdrop-blur-sm rounded px-2 py-0.5 flex items-center gap-1 shadow-sm">
            <div className="flex items-center gap-0.5">
              <span className="text-xs font-bold text-gray-800">
                {computedRating.toFixed(1)}
              </span>
              <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
            </div>
            <span className="text-gray-300 text-[8px]">|</span>
            <span className="text-[11px] font-semibold text-gray-800">
              {reviewCount >= 1000
                ? (reviewCount / 1000).toFixed(1) + "k+"
                : reviewCount + "+"}
            </span>
          </div>
        )}
      </div>

      {/* INFO */}
      <div className="p-3 flex flex-col flex-1 md:p-4">
        <p className="text-xs text-gray-500">{grocery?.category?.name}</p>
        {grocery?.brand && (
          <p className="text-xs text-gray-400 font-medium uppercase">
            {grocery?.brand}
          </p>
        )}
        <h3 className="font-semibold text-gray-800 text-sm mt-1 leading-tight line-clamp-2 min-h-[36px]">
          {grocery?.name}
        </h3>

        {/* PRICE & VARIANTS - flexible growth */}
        <div className={`flex flex-col ${isListView ? "" : "flex-grow"}`}>
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            <span className="text-green-700 font-bold text-base">
              ₹{sellingPrice}
            </span>
            {mrpPrice && mrpPrice > (sellingPrice as number) && (
              <span className="line-through text-gray-400 text-xs">
                ₹{mrpPrice}
              </span>
            )}
            {mrpPrice && mrpPrice > (sellingPrice as number) && (
              <span className="text-red-500 text-xs font-medium">
                {Math.round(
                  ((mrpPrice - (sellingPrice as number)) / mrpPrice) * 100,
                )}
                % OFF
              </span>
            )}
            {hasMultipleVariants && (
              <div
                className="relative inline-block"
                onMouseEnter={() => setShowVariantBubble(true)}
                onMouseLeave={() => setShowVariantBubble(false)}
              >
                <span className="text-blue-600 text-xs font-semibold ml-1 cursor-pointer hover:text-blue-800 transition-colors">
                  +{(grocery?.variants?.length || 1) - 1} variants
                </span>

                {/* BUBBLE TOOLTIP */}
                {showVariantBubble && (
                  <motion.div
                    ref={variantBubbleRef}
                    initial={{ opacity: 0, scale: 0.8, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-[120] bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg shadow-lg border border-blue-500 max-w-xs"
                  >
                    {/* Arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-blue-600"></div>

                    <div className="p-2">
                      <p className="text-[10px] font-semibold mb-1 opacity-90">
                        Variants:
                      </p>
                      <div className="space-y-0.5">
                        {grocery?.variants?.map((variant) => (
                          <div
                            key={variant._id}
                            className={`flex justify-between items-center text-[9px] p-1 rounded gap-2 ${
                              variant._id === defaultVariant?._id
                                ? "bg-blue-500 font-semibold"
                                : "bg-blue-600/40 hover:bg-blue-500/50"
                            } transition-colors`}
                          >
                            <span className="whitespace-nowrap text-[8px]">
                              {getVariantDisplayName(variant)}
                            </span>
                            <span className="font-bold whitespace-nowrap flex-shrink-0">
                              ₹{variant.price.selling}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* UNIT */}
        <div
          className={`flex justify-between items-center pt-2 text-sm border-t border-gray-100 ${
            isListView ? "mt-3" : "mt-auto"
          }`}
        >
          <span className="bg-gray-100 text-gray-900 text-[11px] font-medium px-2 py-1 rounded max-w-[170px] break-words leading-tight">
            {activeVariantLabel}
          </span>
          {isOutOfStock ? (
            <span className="text-red-500">Out of stock</span>
          ) : stock <= 5 ? (
            <span className="text-orange-600">Only {stock} left</span>
          ) : (
            <span className="text-green-600">
              <span className="font-semibold">{stock}</span> In stock
            </span>
          )}
        </div>

        {/* CART */}
        <div className="mt-2">
          {hasMultipleVariants && productTotalQuantity > 0 && (
            <div
              ref={totalInCartRef}
              className="relative inline-block mb-1 group"
              onMouseLeave={() => setShowTotalBreakdown(false)}
            >
              <button
                type="button"
                onClick={() => setShowTotalBreakdown((prev) => !prev)}
                className="text-[11px] text-emerald-700 font-medium cursor-help underline decoration-dotted underline-offset-2"
              >
                Total in cart: {productTotalQuantity}
              </button>

              <div
                className={`absolute bottom-full left-0 mb-2 w-56 rounded-lg border border-emerald-100 bg-white shadow-xl p-2 transition-opacity duration-150 z-[130] ${
                  showTotalBreakdown
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none group-hover:opacity-100"
                }`}
              >
                <p className="text-[10px] font-semibold text-emerald-800 mb-1">
                  Variant-wise qty
                </p>
                <div className="space-y-1">
                  {totalInCartBreakdown.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-2 text-[11px]"
                    >
                      <span className="text-gray-700 truncate">{entry.name}</span>
                      <span className="font-semibold text-emerald-700">
                        {entry.qty}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {quantity === 0 ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              disabled={isOutOfStock || isAddingToCart}
              onClick={handleCardAddClick}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-full py-1.5 md:py-1.5 text-xs md:text-sm font-medium transition-all disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
              {isAddingToCart
                ? "Adding..."
                : hasMultipleVariants
                ? `${grocery?.variants?.length || 0} Options`
                  : "Add to cart"}
            </motion.button>
          ) : (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center justify-between bg-green-50 border border-green-600 rounded-full px-2 py-1"
            >
              <button
                onClick={handleDecrease}
                disabled={isUpdatingQuantity}
                className="p-1 rounded-full hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Minus className="w-4 h-4 text-green-700" />
              </button>
              <span className="text-green-700 font-semibold text-sm">
                {quantity}
              </span>
              <button
                disabled={isMaxReached || isUpdatingQuantity}
                onClick={handleIncrease}
                className="p-1 rounded-full hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4 text-green-700" />
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {variantSheetOpen && hasMultipleVariants && (
        <div
          className="fixed inset-0 z-[140] bg-black/40 flex items-end sm:items-center justify-center"
          onClick={() => setVariantSheetOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h4 className="text-base font-semibold text-gray-900">Select variant</h4>
            <p className="text-xs text-gray-500 mt-1">{grocery.name}</p>

            <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
              {grocery.variants?.map((variant) => {
                const isSelected = selectedVariant?._id === variant._id;
                const variantOutOfStock = (variant.countInStock ?? 0) === 0;
                const variantQuantity = getVariantQuantity(variant._id);
                const variantMaxReached =
                  variantQuantity >= (variant.countInStock ?? 0);

                return (
                  <div
                    key={variant._id}
                    onClick={() => setSelectedVariantId(variant._id)}
                    className={`w-full text-left border rounded-xl px-3 py-2 transition ${
                      isSelected
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-gray-200 hover:border-emerald-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-gray-800 truncate max-w-[170px]">
                          {variant.variantName
                            ? `${variant.variantName} - ${variant.label}`
                            : variant.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {variantOutOfStock
                            ? "Out of stock"
                            : `${variant.countInStock ?? 0} in stock`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-700">
                          Rs {variant.price.selling}
                        </p>
                        {variant.price.mrp > variant.price.selling && (
                          <p className="text-xs text-gray-400 line-through">
                            Rs {variant.price.mrp}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex justify-end">
                      {variantQuantity === 0 ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleAddToCart(variant);
                          }}
                          disabled={variantOutOfStock || isAddingToCart}
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-3 py-1 text-xs font-semibold hover:bg-emerald-700 disabled:bg-gray-300"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          {isAddingToCart && isSelected ? "Adding..." : "Add"}
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-300 rounded-full px-1 py-1">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDecreaseVariant(variant);
                            }}
                            disabled={isUpdatingQuantity}
                            className="h-6 w-6 rounded-full bg-white border border-emerald-200 flex items-center justify-center disabled:opacity-50"
                          >
                            <Minus className="w-3 h-3 text-emerald-700" />
                          </button>
                          <span className="min-w-5 text-center text-xs font-semibold text-emerald-800">
                            {variantQuantity}
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleIncreaseVariant(variant);
                            }}
                            disabled={variantMaxReached || isUpdatingQuantity}
                            className="h-6 w-6 rounded-full bg-white border border-emerald-200 flex items-center justify-center disabled:opacity-40"
                          >
                            <Plus className="w-3 h-3 text-emerald-700" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setVariantSheetOpen(false)}
                className="w-full border border-gray-300 rounded-xl py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Wishlist Sheet Modal */}
      <AdvancedWishlistSheet
        isOpen={wishlistSheetOpen}
        onClose={() => {
          setWishlistSheetOpen(false);
          handleWishlistUpdate();
        }}
        productId={grocery._id}
        productTitle={grocery.name}
        productImage={grocery.images?.[0]?.url}
      />

      {/* Product Info Bottom Sheet / Modal */}
      {infoSheetOpen && (
        <div
          className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setInfoSheetOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <span className="text-xs font-semibold text-emerald-800 tracking-wider uppercase">
                Product Information
              </span>
              <button
                type="button"
                onClick={() => setInfoSheetOpen(false)}
                className="p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto premium-scroll p-5 space-y-6">
              {/* Product Card Info */}
              <div className="flex gap-4 items-start">
                <div className="relative w-28 h-28 bg-gray-50 border border-gray-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center p-2">
                  {grocery?.images?.[0]?.url ? (
                    <Image
                      src={grocery.images[0].url}
                      alt={grocery.name}
                      fill
                      className="object-contain p-2"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">No Image</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {grocery?.brand && (
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {grocery.brand}
                    </span>
                  )}
                  <h4 className="text-base font-bold text-gray-800 leading-snug mt-0.5">
                    {grocery.name}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">{grocery?.category?.name}</p>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-green-700 font-bold text-lg">
                      ₹{sellingPrice}
                    </span>
                    {mrpPrice && mrpPrice > (sellingPrice as number) && (
                      <span className="line-through text-gray-400 text-xs">
                        ₹{mrpPrice}
                      </span>
                    )}
                    {mrpPrice && mrpPrice > (sellingPrice as number) && (
                      <span className="text-xs font-semibold bg-red-50 text-red-500 px-1.5 py-0.5 rounded">
                        {Math.round(
                          ((mrpPrice - (sellingPrice as number)) / mrpPrice) * 100,
                        )}
                        % OFF
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description Section */}
              <div className="bg-emerald-50/45 border border-emerald-100/50 rounded-2xl p-4 space-y-2">
                <h5 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                  Description
                </h5>
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                  {grocery?.description ||
                    "This fresh and high-quality product is handpicked and stored under optimal conditions to ensure maximum freshness and quality. Product details are verified for accuracy."}
                </p>
              </div>

              {/* Specifications / Highlights */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  Product Details & Highlights
                </h5>
                <div className="border border-gray-100 rounded-xl overflow-hidden text-xs divide-y divide-gray-100">
                  <div className="flex justify-between p-3 bg-gray-50/50">
                    <span className="text-gray-500">Brand</span>
                    <span className="font-semibold text-gray-800">{grocery?.brand || "Ordinary"}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-gray-500">Category</span>
                    <span className="font-semibold text-gray-800">{grocery?.category?.name}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50/50">
                    <span className="text-gray-500">Selected Unit / Weight</span>
                    <span className="font-semibold text-gray-800">{activeVariantLabel}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-gray-500">Tax Information</span>
                    <span className="font-semibold text-gray-800 text-emerald-700">Inclusive of all taxes (GST)</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50/50">
                    <span className="text-gray-500">Shelf Life / Quality check</span>
                    <span className="font-semibold text-gray-800">Fresh & Premium standard</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer Cart Action */}
            <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400">Total Price</span>
                <span className="text-lg font-bold text-emerald-700">
                  ₹{sellingPrice}
                </span>
              </div>
              <div className="w-48 flex-shrink-0">
                {quantity === 0 ? (
                  <button
                    type="button"
                    disabled={isOutOfStock || isAddingToCart}
                    onClick={handleCardAddClick}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-full py-2.5 text-xs font-semibold transition-all"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {isAddingToCart ? "Adding..." : "Add to cart"}
                  </button>
                ) : (
                  <div className="flex items-center justify-between bg-green-50 border border-green-600 rounded-full px-2 py-1.5">
                    <button
                      type="button"
                      onClick={handleDecrease}
                      disabled={isUpdatingQuantity}
                      className="p-1 rounded-full hover:bg-green-100 disabled:opacity-50"
                    >
                      <Minus className="w-3.5 h-3.5 text-green-700" />
                    </button>
                    <span className="text-green-700 font-semibold text-xs">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      disabled={isMaxReached || isUpdatingQuantity}
                      onClick={handleIncrease}
                      className="p-1 rounded-full hover:bg-green-100 disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5 text-green-700" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default GroceryItemCard;
