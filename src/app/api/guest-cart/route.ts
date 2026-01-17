import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { GroceryVariant } from "@/models/groceryVariant.model";
import {
  calculateGuestCartTotals,
  CartItemForTotals,
} from "@/lib/utils/calculateGuestCartTotals";

/* ================= TYPES ================= */
export type GuestCartItem = {
  variantId: string;
  quantity: number;
  priceAtAdd: {
    mrp: number;
    selling: number;
  };
};

export type GuestCartItemWithDetails = {
  variant: any;
  grocery: any;
  quantity: number;
  priceAtAdd: {
    mrp: number;
    selling: number;
  };
};

export type GuestCoupon = {
  couponId?: string;
  code: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;
  minCartValue?: number;
  maxDiscountAmount?: number;
};

/* ================= HELPERS ================= */
async function getGuestCart(): Promise<GuestCartItem[]> {
  const cookieStore = await cookies();
  const cartCookie = cookieStore.get("guest_cart");
  if (!cartCookie?.value) return [];
  try {
    return JSON.parse(cartCookie.value);
  } catch {
    return [];
  }
}

async function setGuestCart(items: GuestCartItem[]) {
  const cookieStore = await cookies();
  cookieStore.set("guest_cart", JSON.stringify(items), {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
}

async function getGuestCoupon(): Promise<GuestCoupon | undefined> {
  const cookieStore = await cookies();
  const couponCookie = cookieStore.get("guest_coupon");
  if (!couponCookie?.value) return undefined;
  try {
    return JSON.parse(couponCookie.value);
  } catch {
    return undefined;
  }
}

async function setGuestCoupon(coupon?: GuestCoupon) {
  const cookieStore = await cookies();
  if (!coupon) {
    cookieStore.delete("guest_coupon");
  } else {
    cookieStore.set("guest_coupon", JSON.stringify(coupon), {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
  }
}

async function blockIfLoggedIn() {
  const session = await auth();
  if (session?.user?.id) {
    return NextResponse.json(
      { success: false, message: "Guest cart disabled for logged-in users" },
      { status: 403 }
    );
  }
  return null;
}

/* ================= COUPON VALIDATION ================= */
function validateAndCalculateCoupon(
  items: CartItemForTotals[],
  coupon?: GuestCoupon
) {
  if (!coupon) return { coupon: undefined, discount: 0 };

  const subtotal = items.reduce(
    (sum, i) => sum + i.priceAtAdd.selling * i.quantity,
    0
  );

  if (coupon.minCartValue && subtotal < coupon.minCartValue) {
    return { coupon: undefined, discount: 0 };
  }

  let discount = 0;

  if (coupon.discountType === "PERCENTAGE") {
    discount = (subtotal * coupon.discountValue) / 100;
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }
  } else {
    discount = coupon.discountValue;
  }

  return {
    coupon,
    discount: Math.round(discount),
  };
}

/* ================= GET ================= */
export async function GET() {
  const blocked = await blockIfLoggedIn();
  if (blocked) return blocked;

  await connectDb();

  const guestCart = await getGuestCart();

  if (guestCart.length === 0) {
    await setGuestCoupon(undefined);
    return NextResponse.json({
      success: true,
      cart: { items: [] },
      coupon: null,
      totals: calculateGuestCartTotals([], 0),
    });
  }

  const variants = await GroceryVariant.find({
    _id: { $in: guestCart.map((i) => i.variantId) },
  }).populate("grocery");

  const items: GuestCartItemWithDetails[] = guestCart
    .map((item) => {
      const variant = variants.find(
        (v: any) => v._id.toString() === item.variantId
      );
      if (!variant) return null;
      return {
        variant,
        grocery: variant.grocery,
        quantity: item.quantity,
        priceAtAdd: item.priceAtAdd,
      };
    })
    .filter(Boolean) as GuestCartItemWithDetails[];

  const coupon = await getGuestCoupon();
  const { coupon: validCoupon, discount } = validateAndCalculateCoupon(
    items,
    coupon
  );

  if (!validCoupon) await setGuestCoupon(undefined);

  return NextResponse.json({
    success: true,
    cart: { items },
    coupon: validCoupon,
    totals: calculateGuestCartTotals(items, discount),
  });
}

/* ================= POST (ADD ITEM) ================= */
export async function POST(req: NextRequest) {
  const blocked = await blockIfLoggedIn();
  if (blocked) return blocked;

  const { variantId, quantity = 1 } = await req.json();
  await connectDb();

  const variant = await GroceryVariant.findById(variantId);
  if (!variant || variant.countInStock <= 0) {
    return NextResponse.json(
      { success: false, message: "Variant unavailable" },
      { status: 400 }
    );
  }

  const guestCart = await getGuestCart();
  const idx = guestCart.findIndex((i) => i.variantId === variantId);

  if (idx > -1) {
    const newQty = guestCart[idx].quantity + quantity;
    if (newQty > variant.countInStock) {
      return NextResponse.json(
        { success: false, message: "Stock exceeded" },
        { status: 400 }
      );
    }
    guestCart[idx].quantity = newQty;
  } else {
    guestCart.push({
      variantId,
      quantity,
      priceAtAdd: {
        mrp: variant.price.mrp,
        selling: variant.price.selling,
      },
    });
  }

  await setGuestCart(guestCart);

  const coupon = await getGuestCoupon();
  const { coupon: validCoupon, discount } = validateAndCalculateCoupon(
    guestCart,
    coupon
  );

  if (!validCoupon) await setGuestCoupon(undefined);

  return NextResponse.json({
    success: true,
    cartCount: guestCart.reduce((s, i) => s + i.quantity, 0),
    coupon: validCoupon,
    totals: calculateGuestCartTotals(guestCart, discount),
  });
}

/* ================= PATCH (UPDATE QUANTITY) ================= */
export async function PATCH(req: NextRequest) {
  const blocked = await blockIfLoggedIn();
  if (blocked) return blocked;

  const { variantId, quantity } = await req.json();
  await connectDb();

  let guestCart = await getGuestCart();

  if (quantity === 0) {
    guestCart = guestCart.filter((i) => i.variantId !== variantId);
  } else {
    const variant = await GroceryVariant.findById(variantId);
    if (!variant || quantity > variant.countInStock) {
      return NextResponse.json(
        { success: false, message: "Stock exceeded" },
        { status: 400 }
      );
    }

    const idx = guestCart.findIndex((i) => i.variantId === variantId);
    if (idx > -1) guestCart[idx].quantity = quantity;
  }

  await setGuestCart(guestCart);

  const coupon = await getGuestCoupon();
  const { coupon: validCoupon, discount } = validateAndCalculateCoupon(
    guestCart,
    coupon
  );

  if (!validCoupon) await setGuestCoupon(undefined);

  return NextResponse.json({
    success: true,
    cartCount: guestCart.reduce((s, i) => s + i.quantity, 0),
    coupon: validCoupon,
    totals: calculateGuestCartTotals(guestCart, discount),
  });
}

/* ================= DELETE (CLEAR CART) ================= */
export async function DELETE() {
  const blocked = await blockIfLoggedIn();
  if (blocked) return blocked;

  const cookieStore = await cookies();
  cookieStore.delete("guest_cart");
  cookieStore.delete("guest_coupon");

  return NextResponse.json({
    success: true,
    cartCount: 0,
    coupon: null,
    totals: calculateGuestCartTotals([], 0),
  });
}
