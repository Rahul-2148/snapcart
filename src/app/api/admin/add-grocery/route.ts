import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import uploadOnCloudinary from "@/lib/server/cloudinary";

import { Grocery } from "@/models/grocery.model";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { Category } from "@/models/category.model";
import { calculateDiscountPercent } from "@/lib/utils/price";
import { createSlug } from "@/lib/utils/createSlug";

export async function POST(req: NextRequest) {
  try {
    await connectDb();

    /* ---------- FORM DATA (FIRST) ---------- */
    const formData = await req.formData();
    const id = formData.get("id") as string;

    if (id) {
      // Update logic
      const grocery = await Grocery.findById(id);
      if (!grocery) {
        return NextResponse.json(
          { success: false, message: "Grocery not found" },
          { status: 404 }
        );
      }

      const name = formData.get("name") as string;
      const description = formData.get("description") as string;
      const categoryId = formData.get("category") as string;
      const brand = (formData.get("brand") as string) || "Ordinary";

      const label = formData.get("label") as string;
      const unit = formData.get("unit") as string;
      const value = Number(formData.get("value"));
      const multiplier = Number(formData.get("multiplier")) || 1;

      const mrp = Math.round(Number(formData.get("mrp")));
      const selling = Math.round(Number(formData.get("selling")));
      const countInStock = Number(formData.get("countInStock")) || 0;

      grocery.name = name;
      grocery.description = description;
      grocery.category = categoryId;
      grocery.brand = brand;
      grocery.updatedAt = new Date();

      const files = formData.getAll("images") as File[];
      if (files.length > 0) {
        const uploadedImages: { url: string; publicId: string }[] = [];
        const folder = `Snapcart_Grocery_Single-vendor/grocery-images/${grocery.slug}`;

        for (const file of files) {
          const uploaded = await uploadOnCloudinary(file, folder);
          if (uploaded) uploadedImages.push(uploaded);
        }
        grocery.images = uploadedImages;
      }

      await grocery.save();

      const variant = await GroceryVariant.findOne({ grocery: grocery._id });
      if (variant) {
        variant.label = label;
        variant.unit = { unit, value, multiplier };
        variant.price = {
          mrp,
          selling,
          discountPercent: calculateDiscountPercent(mrp, selling),
        };
        variant.countInStock = countInStock;
        await variant.save();
      }

      return NextResponse.json(
        {
          success: true,
          message: "Grocery updated successfully",
          grocery,
        },
        { status: 200 }
      );
    } else {
      // Create logic
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;
      const categoryId = formData.get("category") as string;
      const brand = (formData.get("brand") as string) || "Ordinary";

      const label = formData.get("label") as string;
      const unit = formData.get("unit") as string;
      const value = Number(formData.get("value"));
      const multiplier = Number(formData.get("multiplier")) || 1;

      const mrp = Math.round(Number(formData.get("mrp")));
      const selling = Math.round(Number(formData.get("selling")));
      const countInStock = Number(formData.get("countInStock")) || 0;

      /* ---------- AUTH (AFTER BODY READ) ---------- */
      const session = await auth();
      if (session?.user?.role !== "admin") {
        return NextResponse.json(
          { success: false, message: "You are not authorized" },
          { status: 401 }
        );
      }

      /* ---------- VALIDATION ---------- */
      if (
        !name ||
        !categoryId ||
        !label ||
        !unit ||
        isNaN(value) ||
        isNaN(mrp) ||
        isNaN(selling)
      ) {
        return NextResponse.json(
          { success: false, message: "Required fields missing" },
          { status: 400 }
        );
      }

      /* ---------- CATEGORY CHECK ---------- */
      const category = await Category.findById(categoryId);
      if (!category) {
        return NextResponse.json(
          { success: false, message: "Invalid category" },
          { status: 400 }
        );
      }

      if (!category.allowedUnits.includes(unit)) {
        return NextResponse.json(
          { success: false, message: `Unit '${unit}' not allowed` },
          { status: 400 }
        );
      }

      /* ---------- CREATE GROCERY ---------- */
      const slug = `${createSlug(name)}-${Date.now().toString().slice(-5)}`;

      const grocery = await Grocery.create({
        name,
        slug,
        description,
        category: category._id,
        brand,
        createdBy: session.user.id,
        images: [],
      });

      /* ---------- IMAGE UPLOAD ---------- */
      const files = formData.getAll("images") as File[];
      const uploadedImages: { url: string; publicId: string }[] = [];
      const folder = `Snapcart_Grocery_Single-vendor/grocery-images/${grocery.slug}`;

      for (const file of files) {
        const uploaded = await uploadOnCloudinary(file, folder);
        if (uploaded) uploadedImages.push(uploaded);
      }

      grocery.images = uploadedImages;
      await grocery.save();

      /* ---------- VARIANT ---------- */
      const discountPercent = calculateDiscountPercent(mrp, selling);

      const variant = await GroceryVariant.create({
        grocery: grocery._id,
        label,
        unit: { unit, value, multiplier },
        price: { mrp, selling, discountPercent },
        countInStock,
        isDefault: true,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Grocery added successfully",
          grocery,
          defaultVariant: variant,
        },
        { status: 201 }
      );
    }
  } catch (error: any) {
    console.error("ADD/UPDATE GROCERY ERROR:", error);
    return NextResponse.json(
      { success: false, message: `Error saving grocery: ${error.message}` },
      { status: 500 }
    );
  }
}
