// src/app/api/admin/stores/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Store } from "@/models/store.model";
import { User } from "@/models/user.model";
import { createSlug } from "@/lib/utils/createSlug";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    // Populate the manager field with name and email
    const stores = await Store.find({})
      .populate("manager", "name email mobileNumber")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ stores });
  } catch (error: any) {
    console.error("GET Admin Stores Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

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

    // Validate required fields
    if (
      !name ||
      longitude === undefined ||
      latitude === undefined ||
      !address ||
      !city ||
      !state ||
      !pincode
    ) {
      return NextResponse.json(
        { error: "Name, address, coordinates, city, state, and pincode are required" },
        { status: 400 }
      );
    }

    // Check manager exists if provided
    if (manager) {
      const managerUser = await User.findById(manager);
      if (!managerUser) {
        return NextResponse.json({ error: "Assigned manager user not found" }, { status: 400 });
      }
    }

    // Construct Store document
    const storeData = {
      name,
      location: {
        type: "Point" as const,
        coordinates: [Number(longitude), Number(latitude)], // [lng, lat]
        address,
        city,
        state,
        district: district || "",
        area: area || "",
        pincode,
      },
      serviceRadiusKm: Number(serviceRadiusKm || 7),
      openingHours: {
        open: openTime || "06:00",
        close: closeTime || "23:00",
      },
      status: status || "active",
      deliveryFee: {
        base: Number(baseDeliveryFee !== undefined ? baseDeliveryFee : 25),
        freeAbove: Number(freeAboveDeliveryFee !== undefined ? freeAboveDeliveryFee : 500),
      },
      estimatedDeliveryMinutes: {
        min: Number(minDeliveryMinutes !== undefined ? minDeliveryMinutes : 8),
        max: Number(maxDeliveryMinutes !== undefined ? maxDeliveryMinutes : 15),
      },
      contactPhone: contactPhone || "",
      manager: manager || null,
    };

    const newStore = new Store(storeData);
    // Auto-generate slug
    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    newStore.slug = `${slugBase}-${newStore._id.toString().slice(-5)}`;
    
    await newStore.save();

    return NextResponse.json({ success: true, store: newStore });
  } catch (error: any) {
    console.error("POST Admin Store Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
