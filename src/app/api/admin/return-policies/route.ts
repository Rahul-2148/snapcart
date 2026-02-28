// src/app/api/admin/return-policies/route.ts
import { auth } from "@/auth";
import { ReturnPolicy } from "@/models/returnPolicy.model";
import connectDb from "@/lib/server/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    await connectDb();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const isActive = searchParams.get("isActive");
    const groceryFilter = searchParams.get("grocery") || searchParams.get("groceryId");

    let query: any = {};
    if (isActive) {
      query.isActive = isActive === "true";
    }

    if (groceryFilter) {
      query.grocery = groceryFilter;
    }

    const returnPolicies = await ReturnPolicy.find(query)
      .populate("grocery")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await ReturnPolicy.countDocuments(query);

    return NextResponse.json({
      returnPolicies,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("List return policies error:", error);
    return NextResponse.json(
      { error: "Failed to fetch return policies" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    await connectDb();

    const {
      grocery,
      groceryId,
      isReturnable,
      returnWindowDays,
      policyType,
      description,
    } = await req.json();

    // Accept either 'grocery' or 'groceryId' from the request
    const finalGroceryId = grocery || groceryId;
    
    if (!finalGroceryId) {
      return NextResponse.json(
        { error: "grocery ID is required" },
        { status: 400 }
      );
    }

    // Check if policy already exists
    const existing = await ReturnPolicy.findOne({ grocery: finalGroceryId });
    if (existing) {
      return NextResponse.json(
        { error: "Return policy already exists for this product" },
        { status: 400 }
      );
    }

    const policy = new ReturnPolicy({
      grocery: finalGroceryId,
      isReturnable,
      returnWindowDays,
      policyType,
      description,
      isActive: true,
    });

    await policy.save();

    return NextResponse.json(
      { message: "Return policy created", policy },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create return policy error:", error);
    return NextResponse.json(
      { error: "Failed to create return policy" },
      { status: 500 }
    );
  }
}
