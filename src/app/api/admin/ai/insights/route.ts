import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import { Grocery } from "@/models/grocery.model";
import { callAiGateway } from "@/lib/server/ai/gateway";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const role = session?.user?.currentRole || "guest";

    if (role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized. Admin role required." }, { status: 403 });
    }

    const body = await req.json();
    const message = (body?.message || "Provide operations snapshot").toString().trim();

    await connectDb();

    // 1. Gather live operational metrics for the prompt context
    const totalOrdersCount = await Order.countDocuments();
    const pendingOrdersCount = await Order.countDocuments({ orderStatus: "pending" });
    const deliveredOrdersCount = await Order.countDocuments({ orderStatus: "delivered" });

    // Calculate revenue aggregates
    const revenueStats = await Order.aggregate([
      { $match: { orderStatus: "delivered" } },
      { $group: { _id: null, totalSales: { $sum: "$finalTotal" } } },
    ]);
    const totalRevenue = revenueStats[0]?.totalSales || 0;

    // Get count of inactive products
    const outOfStockProducts = await Grocery.countDocuments({ isActive: false });

    // 2. Formulate analytical system instructions and user context
    const systemInstruction = "You are the Snapcart Admin Copilot. You specialize in analyzing operations, GMV trends, inventory status, and generating business strategies.";

    const promptText = `
User Query: "${message}"

Current Snapshot Data:
- Total Orders: ${totalOrdersCount}
- Pending Orders: ${pendingOrdersCount}
- Delivered Orders: ${deliveredOrdersCount}
- Total Revenue: ₹${totalRevenue.toFixed(2)}
- Inactive/Out of Stock Products: ${outOfStockProducts}

Format your response in a clear, executive-friendly structure:
1) Ops Snapshot (highlight metrics)
2) Trend Analysis (improving/worsening based on data)
3) Action Plan (high priority, medium priority, long-term)
`;

    // 3. Request insights from Gemini via AI Gateway
    const gatewayResult = await callAiGateway({
      userId: session?.user?.id,
      role: "admin",
      prompt: promptText,
      systemInstruction,
      taskType: "summary",
    });

    return NextResponse.json({
      success: true,
      reply: gatewayResult.reply,
      snapshot: {
        totalOrders: totalOrdersCount,
        pendingOrders: pendingOrdersCount,
        deliveredOrders: deliveredOrdersCount,
        totalRevenue,
        outOfStockProducts,
      },
    });
  } catch (error: any) {
    console.error("AI admin insights API error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to compile admin insights" }, { status: 500 });
  }
}
