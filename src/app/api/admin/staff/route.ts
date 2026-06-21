// src/app/api/admin/staff/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { StoreStaff } from "@/models/storeStaff.model";
import { Store } from "@/models/store.model";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    // Fetch all staff across all stores, populating store details
    const staff = await StoreStaff.find({})
      .populate("store", "name location")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, staff });
  } catch (error: any) {
    console.error("GET Admin Staff Error:", error);
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
    const { name, role, gender, phone, status, storeId, salary, powers } = body;

    if (!name || !role || !gender || !phone || !storeId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify store exists
    const storeExists = await Store.findById(storeId);
    if (!storeExists) {
      return NextResponse.json({ error: "Assigned dark store not found" }, { status: 404 });
    }

    const newStaff = new StoreStaff({
      name,
      role,
      gender,
      phone,
      status: status || "on-duty",
      store: storeId,
      salary: salary !== undefined ? Number(salary) : 0,
      powers: Array.isArray(powers) ? powers : [],
    });

    await newStaff.save();

    return NextResponse.json({ success: true, staff: newStaff });
  } catch (error: any) {
    console.error("POST Admin Staff Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Staff member ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const { name, role, gender, phone, status, storeId, salary, powers } = body;

    const staffMember = await StoreStaff.findById(id);
    if (!staffMember) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    if (storeId !== undefined) {
      const storeExists = await Store.findById(storeId);
      if (!storeExists) {
        return NextResponse.json({ error: "Assigned dark store not found" }, { status: 404 });
      }
      staffMember.store = storeId;
    }

    if (name !== undefined) staffMember.name = name;
    if (role !== undefined) staffMember.role = role;
    if (gender !== undefined) staffMember.gender = gender;
    if (phone !== undefined) staffMember.phone = phone;
    if (status !== undefined) staffMember.status = status;
    if (salary !== undefined) staffMember.salary = Number(salary);
    if (powers !== undefined) staffMember.powers = Array.isArray(powers) ? powers : [];

    await staffMember.save();

    return NextResponse.json({ success: true, staff: staffMember });
  } catch (error: any) {
    console.error("PUT Admin Staff Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Staff member ID is required" }, { status: 400 });
    }

    const staffMember = await StoreStaff.findByIdAndDelete(id);
    if (!staffMember) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Staff member removed successfully" });
  } catch (error: any) {
    console.error("DELETE Admin Staff Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
