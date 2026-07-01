import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ML_ENGINE_URL = (process.env.ML_ENGINE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
    const res = await fetch(`${ML_ENGINE_URL}/vision/health`, {
      cache: "no-store",
    });
    
    if (!res.ok) {
      return NextResponse.json({
        success: true,
        status: "partially-healthy",
        message: `FastAPI responded with status ${res.status}`,
        fastapi: null
      });
    }
    
    const fastapiHealth = await res.json();
    return NextResponse.json({
      success: true,
      status: "healthy",
      fastapi: fastapiHealth
    });
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      status: "degraded",
      message: "Could not connect to FastAPI Vision AI engine. Ensure Python service is running.",
      error: error?.message || error
    });
  }
}
