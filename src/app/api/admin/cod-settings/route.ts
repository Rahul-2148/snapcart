// src/app/api/admin/cod-settings/route.ts
import connectDb from "@/lib/server/db";
import { CodSettings } from "@/models/codSettings.model";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await connectDb();

    // Get existing settings or create default
    let settings = await CodSettings.findOne();

    if (!settings) {
      // Create default settings if none exist
      settings = await CodSettings.create({
        isEnabled: true,
        flatCharge: 10,
        minOrderValue: 100,
        maxOrderValue: 1000,
      });
    }

    return NextResponse.json(
      { success: true, data: settings },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching COD settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch COD settings" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDb();

    const body = await request.json();
    const { isEnabled, flatCharge, minOrderValue, maxOrderValue } = body;

    // Validation
    if (
      typeof isEnabled !== "boolean" ||
      typeof flatCharge !== "number" ||
      typeof minOrderValue !== "number" ||
      typeof maxOrderValue !== "number"
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid request data" },
        { status: 400 },
      );
    }

    if (flatCharge < 0 || minOrderValue < 0 || maxOrderValue < 0) {
      return NextResponse.json(
        { success: false, error: "Values cannot be negative" },
        { status: 400 },
      );
    }

    if (minOrderValue >= maxOrderValue) {
      return NextResponse.json(
        {
          success: false,
          error: "Min order value must be less than max order value",
        },
        { status: 400 },
      );
    }

    // Update or create settings
    let settings = await CodSettings.findOne();

    if (settings) {
      settings.isEnabled = isEnabled;
      settings.flatCharge = flatCharge;
      settings.minOrderValue = minOrderValue;
      settings.maxOrderValue = maxOrderValue;
      await settings.save();
    } else {
      settings = await CodSettings.create({
        isEnabled,
        flatCharge,
        minOrderValue,
        maxOrderValue,
      });
    }

    return NextResponse.json(
      { success: true, data: settings },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error updating COD settings:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Failed to update COD settings: ${error.message}`,
      },
      { status: 500 },
    );
  }
}
