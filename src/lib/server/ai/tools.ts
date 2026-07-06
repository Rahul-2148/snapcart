import { Cart } from "@/models/cart.model";
import { CartItem } from "@/models/cartItem.model";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { UserAiProfile } from "@/models/userAiProfile.model";
import { Coupon } from "@/models/coupon.model";
import { Order } from "@/models/order.model";
import { OrderItem } from "@/models/orderItem.model";
import { searchGroceries } from "./rag";
import { cookies } from "next/headers";

const ML_ENGINE_URL = (process.env.ML_ENGINE_URL || "http://localhost:8000").replace(/\/$/, "");

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (userId: string, args: any) => Promise<any>;
}

export const aiTools: Record<string, ToolDefinition> = {
  searchProducts: {
    name: "searchProducts",
    description: "Searches groceries by semantic text query or keywords.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query string" },
        limit: { type: "number", default: 6 },
      },
      required: ["query"],
    },
    execute: async (_userId: string, args: { query: string; limit?: number }) => {
      const results = await searchGroceries(args.query, args.limit || 6);
      return { success: true, results };
    },
  },

  addToCart: {
    name: "addToCart",
    description: "Adds item variants directly into the user's active shopping cart.",
    parameters: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              variantId: { type: "string", description: "Mongoose ObjectId of the grocery variant" },
              quantity: { type: "number", default: 1 },
            },
            required: ["variantId", "quantity"],
          },
        },
      },
      required: ["items"],
    },
    execute: async (userId: string, args: { items: { variantId: string; quantity: number }[] }) => {
      if (userId === "000000000000000000000000") {
        const cookieStore = await cookies();
        const cartCookie = cookieStore.get("guest_cart");
        let guestCart: any[] = [];
        if (cartCookie?.value) {
          try {
            guestCart = JSON.parse(cartCookie.value);
          } catch {}
        }

        const added = [];
        for (const item of args.items) {
          const variant = await GroceryVariant.findById(item.variantId);
          if (variant) {
            const idx = guestCart.findIndex((i) => i.variantId === item.variantId);
            if (idx > -1) {
              guestCart[idx].quantity = item.quantity;
            } else {
              guestCart.push({
                variantId: item.variantId,
                quantity: item.quantity,
                priceAtAdd: {
                  mrp: variant.price.mrp,
                  selling: variant.price.selling,
                },
              });
            }
            added.push({ name: variant.label, quantity: item.quantity });
          }
        }

        if (added.length === 0) {
          return {
            success: false,
            message: "Failed to add items to cart. No matching grocery variants were found for the provided variantId(s).",
          };
        }

        cookieStore.set("guest_cart", JSON.stringify(guestCart), {
          httpOnly: true,
          maxAge: 7 * 24 * 60 * 60,
          path: "/",
          sameSite: "strict",
          secure: process.env.NODE_ENV === "production",
        });

        return { success: true, message: "Added items to guest cart.", added, guestCart };
      }

      let cart = await Cart.findOne({ user: userId, isActive: true });
      if (!cart) {
        cart = await Cart.create({ user: userId, isActive: true });
      }

      const added = [];
      for (const item of args.items) {
        const variant = await GroceryVariant.findById(item.variantId);
        if (variant) {
          await CartItem.findOneAndUpdate(
            { cart: cart._id, variant: variant._id },
            {
              $set: {
                quantity: item.quantity,
                priceAtAdd: {
                  mrp: variant.price.mrp,
                  selling: variant.price.selling,
                },
              },
            },
            { upsert: true }
          );
          added.push({ name: variant.label, quantity: item.quantity });
        }
      }

      if (added.length === 0) {
        return {
          success: false,
          message: "Failed to add items to cart. No matching grocery variants were found for the provided variantId(s). Please verify you are using the variant's _id (from the variants array of the grocery search results), and NOT the main product's _id (groceryId).",
        };
      }

      return { success: true, message: "Added items to cart.", added };
    },
  },

  emptyCart: {
    name: "emptyCart",
    description: "Removes all items from the user's active shopping cart.",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (userId: string) => {
      if (userId === "000000000000000000000000") {
        const cookieStore = await cookies();
        cookieStore.delete("guest_cart");
        cookieStore.delete("guest_coupon");
        return { success: true, message: "Shopping cart emptied.", guestCart: [], guestCoupon: null };
      }
      const cart = await Cart.findOne({ user: userId, isActive: true });
      if (cart) {
        await CartItem.deleteMany({ cart: cart._id });
        return { success: true, message: "Shopping cart emptied." };
      }
      return { success: false, message: "No active cart found." };
    },
  },

  applyCoupon: {
    name: "applyCoupon",
    description: "Applies a coupon discount to the active cart.",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "The coupon code to apply (e.g. SAVE10)" },
      },
      required: ["code"],
    },
    execute: async (userId: string, args: { code: string }) => {
      const coupon = await Coupon.findOne({ code: args.code.toUpperCase(), isActive: true });
      if (!coupon) {
        return { success: false, message: "Invalid or inactive coupon code." };
      }

      if (userId === "000000000000000000000000") {
        const cookieStore = await cookies();
        const cartCookie = cookieStore.get("guest_cart");
        let guestCart: any[] = [];
        if (cartCookie?.value) {
          try {
            guestCart = JSON.parse(cartCookie.value);
          } catch {}
        }
        if (guestCart.length === 0) {
          return { success: false, message: "No active cart found." };
        }
        const subtotal = guestCart.reduce((sum, item) => sum + item.priceAtAdd.selling * item.quantity, 0);
        if (coupon.minCartValue && subtotal < coupon.minCartValue) {
          return { success: false, message: `Minimum cart value of ₹${coupon.minCartValue} is required to apply this coupon.` };
        }
        const guestCoupon = {
          couponId: coupon._id.toString(),
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minCartValue: coupon.minCartValue,
          maxDiscountAmount: coupon.maxDiscountAmount,
        };
        cookieStore.set("guest_coupon", JSON.stringify(guestCoupon), {
          httpOnly: true,
          maxAge: 7 * 24 * 60 * 60,
          path: "/",
          sameSite: "strict",
          secure: process.env.NODE_ENV === "production",
        });
        return { success: true, message: `Coupon ${coupon.code} applied successfully.`, guestCoupon };
      }

      const cart = await Cart.findOne({ user: userId, isActive: true });
      if (!cart) {
        return { success: false, message: "No active cart found." };
      }

      cart.coupon = {
        couponId: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscountAmount: coupon.maxDiscountAmount,
        minCartValue: coupon.minCartValue,
      };
      await cart.save();

      return { success: true, message: `Coupon ${coupon.code} applied successfully.` };
    },
  },

  getUserAiProfile: {
    name: "getUserAiProfile",
    description: "Retrieves the user's dietary preferences, allergies, and family details.",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (userId: string) => {
      let profile = await UserAiProfile.findOne({ userId });
      if (!profile) {
        profile = await UserAiProfile.create({ userId });
      }
      return { success: true, profile };
    },
  },

  updateUserAiProfile: {
    name: "updateUserAiProfile",
    description: "Updates user's dietary preferences, family size, or allergies.",
    parameters: {
      type: "object",
      properties: {
        dietaryPreferences: { type: "array", items: { type: "string" } },
        allergies: { type: "array", items: { type: "string" } },
        familySize: { type: "number" },
        spendBracket: { type: "string", enum: ["budget", "medium", "premium"] },
      },
    },
    execute: async (userId: string, args: any) => {
      const updateData: any = {};
      if (Array.isArray(args.dietaryPreferences)) updateData.dietaryPreferences = args.dietaryPreferences;
      if (Array.isArray(args.allergies)) updateData.allergies = args.allergies;
      if (typeof args.familySize === "number") updateData.familySize = args.familySize;
      if (args.spendBracket) updateData.spendBracket = args.spendBracket;

      const profile = await UserAiProfile.findOneAndUpdate(
        { userId },
        { $set: updateData },
        { new: true, upsert: true }
      );

      return { success: true, profile };
    },
  },

  reorderLastOrder: {
    name: "reorderLastOrder",
    description: "Reorders items from the user's last delivered order by adding them to the active shopping cart.",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (userId: string) => {
      const lastOrder = await Order.findOne({ userId, orderStatus: "delivered" })
        .sort({ createdAt: -1 })
        .populate({
          path: "orderItems",
          model: "OrderItem",
        })
        .lean<{ orderItems: any[] }>();

      if (!lastOrder || !lastOrder.orderItems || lastOrder.orderItems.length === 0) {
        return { success: false, message: "No previous delivered orders found to reorder." };
      }

      let cart = await Cart.findOne({ user: userId, isActive: true });
      if (!cart) {
        cart = await Cart.create({ user: userId, isActive: true });
      }

      const added = [];
      for (const item of lastOrder.orderItems) {
        const variantId = item.variant?.variantId || item.variant;
        if (!variantId) continue;
        const variant = await GroceryVariant.findById(variantId);
        if (variant) {
          await CartItem.findOneAndUpdate(
            { cart: cart._id, variant: variant._id },
            {
              $set: {
                quantity: item.quantity,
                priceAtAdd: {
                  mrp: variant.price.mrp,
                  selling: variant.price.selling,
                },
              },
            },
            { upsert: true }
          );
          added.push({ name: variant.label, quantity: item.quantity });
        }
      }
      return { success: true, message: "Successfully added items from your last order to the cart.", added };
    },
  },

  getSpendAnalysis: {
    name: "getSpendAnalysis",
    description: "Retrieves spending analysis metrics (AOV, monthly purchase count, return rate) based on user's order history.",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (userId: string) => {
      const orders = await Order.find({ userId }).populate({ path: "orderItems", model: "OrderItem" }).lean<{ orderStatus: string; paymentDetails?: { amount: number }[] }[]>();
      if (orders.length === 0) {
        return { success: true, message: "No purchase history available for spend analysis.", metrics: { avgOrderValue: 0, totalOrders: 0, returnRate: 0, inactiveDays: 30 } };
      }

      const totalOrders = orders.length;
      const deliveredOrders = orders.filter(o => o.orderStatus === "delivered");
      const returnedOrders = orders.filter(o => o.orderStatus === "returned" || o.orderStatus === "refunded");

      const returnRate = returnedOrders.length / totalOrders;
      const totalSpend = deliveredOrders.reduce((sum, o) => {
        const paidAmount = Array.isArray(o.paymentDetails) && o.paymentDetails[0]?.amount;
        return sum + (paidAmount || 0);
      }, 0);
      const avgOrderValue = deliveredOrders.length > 0 ? totalSpend / deliveredOrders.length : 0;

      // Calculate inactive days
      const lastOrder = await Order.findOne({ userId }).sort({ createdAt: -1 }).lean<{ createdAt: Date }>();
      const inactiveDays = lastOrder
        ? Math.floor((Date.now() - new Date(lastOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 30;

      return {
        success: true,
        metrics: {
          avgOrderValue,
          totalOrders,
          returnRate,
          inactiveDays,
          totalSpend
        }
      };
    },
  },

  applyBestCoupon: {
    name: "applyBestCoupon",
    description: "Evaluates all active coupons in the system and automatically applies the one yielding the highest discount for the active cart value.",
    parameters: {
      type: "object",
      properties: {},
    },
    execute: async (userId: string) => {
      let cartSubTotal = 0;
      let isGuest = userId === "000000000000000000000000";
      let guestCart: any[] = [];
      let cookieStore: any;

      if (isGuest) {
        cookieStore = await cookies();
        const cartCookie = cookieStore.get("guest_cart");
        if (cartCookie?.value) {
          try {
            guestCart = JSON.parse(cartCookie.value);
          } catch {}
        }
        if (guestCart.length === 0) {
          return { success: false, message: "Your cart is empty." };
        }
        cartSubTotal = guestCart.reduce((sum, item) => sum + (item.quantity * (item.priceAtAdd?.selling || 0)), 0);
      } else {
        const cart = await Cart.findOne({ user: userId, isActive: true });
        if (!cart) {
          return { success: false, message: "No active cart found." };
        }
        const cartItems = await CartItem.find({ cart: cart._id }).populate({ path: "variant", model: "GroceryVariant" }).lean<{ quantity: number; priceAtAdd: { selling: number } }[]>();
        if (cartItems.length === 0) {
          return { success: false, message: "Your cart is empty." };
        }
        cartSubTotal = cartItems.reduce((sum, item) => sum + (item.quantity * (item.priceAtAdd?.selling || 0)), 0);
      }

      const coupons = await Coupon.find({ isActive: true });
      let bestCoupon: any = null;
      let maxDiscount = 0;

      for (const coupon of coupons) {
        if (coupon.minCartValue && cartSubTotal < coupon.minCartValue) {
          continue;
        }

        let discount = 0;
        const discountType = (coupon.discountType || "").toLowerCase();
        if (discountType === "percentage") {
          discount = (cartSubTotal * coupon.discountValue) / 100;
          if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
            discount = coupon.maxDiscountAmount;
          }
        } else if (discountType === "flat") {
          discount = coupon.discountValue;
        }

        if (discount > maxDiscount) {
          maxDiscount = discount;
          bestCoupon = coupon;
        }
      }

      if (!bestCoupon) {
        return { success: false, message: "No eligible discount coupons found for your current cart value." };
      }

      let guestCouponResult = undefined;
      if (isGuest) {
        const guestCoupon = {
          couponId: bestCoupon._id.toString(),
          code: bestCoupon.code,
          discountType: bestCoupon.discountType,
          discountValue: bestCoupon.discountValue,
          minCartValue: bestCoupon.minCartValue,
          maxDiscountAmount: bestCoupon.maxDiscountAmount,
        };
        cookieStore.set("guest_coupon", JSON.stringify(guestCoupon), {
          httpOnly: true,
          maxAge: 7 * 24 * 60 * 60,
          path: "/",
          sameSite: "strict",
          secure: process.env.NODE_ENV === "production",
        });
        guestCouponResult = guestCoupon;
      } else {
        const cart = await Cart.findOne({ user: userId, isActive: true });
        if (cart) {
          cart.coupon = {
            couponId: bestCoupon._id,
            code: bestCoupon.code,
            discountType: bestCoupon.discountType,
            discountValue: bestCoupon.discountValue,
            maxDiscountAmount: bestCoupon.maxDiscountAmount,
            minCartValue: bestCoupon.minCartValue,
          };
          await cart.save();
        }
      }

      return {
        success: true,
        message: `Automatically applied the best coupon: ${bestCoupon.code}.`,
        discountAmount: maxDiscount,
        couponCode: bestCoupon.code,
        guestCoupon: guestCouponResult
      };
    },
  },

  runDynamicPricing: {
    name: "runDynamicPricing",
    description: "Calculates optimized real-time pricing for a variant using the ML engine and updates the database.",
    parameters: {
      type: "object",
      properties: {
        variantId: { type: "string", description: "ObjectId of the GroceryVariant to optimize" },
        demandSurge: { type: "number", default: 1.0, description: "Demand multiplier (1.0 to 2.5)" },
        weatherMultiplier: { type: "number", default: 1.0, description: "Weather surge factor (1.0 to 1.5)" },
        competitorPrice: { type: "number", description: "Competitor's price for identical variant" }
      },
      required: ["variantId"]
    },
    execute: async (userId: string, args: { variantId: string; demandSurge?: number; weatherMultiplier?: number; competitorPrice?: number }) => {
      const variant = await GroceryVariant.findById(args.variantId);
      if (!variant) {
        return { success: false, message: "Grocery variant not found." };
      }

      const basePrice = variant.price.selling;
      const stock = variant.countInStock || 0;

      let dynamicPrice = basePrice;
      try {
        const response = await fetch(`${ML_ENGINE_URL}/predict/pricing`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(2000),
          body: JSON.stringify({
            base_price: basePrice,
            stock: stock,
            demand_surge: args.demandSurge || 1.0,
            weather_multiplier: args.weatherMultiplier || 1.0,
            competitor_price: args.competitorPrice || null
          })
        });

        if (response.ok) {
          const data = await response.json();
          dynamicPrice = data.dynamic_price;
        }
      } catch (err) {
        console.warn("Pricing model service unreachable. Falling back to local pricing optimization formula:", err);
        // Fallback local calculations matching python engine logic
        let price = basePrice;
        if (stock < 5) price *= 1.2;
        else if (stock < 15) price *= 1.08;
        const surge = Math.max(1.0, Math.min(2.5, (args.demandSurge || 1.0) * (args.weatherMultiplier || 1.0)));
        price *= surge;
        if (args.competitorPrice && price > args.competitorPrice * 1.15) {
          price = args.competitorPrice * 1.15;
        }
        dynamicPrice = Math.round(price * 100) / 100;
      }

      // Apply safety checks (max 15% increase or 30% decrease from base)
      const maxAllowed = basePrice * 1.15;
      const minAllowed = basePrice * 0.70;
      if (dynamicPrice > maxAllowed) dynamicPrice = Math.round(maxAllowed * 100) / 100;
      if (dynamicPrice < minAllowed) dynamicPrice = Math.round(minAllowed * 100) / 100;

      // Save to database
      variant.price.selling = dynamicPrice;
      await variant.save();

      return {
        success: true,
        message: `Dynamic price calculated and updated successfully.`,
        previousPrice: basePrice,
        updatedPrice: dynamicPrice,
        stockRemaining: stock
      };
    },
  },

  runDemandForecast: {
    name: "runDemandForecast",
    description: "Forecasts sales demand for a product using the XGBoost engine.",
    parameters: {
      type: "object",
      properties: {
        dayOfWeek: { type: "number", description: "Day of week index (0-6)" },
        isHoliday: { type: "boolean", description: "True if day is a holiday" },
        lag7Sales: { type: "number", description: "Sales count from 7 days ago" },
        temperature: { type: "number", description: "Local temperature in celsius" },
        discountRate: { type: "number", description: "Discount percentage applied (0.0 to 1.0)" }
      },
      required: ["dayOfWeek", "isHoliday", "lag7Sales", "temperature", "discountRate"]
    },
    execute: async (userId: string, args: { dayOfWeek: number; isHoliday: boolean; lag7Sales: number; temperature: number; discountRate: number }) => {
      try {
        const response = await fetch(`${ML_ENGINE_URL}/predict/demand`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(2000),
          body: JSON.stringify({
            day_of_week: args.dayOfWeek,
            is_holiday: args.isHoliday,
            lag_7_sales: args.lag7Sales,
            temperature: args.temperature,
            discount_rate: args.discountRate
          })
        });

        if (response.ok) {
          const data = await response.json();
          return { success: true, predictedDemand: data.predicted_demand };
        }
      } catch (err) {
        console.warn("Forecast service unreachable. Running fallback forecast:", err);
      }
      // Fallback simulation
      const pred = Math.round(args.lag7Sales * (1.0 + 0.1 * Math.sin(args.dayOfWeek)) - (args.discountRate * 2.0));
      return { success: true, predictedDemand: Math.max(0, pred) };
    },
  },

  runCustomerSegmentation: {
    name: "runCustomerSegmentation",
    description: "Performs ML-based user segmentation (CLV, churn risk, tier) and updates the UserAiProfile.",
    parameters: {
      type: "object",
      properties: {
        targetUserId: { type: "string", description: "Mongoose ObjectId of the user to segment" }
      }
    },
    execute: async (userId: string, args: { targetUserId?: string }) => {
      const targetId = args.targetUserId || userId;

      // Call spend analysis locally first
      const analysisRes = await aiTools.getSpendAnalysis.execute(targetId, {});
      if (!analysisRes.success) {
        return { success: false, message: "Failed to gather user metrics." };
      }

      const { avgOrderValue, totalOrders, returnRate, inactiveDays } = analysisRes.metrics;
      const purchaseFreqMonthly = totalOrders / 6; // Assume historical orders span 6 months

      let churnRisk = 0.5;
      let clv = avgOrderValue * purchaseFreqMonthly * 12 * 0.15;
      let customerSegment = "medium";

      try {
        const response = await fetch(`${ML_ENGINE_URL}/predict/segment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(2000),
          body: JSON.stringify({
            inactive_days: inactiveDays,
            return_rate: returnRate,
            avg_spend: avgOrderValue,
            purchase_freq_monthly: purchaseFreqMonthly
          })
        });

        if (response.ok) {
          const data = await response.json();
          churnRisk = data.churn_risk;
          clv = data.predicted_clv;
          customerSegment = data.customer_segment;
        }
      } catch (err) {
        console.warn("Segmentation service unreachable. Fallback evaluation running:", err);
        churnRisk = parseFloat(Math.min(0.99, (inactiveDays * 0.05) + (returnRate * 2.0)).toFixed(3));
        customerSegment = clv > 500 ? "premium" : (clv > 150 ? "medium" : "budget");
      }

      // Save to database
      await UserAiProfile.findOneAndUpdate(
        { userId: targetId },
        {
          $set: {
            spendBracket: customerSegment,
            avgOrderValue: avgOrderValue
          }
        },
        { upsert: true }
      );

      return {
        success: true,
        userId: targetId,
        segment: customerSegment,
        predictedClv: clv,
        churnRisk: churnRisk
      };
    },
  },
};
