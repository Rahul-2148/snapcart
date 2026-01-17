// src/lib/utils/calculateCartTotals.ts
export function calculateCartTotals(cart: any) {
  let subtotal = 0;
  let totalMrp = 0;
  let totalDiscount = 0;
  let totalItems = 0;

  cart.items.forEach((item: any) => {
    const selling = item.priceAtAdd?.selling ?? item.variant.price.selling;
    const mrp = item.priceAtAdd?.mrp ?? item.variant.price.mrp;

    subtotal += selling * item.quantity;
    totalMrp += mrp * item.quantity;
    totalDiscount += (mrp - selling) * item.quantity;
    totalItems += item.quantity;
  });

  const shipping = subtotal >= 500 || subtotal === 0 ? 0 : 50;

  let couponDiscount = 0;
  if (cart.coupon) {
    const { discountType, discountValue, minCartValue, maxDiscountAmount } =
      cart.coupon;

    if (!minCartValue || subtotal >= minCartValue) {
      if (discountType === "PERCENTAGE") {
        couponDiscount = (subtotal * discountValue) / 100;
        if (maxDiscountAmount && couponDiscount > maxDiscountAmount) {
          couponDiscount = maxDiscountAmount;
        }
      } else {
        couponDiscount = discountValue;
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
