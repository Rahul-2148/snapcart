import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, image_url } = body;

    if (!id || !image_url) {
      return NextResponse.json({ success: false, message: "Missing id or image_url" }, { status: 400 });
    }

    const fastapiRes = await fetch("http://127.0.0.1:8000/vision/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, image_url })
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
