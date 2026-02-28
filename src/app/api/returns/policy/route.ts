// src/app/api/returns/policy/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { ReturnPolicy } from "@/models/returnPolicy.model";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groceryId = searchParams.get("groceryId");

    if (!groceryId) {
      return NextResponse.json({ error: "groceryId is required" }, { status: 400 });
    }

    await connectDb();

    const policy = await ReturnPolicy.findOne({ grocery: groceryId, isActive: true });
    if (!policy) {
      return NextResponse.json({ hasPolicy: false }, { status: 200 });
    }

    return NextResponse.json({
      hasPolicy: true,
      isReturnable: policy.isReturnable,
      returnWindowDays: policy.returnWindowDays,
      policyType: policy.policyType,
      description: policy.description,
    }, { status: 200 });
  } catch (error) {
    console.error("Fetch return policy error:", error);
    return NextResponse.json({ error: "Failed to fetch return policy" }, { status: 500 });
  }
}
