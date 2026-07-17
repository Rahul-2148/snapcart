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

  variantName?: string;

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

  addedBy?: {
    memberId: string;
    name: string;
  };

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

  isGoldMember: boolean;

  goldDiscount: number;

  groupCode?: string | null;

  groupMemberId?: string | null;

  groupMemberName?: string | null;

  groupSession?: any;

}



const calculateTotals = (items: CartItem[], coupon: AppliedCoupon | null, isGold = false) => {

  let totalMRP = 0;

  let subTotal = 0;

  let totalItems = 0;

  let goldDiscount = 0;



  items.forEach((item) => {

    const mrp = item.priceAtAdd?.mrp ?? item.variant.price.mrp;

    const originalSelling = item.priceAtAdd?.selling ?? item.variant.price.selling;

    let selling = originalSelling;



    // Check if vegetable or fruit

    const categoryObj = item.variant.grocery?.category as any;

    const categoryName = (categoryObj && typeof categoryObj === "object" ? categoryObj.name : "").toLowerCase();

    const isVegOrFruit = categoryName.includes("vegetable") || categoryName.includes("fruit") || categoryName.includes("veg") || categoryName.includes("frut");



    if (isGold) {
      if (isVegOrFruit) {
        selling = Math.round(selling * 0.9 * 100) / 100;
      } else {
        selling = Math.round(selling * 0.95 * 100) / 100;
      }
      goldDiscount += (originalSelling - selling) * item.quantity;
    }



    totalMRP += mrp * item.quantity;

    subTotal += selling * item.quantity;

    totalItems += item.quantity;

  });



  const savings = totalMRP - subTotal - goldDiscount;

  // Delivery fee: free above ₹149 for Gold, or ₹199 for normal users

  const threshold = isGold ? 149 : 199;

  const deliveryFee = subTotal >= threshold || subTotal === 0 ? 0 : 15;



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

    goldDiscount,

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

  isGoldMember: false,

  goldDiscount: 0,

  groupCode: null,

  groupMemberId: null,

  groupMemberName: null,

  groupSession: null,

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

        isGoldMember?: boolean;

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



      if (typeof action.payload.isGoldMember === "boolean")

        state.isGoldMember = action.payload.isGoldMember;



      const totals = calculateTotals(

        state.cartItems,

        action.payload.appliedCoupon ?? state.appliedCoupon,

        state.isGoldMember

      );

      state.totalMRP = totals.totalMRP;

      state.subTotal = totals.subTotal;

      state.savings = totals.savings;

      state.deliveryFee = totals.deliveryFee;

      state.totalItems = totals.totalItems;

      state.couponDiscount = totals.couponDiscount;

      state.finalTotal = totals.finalTotal;

      state.goldDiscount = totals.goldDiscount;



      // Only keep coupon if discount > 0

      if (totals.couponDiscount > 0) {

        state.appliedCoupon =

          action.payload.appliedCoupon ?? state.appliedCoupon;

      } else {

        state.appliedCoupon = null;

      }

    },



    applyCoupon: (state, action: PayloadAction<AppliedCoupon>) => {

      const totals = calculateTotals(state.cartItems, action.payload, state.isGoldMember);

      state.totalMRP = totals.totalMRP;

      state.subTotal = totals.subTotal;

      state.savings = totals.savings;

      state.deliveryFee = totals.deliveryFee;

      state.totalItems = totals.totalItems;

      state.goldDiscount = totals.goldDiscount;

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

      const totals = calculateTotals(state.cartItems, null, state.isGoldMember);

      state.totalMRP = totals.totalMRP;

      state.subTotal = totals.subTotal;

      state.savings = totals.savings;

      state.deliveryFee = totals.deliveryFee;

      state.totalItems = totals.totalItems;

      state.goldDiscount = totals.goldDiscount;

      state.finalTotal = totals.finalTotal;

    },



    setGroupSession: (

      state,

      action: PayloadAction<{

        groupCode: string | null;

        groupMemberId: string | null;

        groupMemberName: string | null;

        groupSession?: any;

      }>

    ) => {

      state.groupCode = action.payload.groupCode;

      state.groupMemberId = action.payload.groupMemberId;

      state.groupMemberName = action.payload.groupMemberName;

      if (action.payload.groupSession !== undefined) {

        state.groupSession = action.payload.groupSession;

      }

    },



    clearCart: () => initialState,

  },

});



export const { setCart, applyCoupon, removeCoupon, setGroupSession, clearCart } =

  cartSlice.actions;

export default cartSlice.reducer;

