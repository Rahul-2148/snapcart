// src/global.d.ts
import { Connection } from "mongoose";

declare global {
  var mongoose: {
    conn: Connection | null;
    promise: Promise<Connection> | null;
  };
  var io: any; // Global Socket.IO instance
}

export {};