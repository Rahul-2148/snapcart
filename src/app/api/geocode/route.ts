import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!lat || !lon) return NextResponse.json({ error: "Missing lat/lon" }, { status: 400 });

  try {
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/reverse`,
      {
        params: { format: "jsonv2", lat, lon, "accept-language": "en" },
        headers: { "User-Agent": "vybe-app" },
      }
    );
    return NextResponse.json(res.data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
