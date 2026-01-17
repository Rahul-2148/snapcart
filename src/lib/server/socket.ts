import { io, Socket } from "socket.io-client";

let socketClient: Socket | null = null;

const getSocketClient = (): Socket => {
  if (!socketClient) {
    socketClient = io("http://localhost:3001", {
      // Connect to standalone Socket.io server
      path: "/api/socket_io",
      addTrailingSlash: false,
    });

    socketClient.on("connect", () => {
      console.log("Socket.io client connected from Next.js server-side");
    });

    socketClient.on("disconnect", () => {
      console.log("Socket.io client disconnected from Next.js server-side");
    });
  }
  return socketClient;
};

// Helper function to send notifications
export const sendNotification = (userId: string, notification: any) => {
  try {
    const ioClient = getSocketClient();
    (ioClient as any).to(userId).emit("new_notification", notification);
    console.log(`Notification sent to user ${userId} via Socket.io client.`);
  } catch (error) {
    console.error("Error sending notification via Socket.io client:", error);
  }
};

export default getSocketClient;
