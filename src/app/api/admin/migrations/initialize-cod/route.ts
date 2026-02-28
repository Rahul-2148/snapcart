import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { GroceryVariant } from "@/models/groceryVariant.model";
import { auth } from "@/auth";
import { User } from "@/models/user.model";

export const POST = async (req: NextRequest) => {
  try {
    await connectDb();

    // Verify admin
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const admin = await User.findOne({ email: session.user.email });
    if (!admin || !admin.roles?.includes("admin")) {
      return NextResponse.json(
        { message: "Only admins can run this migration" },
        { status: 403 },
      );
    }

    console.log("[Migration] Initializing COD fields on variants...");

    // Find variants without cod field
    const variantsWithoutCod = await GroceryVariant.find({
      $or: [{ cod: { $exists: false } }, { cod: null }],
    });

    console.log(
      `[Migration] Found ${variantsWithoutCod.length} variants without COD field`,
    );

    if (variantsWithoutCod.length > 0) {
      // Initialize cod field
      const result = await GroceryVariant.updateMany(
        {
          $or: [{ cod: { $exists: false } }, { cod: null }],
        },
        {
          $set: {
            "cod.isCodAllowed": true,
            "cod.handlingCharge": 0,
          },
        },
      );

      console.log(`[Migration] Updated ${result.modifiedCount} variants`);
    }

    // Verify
    const totalVariants = await GroceryVariant.countDocuments();
    const variantsWithCod = await GroceryVariant.countDocuments({
      cod: { $exists: true },
    });

    return NextResponse.json({
      success: true,
      message: "COD field initialization complete",
      stats: {
        totalVariants,
        variantsWithCod,
        allInitialized: variantsWithCod === totalVariants,
      },
    });
  } catch (error: any) {
    console.error("[Migration] Error:", error);
    return NextResponse.json(
      {
        message: "Migration failed",
        error: error.message,
      },
      { status: 500 },
    );
  }
};
