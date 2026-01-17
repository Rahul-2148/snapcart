
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Grocery } from "@/models/grocery.model";
import { auth } from "@/auth";
import mongoose from "mongoose";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: "Invalid grocery ID" }, { status: 400 });
        }
        await connectDb();
        const grocery = await Grocery.findById(id).populate("category variants");
        if (!grocery) {
            return NextResponse.json({ success: false, message: "Grocery not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, grocery });
    } catch (error) {
        const resolvedParams = await params;
        console.error(`GET grocery ${resolvedParams.id} error:`, error);
        return NextResponse.json({ success: false, message: "Failed to fetch grocery" }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }
        const { id } = await params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return NextResponse.json({ success: false, message: "Invalid grocery ID" }, { status: 400 });
        }
        await connectDb();
        const body = await req.json();
        const updatedGrocery = await Grocery.findByIdAndUpdate(id, body, { new: true });
        if (!updatedGrocery) {
            return NextResponse.json({ success: false, message: "Grocery not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true, grocery: updatedGrocery });
    } catch (error) {
        const resolvedParams = await params;
        console.error(`PUT grocery ${resolvedParams.id} error:`, error);
        return NextResponse.json({ success: false, message: "Failed to update grocery" }, { status: 500 });
    }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ success: false, message: "Invalid grocery ID" }, { status: 400 });
    }

    await connectDb();

    const deletedGrocery = await Grocery.findByIdAndDelete(id);

    if (!deletedGrocery) {
      return NextResponse.json(
        { success: false, message: "Grocery not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Grocery deleted successfully",
    });
  } catch (error) {
    const resolvedParams = await params;
    console.error(`DELETE grocery ${resolvedParams.id} error:`, error);
    return NextResponse.json(
      { success: false, message: "Failed to delete grocery" },
      { status: 500 }
    );
  }
}