import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import uploadOnCloudinary, { deleteFromCloudinary } from "@/lib/server/cloudinary";

import { Grocery } from "@/models/grocery.model";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { Category } from "@/models/category.model";
import { calculateDiscountPercent } from "@/lib/utils/price";
import { createSlug } from "@/lib/utils/createSlug";

export async function POST(req: Request) {
  try {
    await connectDb();

    // Read formData FIRST (before any auth calls that might touch the body)
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e) {
      console.error("Error reading formData:", e);
      return NextResponse.json(
        { success: false, message: "Failed to parse form data" },
        { status: 400 }
      );
    }
    
    // Auth check AFTER reading body
    const session = await auth();
    if (!session || session?.user?.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "You are not authorized" },
        { status: 401 }
      );
    }
    
    const id = formData.get("id") as string;

    if (id) {
      // ===== UPDATE LOGIC =====
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

      // Parse variants JSON from formData
      const variantsJson = formData.get("variants") as string;
      let variants: any[] = [];
      if (variantsJson) {
        try {
          variants = JSON.parse(variantsJson);
        } catch (e) {
          return NextResponse.json(
            { success: false, message: "Invalid variants JSON" },
            { status: 400 }
          );
        }
      }

      /* ---------- VALIDATION ---------- */
      if (!name || !categoryId) {
        return NextResponse.json(
          { success: false, message: "Name and category are required" },
          { status: 400 }
        );
      }

      if (!variants || variants.length === 0) {
        return NextResponse.json(
          { success: false, message: "At least one variant is required" },
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

      // Validate all units
      for (const variant of variants) {
        if (!category.allowedUnits.includes(variant.unit.unit)) {
          return NextResponse.json(
            { success: false, message: `Unit '${variant.unit.unit}' not allowed for this category` },
            { status: 400 }
          );
        }
      }

      /* ---------- UPDATE GROCERY ---------- */
      grocery.name = name;
      grocery.description = description;
      grocery.category = categoryId;
      grocery.brand = brand;
      grocery.updatedAt = new Date();

      const files = formData.getAll("images") as File[];
      
      // Parse which existing images to keep
      const keepImageIdsJson = formData.get("keepImageIds") as string;
      let keepImageIds: string[] = [];
      if (keepImageIdsJson) {
        try {
          keepImageIds = JSON.parse(keepImageIdsJson);
        } catch (e) {
          console.error("Error parsing keepImageIds:", e);
        }
      }
      
      // Always process images - either delete removed ones or add new ones
      if (grocery.images && grocery.images.length > 0) {
        // Delete images that are NOT in the keepImageIds list
        for (const img of grocery.images) {
          const imgId = img._id?.toString() || img.id;
          if (!keepImageIds.includes(imgId)) {
            await deleteFromCloudinary(img.publicId);
          }
        }
      }

      // Build final images array
      const uploadedImages: { url: string; publicId: string }[] = [];
      
      // First, keep the existing images that weren't removed
      if (grocery.images && grocery.images.length > 0) {
        for (const img of grocery.images) {
          const imgId = img._id?.toString() || img.id;
          if (keepImageIds.includes(imgId)) {
            uploadedImages.push({
              url: img.url,
              publicId: img.publicId,
            });
          }
        }
      }

      // Then upload new files if any
      if (files.length > 0) {
        const folder = `Snapcart_Grocery_Single-vendor/grocery-images/${grocery.slug}`;
        for (const file of files) {
          const uploaded = await uploadOnCloudinary(file, folder);
          if (uploaded) uploadedImages.push(uploaded);
        }
      }
      
      grocery.images = uploadedImages;

      await grocery.save();

      /* ---------- DELETE OLD VARIANTS & CREATE NEW ONES ---------- */
      await GroceryVariant.deleteMany({ grocery: grocery._id });

      const createdVariants: any[] = [];
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const discountPercent = calculateDiscountPercent(
          v.price.mrp,
          v.price.selling
        );

        const variant = await GroceryVariant.create({
          grocery: grocery._id,
          label: v.label,
          unit: {
            unit: v.unit.unit,
            value: v.unit.value,
            multiplier: v.unit.multiplier,
          },
          price: {
            mrp: v.price.mrp,
            selling: v.price.selling,
            discountPercent,
          },
          countInStock: v.countInStock || 0,
          isDefault: i === 0,
        });

        createdVariants.push(variant);
      }

      return NextResponse.json(
        {
          success: true,
          message: "Grocery updated successfully",
          grocery,
          variants: createdVariants,
        },
        { status: 200 }
      );
    } else {
      // ===== CREATE LOGIC =====
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;
      const categoryId = formData.get("category") as string;
      const brand = (formData.get("brand") as string) || "Ordinary";

      // Parse variants JSON from formData
      const variantsJson = formData.get("variants") as string;
      let variants: any[] = [];
      if (variantsJson) {
        try {
          variants = JSON.parse(variantsJson);
        } catch (e) {
          return NextResponse.json(
            { success: false, message: "Invalid variants JSON" },
            { status: 400 }
          );
        }
      }

      /* ---------- VALIDATION ---------- */
      if (!name || !categoryId) {
        return NextResponse.json(
          { success: false, message: "Name and category are required" },
          { status: 400 }
        );
      }

      if (!variants || variants.length === 0) {
        return NextResponse.json(
          { success: false, message: "At least one variant is required" },
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

      // Validate all units
      for (const variant of variants) {
        if (!category.allowedUnits.includes(variant.unit.unit)) {
          return NextResponse.json(
            { success: false, message: `Unit '${variant.unit.unit}' not allowed for this category` },
            { status: 400 }
          );
        }
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

      /* ---------- CREATE VARIANTS ---------- */
      const createdVariants: any[] = [];
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const discountPercent = calculateDiscountPercent(
          v.price.mrp,
          v.price.selling
        );

        const variant = await GroceryVariant.create({
          grocery: grocery._id,
          label: v.label,
          unit: {
            unit: v.unit.unit,
            value: v.unit.value,
            multiplier: v.unit.multiplier,
          },
          price: {
            mrp: v.price.mrp,
            selling: v.price.selling,
            discountPercent,
          },
          countInStock: v.countInStock || 0,
          isDefault: i === 0,
        });

        createdVariants.push(variant);
      }

      return NextResponse.json(
        {
          success: true,
          message: "Grocery added successfully",
          grocery,
          variants: createdVariants,
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
