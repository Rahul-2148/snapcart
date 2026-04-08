// socket-server.ts
import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/socket.io",
  addTrailingSlash: false,
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  // User connected

  // ===== USER EVENTS =====
  socket.on("join_user_room", (userId, fullName, role) => {
    socket.join(userId);
    const label = role ? `${role}` : "user";
    console.log(`${label} ${userId} (${fullName}) joined user room`);
  });

  socket.on("join_order_room", (orderId) => {
    if (!orderId) return;
    socket.join(`order_${orderId}`);
    console.log(`Order room joined: ${orderId}`);
  });

  socket.on("join_return_room", ({ returnId }) => {
    if (!returnId) return;
    socket.join(`return_${returnId}`);
    console.log(`Return room joined: ${returnId}`);
  });

  socket.on("join_delivery_room", (deliveryPartnerId, name, role) => {
    socket.join(deliveryPartnerId);
    socket.join("delivery_partners");
    const label = role ? `${role}` : "delivery partner";
    console.log(
      `${label} ${deliveryPartnerId} (${name}) joined delivery rooms`,
    );
  });

  socket.on("join_admin_room", (adminId, name, role) => {
    socket.join("admins");
    const label = role ? `${role}` : "admin";
    console.log(`${label} ${adminId} (${name}) joined admins room`);
  });

  socket.on("leave_delivery_room", (deliveryPartnerId) => {
    socket.leave(deliveryPartnerId);
    socket.leave("delivery_partners");
    console.log(`Delivery partner ${deliveryPartnerId} left rooms`);
  });

  // ===== LOCATION UPDATE =====
  socket.on("location_update", (data) => {
    const { userId, lat, lng, type } = data;
    if (type === "delivery_boy") {
      io.to("admins").emit("delivery_boy_location", {
        partnerId: userId,
        lat,
        lng,
        timestamp: new Date(),
      });
    }
  });

  socket.on("delivery_partner_location_updated", (data) => {
    if (data?.orderId) {
      io.to(`order_${data.orderId}`).emit(
        "delivery_partner_location_updated",
        data,
      );
    } else {
      io.emit("delivery_partner_location_updated", data);
    }
  });

  // ===== DELIVERY REQUEST EVENTS =====
  socket.on("new_delivery_request", (data) => {
    io.to("delivery_partners").emit("new_delivery_request", data);
  });

  socket.on("delivery_request_accepted", (data) => {
    io.emit("delivery_request_accepted", data);
  });

  socket.on("delivery_request_rejected", (data) => {
    io.to("delivery_partners").emit("delivery_request_rejected", data);
  });

  // ===== DELIVERY STATUS EVENTS =====
  socket.on("delivery_status_update", (data) => {
    const { customerId, orderId, status, location } = data;
    io.to(customerId).emit("order_status_update", {
      orderId,
      status,
      location,
      timestamp: new Date(),
    });
    if (orderId) {
      io.to(`order_${orderId}`).emit("order_status_update", {
        orderId,
        status,
        location,
        timestamp: new Date(),
      });
    }
    io.to("admins").emit("delivery_status_update", data);
  });

  socket.on("delivery_reached_store", (data) => {
    io.to(data.customerId).emit("delivery_reached_store", {
      orderNumber: data.orderNumber,
      message: "Your delivery partner has reached the store",
    });
  });

  socket.on("delivery_picked_up", (data) => {
    io.to(data.customerId).emit("delivery_picked_up", {
      orderNumber: data.orderNumber,
      message: "Your order has been picked up",
      estimatedDeliveryTime: data.estimatedTime,
    });
  });

  socket.on("delivery_on_the_way", (data) => {
    io.to(data.customerId).emit("delivery_on_the_way", {
      orderNumber: data.orderNumber,
      message: "Your delivery is on the way",
      location: data.location,
    });
  });

  socket.on("delivery_reached_customer", (data) => {
    io.to(data.customerId).emit("delivery_reached_customer", {
      orderNumber: data.orderNumber,
      message: "Your delivery partner has arrived",
      location: data.location,
    });
  });

  socket.on("delivery_completed", (data) => {
    io.to(data.customerId).emit("delivery_completed", {
      orderNumber: data.orderNumber,
      message: "Your order has been delivered",
      timestamp: new Date(),
    });
    io.to("admins").emit("delivery_completed", data);
  });

  // ===== EARNINGS EVENTS =====
  socket.on("earning_credited", (data) => {
    const { deliveryPartnerId, amount, orderNumber } = data;
    io.to(deliveryPartnerId).emit("earning_credited", {
      amount,
      orderNumber,
      message: `₹${amount} credited for delivery #${orderNumber}`,
      timestamp: new Date(),
    });
  });

  socket.on("earning_update", (data) => {
    io.to(data.deliveryPartnerId).emit("earning_update", {
      totalEarnings: data.totalEarnings,
      pendingPayout: data.pendingPayout,
      currentSessionEarnings: data.currentSessionEarnings,
    });
  });

  // ===== RATING EVENTS =====
  socket.on("order_rated", (data) => {
    const { deliveryPartnerId, rating, orderId } = data;
    io.to(deliveryPartnerId).emit("order_rated", {
      orderId,
      rating,
      message: `You received a ${rating} star rating`,
    });
  });

  // ===== NOTIFICATION EVENTS =====
  socket.on("send_notification", (data) => {
    const { userId, notification } = data;
    io.to(userId).emit("new_notification", notification);
  });

  socket.on("mark_notification_read", (data) => {
    // Mark notification as read
  });

  // ===== ROLE CHANGE REQUEST =====
  socket.on("role_change_request", (data) => {
    io.emit("new_role_request", data);
  });

  socket.on("broadcast_role_request", (data) => {
    io.emit("new_role_request", data);
  });

  // ===== RETURN EVENTS =====
  socket.on("return:created", (data) => {
    io.emit("return:created", data);
  });

  socket.on("return:updated", (data) => {
    io.emit("return:updated", data);
  });

  socket.on("return:cancelled", (data) => {
    io.emit("return:cancelled", data);
  });

  socket.on("return:status-changed", (data) => {
    io.emit("return:status-changed", data);
  });

  // Admin forwarding helpers: server accepts admin events from trusted server-side client
  socket.on("admin:pickup_assigned", (data) => {
    try {
      const { targetSocketId, payload } = data || {};
      if (targetSocketId) {
        io.to(targetSocketId).emit("pickup:assigned", payload);
      }
    } catch (err) {
      console.error("admin:pickup_assigned forward error:", err);
    }
  });

  socket.on("admin:return_pickup_assigned", (data) => {
    try {
      const { targetSocketId, payload } = data || {};
      if (targetSocketId) {
        io.to(targetSocketId).emit("return:pickup-assigned", payload);
      }
    } catch (err) {
      console.error("admin:return_pickup_assigned forward error:", err);
    }
  });

  // ===== BANNER EVENTS =====
  socket.on("banner:create", (data) => {
    io.emit("banner:created", { banner: data });
  });

  socket.on("banner:update", (data) => {
    io.emit("banner:updated", { banner: data });
  });

  socket.on("banner:delete", (data) => {
    io.emit("banner:deleted", { bannerId: data.bannerId });
  });

  // ===== WISHLIST EVENTS =====
  socket.on("wishlist:follow", (data) => {
    const { wishlistId, followCount } = data;
    io.emit(`wishlist:follow:${wishlistId}`, {
      followCount,
      action: "followed",
    });
  });

  socket.on("wishlist:unfollow", (data) => {
    const { wishlistId, followCount } = data;
    io.emit(`wishlist:follow:${wishlistId}`, {
      followCount,
      action: "unfollowed",
    });
  });

  socket.on("disconnect", () => {
    // User disconnected
  });
});

const SOCKET_PORT = Number(
  process.env.PORT || process.env.SOCKET_PORT || 3001,
);

httpServer.listen(SOCKET_PORT, () => {
  console.log(`Socket.io server listening on port ${SOCKET_PORT}`);
});
