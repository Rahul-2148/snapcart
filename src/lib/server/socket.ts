import { io, Socket } from "socket.io-client";
import { getSocketServerUrl } from "@/lib/config/urls";

let socketClient: Socket | null = null;
let isConnecting = false;
let connectionPromise: Promise<Socket> | null = null;

const getSocketClient = (): Socket => {
  if (!socketClient) {
    socketClient = io(getSocketServerUrl(), {
      path: "/socket.io",
      addTrailingSlash: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketClient.on("connect", () => {
      // Socket connected
    });

    socketClient.on("disconnect", () => {
      // Socket disconnected
    });

    socketClient.on("connect_error", (error: any) => {
      console.error("⚠️ Socket.io connection error:", error.message);
    });
  }
  return socketClient;
};

// Wait for socket to be connected
const waitForConnection = async (socket: Socket, timeout = 5000): Promise<boolean> => {
  if (socket.connected) {
    return true;
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(false);
    }, timeout);

    socket.once("connect", () => {
      clearTimeout(timer);
      resolve(true);
    });

    // If already connecting, just wait for the event
    if (!socket.connected) {
      socket.connect();
    }
  });
};

// Helper function to send notifications
export const sendNotification = async (userId: string, notification: any) => {
  try {
    const ioClient = getSocketClient();
    
    // Wait for connection to be established (max 3 seconds)
    const connected = await waitForConnection(ioClient, 3000);
    
    if (!connected) {
      // Connection timeout - still try to emit in case it connects later
    }
    
    ioClient.emit("send_notification", { userId, notification });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

// Helper function to emit role change request to all admins
export const emitRoleChangeRequest = async (notification: any) => {
  try {
    const ioClient = getSocketClient();
    
    // Wait for connection to be established (max 3 seconds)
    const connected = await waitForConnection(ioClient, 3000);
    
    if (!connected) {
      // Connection timeout - still try to emit in case it connects later
    }
    
    ioClient.emit("broadcast_role_request", notification);
  } catch (error) {
    console.error("Error emitting role change request:", error);
  }
};

// Initialize connection early (pre-connect)
export const initializeSocket = () => {
  getSocketClient();
};

// Get socket client instance (for backward compatibility)
export const getIO = () => {
  return getSocketClient();
};

export default getSocketClient;
