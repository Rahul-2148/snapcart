// Notification helper functions for delivery system
import {
  sendPushNotification,
  sendMulticastNotification,
} from "./firebase-admin";
import { getIO } from "./socket";

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  url?: string;
}

// Send notification via both Socket.io and Push Notification
export const sendDeliveryNotification = async (
  userId: string,
  fcmToken: string | undefined,
  socketEvent: string,
  notification: NotificationPayload,
  socketData?: any,
) => {
  // Send Socket.io real-time notification
  try {
    const io = getIO();
    io?.emit(socketEvent, {
      userId,
      ...socketData,
      timestamp: new Date(),
    });
    console.log(`Socket notification sent: ${socketEvent}`);
  } catch (error) {
    console.error("Socket notification error:", error);
  }

  // Send Push Notification (if FCM token available)
  if (fcmToken) {
    try {
      const pushData = {
        ...notification.data,
        url: notification.url || "/",
      };

      await sendPushNotification(
        fcmToken,
        notification.title,
        notification.body,
        pushData,
      );
      console.log(`Push notification sent to user: ${userId}`);
    } catch (error) {
      console.error("Push notification error:", error);
    }
  }
};

// Notify customer about delivery status
export const notifyCustomer = async (
  customerId: string,
  customerFcmToken: string | undefined,
  eventType: "accepted" | "picked_up" | "on_the_way" | "arrived" | "completed",
  orderNumber: string,
  partnerName?: string,
) => {
  const notifications = {
    accepted: {
      title: "🚴 Delivery Partner Assigned!",
      body: `${partnerName} has accepted your order #${orderNumber}. Track your delivery in real-time.`,
      socketEvent: "delivery_accepted",
      url: `/order/tracking?orderId=${orderNumber}`,
    },
    picked_up: {
      title: "📦 Order Picked Up!",
      body: `Your order #${orderNumber} has been picked up and is on the way.`,
      socketEvent: "delivery_picked_up",
      url: `/order/tracking?orderId=${orderNumber}`,
    },
    on_the_way: {
      title: "🚴 Out for Delivery!",
      body: `${partnerName} is heading your way with order #${orderNumber}.`,
      socketEvent: "delivery_on_the_way",
      url: `/order/tracking?orderId=${orderNumber}`,
    },
    arrived: {
      title: "📍 Delivery Partner Arrived!",
      body: `${partnerName} has arrived with your order #${orderNumber}. Please share the OTP.`,
      socketEvent: "delivery_reached_customer",
      url: `/order/tracking?orderId=${orderNumber}`,
    },
    completed: {
      title: "✅ Order Delivered!",
      body: `Your order #${orderNumber} has been delivered successfully. Enjoy your groceries!`,
      socketEvent: "delivery_completed",
      url: `/user/orders`,
    },
  };

  const notification = notifications[eventType];

  await sendDeliveryNotification(
    customerId,
    customerFcmToken,
    notification.socketEvent,
    {
      title: notification.title,
      body: notification.body,
      data: { orderNumber, eventType },
      url: notification.url,
    },
    { orderNumber, partnerName, status: eventType },
  );
};

// Notify delivery partner about new order
export const notifyDeliveryPartner = async (
  partnerId: string,
  partnerFcmToken: string | undefined,
  eventType:
    | "new_order"
    | "order_cancelled"
    | "rating_received"
    | "earning_credited",
  orderNumber: string,
  additionalData?: any,
) => {
  const notifications = {
    new_order: {
      title: "🔔 New Delivery Request!",
      body: `Order #${orderNumber} is available nearby. Accept within 6 minutes.`,
      socketEvent: "new_delivery_request",
      url: `/delivery-boy`,
    },
    order_cancelled: {
      title: "❌ Order Cancelled",
      body: `Order #${orderNumber} has been cancelled by the customer.`,
      socketEvent: "order_cancelled",
      url: `/delivery-boy`,
    },
    rating_received: {
      title: "⭐ Rating Received!",
      body: `You received ${additionalData?.rating} stars for order #${orderNumber}. Keep up the great work!`,
      socketEvent: "order_rated",
      url: `/delivery-boy/assignments/${additionalData?.assignmentId}`,
    },
    earning_credited: {
      title: "💰 Earning Credited!",
      body: `₹${additionalData?.amount} credited for order #${orderNumber}. Total pending: ₹${additionalData?.totalPending}`,
      socketEvent: "earning_credited",
      url: `/delivery-boy?tab=earnings`,
    },
  };

  const notification = notifications[eventType];

  await sendDeliveryNotification(
    partnerId,
    partnerFcmToken,
    notification.socketEvent,
    {
      title: notification.title,
      body: notification.body,
      data: { orderNumber, eventType, ...additionalData },
      url: notification.url,
    },
    { orderNumber, ...additionalData },
  );
};

// Notify admin about important events
export const notifyAdmin = async (
  eventType: "order_failed" | "payout_requested" | "partner_suspended",
  message: string,
  data?: any,
) => {
  try {
    const io = getIO();
    io?.emit("admin_notification", {
      type: eventType,
      message,
      data,
      timestamp: new Date(),
    });
    console.log(`Admin notification sent: ${eventType}`);
  } catch (error) {
    console.error("Admin notification error:", error);
  }
};
