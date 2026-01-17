// socket-server.ts
import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  path: "/api/socket_io",
  addTrailingSlash: false,
  cors: {
    origin: "*", // Adjust CORS as needed for your Next.js frontend
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("A user connected to standalone Socket.io server");

  socket.on("join_user_room", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  socket.on("role_change_request", (data) => {
    io.emit("new_role_request", data); // Emit to all connected clients
    console.log("Role change request emitted:", data);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected from standalone Socket.io server");
  });
});

const SOCKET_PORT = 3001;

httpServer.listen(SOCKET_PORT, () => {
  console.log(`Socket.io server listening on port ${SOCKET_PORT}`);
});
