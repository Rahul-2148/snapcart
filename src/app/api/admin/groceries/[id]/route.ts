import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Grocery } from "@/models/grocery.model";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { auth } from "@/auth";
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid grocery ID" },
        { status: 400 },
      );
    }
    await connectDb();
    const grocery = await Grocery.findById(id).populate("category");

    // Fetch variants separately since it's a virtual field
    if (grocery) {
      const variants = await GroceryVariant.find({ grocery: id });
      (grocery as any).variants = variants;
      
      // Ensure badges are included in response
      if (!grocery.badges) {
        grocery.badges = {
          isBestSeller: false,
          isNew: false,
          isFeatured: false,
        };
      }
    }

    if (!grocery) {
      return NextResponse.json(
        { success: false, message: "Grocery not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, grocery });
  } catch (error: any) {
    const resolvedParams = await params;
    console.error(`GET grocery ${resolvedParams.id} error:`, error);
    return NextResponse.json(
      { success: false, message: `Failed to get grocery ${resolvedParams.id}` },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session || !session.user.roles?.includes("admin")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid grocery ID" },
        { status: 400 },
      );
    }
    await connectDb();
    const body = await req.json();
    const updatedGrocery = await Grocery.findByIdAndUpdate(id, body, {
      new: true,
    });
    if (!updatedGrocery) {
      return NextResponse.json(
        { success: false, message: "Grocery not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, grocery: updatedGrocery });
  } catch (error: any) {
    const resolvedParams = await params;
    console.error(`PUT grocery ${resolvedParams.id} error:`, error);
    return NextResponse.json(
      {
        success: false,
        message: `Failed to update grocery ${resolvedParams.id}`,
      },
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
    if (!session || !session.user.roles?.includes("admin")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid grocery ID" },
        { status: 400 },
      );
    }

    await connectDb();

    const deletedGrocery = await Grocery.findByIdAndDelete(id);

    if (!deletedGrocery) {
      return NextResponse.json(
        { success: false, message: "Grocery not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Grocery deleted successfully",
    });
  } catch (error: any) {
    const resolvedParams = await params;
    console.error(`DELETE grocery ${resolvedParams.id} error:`, error);
    return NextResponse.json(
      {
        success: false,
        message: `Failed to delete grocery ${resolvedParams.id}`,
      },
      { status: 500 },
    );
  }
}
