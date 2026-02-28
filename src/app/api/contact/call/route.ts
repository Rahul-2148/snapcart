import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { User } from "@/models/user.model";
import { isDeliveryPartner } from "@/lib/server/roles";
import twilio from "twilio";
import { getAppBaseUrl } from "@/lib/config/urls";

const normalizePhone = (raw?: string) => {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (raw.startsWith("+")) return raw;
  const countryCode = process.env.DEFAULT_COUNTRY_CODE || "+91";
  if (digits.length === 10) return `${countryCode}${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return `${countryCode}${digits}`;
};

export const POST = async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { orderId, role } = await req.json();
  if (!orderId || (role !== "customer" && role !== "partner")) {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    return NextResponse.json(
      { message: "Calling not configured" },
      { status: 503 },
    );
  }

  await connectDb();
  const order = await Order.findById(orderId)
    .select("userId deliveryAddress.mobile")
    .lean();
  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  const assignment = await DeliveryAssignment.findOne({ order: orderId })
    .select("assignedTo")
    .lean();
  if (!assignment?.assignedTo) {
    return NextResponse.json(
      { message: "Delivery partner not assigned" },
      { status: 400 },
    );
  }

  if (role === "customer") {
    if (order.userId.toString() !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  } else {
    if (!isDeliveryPartner(session)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    if (assignment.assignedTo.toString() !== session.user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  const partnerUser = await User.findById(assignment.assignedTo)
    .select("mobileNumber")
    .lean();

  const customerNumber = normalizePhone(order.deliveryAddress?.mobile);
  const partnerNumber = normalizePhone(partnerUser?.mobileNumber);
  if (!customerNumber || !partnerNumber) {
    return NextResponse.json(
      { message: "Missing contact numbers" },
      { status: 400 },
    );
  }

  const caller = role === "customer" ? customerNumber : partnerNumber;
  const callee = role === "customer" ? partnerNumber : customerNumber;

  const client = twilio(accountSid, authToken);
  const baseUrl = getAppBaseUrl();
  const twimlUrl = `${baseUrl}/api/contact/twiml?to=${encodeURIComponent(
    callee,
  )}`;

  const call = await client.calls.create({
    to: caller,
    from: fromNumber,
    url: twimlUrl,
  });

  return NextResponse.json({ success: true, callSid: call.sid });
};
