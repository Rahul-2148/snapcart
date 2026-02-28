import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const to = searchParams.get("to");
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!to) {
    return NextResponse.json({ message: "Missing 'to'" }, { status: 400 });
  }
  if (!fromNumber) {
    return NextResponse.json(
      { message: "Calling not configured" },
      { status: 503 },
    );
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${fromNumber}">${to}</Dial>
</Response>`;

  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
};
