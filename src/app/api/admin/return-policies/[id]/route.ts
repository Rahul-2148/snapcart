// src/app/api/admin/return-policies/[id]/route.ts
import { auth } from "@/auth";
import { ReturnPolicy } from "@/models/returnPolicy.model";
import connectDb from "@/lib/server/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDb();

    const { id } = await params;
    const policy = await ReturnPolicy.findById(id);
    if (!policy) {
      return NextResponse.json(
        { error: "Return policy not found" },
        { status: 404 },
      );
    }

    const updates = await req.json();

    // Update allowed fields
    const allowedUpdates = [
      "isReturnable",
      "returnWindowDays",
      "policyType",
      "description",
      "isActive",
    ];

    allowedUpdates.forEach((key) => {
      if (key in updates) {
        (policy as any)[key] = updates[key];
      }
    });

    await policy.save();

    return NextResponse.json({
      message: "Return policy updated",
      policy,
    });
  } catch (error) {
    console.error("Update return policy error:", error);
    return NextResponse.json(
      { error: "Failed to update return policy" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await connectDb();

    const { id } = await params;
    await ReturnPolicy.findByIdAndDelete(id);

    return NextResponse.json({ message: "Return policy deleted" });
  } catch (error) {
    console.error("Delete return policy error:", error);
    return NextResponse.json(
      { error: "Failed to delete return policy" },
      { status: 500 },
    );
  }
}
