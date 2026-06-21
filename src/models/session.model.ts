// src/models/session.model.ts
import mongoose, { Document, Schema } from "mongoose";

export interface ISession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  jti: string; // NextAuth's JSON Web Token ID (used as unique session ID)
  deviceType: "mobile" | "tablet" | "desktop" | "unknown";
  browser: string;
  os: string;
  ipAddress: string;
  userAgent?: string;
  createdAt: Date;
  lastActiveAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceType: {
      type: String,
      enum: ["mobile", "tablet", "desktop", "unknown"],
      default: "unknown",
    },
    browser: {
      type: String,
      required: true,
      default: "Unknown Browser",
    },
    os: {
      type: String,
      required: true,
      default: "Unknown OS",
    },
    ipAddress: {
      type: String,
      required: true,
      default: "127.0.0.1",
    },
    userAgent: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Session = mongoose.models.Session || mongoose.model<ISession>("Session", sessionSchema);
