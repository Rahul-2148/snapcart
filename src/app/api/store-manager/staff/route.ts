// src/app/api/store-manager/staff/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Store } from "@/models/store.model";
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

    // Find store managed by this user
    const query = isAdmin ? {} : { manager: session.user.id };
    const store = await Store.findOne(query);

    if (!store) {
      return NextResponse.json(
        { error: "No store assigned to this manager account" },
        { status: 404 }
      );
    }

    const staff = await StoreStaff.find({ store: store._id }).sort({ createdAt: -1 });

    return NextResponse.json({ staff });
  } catch (error: any) {
    console.error("GET Store Staff Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
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
    const { name, role, gender, phone, status, salary, powers } = body;

    if (!name || !role || !gender || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newStaff = new StoreStaff({
      name,
      role,
      gender,
      phone,
      status: status || "on-duty",
      store: store._id,
      salary: salary !== undefined ? Number(salary) : 0,
      powers: Array.isArray(powers) ? powers : [],
    });

    await newStaff.save();

    return NextResponse.json({ success: true, staff: newStaff });
  } catch (error: any) {
    console.error("POST Store Staff Error:", error);
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Staff member ID is required" }, { status: 400 });
    }

    const query = isAdmin ? {} : { manager: session.user.id };
    const store = await Store.findOne(query);

    if (!store) {
      return NextResponse.json(
        { error: "No store assigned to this manager account" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, role, gender, phone, status, salary, powers } = body;

    const staffMember = await StoreStaff.findOne({ _id: id, store: store._id });
    if (!staffMember) {
      return NextResponse.json({ error: "Staff member not found in this store" }, { status: 404 });
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
    console.error("PUT Store Staff Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const isManager = session?.user?.roles?.includes("storeManager");
    const isAdmin = session?.user?.roles?.includes("admin");

    if (!session || (!isManager && !isAdmin)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDb();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Staff member ID is required" }, { status: 400 });
    }

    const query = isAdmin ? {} : { manager: session.user.id };
    const store = await Store.findOne(query);

    if (!store) {
      return NextResponse.json(
        { error: "No store assigned to this manager account" },
        { status: 404 }
      );
    }

    const staffMember = await StoreStaff.findOneAndDelete({ _id: id, store: store._id });
    if (!staffMember) {
      return NextResponse.json({ error: "Staff member not found or access denied" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Staff member removed successfully" });
  } catch (error: any) {
    console.error("DELETE Store Staff Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
