// src/models/codSettings.model.ts
import mongoose, { Document } from "mongoose";

export interface ICodSettings {
  _id?: mongoose.Types.ObjectId;
  isEnabled: boolean;
  flatCharge: number; // Flat COD fee per order (e.g., ₹10)
  minOrderValue: number; // Minimum order value for COD (e.g., ₹100)
  maxOrderValue: number; // Maximum order value for COD (e.g., ₹1000)
  createdAt?: Date;
  updatedAt?: Date;
}

export type CodSettingsDocument = ICodSettings & Document;

const codSettingsSchema = new mongoose.Schema<ICodSettings>(
  {
    isEnabled: {
      type: Boolean,
      default: true,
      description: "Enable/disable COD for entire platform",
    },
    flatCharge: {
      type: Number,
      default: 10,
      min: 0,
      description: "Flat charge per COD order (not per product)",
    },
    minOrderValue: {
      type: Number,
      default: 100,
      min: 0,
      description: "Minimum order value to enable COD",
    },
    maxOrderValue: {
      type: Number,
      default: 1000,
      min: 0,
      description: "Maximum order value to enable COD",
    },
  },
  { timestamps: true }
);

export const CodSettings =
  mongoose.models.CodSettings ||
  mongoose.model("CodSettings", codSettingsSchema);
