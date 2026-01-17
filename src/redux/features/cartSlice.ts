import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AppliedCoupon {
  code: string;
  type: "percentage" | "flat";
  discountValue: number;
  minCartValue?: number;
  maxDiscount?: number;
}

export interface PriceAtAdd {
  mrp: number;
  selling: number;
}

export interface CartVariant {
  _id: string;
  label: string;
  price: {
    mrp: number;
    selling: number;
    discountPercent?: number;
  };
  grocery?: {
    _id: string;
    name: string;
    category: string;
    images?: { url: string }[];
  };
}

export interface CartItem {
  _id: string;
  variant: CartVariant;
  quantity: number;
  priceAtAdd: PriceAtAdd;
}

interface CartState {
  cartItems: CartItem[];
  cartId?: string | null;
  totalItems: number;
  totalMRP: number;
  subTotal: number;
  savings: number;
  deliveryFee: number;
  finalTotal: number;
  couponDiscount: number;
  appliedCoupon: AppliedCoupon | null;
  isGuest: boolean;
}

const calculateTotals = (items: CartItem[], coupon: AppliedCoupon | null) => {
  let totalMRP = 0;
  let subTotal = 0;
  let totalItems = 0;

  items.forEach((item) => {
    const mrp = item.priceAtAdd?.mrp ?? item.variant.price.mrp;
    const selling = item.priceAtAdd?.selling ?? item.variant.price.selling;

    totalMRP += mrp * item.quantity;
    subTotal += selling * item.quantity;
    totalItems += item.quantity;
  });

  const savings = totalMRP - subTotal;
  // Delivery fee: free for orders >= 500 or empty cart; otherwise ₹40 (align with backend)
  const deliveryFee = subTotal >= 500 || subTotal === 0 ? 0 : 40;

  let couponDiscount = 0;
  if (coupon && (!coupon.minCartValue || subTotal >= coupon.minCartValue)) {
    if (coupon.type === "percentage") {
      couponDiscount = (subTotal * coupon.discountValue) / 100;
      if (coupon.maxDiscount && couponDiscount > coupon.maxDiscount) {
        couponDiscount = coupon.maxDiscount;
      }
    } else {
      couponDiscount = coupon.discountValue;
    }
  }

  const finalTotal = Math.max(subTotal + deliveryFee - couponDiscount, 0);

  return {
    totalMRP,
    subTotal,
    savings,
    deliveryFee,
    totalItems,
    couponDiscount,
    finalTotal,
  };
};

const initialState: CartState = {
  cartItems: [],
  cartId: null,
  totalItems: 0,
  totalMRP: 0,
  subTotal: 0,
  savings: 0,
  deliveryFee: 0,
  finalTotal: 0,
  couponDiscount: 0,
  appliedCoupon: null,
  isGuest: false,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    setCart: (
      state,
      action: PayloadAction<{
        items: CartItem[];
        cartId?: string | null;
        isGuest?: boolean;
        appliedCoupon?: AppliedCoupon | null;
      }>
    ) => {
      state.cartItems = (action.payload.items || []).filter(
        (i) => i.quantity > 0
      );
      if (action.payload.cartId !== undefined)
        state.cartId = action.payload.cartId;
      if (typeof action.payload.isGuest === "boolean")
        state.isGuest = action.payload.isGuest;

      const totals = calculateTotals(
        state.cartItems,
        action.payload.appliedCoupon ?? state.appliedCoupon
      );
      state.totalMRP = totals.totalMRP;
      state.subTotal = totals.subTotal;
      state.savings = totals.savings;
      state.deliveryFee = totals.deliveryFee;
      state.totalItems = totals.totalItems;
      state.couponDiscount = totals.couponDiscount;
      state.finalTotal = totals.finalTotal;

      // Only keep coupon if discount > 0
      if (totals.couponDiscount > 0) {
        state.appliedCoupon =
          action.payload.appliedCoupon ?? state.appliedCoupon;
      } else {
        state.appliedCoupon = null;
      }
    },

    applyCoupon: (state, action: PayloadAction<AppliedCoupon>) => {
      const totals = calculateTotals(state.cartItems, action.payload);
      if (totals.couponDiscount > 0) {
        state.appliedCoupon = action.payload;
        state.couponDiscount = totals.couponDiscount;
      } else {
        state.appliedCoupon = null;
        state.couponDiscount = 0;
      }
      state.finalTotal = totals.finalTotal;
    },

    removeCoupon: (state) => {
      state.appliedCoupon = null;
      state.couponDiscount = 0;
      const totals = calculateTotals(state.cartItems, null);
      state.finalTotal = totals.finalTotal;
    },

    clearCart: () => initialState,
  },
});

export const { setCart, applyCoupon, removeCoupon, clearCart } =
  cartSlice.actions;
export default cartSlice.reducer;
