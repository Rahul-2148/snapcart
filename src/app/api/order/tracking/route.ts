import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Order } from "@/models/order.model";
import { DeliveryAssignment } from "@/models/deliveryAssignment.model";
import { DeliveryPartner } from "@/models/deliveryPartner.model";
import { User } from "@/models/user.model";

export const GET = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ message: "orderId required" }, { status: 400 });
  }

  await connectDb();
  const order = await Order.findById(orderId)
    .select(
      "orderNumber orderStatus deliveryAddress createdAt packedAt confirmedAt shippedAt outForDeliveryAt deliveredAt",
    )
    .lean();

  if (!order) {
    return NextResponse.json({ message: "Order not found" }, { status: 404 });
  }

  let assignment = null;
  let deliveryPartnerLocation = null;
  let deliveryPartnerContact: null | { name?: string; mobile?: string } = null;

  if (order.deliveryAddress?.location) {
    const assignmentData = await DeliveryAssignment.findOne({
      order: orderId,
    })
      .select(
        "status assignedTo estimatedDistance estimatedTime timeline pickupLocation deliveryLocation",
      )
      .lean();

    if (assignmentData) {
      assignment = assignmentData;

      if (assignmentData.assignedTo) {
        const partner = await DeliveryPartner.findOne({
          user: assignmentData.assignedTo,
        })
          .select("currentLocation stats user")
          .lean();

        if (partner?.currentLocation) {
          deliveryPartnerLocation = partner.currentLocation;
        }

        if (partner?.user) {
          const partnerUser = await User.findById(partner.user)
            .select("name mobileNumber")
            .lean();
          if (partnerUser) {
            deliveryPartnerContact = {
              name: partnerUser.name,
              mobile: partnerUser.mobileNumber,
            };
          }
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    tracking: {
      orderNumber: order.orderNumber,
      status: order.orderStatus,
      userLocation: order.deliveryAddress?.location || null,
      timeline: {
        ordered: order.createdAt,
        confirmed: order.confirmedAt || null,
        packed: order.packedAt || null,
        shipped: order.shippedAt || null,
        outForDelivery: order.outForDeliveryAt || null,
        delivered: order.deliveredAt || null,
      },
      assignment: assignment
        ? {
            status: assignment.status,
            estimatedDistance: assignment.estimatedDistance,
            estimatedTime: assignment.estimatedTime,
            pickupLocation: assignment.pickupLocation,
            deliveryLocation: assignment.deliveryLocation,
            timeline: assignment.timeline,
          }
        : null,
      deliveryPartnerLocation,
      deliveryPartnerContact,
    },
  });
};
