// src/models/user.model.ts
import mongoose, { Document } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  mobileNumber?: string;
  gender?: "male" | "female" | "other" | "prefer-not-to-say";
  roles?: ("user" | "deliveryBoy" | "admin" | "storeManager")[];
  currentRole?: "user" | "deliveryBoy" | "admin" | "storeManager"; // Active role in current session
  image?: {
    url: string;
    publicId: string;
  };
  isBlocked?: boolean;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  roleChangeRequest?: "none" | "pending" | "approved" | "rejected";
  requestedRole?: "user" | "deliveryBoy" | "admin" | "storeManager";
  roleChangeRequestTimestamp?: Date;
  hasPassword?: boolean;
  isLoginedWithGoogle?: boolean;
  profileCompleted?: boolean; // Flag to check if Google user completed profile
  roleOtp?: string;
  roleOtpExpires?: Date;
  isRoleOtpVerified?: boolean;
  kyc?: {
    status: "not_submitted" | "pending" | "approved" | "rejected";
    documents: Array<{
      type: "aadhaar_front" | "aadhaar_back" | "pan" | "selfie";
      url: string;
      publicId: string;
      uploadedAt: Date;
    }>;
    submittedAt?: Date;
    reviewedAt?: Date;
    rejectionReason?: string;
    aadhaarNumber?: string;
    panNumber?: string;
    verificationType?: "manual" | "digilocker";
  };
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
      enum: ["user", "deliveryBoy", "admin", "storeManager"],
      default: ["user"],
    },
    currentRole: {
      type: String,
      enum: ["user", "deliveryBoy", "admin", "storeManager"],
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
      enum: ["user", "deliveryBoy", "admin", "storeManager"],
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
    roleOtp: {
      type: String,
      default: null,
    },
    roleOtpExpires: {
      type: Date,
      default: null,
    },
    isRoleOtpVerified: {
      type: Boolean,
      default: false,
    },
    kyc: {
      status: {
        type: String,
        enum: ["not_submitted", "pending", "approved", "rejected"],
        default: "not_submitted",
        index: true,
      },
      documents: [
        {
          type: {
            type: String,
            enum: ["aadhaar_front", "aadhaar_back", "pan", "selfie"],
            required: true,
          },
          url: { type: String, required: true },
          publicId: { type: String, required: true },
          uploadedAt: { type: Date, default: Date.now },
          _id: false,
        },
      ],
      submittedAt: { type: Date },
      reviewedAt: { type: Date },
      rejectionReason: { type: String },
      aadhaarNumber: { type: String },
      panNumber: { type: String },
      verificationType: { type: String, enum: ["manual", "digilocker"], default: "manual" },
      _id: false,
    },
  },
  { timestamps: true },
);

export const User =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);
