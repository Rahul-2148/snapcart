import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { isDeliveryPartner } from "@/lib/server/roles";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import { CashDeposit } from "@/models/cashDeposit.model";
import { Store } from "@/models/store.model";

export const GET = async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!(await isDeliveryPartner(session))) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDb();

    const deposits = await CashDeposit.find({ deliveryPartner: session.user.id })
      .populate("storeId", "name location.address")
      .sort({ createdAt: -1 })
      .limit(30);

    const stores = await Store.find({ status: "active" }, "name location.address");

    return NextResponse.json({ success: true, deposits, stores });
  } catch (error: any) {
    console.error("GET Cash Deposits Error:", error);
    return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
  }
};

export const POST = async (req: NextRequest) => {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!(await isDeliveryPartner(session))) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDb();

    const partner = await DeliveryPartner.findOne({ user: session.user.id });
    if (!partner) {
      return NextResponse.json({ message: "Partner profile missing" }, { status: 404 });
    }

    const { amount, method, transactionId, storeId } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ message: "Amount must be greater than zero" }, { status: 400 });
    }

    const currentCash = partner.earnings?.cashInHand || 0;
    if (amount > currentCash) {
      return NextResponse.json({ message: "Deposit amount cannot exceed Cash In Hand balance" }, { status: 400 });
    }

    if (method === "store_manager" && !storeId) {
      return NextResponse.json({ message: "Store is required for offline handover" }, { status: 400 });
    }

    const depositData: any = {
      deliveryPartner: session.user.id,
      amount,
      method,
      status: method === "upi" ? "approved" : "pending",
    };

    if (method === "upi") {
      depositData.transactionId = transactionId || `UPI-TXN-${Date.now()}`;
      depositData.approvedAt = new Date();

      // Deduct cash immediately for online UPI
      partner.earnings.cashInHand = Math.max(0, currentCash - amount);
      await partner.save();
    } else {
      depositData.storeId = storeId;
      if (transactionId) depositData.transactionId = transactionId;
    }

    const deposit = await CashDeposit.create(depositData);

    if (method === "store_manager" && storeId) {
      try {
        const { notifyStoreManager } = await import("@/lib/server/notifications");
        await notifyStoreManager(
          storeId,
          {
            title: "Cash Handover Request",
            message: `Delivery Partner ${session.user.name || "Rider"} has requested cash deposit of ₹${amount} for approval.`,
            type: "system",
            link: "/store-manager",
            priority: "normal",
          }
        );
      } catch (err) {
        console.error("Failed to notify store manager for cash deposit:", err);
      }
    }

    return NextResponse.json({
      success: true,
      deposit,
      cashInHand: partner.earnings.cashInHand,
    });
  } catch (error: any) {
    console.error("POST Cash Deposit Error:", error);
    return NextResponse.json({ message: error.message || "Internal Server Error" }, { status: 500 });
  }
};
