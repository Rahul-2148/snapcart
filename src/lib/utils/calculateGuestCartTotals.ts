// src/lib/utils/calculateGuestCartTotals.ts
export type CartItemForTotals = {
  priceAtAdd: {
    mrp: number;
    selling: number;
  };
  quantity: number;
};

export type CouponForTotals = {
  discountType: "FLAT" | "PERCENTAGE";
  discountValue: number;
  minCartValue?: number;
  maxDiscountAmount?: number;
};

export function calculateGuestCartTotals(
  items: CartItemForTotals[],
  couponOrDiscount?: CouponForTotals | number
) {
  let subtotal = 0;
  let totalMrp = 0;
  let totalDiscount = 0;
  let totalItems = 0;

  items.forEach((i) => {
    subtotal += i.priceAtAdd.selling * i.quantity;
    totalMrp += i.priceAtAdd.mrp * i.quantity;
    totalDiscount += (i.priceAtAdd.mrp - i.priceAtAdd.selling) * i.quantity;
    totalItems += i.quantity;
  });

  const shipping = subtotal >= 500 || subtotal === 0 ? 0 : 50;

  let couponDiscount = 0;
  if (typeof couponOrDiscount === "number") {
    couponDiscount = Math.round(couponOrDiscount);
  } else if (couponOrDiscount) {
    const coupon = couponOrDiscount as CouponForTotals;
    if (!coupon.minCartValue || subtotal >= coupon.minCartValue) {
      if (coupon.discountType === "PERCENTAGE") {
        couponDiscount = (subtotal * coupon.discountValue) / 100;
        if (
          coupon.maxDiscountAmount &&
          couponDiscount > coupon.maxDiscountAmount
        ) {
          couponDiscount = coupon.maxDiscountAmount;
        }
      } else {
        couponDiscount = coupon.discountValue;
      }
    }
  }

  const total = Math.max(subtotal + shipping - couponDiscount, 0);

  return {
    subtotal,
    totalMrp,
    totalDiscount,
    totalItems,
    shipping,
    couponDiscount,
    total,
  };
}
