import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Category } from "@/models/category.model";
import { auth } from "@/auth";
import { createSlug } from "@/lib/utils/createSlug";

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const query: any = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const categories = await Category.find(query).sort({ name: 1 });
    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error("GET categories error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    await connectDb();
    const { name, allowedUnits } = await req.json();
    const slug = createSlug(name);
    const newCategory = new Category({ name, slug, allowedUnits });
    await newCategory.save();
    return NextResponse.json(
      { success: true, category: newCategory },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST category error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return NextResponse.json(
        {
          success: false,
          message: `Validation failed: ${messages.join(", ")}`,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: `Failed to create category: ${error.message}`,
      },
      { status: 500 }
    );
  }
}
