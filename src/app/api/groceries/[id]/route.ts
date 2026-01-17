import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDb from "@/lib/server/db";
import { Grocery } from "@/models/grocery.model";

// register models used in population
import "@/models/category.model";
import "@/models/groceryVariant.model";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid grocery ID" },
        { status: 400 }
      );
    }

    await connectDb();

    const grocery = await Grocery.findById(id)
      .populate("category", "name allowedUnits")
      .populate({ path: "variants", model: "GroceryVariant" });

    if (!grocery) {
      return NextResponse.json(
        { success: false, message: "Grocery not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, grocery });
  } catch (error) {
    console.error(`GET grocery ${params?.id} error:`, error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch grocery" },
      { status: 500 }
    );
  }
}
