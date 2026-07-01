import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import { OrderItem } from "@/models/orderItem.model";
import { Grocery } from "@/models/grocery.model";
import { Cart } from "@/models/cart.model";
import { GroceryVariant } from "@/models/groceryVariant.model";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      // Fallback: guest users get trending/featured items
      await connectDb();
      const trending = await Grocery.find({ isActive: true, "badges.isFeatured": true }).limit(5).lean();
      return NextResponse.json({ success: true, type: "trending", recommendations: trending });
    }

    await connectDb();

    // 1. Fetch user purchase history (variant labels or item ids)
    const userOrders = await Order.find({ userId, orderStatus: "delivered" })
      .populate({
        path: "orderItems",
        model: "OrderItem",
        populate: {
          path: "variant",
          model: "GroceryVariant"
        }
      })
      .limit(10)
      .lean();

    const historicalVariantIds: string[] = [];
    const categoriesBought: string[] = [];

    for (const order of userOrders) {
      if (Array.isArray(order.orderItems)) {
        for (const item of order.orderItems as any[]) {
          if (item?.variant?._id) {
            historicalVariantIds.push(item.variant._id.toString());
          }
          if (item?.variant?.grocery) {
            // Find grocery to get category
            const groceryDoc = await Grocery.findById(item.variant.grocery).lean<{ category?: any }>();
            if (groceryDoc?.category) {
              categoriesBought.push(groceryDoc.category.toString());
            }
          }
        }
      }
    }

    // 2. Fetch user's active cart items (session basket)
    const activeCart = await Cart.findOne({ user: userId, isActive: true })
      .populate({
        path: "items",
        populate: {
          path: "variant",
          model: "GroceryVariant"
        }
      })
      .lean<{ items?: any[] }>();

    const basketVariantIds: string[] = [];
    if (activeCart && Array.isArray(activeCart.items)) {
      for (const item of activeCart.items) {
        if (item?.variant?._id) {
          basketVariantIds.push(item.variant._id.toString());
        }
      }
    }

    try {
      // 3. Call the Python ML Engine recommendations endpoint
      const ML_ENGINE_URL = (process.env.ML_ENGINE_URL || "http://localhost:8000").replace(/\/$/, "");
      const mlResponse = await fetch(`${ML_ENGINE_URL}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(2000),
        body: JSON.stringify({
          userId: userId,
          userHistory: historicalVariantIds,
          currentSessionBasket: basketVariantIds
        })
      });

      if (mlResponse.ok) {
        const mlData = await mlResponse.json();
        const collaborative = Array.isArray(mlData.collaborative_recommendations) ? mlData.collaborative_recommendations : [];
        const sessionRecs = Array.isArray(mlData.session_recommendations) ? mlData.session_recommendations : [];
        const combinedIds = [...new Set([...collaborative, ...sessionRecs])];

        if (combinedIds.length > 0) {
          // Resolve actual variant documents and get their main grocery products
          const resolvedVariants = await GroceryVariant.find({ _id: { $in: combinedIds } }).select("grocery").lean<{ grocery: any }[]>();
          const groceryIds = resolvedVariants.map(v => v.grocery);

          const mlRecommendations = await Grocery.find({
            _id: { $in: groceryIds },
            isActive: true
          })
            .limit(6)
            .populate("variants")
            .lean();

          if (mlRecommendations.length > 0) {
            return NextResponse.json({
              success: true,
              type: "deep-learning-personalized",
              recommendations: mlRecommendations
            });
          }
        }
      }
    } catch (mlError) {
      console.warn("FastAPI Recommendations Engine unreachable. Falling back to DB querying:", mlError);
    }

    // 4. Fallback: Fetch products in categories frequently purchased by user
    const recommendations = await Grocery.find({
      category: { $in: categoriesBought },
      isActive: true,
    })
      .limit(6)
      .populate("variants")
      .lean();

    return NextResponse.json({
      success: true,
      type: "personalized-fallback",
      categoriesTargeted: [...new Set(categoriesBought)],
      recommendations,
    });
  } catch (error: any) {
    console.error("Recommendations API error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to load recommendations" }, { status: 500 });
  }
}
