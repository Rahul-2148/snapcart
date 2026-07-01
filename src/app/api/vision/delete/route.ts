import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let variantId = searchParams.get("variantId") || searchParams.get("id");

    if (!variantId) {
      try {
        const body = await req.json();
        variantId = body?.variantId || body?.id;
      } catch {}
    }

    if (!variantId) {
      return NextResponse.json({ success: false, message: "Missing variantId" }, { status: 400 });
    }

    const ML_ENGINE_URL = (process.env.ML_ENGINE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
    const fastapiRes = await fetch(`${ML_ENGINE_URL}/vision/delete/${variantId}`, {
      method: "DELETE"
    });

    if (!fastapiRes.ok) {
      const errText = await fastapiRes.text();
      return NextResponse.json({ success: false, message: `FastAPI responded with error: ${errText}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || error }, { status: 500 });
  }
}
