import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { PaymentSession } from "@/models/paymentSession.model";
import { User } from "@/models/user.model";
import { DeliverySettings } from "@/models/deliverySettings.model";
import { calculateCheckoutPricing } from "@/lib/server/pricing";

export const POST = async (req: NextRequest) => {
  try {
    await connectDb();

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const { deliveryAddress, onlinePaymentType, storeId, useWallet } = await req.json();

    if (!deliveryAddress || !onlinePaymentType) {
      return NextResponse.json(
        { message: "deliveryAddress & onlinePaymentType required" },
        { status: 400 }
      );
    }

    if (!deliveryAddress.street || !deliveryAddress.street.trim()) {
      return NextResponse.json(
        { message: "Delivery address is incomplete. Flat, House, or Building details are required." },
        { status: 400 }
      );
    }

    if (!["stripe", "razorpay"].includes(onlinePaymentType)) {
      return NextResponse.json(
        { message: "Invalid onlinePaymentType" },
        { status: 400 }
      );
    }

    const cart = await Cart.findOne({ user: user._id });
    if (!cart) {
      return NextResponse.json({ message: "Cart not found" }, { status: 400 });
    }

    const cartItems = await CartItem.find({ cart: cart._id })
      .populate({
        path: "variant",
        populate: {
          path: "grocery",
          select: "name isActive",
        },
      });

    if (!cartItems.length) {
      return NextResponse.json({ message: "Cart is empty" }, { status: 400 });
    }

    // Stock verification
    for (const item of cartItems) {
      const variant: any = item.variant;
      const freshVariant = await GroceryVariant.findById(variant?._id, "countInStock");
      if (!variant || !variant.grocery?.isActive || !freshVariant || freshVariant.countInStock < item.quantity) {
        return NextResponse.json(
          { message: `Insufficient or invalid stock for ${variant?.grocery?.name || "item"}` },
          { status: 400 }
        );
      }
    }

    // Call unified pricing engine
    const pricing = await calculateCheckoutPricing({
      userId: user._id.toString(),
      deliveryAddress,
      paymentMethod: "online",
      useWallet: !!useWallet,
      cartItemsInput: cartItems,
    });

    if (!pricing.serviceable) {
      return NextResponse.json(
        { message: pricing.notServiceableReason || "Delivery address is not serviceable." },
        { status: 400 }
      );
    }

    const isKycApproved = user.kyc?.status === "approved";
    if (!isKycApproved && pricing.baseFinalTotal > 50000) {
      return NextResponse.json(
        { message: "Order value exceeds ₹50,000. KYC verification (Aadhaar & PAN) is mandatory for high-value orders." },
        { status: 403 }
      );
    }

    const itemsSnapshot = cartItems.map((item: any) => ({
      variantId: item.variant._id,
      groceryId: item.variant.grocery._id,
      groceryName: item.variant.grocery.name,
      variantLabel: item.variant.label,
      unit: item.variant.unit,
      value: item.variant.value,
      quantity: item.quantity,
      price: {
        mrpPrice: item.priceAtAdd.mrp,
        sellingPrice: item.priceAtAdd.selling,
      },
    }));

    const expiryMinutes = Number(
      process.env.PENDING_ORDER_EXPIRY_MINUTES || 30
    );

    const paymentSession = await PaymentSession.create({
      userId: user._id,
      storeId: pricing.nearestStore?.id || null,
      items: itemsSnapshot,
      subTotal: pricing.subTotal,
      totalMRP: pricing.totalMRP,
      savings: pricing.savings,
      deliveryFee: pricing.deliveryFee,
      packagingFee: pricing.packagingFee,
      weightSurcharge: pricing.weightSurcharge,
      taxes: 0, // Stored as 0 to denote inclusive tax model
      finalTotal: pricing.finalTotal,
      walletDeduction: pricing.walletDeduction,
      coupon: pricing.couponSnapshot,
      couponDiscount: pricing.couponDiscount,
      deliveryAddress,
      paymentMethod: "online",
      onlinePaymentType,
      status: "pending",
      expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
    });

    return NextResponse.json({
      success: true,
      paymentSessionId: paymentSession._id,
    });
  } catch (error: any) {
    console.error("Create payment session error:", error);
    return NextResponse.json(
      { message: `Failed to create payment session: ${error.message}` },
      { status: 500 }
    );
  }
};
