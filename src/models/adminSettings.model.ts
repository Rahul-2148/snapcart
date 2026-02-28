// src/models/adminSettings.model.ts
import mongoose, { Document } from "mongoose";

export interface IAdminSettings extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  theme: "system" | "light" | "dark";
  notifications: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  orderAlerts: boolean;
  autoApproveReturns: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const adminSettingsSchema = new mongoose.Schema<IAdminSettings>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    theme: {
      type: String,
      enum: ["system", "light", "dark"],
      default: "system",
    },
    notifications: {
      email: {
        type: Boolean,
        default: true,
      },
      sms: {
        type: Boolean,
        default: false,
      },
      inApp: {
        type: Boolean,
        default: true,
      },
    },
    orderAlerts: {
      type: Boolean,
      default: true,
    },
    autoApproveReturns: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// Note: `unique: true` on the `userId` path already creates an index.
// Avoid duplicating the index via `schema.index()` to prevent Mongoose warnings.

export const AdminSettings =
  mongoose.models.AdminSettings ||
  mongoose.model<IAdminSettings>("AdminSettings", adminSettingsSchema);
