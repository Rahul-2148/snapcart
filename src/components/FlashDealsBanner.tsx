// src/components/FlashDealsBanner.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Zap, Plus, Minus, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppDispatch, RootState } from "@/redux/store";
import { setCart } from "@/redux/features/cartSlice";
import {
  addToCartApi,
  addGuestCartApi,
  updateCartQuantityApi,
  updateGuestCartApi,
} from "@/hooks/cart.api";

interface IFlashDealItem {
  _id: string;
  groceryVariant: {
    _id: string;
    label: string;
    variantName?: string;
    price: { mrp: number; selling: number };
    countInStock: number;
    grocery: {
      _id: string;
      name: string;
      brand?: string;
      images?: { url: string; publicId: string }[];
    };
  };
  flashPrice: number;
  startTime: string;
  endTime: string;
  dealStock: number;
  soldCount: number;
  limitPerUser: number;
}

export default function FlashDealsBanner() {
  const dispatch = useDispatch<AppDispatch>();
  const { data: session, status } = useSession();
  const isGuest = status === "unauthenticated";

  const { cartItems } = useSelector((state: RootState) => state.cart);
  const [deals, setDeals] = useState<IFlashDealItem[]>([]);
  const [timeLeftStr, setTimeLeftStr] = useState("");
  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDeals = async () => {
    try {
      const res = await axios.get("/api/flash-deals");
      if (res.data?.success) {
        setDeals(res.data.deals || []);
      }
    } catch (err) {
      console.error("Failed to load flash deals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  // Timer Tick
  useEffect(() => {
    if (deals.length === 0) return;

    const interval = setInterval(() => {
      // Find the closest end time
      const now = new Date().getTime();
      const endTimes = deals.map((d) => new Date(d.endTime).getTime());
      const closestEnd = Math.min(...endTimes);

      const distance = closestEnd - now;

      if (distance <= 0) {
        setTimeLeftStr("Deals Expired!");
        clearInterval(interval);
        fetchDeals(); // Refresh to see if any new deals started
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      const hStr = hours.toString().padStart(2, "0");
      const mStr = minutes.toString().padStart(2, "0");
      const sStr = seconds.toString().padStart(2, "0");

      setTimeLeftStr(`${hStr}h : ${mStr}m : ${sStr}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [deals]);

  const generateTempCartItemId = () => {
    return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const handleAddToCart = async (deal: IFlashDealItem) => {
    const variant = deal.groceryVariant;
    if (!variant?._id || actionLoading) return;

    setActionLoading(variant._id);

    // Flash deals override standard prices in the cart item
    const customPrice = {
      mrp: variant.price.mrp,
      selling: deal.flashPrice, // Flash Price applied
    };

    try {
      if (isGuest) {
        const updatedItems = [...cartItems];
        const existing = updatedItems.find((i) => i.variant._id === variant._id);

        if (existing) {
          if (existing.quantity < deal.limitPerUser) {
            existing.quantity += 1;
          } else {
            toast.warning(`Limit of ${deal.limitPerUser} units reached for Flash Deal!`);
            setActionLoading(null);
            return;
          }
        } else {
          updatedItems.push({
            _id: generateTempCartItemId(),
            variant: {
              ...variant,
              price: {
                ...variant.price,
                selling: deal.flashPrice, // Apply flash price override
              },
            } as any,
            quantity: 1,
            priceAtAdd: customPrice,
          });
        }

        dispatch(setCart({ items: updatedItems, cartId: null, isGuest: true }));
        toast.success("Added to cart at Flash Price!");
        await addGuestCartApi(variant._id, 1);
      } else {
        const updatedItems = [...cartItems];
        const existing = updatedItems.find((i) => i.variant._id === variant._id);

        if (existing) {
          if (existing.quantity < deal.limitPerUser) {
            existing.quantity += 1;
          } else {
            toast.warning(`Limit of ${deal.limitPerUser} units reached for Flash Deal!`);
            setActionLoading(null);
            return;
          }
        } else {
          updatedItems.push({
            _id: generateTempCartItemId(),
            variant: {
              ...variant,
              price: {
                ...variant.price,
                selling: deal.flashPrice,
              },
            } as any,
            quantity: 1,
            priceAtAdd: customPrice,
          });
        }

        dispatch(setCart({ items: updatedItems, isGuest: false }));
        toast.success("Added to cart at Flash Price!");
        const res = await addToCartApi(variant._id, 1);
        if (res) {
          dispatch(
            setCart({
              items: res.items ?? [],
              cartId: res._id ?? res.cartId ?? null,
              isGuest: false,
              appliedCoupon: null,
            })
          );
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add item");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateQuantity = async (deal: IFlashDealItem, newQty: number) => {
    const variant = deal.groceryVariant;
    const cartItem = cartItems.find((i) => i.variant._id === variant._id);
    if (!cartItem?._id || actionLoading) return;

    if (newQty > deal.limitPerUser) {
      toast.warning(`Limit of ${deal.limitPerUser} units reached for Flash Deal!`);
      return;
    }

    setActionLoading(variant._id);

    try {
      if (isGuest) {
        const updatedItems = cartItems
          .map((i) => (i.variant._id === variant._id ? { ...i, quantity: newQty } : i))
          .filter((i) => i.quantity > 0);

        dispatch(setCart({ items: updatedItems, cartId: null, isGuest: true }));
        await updateGuestCartApi(variant._id, newQty);
        toast.success("Quantity updated!");
      } else {
        const res = await updateCartQuantityApi(cartItem._id, newQty);
        if (res.success) {
          dispatch(
            setCart({
              items: res.items ?? [],
              cartId: res._id ?? res.cartId ?? null,
              isGuest: false,
              appliedCoupon: null,
            })
          );
          toast.success(newQty === 0 ? "Removed from cart" : "Quantity updated!");
        } else {
          toast.error(res.message || "Failed to update quantity");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update quantity");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || deals.length === 0) return null;

  return (
    <div className="w-[90%] md:w-[80%] mx-auto my-8">
      {/* Outer Banner Wrapper with Sleek Glowing Borders */}
      <div className="relative bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-950 rounded-3xl overflow-hidden p-6 border border-emerald-500/20 shadow-2xl shadow-emerald-950/20">

        {/* Decorative background grid and blurs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Banner Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-emerald-500/15 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-400/30 animate-pulse">
              <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Lightning Flash Deals
              </h2>
              <p className="text-xs text-emerald-400/80 font-medium mt-0.5">Slashed prices for a limited time only!</p>
            </div>
          </div>

          {/* Countdown Clock */}
          <div className="flex items-center gap-3.5 bg-black/40 border border-emerald-500/20 px-4 py-2 rounded-2xl">
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-emerald-400">Ends in</span>
            <span className="font-mono text-sm md:text-base font-black text-white tracking-widest drop-shadow-[0_2px_4px_rgba(16,185,129,0.3)]">
              {timeLeftStr || "Loading..."}
            </span>
          </div>
        </div>

        {/* Deals Horizontal Scroll */}
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-smooth">
          {deals.map((deal) => {
            const variant = deal.groceryVariant;
            const parent = variant?.grocery;
            if (!variant || !parent) return null;

            const cartItem = cartItems.find((i) => i.variant._id === variant._id);
            const qtyInCart = cartItem?.quantity ?? 0;
            const isDealActive = deal.soldCount < deal.dealStock;

            // Calculate percentage discount
            const discount = Math.round(((variant.price.mrp - deal.flashPrice) / variant.price.mrp) * 100);

            // Calculate progress stock
            const stockRemaining = Math.max(0, deal.dealStock - deal.soldCount);
            const stockProgressPercent = Math.min(100, (deal.soldCount / deal.dealStock) * 100);

            return (
              <div
                key={deal._id}
                className="flex-shrink-0 w-[180px] sm:w-[200px] bg-slate-900/60 border border-slate-800 hover:border-emerald-500/30 rounded-2xl p-3 flex flex-col justify-between transition-all duration-300 relative group"
              >
                {/* Discount Ribbon */}
                {discount > 0 && (
                  <div className="absolute top-2 left-2 z-10 bg-red-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-lg shadow-md shadow-red-500/20">
                    {discount}% OFF
                  </div>
                )}

                {/* Product Image */}
                <div className="w-full h-24 bg-white/5 rounded-xl overflow-hidden flex items-center justify-center relative mb-3">
                  {parent.images && parent.images[0]?.url ? (
                    <img
                      src={parent.images[0].url}
                      alt={parent.name}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <span className="text-slate-500 text-xs">No image</span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-emerald-400 font-bold tracking-wide uppercase">
                      {parent.brand || "Fresh"}
                    </span>
                    <h3 className="text-xs md:text-sm font-bold text-slate-100 line-clamp-2 leading-snug">
                      {parent.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold">{variant.label}</p>
                  </div>

                  {/* Pricing */}
                  <div className="mt-2.5 flex items-baseline gap-2">
                    <span className="text-base font-black text-emerald-400">₹{deal.flashPrice}</span>
                    <span className="text-xs text-slate-500 line-through">₹{variant.price.mrp}</span>
                  </div>

                  {/* Stock left progress bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                      <span>{stockRemaining} left</span>
                      <span>{deal.soldCount} sold</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                        style={{ width: `${stockProgressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Add to Cart Actions */}
                  <div className="mt-4">
                    {!isDealActive ? (
                      <button
                        type="button"
                        disabled
                        className="w-full bg-slate-800 text-slate-500 text-xs font-bold py-2 rounded-xl cursor-not-allowed"
                      >
                        Sold Out
                      </button>
                    ) : qtyInCart > 0 ? (
                      <div className="flex items-center justify-between bg-emerald-600 rounded-xl p-0.5 border border-emerald-500">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(deal, qtyInCart - 1)}
                          disabled={actionLoading === variant._id}
                          className="p-1.5 text-white hover:bg-emerald-700 rounded-lg transition disabled:opacity-50"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        {actionLoading === variant._id ? (
                          <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                        ) : (
                          <span className="text-xs font-black text-white">{qtyInCart}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(deal, qtyInCart + 1)}
                          disabled={actionLoading === variant._id}
                          className="p-1.5 text-white hover:bg-emerald-700 rounded-lg transition disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(deal)}
                        disabled={actionLoading === variant._id}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black py-2 rounded-xl transition flex items-center justify-center gap-1 shadow-md shadow-emerald-950/40 cursor-pointer"
                      >
                        {actionLoading === variant._id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            ADD
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
