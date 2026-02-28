import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import connectDb from "@/lib/server/db";
import uploadOnCloudinary, {
  deleteFromCloudinary,
} from "@/lib/server/cloudinary";

import { Grocery } from "@/models/grocery.model";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { Category } from "@/models/category.model";
import { calculateDiscountPercent } from "@/lib/utils/price";
import { createSlug } from "@/lib/utils/createSlug";

export async function POST(req: Request) {
  try {
    await connectDb();

    // Read formData FIRST (before any auth that might touch the body)
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e) {
      console.error("Error reading formData:", e);
      return NextResponse.json(
        { success: false, message: "Failed to parse form data" },
        { status: 400 },
      );
    }

    // Auth check AFTER reading formData using JWT from cookies
    let token;
    try {
      const nextReq = new NextRequest(req.url, { headers: req.headers });
      token = await getToken({
        req: nextReq,
        secret: process.env.NEXTAUTH_SECRET,
      });
      if (!token || token.currentRole !== "admin") {
        return NextResponse.json(
          { success: false, message: "You are not authorized" },
          { status: 401 },
        );
      }
    } catch (authError) {
      console.error("Auth/JWT error:", authError);
      return NextResponse.json(
        { success: false, message: "Authentication failed" },
        { status: 401 },
      );
    }

    const id = formData.get("id") as string;

    if (id) {
      // ===== UPDATE LOGIC =====
      const grocery = await Grocery.findById(id);
      if (!grocery) {
        return NextResponse.json(
          { success: false, message: "Grocery not found" },
          { status: 404 },
        );
      }

      const name = formData.get("name") as string;
      const description = formData.get("description") as string;
      const categoryId = formData.get("category") as string;
      const brand = (formData.get("brand") as string) || "Ordinary";
      const isBestSeller = formData.get("isBestSeller") === "true";
      const isNew = formData.get("isNew") === "true";
      const isFeatured = formData.get("isFeatured") === "true";

      // Parse variants JSON from formData
      const variantsJson = formData.get("variants") as string;
      let variants: any[] = [];
      if (variantsJson) {
        try {
          variants = JSON.parse(variantsJson);
        } catch (e) {
          return NextResponse.json(
            { success: false, message: "Invalid variants JSON" },
            { status: 400 },
          );
        }
      }

      /* ---------- VALIDATION ---------- */
      if (!name || !categoryId) {
        return NextResponse.json(
          { success: false, message: "Name and category are required" },
          { status: 400 },
        );
      }

      if (!variants || variants.length === 0) {
        return NextResponse.json(
          { success: false, message: "At least one variant is required" },
          { status: 400 },
        );
      }

      /* ---------- CATEGORY CHECK ---------- */
      const category = await Category.findById(categoryId);
      if (!category) {
        return NextResponse.json(
          { success: false, message: "Invalid category" },
          { status: 400 },
        );
      }

      // Validate all units
      for (const variant of variants) {
        if (!category.allowedUnits.includes(variant.unit.unit)) {
          return NextResponse.json(
            {
              success: false,
              message: `Unit '${variant.unit.unit}' not allowed for this category`,
            },
            { status: 400 },
          );
        }
      }

      /* ---------- UPDATE GROCERY ---------- */
      // Use $set operator to automatically handle new fields
      await Grocery.findByIdAndUpdate(
        id,
        {
          $set: {
            name,
            description,
            category: categoryId,
            brand,
            "badges.isBestSeller": isBestSeller,
            "badges.isNew": isNew,
            "badges.isFeatured": isFeatured,
            updatedAt: new Date(),
          },
        },
        { new: true, runValidators: true },
      );

      // Reload grocery with updated data
      const updatedGrocery = await Grocery.findById(id);
      if (!updatedGrocery) {
        throw new Error("Failed to reload updated grocery");
      }

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

      updatedGrocery.images = uploadedImages;

      await updatedGrocery.save();

      /* ---------- DELETE OLD VARIANTS & CREATE NEW ONES ---------- */
      await GroceryVariant.deleteMany({ grocery: updatedGrocery._id });

      const resolveCodStatus = (variant: any) => {
        // Normalize incoming COD shape to our enum
        return variant?.cod?.status || variant?.codStatus || "with-charge";
      };

      const createdVariants: any[] = [];
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const discountPercent = calculateDiscountPercent(
          v.price.mrp,
          v.price.selling,
        );
        const codStatus = resolveCodStatus(v);

        const variant = await GroceryVariant.create({
          grocery: updatedGrocery._id,
          label: v.label,
          variantName: v.variantName || null,
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
          cod: {
            status: codStatus,
          },
        });

        createdVariants.push(variant);
      }

      return NextResponse.json(
        {
          success: true,
          message: "Grocery updated successfully",
          grocery: updatedGrocery,
          variants: createdVariants,
        },
        { status: 200 },
      );
    } else {
      // ===== CREATE LOGIC =====
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;
      const categoryId = formData.get("category") as string;
      const brand = (formData.get("brand") as string) || "Ordinary";
      const isBestSeller = formData.get("isBestSeller") === "true";
      const isNew = formData.get("isNew") === "true";
      const isFeatured = formData.get("isFeatured") === "true";

      // Parse variants JSON from formData
      const variantsJson = formData.get("variants") as string;
      let variants: any[] = [];
      if (variantsJson) {
        try {
          variants = JSON.parse(variantsJson);
        } catch (e) {
          return NextResponse.json(
            { success: false, message: "Invalid variants JSON" },
            { status: 400 },
          );
        }
      }

      /* ---------- VALIDATION ---------- */
      if (!name || !categoryId) {
        return NextResponse.json(
          { success: false, message: "Name and category are required" },
          { status: 400 },
        );
      }

      if (!variants || variants.length === 0) {
        return NextResponse.json(
          { success: false, message: "At least one variant is required" },
          { status: 400 },
        );
      }

      /* ---------- CATEGORY CHECK ---------- */
      const category = await Category.findById(categoryId);
      if (!category) {
        return NextResponse.json(
          { success: false, message: "Invalid category" },
          { status: 400 },
        );
      }

      // Validate all units
      for (const variant of variants) {
        if (!category.allowedUnits.includes(variant.unit.unit)) {
          return NextResponse.json(
            {
              success: false,
              message: `Unit '${variant.unit.unit}' not allowed for this category`,
            },
            { status: 400 },
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
        badges: {
          isBestSeller,
          isNew,
          isFeatured,
        },
        createdBy: token.sub,
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
      const resolveCodStatus = (variant: any) => {
        return variant?.cod?.status || variant?.codStatus || "with-charge";
      };

      const createdVariants: any[] = [];
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const discountPercent = calculateDiscountPercent(
          v.price.mrp,
          v.price.selling,
        );
        const codStatus = resolveCodStatus(v);

        const variant = await GroceryVariant.create({
          grocery: grocery._id,
          label: v.label,
          variantName: v.variantName || null,
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
          cod: {
            status: codStatus,
          },
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
        { status: 201 },
      );
    }
  } catch (error: any) {
    console.error("ADD/UPDATE GROCERY ERROR:", error);
    return NextResponse.json(
      { success: false, message: `Error saving grocery: ${error.message}` },
      { status: 500 },
    );
  }
}
