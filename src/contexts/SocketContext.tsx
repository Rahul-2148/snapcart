"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { getSocketServerUrl } from "@/lib/config/urls";

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context.socket;
};

// Singleton socket instance
let globalSocket: Socket | null = null;
let isConnecting = false;

const getSocketInstance = (): Socket => {
  if (globalSocket && globalSocket.connected) {
    return globalSocket;
  }

  if (isConnecting) {
    // Wait for existing connection
    return globalSocket!;
  }

  isConnecting = true;

  const finalSocketUri = getSocketServerUrl();

  globalSocket = io(finalSocketUri, {
    path: "/socket.io",
    addTrailingSlash: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ["websocket", "polling"],
  });

  globalSocket.on("connect", () => {
    console.log("✅ Socket connected:", globalSocket!.id);
    isConnecting = false;
  });

  globalSocket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", reason);
  });

  globalSocket.on("connect_error", (error) => {
    console.error("❌ Socket connection error:", error);
    isConnecting = false;
  });

  return globalSocket;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketInstance = getSocketInstance();
    setSocket(socketInstance);

    // Cleanup only disconnects if this is the last provider instance unmounting
    return () => {
      // Don't disconnect on unmount in dev due to React Strict Mode
      // The socket will persist across remounts
      console.log("🔄 SocketProvider unmounted (keeping connection alive)");
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};
