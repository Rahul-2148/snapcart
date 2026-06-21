// src/app/api/store-manager/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Store } from "@/models/store.model";
import { Order } from "@/models/order.model";
import { StoreInventory } from "@/models/storeInventory.model";
import { StoreStaff } from "@/models/storeStaff.model";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const isManager = session?.user?.roles?.includes("storeManager");
    const isAdmin = session?.user?.roles?.includes("admin");

    if (!session || (!isManager && !isAdmin)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    // Find store assigned to this manager
    // Admins can view any store, but by default we look up by manager or return the first store for admins if not specified
    const query = isAdmin ? {} : { manager: session.user.id };
    const store = await Store.findOne(query).populate("manager", "name email");

    if (!store) {
      return NextResponse.json(
        { error: "No store assigned to this manager account" },
        { status: 404 }
      );
    }

    // Calculate metrics
    const pendingOrdersCount = await Order.countDocuments({
      storeId: store._id,
      orderStatus: { $in: ["pending", "confirmed", "packed"] },
    });

    const outOfStockCount = await StoreInventory.countDocuments({
      store: store._id,
      stock: 0,
      isAvailable: true,
    });

    const totalVariantsCount = await StoreInventory.countDocuments({
      store: store._id,
    });

    const activeStaffCount = await StoreStaff.countDocuments({
      store: store._id,
      status: "on-duty",
    });

    return NextResponse.json({
      store,
      metrics: {
        pendingOrdersCount,
        outOfStockCount,
        totalVariantsCount,
        activeStaffCount,
      },
    });
  } catch (error: any) {
    console.error("GET Store Manager Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    const isManager = session?.user?.roles?.includes("storeManager");
    const isAdmin = session?.user?.roles?.includes("admin");

    if (!session || (!isManager && !isAdmin)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const query = isAdmin ? {} : { manager: session.user.id };
    const store = await Store.findOne(query);

    if (!store) {
      return NextResponse.json(
        { error: "No store assigned to this manager account" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { status, openTime, closeTime, contactPhone } = body;

    if (status) store.status = status;
    if (openTime) store.openingHours.open = openTime;
    if (closeTime) store.openingHours.close = closeTime;
    if (contactPhone !== undefined) store.contactPhone = contactPhone;

    await store.save();

    return NextResponse.json({ success: true, store });
  } catch (error: any) {
    console.error("PUT Store Manager Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
