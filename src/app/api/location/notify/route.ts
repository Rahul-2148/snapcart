// src/app/api/location/notify/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { ComingSoon } from "@/models/comingSoon.model";

export async function POST(req: NextRequest) {
  try {
    await connectDb();

    const body = await req.json();
    const { email, pincode, city, longitude, latitude } = body;

    if (!email || !pincode || !city) {
      return NextResponse.json(
        { error: "Email, pincode, and city are required fields." },
        { status: 400 }
      );
    }

    const coords: [number, number] = [
      longitude !== undefined ? Number(longitude) : 0,
      latitude !== undefined ? Number(latitude) : 0,
    ];

    try {
      const entry = new ComingSoon({
        email,
        pincode,
        city,
        coordinates: coords,
      });

      await entry.save();
      
      return NextResponse.json({
        success: true,
        message: "Thank you! We will notify you as soon as we launch in your area.",
      });
    } catch (dbError: any) {
      // Handle MongoDB unique key duplicate error code 11000
      if (dbError.code === 11000) {
        return NextResponse.json({
          success: true,
          message: "You are already signed up for alerts in this pincode! We'll keep you posted.",
        });
      }
      throw dbError;
    }
  } catch (error: any) {
    console.error("POST Coming Soon Alert Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
