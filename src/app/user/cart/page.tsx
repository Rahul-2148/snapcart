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
  Info as InfoIcon,
  Share2,
  Copy,
  LogOut,
  Users,
  Crown,
  Lock,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { useConfirmation } from "@/components/common/ConfirmationModal";
import { setCart, applyCoupon, removeCoupon, setGroupSession } from "@/redux/features/cartSlice";
import { AppDispatch, RootState } from "@/redux/store";
import type { AppliedCoupon } from "@/redux/features/cartSlice";
import axios from "axios";

import {
  fetchCartApi,
  getGuestCart,
  removeFromCartApi,
  updateCartQuantityApi,
  updateGuestCartApi,
  clearCartApi,
  clearGuestCart,
  addToCartApi,
  addGuestCartApi,
} from "@/hooks/cart.api";

const CartPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { confirm, Modal: ConfirmationModal } = useConfirmation();

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
    groupCode,
    groupMemberId,
    groupMemberName,
    groupSession,
    isGoldMember,
    goldDiscount,
  } = useSelector((state: RootState) => state.cart);

  const [loading, setLoading] = useState(true);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [deliverySettings, setDeliverySettings] = useState<any>(null);
  const [upsellItems, setUpsellItems] = useState<any[]>([]);

  // Group Order States
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [hostNameInput, setHostNameInput] = useState("");
  const [startingGroup, setStartingGroup] = useState(false);

  /* ================= FETCH PUBLIC SETTINGS & UPSELLS ================= */
  useEffect(() => {
    const fetchDeliverySettings = async () => {
      try {
        const res = await fetch("/api/delivery/settings");
        const data = await res.json();
        if (data.success) {
          setDeliverySettings(data.settings);
        }
      } catch (err) {
        console.error("Failed to load delivery settings:", err);
      }
    };

    const fetchUpsellItems = async () => {
      try {
        const res = await fetch("/api/recommendations/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartItems }),
        });
        const data = await res.json();
        if (data.success && data.recommendations) {
          setUpsellItems(data.recommendations);
        }
      } catch (err) {
        console.error("Failed to load upsell items:", err);
      }
    };

    fetchDeliverySettings();
    fetchUpsellItems();
  }, [cartItems]);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [showAvailableCoupons, setShowAvailableCoupons] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [prevUserId, setPrevUserId] = useState<string | null>(null);
  const [isMergingGuest, setIsMergingGuest] = useState(false);
  const [mergeCompleted, setMergeCompleted] = useState(false);

  const extractGuestItems = (guestCart: any) =>
    guestCart?.cart?.items ?? guestCart?.items ?? [];

  const normalizeGuestCoupon = (raw: any): AppliedCoupon | null => {
    if (!raw) return null;
    const discountValue = raw.discountValue ?? raw.discount ?? 0;
    if (!discountValue) return null;
    return {
      code: raw.code,
      discountValue,
      type:
        (raw.discountType || "").toLowerCase() === "percentage"
          ? "percentage"
          : "flat",
      maxDiscount: raw.maxDiscountAmount ?? raw.maxDiscount,
      minCartValue: raw.minCartValue,
    };
  };

  /* ================= DETECT LOGIN TRANSITION & MERGE ================= */
  useEffect(() => {
    const handleLoginTransition = async () => {
      const currentUserId = session?.user?.id;
      const wasGuest = prevUserId === null;
      const isNowLoggedIn = currentUserId !== null && currentUserId !== undefined;

      if (wasGuest && isNowLoggedIn) {
        setIsMergingGuest(true); // ✅ Block loadCart from running
        setLoading(true); // ✅ Show loading during merge

        try {
          // ✅ Read from localStorage (guest cart API will return 403 now)
          let guestItems: any[] = [];
          let guestCoupon: AppliedCoupon | null = null;
          
          try {
            const stored = localStorage.getItem("guest_cart_for_merge");
            if (stored) {
              const parsed = JSON.parse(stored);
              guestItems = parsed.items || [];
              guestCoupon = parsed.coupon || null;
            }
          } catch (err) {
            // Failed to read localStorage
          }

          if (guestItems.length > 0) {
            const mergeRes = await fetch("/api/cart/merge", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: guestItems.map((i: any) => ({
                  variantId: i.variant._id,
                  quantity: i.quantity,
                  priceAtAdd: i.priceAtAdd,
                })),
              }),
            });

            const mergeData = await mergeRes.json();

            if (mergeData.success && mergeData.items) {
              dispatch(
                setCart({
                  items: mergeData.items,
                  cartId: mergeData.cartId,
                  isGuest: false,
                  appliedCoupon: guestCoupon, // ✅ Preserve guest coupon
                  isGoldMember: mergeData.isGoldMember,
                })
              );
              setMergeCompleted(true); // ✅ Mark merge as done

              // ✅ Clear guest cart cookie from server (DELETE now allows logged-in users)
              try {
                await fetch("/api/guest-cart", { method: "DELETE" });
              } catch (err) {
                // Failed to clear guest cart cookie
              }
            }

            // Clear localStorage
            localStorage.removeItem("guest_cart_for_merge");
            localStorage.removeItem("guest_coupon"); // ✅ Clear guest coupon too
          }
        } catch (err) {
          // Error during merge
        } finally {
          setIsMergingGuest(false); // ✅ Allow loadCart to run now
          setLoading(false); // ✅ Stop loading
        }
      }

      // Update previous user ID for next comparison
      setPrevUserId(currentUserId || null);
    };

    if (status !== "loading") {
      handleLoginTransition();
    }
  }, [session?.user?.id, status, dispatch]);

  /* ================= SAVE GUEST CART TO LOCALSTORAGE ================= */
  useEffect(() => {
    // When guest cart loads, save it to localStorage for post-login merge
    if (!session?.user && cartItems.length > 0 && isGuest) {
      try {
        localStorage.setItem(
          "guest_cart_for_merge",
          JSON.stringify({ 
            items: cartItems,
            coupon: appliedCoupon // ✅ Save coupon too
          })
        );
      } catch (err) {
        // Failed to save guest cart to localStorage
      }
    }
  }, [cartItems, isGuest, session?.user, appliedCoupon]);

  /* ================= LOAD CART ================= */
  useEffect(() => {
    const loadCart = async () => {
      // ✅ CRITICAL: Skip if merge is in progress
      if (isMergingGuest) {
        return;
      }

      // ✅ CRITICAL: Skip if merge just completed
      if (mergeCompleted && cartItems.length > 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const groupCodeLocal = localStorage.getItem("snapcart_group_code");
        const memberIdLocal = localStorage.getItem("snapcart_group_member_id");
        const memberNameLocal = localStorage.getItem("snapcart_group_member_name");

        if (groupCodeLocal) {
          // Verify session first
          const statusRes = await fetch(`/api/cart/group/status?code=${groupCodeLocal}`);
          const statusData = await statusRes.json();

          if (statusData.success && statusData.groupCart && statusData.groupCart.isActive) {
            // Group session is active! Fetch group items
            const userCart = await fetchCartApi();

            dispatch(
              setGroupSession({
                groupCode: groupCodeLocal,
                groupMemberId: memberIdLocal,
                groupMemberName: memberNameLocal,
                groupSession: statusData.groupCart,
              })
            );

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
                cartId: userCart.cart?._id,
                isGuest: false,
                appliedCoupon: appliedCouponData,
                isGoldMember: userCart.isGoldMember,
              })
            );
          } else {
            // Group session has ended! Clear local storage
            localStorage.removeItem("snapcart_group_code");
            localStorage.removeItem("snapcart_group_member_id");
            localStorage.removeItem("snapcart_group_member_name");
            localStorage.removeItem("snapcart_group_host_name");
            dispatch(
              setGroupSession({
                groupCode: null,
                groupMemberId: null,
                groupMemberName: null,
                groupSession: null,
              })
            );
            toast.error("This group order session has ended or been completed.");
            router.refresh();
          }
        } else if (session?.user) {
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
              cartId: userCart.cart?._id,
              isGuest: false,
              appliedCoupon: appliedCouponData,
              isGoldMember: userCart.isGoldMember,
            })
          );
        } else {
          const guestCart = await getGuestCart();
          const guestItems = extractGuestItems(guestCart);

          let guestCoupon: AppliedCoupon | null = normalizeGuestCoupon(
            guestCart?.coupon
          );
          let guestDiscount = guestCoupon?.discountValue ?? 0;

          if (!guestCoupon) {
            try {
              const savedCoupon = localStorage.getItem("guest_coupon");
              if (savedCoupon) {
                const parsed = JSON.parse(savedCoupon);
                guestCoupon = normalizeGuestCoupon(parsed);
                guestDiscount = guestCoupon?.discountValue ?? 0;
              }
            } catch (e) {
              // No valid coupon for guest
            }
          }

          dispatch(
            setCart({
              items: guestItems,
              cartId: undefined,
              isGuest: true,
              appliedCoupon: guestCoupon,
            })
          );
        }
      } catch (err) {
        // Cart load failed
      }
      setLoading(false);
      setIsInitialLoad(false);
    };

    if (status === "loading") return;
    loadCart();
  }, [
    dispatch,
    session?.user,
    status,
    isInitialLoad,
    isMergingGuest,
    mergeCompleted,
  ]);

  // Set up polling interval for group cart sync
  useEffect(() => {
    const groupCodeLocal = localStorage.getItem("snapcart_group_code");
    if (!groupCodeLocal) return;

    const interval = setInterval(async () => {
      try {
        const statusRes = await fetch(`/api/cart/group/status?code=${groupCodeLocal}`);
        const statusData = await statusRes.json();

        if (statusData.success && statusData.groupCart) {
          if (!statusData.groupCart.isActive) {
            localStorage.removeItem("snapcart_group_code");
            localStorage.removeItem("snapcart_group_member_id");
            localStorage.removeItem("snapcart_group_member_name");
            localStorage.removeItem("snapcart_group_host_name");
            dispatch(
              setGroupSession({
                groupCode: null,
                groupMemberId: null,
                groupMemberName: null,
                groupSession: null,
              })
            );
            toast.info("The host has ended this group ordering session.");
            clearInterval(interval);
            router.refresh();
            return;
          }

          const userCart = await fetchCartApi();

          dispatch(
            setGroupSession({
              groupCode: groupCodeLocal,
              groupMemberId: localStorage.getItem("snapcart_group_member_id"),
              groupMemberName: localStorage.getItem("snapcart_group_member_name"),
              groupSession: statusData.groupCart,
            })
          );

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
              cartId: userCart.cart?._id,
              isGuest: false,
              appliedCoupon: appliedCouponData,
            })
          );
        }
      } catch (err) {
        console.error("Group cart poll error:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [dispatch, router]);

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

    const isGroup = !!localStorage.getItem("snapcart_group_code");
    const activeMemberId = localStorage.getItem("snapcart_group_member_id");
    const isHost = session?.user?.id && groupSession?.host?._id === session.user.id;

    let title = "Clear Cart";
    let message = "Are you sure you want to clear your entire cart?";
    if (isGroup) {
      if (isHost) {
        title = "Clear Group Cart";
        message = "Are you sure you want to clear the entire group cart? Items from all members will be deleted.";
      } else {
        title = "Clear My Items";
        message = "Are you sure you want to remove all items you added from the group cart?";
      }
    }

    await confirm({
      title,
      message,
      confirmText: "Clear",
      isDangerous: true,
      onConfirm: async () => {
        try {
          if (isGroup) {
            await clearCartApi();
            const userCart = await fetchCartApi();
            dispatch(
              setCart({
                items: userCart.items || [],
                cartId: userCart.cart?._id,
                isGuest: false,
                appliedCoupon: null,
              })
            );
            toast.success(isHost ? "Group cart cleared!" : "Your items removed!");
          } else if (isGuest) {
            await clearGuestCart();
            dispatch(
              setCart({
                items: [],
                cartId: undefined,
                isGuest: true,
              })
            );
            toast.success("Cart cleared successfully!");
          } else {
            await clearCartApi();
            dispatch(
              setCart({
                items: [],
                cartId: undefined,
                isGuest: false,
              })
            );
            toast.success("Cart cleared successfully!");
          }
        } catch (error) {
          console.error("Error clearing cart:", error);
          toast.error("Failed to clear cart");
        }
      },
    });
  };

  /* ================= HANDLE START GROUP ORDER ================= */
  const handleStartGroupOrder = async () => {
    if (!session?.user) {
      toast.error("Please login to host a group order.");
      router.push("/login?redirect=/user/cart");
      return;
    }
    
    setShowGroupModal(true);
    setHostNameInput(session.user.name || "");
  };

  const submitStartGroupOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostNameInput.trim()) {
      toast.error("Please enter your name");
      return;
    }
    
    setStartingGroup(true);
    try {
      const { data } = await axios.post("/api/cart/group/create", {
        hostName: hostNameInput.trim(),
      });
      
      if (data.success) {
        localStorage.setItem("snapcart_group_code", data.groupCart.code);
        localStorage.setItem("snapcart_group_member_id", data.memberId);
        localStorage.setItem("snapcart_group_member_name", data.memberName);
        localStorage.setItem("snapcart_group_host_name", data.memberName);
        
        dispatch(
          setGroupSession({
            groupCode: data.groupCart.code,
            groupMemberId: data.memberId,
            groupMemberName: data.memberName,
            groupSession: data.groupCart,
          })
        );
        
        toast.success("Group order session started!");
        setShowGroupModal(false);
        setIsInitialLoad(true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to start group order");
    } finally {
      setStartingGroup(false);
    }
  };

  /* ================= HANDLE LEAVE GROUP ORDER ================= */
  const handleLeaveGroupOrder = async () => {
    const isHost = session?.user?.id && groupSession?.host?._id === session.user.id;
    
    await confirm({
      title: isHost ? "End Group Order" : "Leave Group Order",
      message: isHost 
        ? "Are you sure you want to end this group order session? Guest items will be removed."
        : "Are you sure you want to leave this group order? Your added items will be removed from the host's cart.",
      confirmText: isHost ? "End Session" : "Leave Group",
      isDangerous: true,
      onConfirm: async () => {
        try {
          const res = await axios.post("/api/cart/group/exit", {
            code: groupCode,
            memberId: groupMemberId,
            action: isHost ? "terminate" : "leave",
          });
          
          if (res.data.success) {
            localStorage.removeItem("snapcart_group_code");
            localStorage.removeItem("snapcart_group_member_id");
            localStorage.removeItem("snapcart_group_member_name");
            localStorage.removeItem("snapcart_group_host_name");
            
            dispatch(
              setGroupSession({
                groupCode: null,
                groupMemberId: null,
                groupMemberName: null,
                groupSession: null,
              })
            );
            
            toast.success(isHost ? "Group session ended" : "Successfully left the group");
            window.location.reload();
          }
        } catch (err: any) {
          toast.error("Failed to leave/end group order.");
        }
      },
    });
  };

  /* ================= HANDLE APPLY COUPON ================= */
  const handleApplyCoupon = async (e?: React.FormEvent) => {
    e?.preventDefault();
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

    // Check if group member is authorized
    const isGroup = !!localStorage.getItem("snapcart_group_code");
    const activeMemberId = localStorage.getItem("snapcart_group_member_id");
    const isHost = session?.user?.id && groupSession?.host?._id === session.user.id;
    
    if (isGroup && !isHost && item.addedBy?.memberId !== activeMemberId) {
      toast.error("You can only edit items you added!");
      return;
    }

    try {
      if (isGroup) {
        const res = await updateCartQuantityApi(cartItemId, item.quantity + 1);
        if (!res?.success) {
          toast.error(res?.message || "Failed to update quantity");
          return;
        }
        dispatch(
          setCart({
            items: res.items,
            cartId: res.cartId,
            isGuest: false,
          })
        );
        toast.success(res.message);
      } else if (isGuest) {
        await updateGuestCartApi(item.variant._id, item.quantity + 1);
        const guestCart = await getGuestCart();
        const guestItems = extractGuestItems(guestCart);

        // If cart became empty, remove coupon and clear guest storage
        if (!guestItems || guestItems.length === 0) {
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
          const guestApplied: AppliedCoupon | null = normalizeGuestCoupon(
            guestCart?.coupon
          );

          dispatch(
            setCart({
              items: guestItems,
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

    // Check if group member is authorized
    const isGroup = !!localStorage.getItem("snapcart_group_code");
    const activeMemberId = localStorage.getItem("snapcart_group_member_id");
    const isHost = session?.user?.id && groupSession?.host?._id === session.user.id;
    
    if (isGroup && !isHost && item.addedBy?.memberId !== activeMemberId) {
      toast.error("You can only edit items you added!");
      return;
    }

    try {
      if (isGroup) {
        const res = await updateCartQuantityApi(cartItemId, item.quantity - 1);
        if (!res?.success) {
          toast.error(res?.message || "Failed to update quantity");
          return;
        }
        dispatch(
          setCart({
            items: res.items,
            cartId: res.cartId,
            isGuest: false,
          })
        );
        toast.success(res.message);
      } else if (isGuest) {
        await updateGuestCartApi(item.variant._id, item.quantity - 1);
        const guestCart = await getGuestCart();
        const guestItems = extractGuestItems(guestCart);
        let guestApplied: AppliedCoupon | null = normalizeGuestCoupon(
          guestCart?.coupon
        );

        // fallback to localStorage (if coupon applied client-side)
        if (!guestApplied && typeof window !== "undefined") {
          try {
            const saved = localStorage.getItem("guest_coupon");
            if (saved) {
              const parsed = JSON.parse(saved);
              guestApplied = normalizeGuestCoupon(parsed);
            }
          } catch {}
        }

        if (!guestItems || guestItems.length === 0) {
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
              items: guestItems,
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

    // Check if group member is authorized
    const isGroup = !!localStorage.getItem("snapcart_group_code");
    const activeMemberId = localStorage.getItem("snapcart_group_member_id");
    const isHost = session?.user?.id && groupSession?.host?._id === session.user.id;
    
    if (isGroup && !isHost && item.addedBy?.memberId !== activeMemberId) {
      toast.error("You can only edit items you added!");
      return;
    }

    try {
      if (isGroup) {
        const response = await removeFromCartApi(cartItemId);
        if (!response?.success) {
          toast.error(response?.message || "Failed to remove item");
          return;
        }
        dispatch(
          setCart({
            items: response.items,
            cartId: response.cartId,
            isGuest: false,
          })
        );
        toast.success(response.message);
      } else if (isGuest) {
        await updateGuestCartApi(item.variant._id, 0);
        const guestCart = await getGuestCart();
        const guestItems = extractGuestItems(guestCart);
        let guestApplied: AppliedCoupon | null = normalizeGuestCoupon(
          guestCart?.coupon
        );

        // If cart became empty, remove coupon and clear guest storage
        if (!guestItems || guestItems.length === 0) {
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
                guestApplied = normalizeGuestCoupon(parsed);
              }
            } catch {}
          }

          dispatch(
            setCart({
              items: guestItems,
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

  const handleAddUpsell = async (variant: any) => {
    try {
      const isGroup = !!localStorage.getItem("snapcart_group_code");
      if (isGroup) {
        const res = await addToCartApi(variant._id, 1);
        if (res) {
          dispatch(
            setCart({
              items: res.items,
              cartId: res.cartId,
              isGuest: false,
            })
          );
          toast.success("Added to group cart!");
        }
      } else if (isGuest) {
        const tempId = `temp-${Date.now()}`;
        const updatedItems = [...cartItems, {
          _id: tempId,
          variant: variant,
          quantity: 1,
          priceAtAdd: { mrp: variant.price.mrp, selling: variant.price.selling }
        }];
        dispatch(setCart({ items: updatedItems, cartId: null, isGuest: true }));
        toast.success("Added to cart!");
        await addGuestCartApi(variant._id, 1);
      } else {
        const res = await addToCartApi(variant._id, 1);
        if (res) {
          let serverAppliedCoupon: AppliedCoupon | null = null;
          if (res.coupon) {
            serverAppliedCoupon = {
              code: res.coupon.code,
              discountValue: res.coupon.discountValue || 0,
              type: res.coupon.discountType?.toLowerCase() === "percentage" ? "percentage" : "flat",
              maxDiscount: res.coupon.maxDiscountAmount,
              minCartValue: res.coupon.minCartValue,
            };
          }
          dispatch(
            setCart({
              items: res.items,
              cartId: res._id ?? res.cartId,
              isGuest: false,
              appliedCoupon: serverAppliedCoupon,
            })
          );
          toast.success("Added to cart!");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add to cart");
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

      {/* Group Cart Panel */}
      {groupCode ? (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-emerald-500/25 rounded-2xl p-5 mb-6 shadow-sm shadow-emerald-500/5 relative overflow-hidden"
        >
          {/* Top Banner Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="bg-emerald-600 text-white text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm shadow-emerald-600/10">
                  <Users className="w-3.5 h-3.5" />
                  <span>GROUP ORDER ACTIVE</span>
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  Invite Code: <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-1 rounded-lg tracking-wider font-mono">{groupCode}</span>
                </span>
              </div>
              
              <p className="text-sm text-slate-600">
                Host: <span className="font-bold text-slate-800">{localStorage.getItem("snapcart_group_host_name") || "Host"}</span>
                {groupSession?.members?.length > 1 && (
                  <>
                    {" • "}
                    <span>Total members joined: <span className="font-bold text-slate-800">{groupSession.members.length}</span></span>
                  </>
                )}
              </p>

              {/* Members List */}
              <div className="flex flex-wrap gap-2 pt-1">
                {groupSession?.members?.map((m: any) => {
                  const isMemberHost = m.memberId === "host" || m.name.includes("(Host)");
                  return (
                    <div 
                      key={m.memberId} 
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                        m.memberId === groupMemberId
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                          : "bg-slate-50 border-slate-200 text-slate-600"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      <span>{m.name}</span>
                      {isMemberHost && <Crown className="w-3 h-3 text-amber-500" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Panel */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => {
                  const inviteLink = `${window.location.origin}/user/cart/group/join?code=${groupCode}`;
                  navigator.clipboard.writeText(inviteLink);
                  toast.success("Invite link copied to clipboard!");
                }}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-300/40 rounded-xl font-bold text-sm transition-all duration-200"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Invite Link</span>
              </button>
              
              <button
                onClick={handleLeaveGroupOrder}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl font-bold text-sm transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span>
                  {(() => {
                    const isHost = session?.user?.id && (groupSession?.host?._id === session.user.id || groupSession?.host === session.user.id);
                    return isHost ? "End Session" : "Leave Group";
                  })()}
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-500/10 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Users className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5 justify-center sm:justify-start">
                <span>Order with Friends & Roommates</span>
                <span className="bg-emerald-500/10 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">New</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
                Create a shared cart, share the link, and let everyone add their favorite items from their own phones. Host pays the final bill!
              </p>
            </div>
          </div>
          <button
            onClick={handleStartGroupOrder}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all duration-200 shadow-md shadow-emerald-600/10 flex items-center gap-2 flex-shrink-0"
          >
            <Users className="w-4 h-4" />
            <span>Start Group Cart</span>
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* CART ITEMS */}
        <div className="lg:col-span-2 space-y-4">
          {/* Free Delivery Progress Tracker */}
          {cartItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-emerald-500/15 shadow-sm rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden"
            >
              {(() => {
                const threshold = isGoldMember ? 149 : (deliverySettings?.freeDeliveryThreshold ?? 199);
                const difference = threshold - subTotal;
                const percent = Math.min(100, (subTotal / threshold) * 100);
                const isUnlocked = subTotal >= threshold;

                return (
                  <>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                        isUnlocked
                          ? "bg-green-100 border-green-300 text-green-700"
                          : "bg-orange-100 border-orange-200 text-orange-655"
                      }`}>
                        {isUnlocked ? "🎉" : "🚴"}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-800">
                          {isUnlocked ? (
                            "You have unlocked FREE delivery!"
                          ) : (
                            <>
                              Add <span className="text-orange-600 font-extrabold">₹{difference.toFixed(0)}</span> more for <span className="text-green-600 font-extrabold">FREE delivery</span>
                            </>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                          {isUnlocked
                            ? "Savings applied automatically to your bill details."
                            : `Shop above ₹${threshold} to save delivery charges.`}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className={`h-full rounded-full bg-gradient-to-r ${
                          isUnlocked
                            ? "from-green-500 to-emerald-400"
                            : "from-orange-500 to-amber-400"
                        }`}
                      />
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl shadow-sm px-4 py-4 animate-pulse"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 h-16 bg-gray-200 rounded" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
                        <div className="h-3 bg-gray-200 rounded mb-2 w-1/2" />
                        <div className="h-3 bg-gray-200 rounded w-2/3" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : cartItems.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <ShoppingBasket className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No items in your cart</p>
            </div>
          ) : (
            <AnimatePresence>
              {groupCode ? (
                (() => {
                  // Group items by addedBy.memberId
                  const groupedItems: { [key: string]: { memberName: string; items: any[]; subTotal: number } } = {};
                  
                  cartItems.forEach((item) => {
                    const memberId = item.addedBy?.memberId || "host";
                    let memberName = item.addedBy?.name;
                    
                    if (memberId === "host") {
                      memberName = localStorage.getItem("snapcart_group_host_name") || "Host";
                      if (memberName && !memberName.includes("Host")) {
                        memberName = `${memberName} (Host)`;
                      }
                    }
                    
                    if (!groupedItems[memberId]) {
                      groupedItems[memberId] = {
                        memberName: memberName || "Member",
                        items: [],
                        subTotal: 0
                      };
                    }
                    groupedItems[memberId].items.push(item);
                    groupedItems[memberId].subTotal += (item.variant?.price?.selling || 0) * item.quantity;
                  });

                  return (
                    <div className="space-y-6">
                      {Object.keys(groupedItems).map((mId) => {
                        const group = groupedItems[mId];
                        const isHost = session?.user?.id && groupSession?.host?._id === session.user.id;
                        const isMyItems = mId === groupMemberId || (mId === "host" && isHost);
                        
                        return (
                          <div key={mId} className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 space-y-4">
                            {/* Member Title Header */}
                            <div className="flex items-center justify-between border-b pb-2 mb-1">
                              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isMyItems ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></span>
                                <span>{group.memberName}&apos;s List</span>
                                {isMyItems && (
                                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">You</span>
                                )}
                              </h3>
                              <span className="text-xs font-bold text-slate-500">
                                {group.items.length} items • ₹{group.subTotal.toFixed(2)}
                              </span>
                            </div>
                            
                            {/* Items List */}
                            <div className="space-y-3">
                              {group.items.map((item) => {
                                if (!item?.variant) return null;
                                
                                const discountPercent = item.variant.price?.discountPercent || 0;
                                const itemTotal = (item.variant.price?.selling || 0) * item.quantity;
                                const itemSavings = ((item.variant.price?.mrp || 0) - (item.variant.price?.selling || 0)) * item.quantity;
                                const itemMRP = (item.variant.price?.mrp || 0) * item.quantity;
                                
                                const categoryObj = item.variant.grocery?.category as any;
                                const categoryName = (categoryObj && typeof categoryObj === "object" ? categoryObj.name : "").toLowerCase();
                                const isVegOrFruit = categoryName.includes("vegetable") || categoryName.includes("fruit") || categoryName.includes("veg") || categoryName.includes("frut");

                                // Can the current user edit this item?
                                const canEdit = isHost || mId === groupMemberId;
                                
                                return (
                                  <motion.div
                                    key={item._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-xl shadow-sm px-4 py-4"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                                        <Link href={`/user/product-details/${item.variant.grocery?._id}`} className="shrink-0">
                                          <Image
                                            src={item.variant.grocery?.images?.[0]?.url || "/placeholder.png"}
                                            alt={item.variant.grocery?.name || "Grocery item"}
                                            width={60}
                                            height={60}
                                            className="object-contain cursor-pointer hover:scale-105 transition"
                                          />
                                        </Link>

                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-semibold text-gray-800 break-words text-sm">
                                            {item.variant.grocery?.name || "Unknown Item"}
                                          </h4>
                                          <p className="text-xs text-gray-500">
                                            {item.variant.variantName
                                              ? `${item.variant.variantName} - ${item.variant.label}`
                                              : item.variant.label}
                                          </p>

                                          <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <span className="text-xs line-through text-gray-400">
                                              ₹{item.variant.price?.mrp || 0}
                                            </span>
                                            <span className="text-green-700 font-bold text-sm">
                                              ₹{item.variant.price?.selling || 0}
                                            </span>
                                            {discountPercent > 0 && (
                                              <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                                                {discountPercent}% OFF
                                              </span>
                                            )}
                                            {isGoldMember && (
                                              <span className="bg-amber-100 text-amber-800 border border-amber-350 text-[10px] font-black px-1.5 py-0.5 rounded whitespace-nowrap flex items-center gap-0.5 shadow-sm">
                                                👑 GOLD Extra {isVegOrFruit ? "10%" : "5%"} Off
                                              </span>
                                            )}
                                          </div>

                                          <p className="text-xs text-gray-500 mt-1">
                                            ₹{item.variant.price?.selling || 0} × {item.quantity} ={" "}
                                            <span className="font-semibold text-slate-800">
                                              ₹{itemTotal.toFixed(2)}
                                            </span>
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-2.5 sm:pt-0">
                                        {canEdit ? (
                                          <>
                                            <div className="flex items-center gap-2.5 bg-slate-50 px-2.5 py-1.25 border border-slate-200/80 rounded-full">
                                              <button
                                                disabled={item.quantity === 1}
                                                onClick={() => handleDecrease(item._id)}
                                                className="disabled:opacity-40 bg-white p-1 rounded-full hover:bg-emerald-50 border border-slate-200"
                                              >
                                                <Minus size={12} />
                                              </button>
                                              <span className="text-xs font-bold text-slate-800">
                                                {item.quantity}
                                              </span>
                                              <button
                                                onClick={() => handleIncrease(item._id)}
                                                className="bg-white p-1 rounded-full hover:bg-emerald-50 border border-slate-200"
                                              >
                                                <Plus size={12} />
                                              </button>
                                            </div>
                                            <button
                                              onClick={() => handleRemove(item._id)}
                                              className="text-red-400 hover:text-red-600 transition"
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          </>
                                        ) : (
                                          <span className="text-xs font-semibold text-slate-400 bg-slate-100/50 border border-slate-150 px-3 py-1 rounded-full">
                                            Added by {group.memberName.split(" ")[0]}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                cartItems.map((item) => {
                  // Defensive checks for null/undefined variant
                  if (!item?.variant) return null;

                  const discountPercent = item.variant.price?.discountPercent || 0;
                  const itemTotal = (item.variant.price?.selling || 0) * item.quantity;
                  const itemSavings =
                    ((item.variant.price?.mrp || 0) - (item.variant.price?.selling || 0)) *
                    item.quantity;
                  const itemMRP = (item.variant.price?.mrp || 0) * item.quantity;

                  return (
                    <motion.div
                      key={item._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="bg-white rounded-xl shadow-sm hover:shadow-md px-4 py-4"
                    >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <Link href={`/user/product-details/${item.variant.grocery?._id}`} className="shrink-0">
                          <Image
                            src={
                              item.variant.grocery?.images?.[0]?.url ||
                              "/placeholder.png"
                            }
                            alt={item.variant.grocery?.name || "Grocery item"}
                            width={64}
                            height={64}
                            className="object-contain cursor-pointer hover:scale-110 transition-transform"
                          />
                        </Link>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-800 break-words">
                            {item.variant.grocery?.name || "Unknown Item"}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {item.variant.variantName
                              ? `${item.variant.variantName} - ${item.variant.label}`
                              : item.variant.label}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs line-through text-gray-400">
                              ₹{item.variant.price?.mrp || 0}
                            </span>
                            <span className="text-green-700 font-bold">
                              ₹{item.variant.price?.selling || 0}
                            </span>
                            {discountPercent > 0 && (
                              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded whitespace-nowrap">
                                {discountPercent}% OFF
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-gray-700 mt-1">
                            ₹{item.variant.price?.selling || 0} × {item.quantity} ={" "}
                            <span className="font-semibold">
                              ₹{itemTotal.toFixed(2)}
                            </span>
                          </p>

                          {itemSavings > 0 && (
                            <div className="mt-1">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-xs text-green-700 font-medium whitespace-nowrap">
                                  You save:
                                </span>
                                <span className="text-xs font-bold text-green-700 whitespace-nowrap">
                                  ₹{itemSavings.toFixed(2)}
                                </span>
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  (on MRP ₹{itemMRP.toFixed(2)})
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
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
                })
              )}
            </AnimatePresence>
          )}

          {/* One-Tap Smart Upsell Carousel */}
          {cartItems.length > 0 && upsellItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white border border-emerald-500/20 shadow-md rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center border border-emerald-100">
                  <Zap className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-855">Before You Checkout</h3>
                  <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Frequently bought together with your items</p>
                </div>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth">
                {upsellItems.map((grocery) => {
                  const variant = grocery.variants?.find((v: any) => v.isDefault) || grocery.variants?.[0];
                  if (!variant) return null;

                  return (
                    <div
                      key={grocery._id}
                      className="flex-shrink-0 w-[145px] sm:w-[160px] bg-slate-50/60 border border-gray-150 rounded-xl p-2.5 flex flex-col justify-between hover:border-emerald-500/30 hover:shadow-sm transition-all duration-200 group"
                    >
                      {/* Product Image */}
                      <div className="w-full h-20 bg-white rounded-lg flex items-center justify-center overflow-hidden mb-2 relative border border-gray-100">
                        {grocery.images && grocery.images[0]?.url ? (
                          <img
                            src={grocery.images[0].url}
                            alt={grocery.name}
                            className="w-full h-full object-contain p-1.5 group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <span className="text-gray-400 text-[10px]">No image</span>
                        )}
                      </div>

                      {/* Info & Price */}
                      <div className="space-y-1">
                        <h5 className="text-[11px] font-bold text-gray-800 line-clamp-1 truncate leading-tight group-hover:text-emerald-700 transition-colors">
                          {grocery.name}
                        </h5>
                        <p className="text-[9px] text-gray-400 font-bold">{variant.label}</p>
                        
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-200/50">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-emerald-600">₹{variant.price.selling}</span>
                            {variant.price.mrp > variant.price.selling && (
                              <span className="text-[9px] text-gray-400 line-through">₹{variant.price.mrp}</span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddUpsell(variant)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-300 font-extrabold text-[10px] px-2.5 py-1 rounded-lg hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
                          >
                            + ADD
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
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
            {groupCode && !(session?.user?.id && groupSession?.host?._id === session.user.id) ? (
              <div className="text-center py-2 space-y-2">
                <Lock className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="font-bold text-slate-800 text-sm">Coupon Management Locked</h3>
                <p className="text-xs text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                  Only the host (<span className="font-bold text-slate-700">{localStorage.getItem("snapcart_group_host_name") || "Host"}</span>) can apply coupons to this group order.
                </p>
              </div>
            ) : (
              <>
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
              </>
            )}
          </motion.div>

          {/* ORDER SUMMARY */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white rounded-xl shadow-md p-5 h-fit sticky top-24"
          >
            <h3 className="font-semibold text-lg mb-4 flex items-center justify-between">
              <span>Order Summary</span>
              {isGoldMember && (
                <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                  <Crown className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  Gold Active
                </span>
              )}
            </h3>

            {isGoldMember && (
              <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-yellow-100 flex flex-col gap-1 text-[11px] text-amber-900 text-left">
                <span className="font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-yellow-600 animate-bounce" /> Snapcart Gold Active
                </span>
                <span className="font-semibold text-amber-800 leading-relaxed">
                  • Extra 10% Off Vegetables & Fruits<br />
                  • Extra 5% Off All Other Categories<br />
                  • FREE Delivery threshold lowered to ₹149<br />
                  • Packaging & Handling fee Waived (₹0)
                </span>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total MRP</span>
                <span>₹{totalMRP.toFixed(2)}</span>
              </div>

              {isGoldMember && goldDiscount > 0 && (
                <div className="flex justify-between text-amber-600 font-semibold">
                  <span className="flex items-center gap-1">👑 Snapcart Gold Discount</span>
                  <span>-₹{goldDiscount.toFixed(2)}</span>
                </div>
              )}

              {savings > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Product Savings</span>
                  <span className="font-medium">-₹{savings.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between font-medium border-t border-dashed border-gray-100 pt-2 text-gray-800">
                <span>Subtotal</span>
                <span>₹{subTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee</span>
                <span className={deliveryFee === 0 ? "text-green-600 font-bold" : ""}>
                  {deliveryFee === 0 ? (
                    isGoldMember ? "FREE (Gold Benefit)" : "FREE"
                  ) : `+₹${deliveryFee.toFixed(2)}`}
                </span>
              </div>

              <hr className="my-3 border-gray-200" />

              <div className="flex justify-between font-bold text-lg pt-2">
                <span>Final Total</span>
                <span className="text-green-700">₹{finalTotal.toFixed(2)}</span>
              </div>

              {/* COD Info Card */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <InfoIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-blue-900 mb-1">
                      💡 COD Tip
                    </p>
                    <p className="text-xs text-blue-700">
                      Pay on delivery option available at checkout. Some items may have delivery charges.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {(() => {
              const isHost = session?.user?.id && (groupSession?.host?._id === session.user.id || groupSession?.host === session.user.id);
              const isGroupDisabled = !!(groupCode && !isHost);

              return (
                <motion.button
                  whileTap={!isGroupDisabled ? { scale: 0.95 } : undefined}
                  disabled={isGroupDisabled}
                  className={`mt-5 w-full py-3 rounded-full font-semibold flex items-center justify-center gap-2 transition-all ${
                    isGroupDisabled
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed border border-gray-200"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                  onClick={() => {
                    if (isGuest) {
                      router.push("/login?redirect=/user/cart");
                    } else {
                      router.push("/user/checkout");
                    }
                  }}
                >
                  {isGroupDisabled ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Waiting for host to checkout</span>
                    </>
                  ) : isGuest ? (
                    "Login to Proceed"
                  ) : (
                    "Proceed to Checkout"
                  )}
                </motion.button>
              );
            })()}

            <div className="mt-4 text-xs text-gray-500 space-y-1">
              <p>• Free delivery on orders above ₹{deliverySettings?.freeDeliveryThreshold ?? 199}</p>
              <p>• Easy returns within 30 minutes</p>
              <p>• Best prices guaranteed</p>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Group Order Start Modal */}
      <AnimatePresence>
        {showGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGroupModal(false)}
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            />
            
            {/* Modal Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl relative z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <span>Host a Group Order</span>
                </h3>
                <button 
                  onClick={() => setShowGroupModal(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={submitStartGroupOrder} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Enter Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Rahul (Host)"
                    value={hostNameInput}
                    onChange={(e) => setHostNameInput(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-800 text-sm transition"
                    maxLength={20}
                    autoFocus
                  />
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    This name will be visible to everyone who joins your group session.
                  </p>
                </div>
                
                <button
                  type="submit"
                  disabled={startingGroup}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
                >
                  {startingGroup ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Starting...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Shared Cart</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Confirmation Modal */}
      {ConfirmationModal}
    </div>
  );
};

export default CartPage;
