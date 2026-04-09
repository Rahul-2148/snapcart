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
    const imagesJson = formData.get("imagesJson") as string;
    let clientUploadedImages: { url: string; publicId: string }[] = [];

    if (imagesJson) {
      try {
        const parsed = JSON.parse(imagesJson);
        if (Array.isArray(parsed)) {
          clientUploadedImages = parsed
            .filter(
              (image) =>
                image &&
                typeof image.url === "string" &&
                typeof image.publicId === "string",
            )
            .map((image) => ({
              url: image.url,
              publicId: image.publicId,
            }));
        }
      } catch (e) {
        return NextResponse.json(
          { success: false, message: "Invalid images JSON" },
          { status: 400 },
        );
      }
    }

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

      // Build final images array from either client-uploaded metadata or server-side file uploads
      const uploadedImages: { url: string; publicId: string }[] = [];

      if (clientUploadedImages.length > 0) {
        const nextPublicIds = new Set(
          clientUploadedImages.map((image) => image.publicId),
        );

        if (grocery.images && grocery.images.length > 0) {
          for (const img of grocery.images) {
            if (!nextPublicIds.has(img.publicId)) {
              await deleteFromCloudinary(img.publicId);
            }
          }
        }

        uploadedImages.push(...clientUploadedImages);
      } else {
        // Always process images - either delete removed ones or add new ones
        if (grocery.images && grocery.images.length > 0) {
          // Delete images that are NOT in the keepImageIds list
          const keepImageIdsJson = formData.get("keepImageIds") as string;
          let keepImageIds: string[] = [];
          if (keepImageIdsJson) {
            try {
              keepImageIds = JSON.parse(keepImageIdsJson);
            } catch (e) {
              console.error("Error parsing keepImageIds:", e);
            }
          }

          for (const img of grocery.images) {
            const imgId = img._id?.toString() || img.id;
            if (!keepImageIds.includes(imgId)) {
              await deleteFromCloudinary(img.publicId);
            }
          }

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

        if (files.length > 0) {
          const folder = `Snapcart_Grocery_Single-vendor/grocery-images/${grocery.slug}`;
          for (const file of files) {
            const uploaded = await uploadOnCloudinary(file, folder);
            if (uploaded) uploadedImages.push(uploaded);
          }
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
        const mrp = Math.round(Number(v.price.mrp) || 0);
        const selling = Math.round(Number(v.price.selling) || 0);
        const discountPercent = calculateDiscountPercent(
          mrp,
          selling,
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
            mrp,
            selling,
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
      const requestedSlug = (formData.get("slug") as string) || "";
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
      const fallbackSlug = `${createSlug(name)}-${Date.now().toString().slice(-5)}`;
      let slug = createSlug(requestedSlug) || fallbackSlug;

      const existingSlug = await Grocery.findOne({ slug }).select("_id");
      if (existingSlug) {
        slug = fallbackSlug;
      }

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

      if (clientUploadedImages.length > 0) {
        uploadedImages.push(...clientUploadedImages);
      } else {
        const folder = `Snapcart_Grocery_Single-vendor/grocery-images/${grocery.slug}`;

        for (const file of files) {
          const uploaded = await uploadOnCloudinary(file, folder);
          if (uploaded) uploadedImages.push(uploaded);
        }
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
        const mrp = Math.round(Number(v.price.mrp) || 0);
        const selling = Math.round(Number(v.price.selling) || 0);
        const discountPercent = calculateDiscountPercent(
          mrp,
          selling,
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
            mrp,
            selling,
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
