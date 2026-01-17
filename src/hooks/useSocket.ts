
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const useSocket = (uri?: string) => { // Make uri optional
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let finalSocketUri;

    if (process.env.NODE_ENV === "development") {
      // In development, connect to the separate Socket.io server
      finalSocketUri = "http://localhost:3001";
    } else {
      // In production, use the provided URI or default to window.location.origin
      finalSocketUri = uri || window.location.origin;
    }

    const socketIo = io(finalSocketUri, {
      path: "/api/socket_io",
      addTrailingSlash: false,
    });

    setSocket(socketIo);

    function cleanup() {
      socketIo.disconnect();
    }
    return cleanup;
  }, [uri]);

  return socket;
};

export default useSocket;
