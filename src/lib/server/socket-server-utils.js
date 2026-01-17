
import { Server } from "socket.io";
// No need to import HttpServer type here, as it's a JS file

let io; // Module-scoped instance

export const initSocket = (httpServer) => {
    if (!io) {
        io = new Server(httpServer, {
            path: "/api/socket_io",
            addTrailingSlash: false,
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
            },
        });

        // Assign to global for wider accessibility, especially in API routes
        // Ensure this is done once, and global is checked
        if (!global.io) {
            global.io = io;
        }

        io.on("connection", (socket) => {
            console.log("A user connected");

            socket.on("join_user_room", (userId) => {
                socket.join(userId);
            });

            socket.on("role_change_request", (data) => {
                global.io?.emit("new_role_request", data); // Use global.io
            });

            socket.on("disconnect", () => {
                console.log("A user disconnected");
            });
        });
    }
};

export const getSocketIo = () => {
    // Try to get from local first, then global
    if (io) return io;
    if (global.io) {
        io = global.io; // Assign to local for future calls
        return io;
    }
    throw new Error("Socket.io not initialized. Call initSocket(httpServer) first.");
};

