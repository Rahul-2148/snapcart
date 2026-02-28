// src/models/user.model.ts
import mongoose, { Document } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  mobileNumber?: string;
  gender?: "male" | "female" | "other" | "prefer-not-to-say";
  roles?: ("user" | "deliveryBoy" | "admin")[];
  currentRole?: "user" | "deliveryBoy" | "admin"; // Active role in current session
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
  profileCompleted?: boolean; // Flag to check if Google user completed profile
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
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not-to-say"],
      default: null,
    },
    roles: {
      type: [String],
      enum: ["user", "deliveryBoy", "admin"],
      default: ["user"],
    },
    currentRole: {
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
    profileCompleted: {
      type: Boolean,
      default: true, // Default true for non-Google users
    },
  },
  { timestamps: true },
);

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);
