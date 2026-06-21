import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb, { startDbSession } from "@/lib/server/db";
import { Store } from "@/models/store.model";
import { CashDeposit } from "@/models/cashDeposit.model";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const isManager = session?.user?.roles?.includes("storeManager");
    const isAdmin = session?.user?.roles?.includes("admin");

    if (!session || (!isManager && !isAdmin)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    // Find the store managed by this user
    const storeQuery = isAdmin ? {} : { manager: session.user.id };
    const store = await Store.findOne(storeQuery);

    if (!store) {
      return NextResponse.json(
        { error: "No store assigned to this manager account" },
        { status: 404 }
      );
    }

    // Retrieve all offline cash deposits for this store
    const deposits = await CashDeposit.find({
      storeId: store._id,
      method: "store_manager",
    })
      .populate("deliveryPartner", "name email mobileNumber")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, deposits });
  } catch (error: any) {
    console.error("GET Store Cash Deposits Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const dbSession = await startDbSession();

  try {
    const session = await auth();
    const isManager = session?.user?.roles?.includes("storeManager");
    const isAdmin = session?.user?.roles?.includes("admin");

    if (!session || (!isManager && !isAdmin)) {
      if (dbSession) {
        await dbSession.abortTransaction();
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    // Find the store managed by this user
    const storeQuery = isAdmin ? {} : { manager: session.user.id };
    const store = await Store.findOne(storeQuery).session(dbSession);

    if (!store) {
      if (dbSession) {
        await dbSession.abortTransaction();
      }
      return NextResponse.json(
        { error: "No store assigned to this manager account" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { depositId, action, rejectionReason } = body;

    if (!depositId || !action || !["approve", "reject"].includes(action)) {
      if (dbSession) {
        await dbSession.abortTransaction();
      }
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const deposit = await CashDeposit.findOne({
      _id: depositId,
      storeId: store._id,
    }).session(dbSession);

    if (!deposit) {
      if (dbSession) {
        await dbSession.abortTransaction();
      }
      return NextResponse.json({ error: "Cash deposit request not found at this store" }, { status: 404 });
    }

    if (deposit.status !== "pending") {
      if (dbSession) {
        await dbSession.abortTransaction();
      }
      return NextResponse.json({ error: "Deposit request is already processed" }, { status: 400 });
    }

    if (action === "approve") {
      deposit.status = "approved";
      deposit.approvedAt = new Date();

      // Retrieve the delivery partner profile
      const partner = await DeliveryPartner.findOne({ user: deposit.deliveryPartner }).session(dbSession);
      if (!partner) {
        if (dbSession) {
          await dbSession.abortTransaction();
        }
        return NextResponse.json({ error: "Delivery partner profile not found" }, { status: 404 });
      }

      // Deduct the cash from rider's cashInHand
      const currentCash = partner.earnings?.cashInHand || 0;
      partner.earnings.cashInHand = Math.max(0, currentCash - deposit.amount);
      await partner.save({ session: dbSession });
    } else if (action === "reject") {
      deposit.status = "rejected";
      deposit.rejectedAt = new Date();
      deposit.rejectionReason = rejectionReason || "Rejected by store manager";
    }

    await deposit.save({ session: dbSession });
    if (dbSession) {
      await dbSession.commitTransaction();
    }

    return NextResponse.json({ success: true, deposit });
  } catch (error: any) {
    if (dbSession) {
      if (dbSession.inTransaction()) {
        await dbSession.abortTransaction();
      }
    }
    console.error("PATCH Store Cash Deposit Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (dbSession) {
      dbSession.endSession();
    }
  }
}
