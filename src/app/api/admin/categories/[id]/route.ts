
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Category } from "@/models/category.model";
import { auth } from "@/auth";
import mongoose from "mongoose";
import { createSlug } from "@/lib/utils/createSlug";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    let isValid = false;
    try {
      new mongoose.Types.ObjectId(id);
      isValid = true;
    } catch {
      isValid = false;
    }
    if (!isValid) {
        return NextResponse.json({ success: false, message: "Invalid category ID" }, { status: 400 });
    }
    await connectDb();
    const { name, allowedUnits } = await req.json();
    const slug = createSlug(name);
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name, slug, allowedUnits },
      { new: true }
    );
    if (!updatedCategory) {
      return NextResponse.json(
        { success: false, message: "Failed to update category" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, category: updatedCategory });
  } catch (error: any) {
    console.error(`PUT category ${id} error:`, error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { success: false, message: `Validation failed: ${messages.join(', ')}` },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    console.log("DELETE category ID:", id, typeof id);
    let isValid = false;
    try {
      new mongoose.Types.ObjectId(id);
      isValid = true;
    } catch {
      isValid = false;
    }
    console.log("Is valid ObjectId:", isValid);
    if (!isValid) {
        return NextResponse.json({ success: false, message: "Invalid category ID" }, { status: 400 });
    }
    await connectDb();
    const deletedCategory = await Category.findByIdAndDelete(id);
    if (!deletedCategory) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error(`DELETE category ${id} error:`, error);
    return NextResponse.json(
      { success: false, message: "Failed to delete category" },
      { status: 500 }
    );
  }
}
