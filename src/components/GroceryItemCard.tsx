// src/components/GroceryItemCard.tsx
"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { useKeenSlider } from "keen-slider/react";
import "keen-slider/keen-slider.min.css";
import { useEffect, useRef } from "react";
import { ShoppingCart, Minus, Plus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";

import { AppDispatch, RootState } from "@/redux/store";
import { setCart } from "@/redux/features/cartSlice";
import {
  addToCartApi,
  updateCartQuantityApi,
  fetchCartApi,
  getGuestCart,
  addGuestCartApi,
  updateGuestCartApi,
} from "@/hooks/cart.api";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface IVariant {
  _id: string;
  label: string;
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

const GroceryItemCard = ({ grocery }: { grocery: IGrocery }) => {
  const dispatch = useDispatch<AppDispatch>();
  const hoverInterval = useRef<NodeJS.Timeout | null>(null);

  const { cartItems, appliedCoupon } = useSelector(
    (state: RootState) => state.cart
  );

  const defaultVariant =
    grocery?.variants?.find((v) => v.isDefault) || grocery?.variants?.[0];

  const cartItem = cartItems.find(
    (item) => item.variant?._id === defaultVariant?._id
  );
  const quantity = cartItem?.quantity ?? 0;

  const sellingPrice = defaultVariant?.price?.selling;
  const mrpPrice = defaultVariant?.price?.mrp;
  const discountPercent = defaultVariant?.price?.discountPercent;
  const stock = defaultVariant?.countInStock ?? 0;
  const isOutOfStock = stock === 0;
  const isMaxReached = quantity >= stock;

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
      1000
    );
  };

  const handleMouseLeave = () => {
    if (hoverInterval.current) {
      clearInterval(hoverInterval.current);
      hoverInterval.current = null;
    }
  };

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
      })
    );
  };

  /* ================= CART ACTIONS ================= */

  const handleAddToCart = async () => {
    if (!defaultVariant?._id) return;

    try {
      if (isGuest) {
        const updatedItems = [...cartItems];
        const existing = updatedItems.find(
          (i) => i.variant._id === defaultVariant._id
        );

        if (existing) {
          if (existing.quantity < stock) existing.quantity += 1;
        } else {
          updatedItems.push({
            _id: crypto.randomUUID(),
            variant: defaultVariant,
            quantity: 1,
            priceAtAdd: {
              mrp: defaultVariant.price.mrp,
              selling: defaultVariant.price.selling,
            },
          });
        }

        dispatch(setCart({ items: updatedItems, cartId: null, isGuest: true }));

        const res = await addGuestCartApi(defaultVariant._id, 1);
        toast[res.success ? "success" : "error"](res.message);
      } else {
        const res = await addToCartApi(defaultVariant._id, 1);
        syncCartToStore(res);
        toast[res.success ? "success" : "error"](res.message);
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    }
  };

  const handleIncrease = async () => {
    if (!cartItem?._id || !defaultVariant?._id) return;

    try {
      if (isGuest) {
        const updatedItems = cartItems.map((i) =>
          i._id === cartItem._id && i.quantity < stock
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );

        dispatch(setCart({ items: updatedItems, cartId: null, isGuest: true }));

        const newQty =
          updatedItems.find((i) => i._id === cartItem._id)?.quantity || 1;
        const res = await updateGuestCartApi(defaultVariant._id, newQty);
        toast[res.success ? "success" : "error"](res.message);
      } else {
        const res = await updateCartQuantityApi(cartItem._id, quantity + 1);
        syncCartToStore(res);
        toast[res.success ? "success" : "error"](res.message);
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    }
  };

  const handleDecrease = async () => {
    if (!cartItem?._id || !defaultVariant?._id) return;

    try {
      if (isGuest) {
        const updatedItems = cartItems
          .map((i) =>
            i._id === cartItem._id ? { ...i, quantity: i.quantity - 1 } : i
          )
          .filter((i) => i.quantity > 0);

        dispatch(setCart({ items: updatedItems, cartId: null, isGuest: true }));

        const newQty =
          updatedItems.find((i) => i._id === cartItem._id)?.quantity || 0;
        const res = await updateGuestCartApi(defaultVariant._id, newQty);
        toast[res.success ? "success" : "error"](res.message);
      } else {
        const res = await updateCartQuantityApi(cartItem._id, quantity - 1);
        syncCartToStore(res);
        toast[res.success ? "success" : "error"](res.message);
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    }
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

  const variantLabel =
    quantity > 1
      ? `${quantity} × ${defaultVariant?.label}`
      : defaultVariant?.label;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all overflow-hidden border border-gray-100 flex flex-col"
    >
      {/* IMAGE */}
      <div
        ref={sliderRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="keen-slider relative w-full aspect-4/3 bg-gray-50"
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

      {/* INFO */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-gray-500">{grocery?.category?.name}</p>
        {grocery?.brand && (
          <p className="text-xs text-gray-400 font-medium uppercase">
            {grocery?.brand}
          </p>
        )}
        <h3 className="font-semibold text-gray-800 text-base mt-1">
          {grocery?.name}
        </h3>

        {/* PRICE */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-green-700 font-bold text-lg">
            ₹{sellingPrice}
          </span>
          <span className="line-through text-gray-400 text-sm">
            ₹{mrpPrice}
          </span>
          {discountPercent && (
            <span className="text-red-500 text-xs font-medium">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* UNIT */}
        <div className="flex justify-between items-center mt-2 text-sm">
          <span className="bg-gray-100 text-gray-900 font-[500] px-2 py-1 rounded">
            {variantLabel}
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
        <div className="mt-4">
          {quantity === 0 ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              disabled={isOutOfStock}
              onClick={handleAddToCart}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-full py-2 text-sm font-medium transition-all"
            >
              <ShoppingCart className="w-5 h-5" />
              Add to cart
            </motion.button>
          ) : (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center justify-between bg-green-50 border border-green-600 rounded-full px-3 py-1"
            >
              <button
                onClick={handleDecrease}
                className="p-1 rounded-full hover:bg-green-100"
              >
                <Minus className="w-4 h-4 text-green-700" />
              </button>
              <span className="text-green-700 font-semibold text-sm">
                {quantity}
              </span>
              <button
                disabled={isMaxReached}
                onClick={handleIncrease}
                className="p-1 rounded-full hover:bg-green-100 disabled:opacity-40"
              >
                <Plus className="w-4 h-4 text-green-700" />
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default GroceryItemCard;
