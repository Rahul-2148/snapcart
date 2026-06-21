// src/lib/server/pricing.ts
import connectDb from "@/lib/server/db";
import { Store } from "@/models/store.model";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { CodSettings } from "@/models/codSettings.model";
import { DeliverySettings } from "@/models/deliverySettings.model";
import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";
import { calculateDistance, calculateSurgeFactor } from "@/lib/server/delivery";
import Wallet from "@/models/wallet.model";

export interface CalculatePricingParams {
  userId: string;
  deliveryAddress: {
    fullName: string;
    mobile: string;
    city: string;
    state: string;
    pincode: string;
    fullAddress: string;
    street?: string;
    landmark?: string;
    alternateMobile?: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
  paymentMethod: "cod" | "online";
  useWallet: boolean;
  cartItemsInput?: any[];
}

export interface PricingBreakdown {
  serviceable: boolean;
  serviceableStatus: "checking" | "serviceable" | "limited" | "not_serviceable" | "unknown";
  notServiceableReason?: string;
  distanceKm: number;
  nearestStore?: {
    id: string;
    name: string;
    estimatedDeliveryMinutes: { min: number; max: number };
  };
  subTotal: number;
  totalMRP: number;
  savings: number;
  deliveryFee: number;
  deliveryBaseFee: number;
  deliveryDistanceFee: number;
  deliverySurgeFee: number;
  packagingFee: number;
  weightSurcharge: number;
  inclusiveProductGst: number;
  serviceGst: number; // 18% GST on delivery + packaging + surcharge + COD
  totalTaxes: number; // serviceGst + inclusiveProductGst
  codHandlingCharge: number;
  codEligible: boolean;
  codDisabledReason?: string;
  couponDiscount: number;
  couponSnapshot?: any;
  walletBalance: number;
  walletDeduction: number;
  baseFinalTotal: number; // total before wallet deduction
  finalTotal: number; // grand total to pay
  items: Array<{
    variantId: string;
    groceryName: string;
    variantLabel: string;
    unit: string;
    value?: string;
    quantity: number;
    sellingPrice: number;
    mrpPrice: number;
    gstRate: number;
    inclusiveGstAmount: number;
    isHeavy: boolean;
    weightKg: number;
    handlingSurcharge: number;
    codStatus: string;
  }>;
}

export async function calculateCheckoutPricing({
  userId,
  deliveryAddress,
  paymentMethod,
  useWallet,
  cartItemsInput,
}: CalculatePricingParams): Promise<PricingBreakdown> {
  await connectDb();

  // 1. Fetch Cart Items
  let items: any[] = [];
  let cartObj: any = null;

  if (userId) {
    cartObj = await Cart.findOne({ user: userId });
  }

  if (cartItemsInput) {
    items = cartItemsInput;
  } else if (cartObj) {
    items = await CartItem.find({ cart: cartObj._id }).populate({
      path: "variant",
      populate: {
        path: "grocery",
        select: "name isActive",
      },
    });
  }

  // Calculate base item totals
  let subTotal = 0;
  let totalMRP = 0;
  const itemsBreakdown: any[] = [];
  let containsFreeDeliveryItem = false;
  const codStatusList: Array<{ name: string; status: string }> = [];

  for (const item of items) {
    const variant = item.variant;
    if (!variant || (variant.grocery && variant.grocery.isActive === false)) {
      continue;
    }

    const sellingPrice = item.priceAtAdd?.selling ?? variant.price.selling;
    const mrpPrice = item.priceAtAdd?.mrp ?? variant.price.mrp;
    const quantity = item.quantity;

    subTotal += sellingPrice * quantity;
    totalMRP += mrpPrice * quantity;

    // Detect weight / volume
    let weightKg = 0;
    const unitStr = (variant.unit?.unit || "").toLowerCase();
    const unitVal = variant.unit?.value || 0;

    if (unitStr === "kg" || unitStr === "liter") {
      weightKg = unitVal;
    } else if (unitStr === "g" || unitStr === "ml") {
      weightKg = unitVal / 1000;
    } else {
      weightKg = 0.1; // Default low weight for piece/pack
    }

    // Heavy check (>= 5kg/L)
    const isHeavy = weightKg >= 5;
    let surchargePerItem = variant.handlingSurcharge || 0;
    if (surchargePerItem === 0 && isHeavy) {
      if (weightKg >= 10) {
        surchargePerItem = 30; // ₹30 surcharge for >= 10kg
      } else {
        surchargePerItem = 15; // ₹15 surcharge for >= 5kg
      }
    }

    // Free delivery check
    if (variant.freeDelivery) {
      containsFreeDeliveryItem = true;
    }

    // GST inclusive computation
    const gstRate = variant.gstRate ?? 5; // Default 5% inclusive
    const inclusiveGstAmount = Math.round((sellingPrice - (sellingPrice / (1 + gstRate / 100))) * quantity * 100) / 100;

    // COD check
    const codStatus = variant.cod?.status || "with-charge";
    codStatusList.push({
      name: variant.grocery?.name || "item",
      status: codStatus,
    });

    itemsBreakdown.push({
      variantId: variant._id.toString(),
      groceryName: variant.grocery?.name || "item",
      variantLabel: variant.label,
      unit: variant.unit?.unit || "",
      value: variant.unit?.value?.toString() || "",
      quantity,
      sellingPrice,
      mrpPrice,
      gstRate,
      inclusiveGstAmount,
      isHeavy,
      weightKg,
      handlingSurcharge: surchargePerItem * quantity,
      codStatus: codStatus,
    });
  }

  const savings = totalMRP - subTotal;

  // 2. Fetch nearest store and check serviceability
  let serviceable = false;
  let serviceableStatus: PricingBreakdown["serviceableStatus"] = "not_serviceable";
  let notServiceableReason = "Coordinates are required to check serviceability.";
  let distanceKm = 0;
  let nearestStore: any = null;

  const deliverySettings = await DeliverySettings.findOne().lean();

  if (deliveryAddress?.location?.lat && deliveryAddress?.location?.lng) {
    const { lat, lng } = deliveryAddress.location;

    const matchedStore = await Store.findOne({
      status: "active",
      "location.coordinates": {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
        },
      },
    });

    if (matchedStore) {
      const [storeLng, storeLat] = matchedStore.location.coordinates;
      distanceKm = calculateDistance(lat, lng, storeLat, storeLng);
      const serviceRadius = matchedStore.serviceRadiusKm || 7;

      const isUniversal = deliverySettings?.universalDeliveryMode === true;

      if (isUniversal || distanceKm <= serviceRadius) {
        serviceable = true;
        nearestStore = matchedStore;
        
        // Compute isOpen manual check
        const now = new Date();
        const nowIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const hours = nowIST.getHours();
        const minutes = nowIST.getMinutes();
        const currentTime = hours * 60 + minutes;

        const openHours = matchedStore.openingHours?.open || "06:00";
        const closeHours = matchedStore.openingHours?.close || "23:00";
        const [openH, openM] = openHours.split(":").map(Number);
        const [closeH, closeM] = closeHours.split(":").map(Number);
        const openTime = openH * 60 + openM;
        const closeTime = closeH * 60 + closeM;

        let isOpen = false;
        if (closeTime < openTime) {
          isOpen = currentTime >= openTime || currentTime <= closeTime;
        } else {
          isOpen = currentTime >= openTime && currentTime <= closeTime;
        }

        serviceableStatus = isOpen ? "serviceable" : "limited";
        if (!isOpen) {
          notServiceableReason = `Delivery limited: store ${matchedStore.name} is currently closed.`;
        }
      } else {
        notServiceableReason = `Out of service area. Nearest store is ${distanceKm} km away (limit: ${serviceRadius} km).`;
      }
    } else {
      notServiceableReason = "No active dark store found serving this area.";
    }
  }

  // 3. Calculate Delivery Fee
  let deliveryFee = 0;
  let deliveryBaseFee = 0;
  let deliveryDistanceFee = 0;
  let deliverySurgeFee = 0;

  const isDeliveryFeeDisabled = deliverySettings?.disableDeliveryFee === true;

  if (serviceable && nearestStore && itemsBreakdown.length > 0 && !isDeliveryFeeDisabled) {
    const baseFee = nearestStore.deliveryFee?.base ?? 15; // Realistic: default ₹15 base
    deliveryBaseFee = baseFee;

    // Extra distance: if distance exceeds 2km, add ₹5 per km
    if (distanceKm > 2.0) {
      deliveryDistanceFee = Math.ceil(distanceKm - 2.0) * 5; // Realistic: ₹5 per km (was ₹10)
    }

    // Surge multiplier (rain / peak hour)
    const surgeMultiplier = calculateSurgeFactor();
    const isSurgeFeeDisabled = deliverySettings?.disableSurgeFee === true;
    if (surgeMultiplier > 1 && !isSurgeFeeDisabled) {
      deliverySurgeFee = Math.round(baseFee * (surgeMultiplier - 1));
    }

    deliveryFee = deliveryBaseFee + deliveryDistanceFee + deliverySurgeFee;

    // Waiver overrides: check if cart subtotal matches freeAbove threshold or global freeDeliveryThreshold
    const freeAbove = nearestStore.deliveryFee?.freeAbove ?? 199;
    const threshold = deliverySettings?.freeDeliveryThreshold ?? 199; // Realistic: free above ₹199 minimum
    const finalFreeAbove = Math.min(freeAbove, threshold);
    if (subTotal >= finalFreeAbove || containsFreeDeliveryItem) {
      deliveryFee = 0; // Free delivery waived
    }
  }

  // 4. Packaging & Handling Fee
  const isPackagingFeeDisabled = deliverySettings?.disablePackagingFee === true;
  const packagingFee = (itemsBreakdown.length > 0 && !isPackagingFeeDisabled) ? 4 : 0; // Flat ₹4 packing fee (allow promo toggle)

  // 5. Weight Surcharges
  const isWeightSurchargeDisabled = deliverySettings?.disableWeightSurcharge === true;
  const weightSurcharge = isWeightSurchargeDisabled ? 0 : itemsBreakdown.reduce((sum, item) => sum + item.handlingSurcharge, 0);

  // 6. COD Eligibility & Fee
  let codEligible = true;
  let codDisabledReason = "";
  let codHandlingCharge = 0;

  const codSettings = await CodSettings.findOne();
  if (codSettings) {
    if (!codSettings.isEnabled) {
      codEligible = false;
      codDisabledReason = "COD is disabled on the platform.";
    } else if (subTotal < codSettings.minOrderValue) {
      codEligible = false;
      codDisabledReason = `COD requires a minimum order value of ₹${codSettings.minOrderValue}.`;
    } else if (subTotal > codSettings.maxOrderValue) {
      codEligible = false;
      codDisabledReason = `COD is not available for high-value orders above ₹${codSettings.maxOrderValue}.`;
    }
  }

  // Check if any product blocks COD
  const blockedItems = codStatusList.filter((item) => item.status === "not-allowed");
  if (blockedItems.length > 0) {
    codEligible = false;
    codDisabledReason = `COD is not allowed for items: ${blockedItems.map((i) => i.name).join(", ")}.`;
  }

  if (paymentMethod === "cod" && codEligible) {
    codHandlingCharge = codSettings?.flatCharge ?? 10; // flat COD fee
  }

  // 7. Taxes & GST
  const inclusiveProductGst = Math.round(itemsBreakdown.reduce((sum, item) => sum + item.inclusiveGstAmount, 0) * 100) / 100;
  
  // Inclusive service GST of 18% on delivery fee, packaging fee, weight surcharge, and COD fee
  const activeFeeBase = deliveryFee + packagingFee + weightSurcharge + codHandlingCharge;
  const serviceGst = Math.round((activeFeeBase - (activeFeeBase / 1.18)) * 100) / 100;

  const totalTaxes = Math.round((inclusiveProductGst + serviceGst) * 100) / 100;

  // 8. Coupon Discount
  let couponDiscount = 0;
  let couponSnapshot: any = undefined;

  if (cartObj && cartObj.coupon?.discountType) {
    const coupon = cartObj.coupon;
    if (!coupon.minCartValue || subTotal >= coupon.minCartValue) {
      const discountTypeNormalized = (coupon.discountType || "").toLowerCase();
      if (discountTypeNormalized === "flat") {
        couponDiscount = coupon.discountValue || 0;
      } else if (discountTypeNormalized === "percentage") {
        couponDiscount = Math.floor((subTotal * (coupon.discountValue || 0)) / 100);
        if (coupon.maxDiscountAmount) {
          couponDiscount = Math.min(couponDiscount, coupon.maxDiscountAmount);
        }
      }
      couponSnapshot = {
        couponId: coupon.couponId,
        code: coupon.code,
        discountType: discountTypeNormalized,
        discountValue: coupon.discountValue,
        discountAmount: couponDiscount,
      };
    }
  }

  // 9. Grand Total (Base Final Total)
  const baseFinalTotal = Math.max(
    subTotal + deliveryFee + packagingFee + weightSurcharge + codHandlingCharge - couponDiscount,
    0
  );

  // 10. Wallet Deductions
  let walletBalance = 0;
  let walletDeduction = 0;

  if (userId) {
    const wallet = await Wallet.findOne({ user: userId });
    if (wallet) {
      walletBalance = wallet.balance || 0;
      if (useWallet) {
        walletDeduction = Math.min(walletBalance, baseFinalTotal);
      }
    }
  }

  const finalTotal = Math.max(baseFinalTotal - walletDeduction, 0);

  return {
    serviceable,
    serviceableStatus,
    notServiceableReason: serviceable ? undefined : notServiceableReason,
    distanceKm,
    nearestStore: nearestStore
      ? {
          id: nearestStore._id.toString(),
          name: nearestStore.name,
          estimatedDeliveryMinutes: nearestStore.estimatedDeliveryMinutes || { min: 8, max: 15 },
        }
      : undefined,
    subTotal,
    totalMRP,
    savings,
    deliveryFee,
    deliveryBaseFee,
    deliveryDistanceFee,
    deliverySurgeFee,
    packagingFee,
    weightSurcharge,
    inclusiveProductGst,
    serviceGst,
    totalTaxes,
    codHandlingCharge,
    codEligible,
    codDisabledReason: codEligible ? undefined : codDisabledReason,
    couponDiscount,
    couponSnapshot,
    walletBalance,
    walletDeduction,
    baseFinalTotal,
    finalTotal,
    items: itemsBreakdown,
  };
}
