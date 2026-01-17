// src/models/user.model.ts
import mongoose, { Document } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  mobileNumber?: string;
  role?: "user" | "deliveryBoy" | "admin";
  image?: {
    url: string;
    publicId: string;
  };
  isBlocked?: boolean;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  roleChangeRequest?: "none" | "pending" | "approved" | "rejected";
  requestedRole?: "user" | "deliveryBoy" | "admin";
  roleChangeRequestTimestamp?: Date;
  hasPassword?: boolean;
  isLoginedWithGoogle?: boolean;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    password: String,
    mobileNumber: {
      type: String,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "deliveryBoy", "admin"],
      default: "user",
    },
    image: {
      url: {
        type: String,
      },
      publicId: {
        type: String,
      },
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    roleChangeRequest: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    requestedRole: {
      type: String,
      enum: ["user", "deliveryBoy", "admin"],
    },
    roleChangeRequestTimestamp: {
      type: Date,
    },
    isLoginedWithGoogle: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);
