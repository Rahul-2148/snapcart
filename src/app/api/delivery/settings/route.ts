// src/app/api/delivery/settings/route.ts
import { NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { getOrCreateDeliverySettings } from "@/lib/server/delivery";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDb();
    const settings = await getOrCreateDeliverySettings();

    // Return only non-sensitive public settings
    return NextResponse.json({
      success: true,
      settings: {
        freeDeliveryThreshold: settings.freeDeliveryThreshold ?? 199,
        disableDeliveryFee: settings.disableDeliveryFee ?? false,
        disablePackagingFee: settings.disablePackagingFee ?? false,
      },
    });
  } catch (error: any) {
    console.error("Failed to load public delivery settings:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load settings" },
      { status: 500 }
    );
  }
}
