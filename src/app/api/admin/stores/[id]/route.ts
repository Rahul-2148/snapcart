// src/app/api/admin/stores/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Store } from "@/models/store.model";
import { User } from "@/models/user.model";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();
    const { id } = await params;

    const body = await req.json();
    const {
      name,
      longitude,
      latitude,
      address,
      city,
      state,
      district,
      area,
      pincode,
      serviceRadiusKm,
      openTime,
      closeTime,
      status,
      baseDeliveryFee,
      freeAboveDeliveryFee,
      minDeliveryMinutes,
      maxDeliveryMinutes,
      contactPhone,
      manager,
    } = body;

    const store = await Store.findById(id);
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Update simple fields
    if (name) store.name = name;
    if (serviceRadiusKm !== undefined) store.serviceRadiusKm = Number(serviceRadiusKm);
    if (openTime) store.openingHours.open = openTime;
    if (closeTime) store.openingHours.close = closeTime;
    if (status) store.status = status;
    if (baseDeliveryFee !== undefined) store.deliveryFee.base = Number(baseDeliveryFee);
    if (freeAboveDeliveryFee !== undefined) store.deliveryFee.freeAbove = Number(freeAboveDeliveryFee);
    if (minDeliveryMinutes !== undefined) store.estimatedDeliveryMinutes.min = Number(minDeliveryMinutes);
    if (maxDeliveryMinutes !== undefined) store.estimatedDeliveryMinutes.max = Number(maxDeliveryMinutes);
    if (contactPhone !== undefined) store.contactPhone = contactPhone;

    // Location coordinates & address
    if (longitude !== undefined && latitude !== undefined) {
      store.location.coordinates = [Number(longitude), Number(latitude)];
    }
    if (address) store.location.address = address;
    if (city) store.location.city = city;
    if (state) store.location.state = state;
    if (district !== undefined) store.location.district = district;
    if (area !== undefined) store.location.area = area;
    if (pincode) store.location.pincode = pincode;

    // Manager assignment
    if (manager !== undefined) {
      if (manager) {
        const managerUser = await User.findById(manager);
        if (!managerUser) {
          return NextResponse.json({ error: "Assigned manager user not found" }, { status: 400 });
        }
        store.manager = manager;
      } else {
        store.manager = null;
      }
    }

    await store.save();

    return NextResponse.json({ success: true, store });
  } catch (error: any) {
    console.error("PUT Admin Store ID Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();
    const { id } = await params;

    const store = await Store.findByIdAndDelete(id);
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Store deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Admin Store ID Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
