// src/models/groceryVariant.model.ts
import mongoose, { Document } from "mongoose";

export interface IGroceryVariant {
  _id?: mongoose.Types.ObjectId;
  grocery: mongoose.Types.ObjectId;
  label: string;
  variantName?: string;
  unit: {
    unit: string;
    value: number;
    multiplier?: number;
  };
  price: {
    mrp: number;
    selling: number;
    discountPercent?: number;
  };
  countInStock?: number;
  isDefault?: boolean;
  cod?: {
    status: "not-allowed" | "with-charge" | "free";
  };
  freeDelivery?: boolean;
  gstRate?: number;
  handlingSurcharge?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type GroceryVariantDocument = IGroceryVariant & Document;

const groceryVariantSchema = new mongoose.Schema<IGroceryVariant>(
  {
    grocery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grocery",
      required: true,
    },

    label: { type: String, required: true },

    variantName: { type: String, default: null },

    unit: {
      unit: {
        type: String,
        enum: [
          "kg",
          "g",
          "liter",
          "ml",
          "piece",
          "dozen",
          "pack",
          "packet",
          "pouch",
          "box",
          "bag",
          "tray",
          "bottle",
          "jar",
          "can",
          "tin",
          "bar",
          "loaf",
          "slice",
          "roll",
          "cup",
          "cone",
          "sachet",
          "strip",
          "tub",
          "sheet",
        ],
        required: true,
      },
      value: { type: Number, required: true },
      multiplier: { type: Number, default: 1 },
    },

    price: {
      mrp: { type: Number, required: true, min: 0 },
      selling: { type: Number, required: true, min: 0 },
      discountPercent: { type: Number, default: 0 },
    },

    countInStock: { type: Number, default: 0, min: 0 },

    isDefault: { type: Boolean, default: false },

    cod: {
      status: { 
        type: String, 
        enum: ["not-allowed", "with-charge", "free"],
        default: "with-charge" 
      },
    },

    freeDelivery: {
      type: Boolean,
      default: false,
    },

    gstRate: {
      type: Number,
      default: 5, // 5% default GST on groceries
      min: 0,
    },

    handlingSurcharge: {
      type: Number,
      default: 0, // 0 default surcharge unless explicitly set
      min: 0,
    },
  },
  { timestamps: true }
);

// Only one default variant per grocery
groceryVariantSchema.index(
  { grocery: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } }
);

// Query optimization
groceryVariantSchema.index({ grocery: 1, isDefault: 1 });
groceryVariantSchema.index({ "price.selling": 1 });

export const GroceryVariant =
  mongoose.models.GroceryVariant ||
  mongoose.model("GroceryVariant", groceryVariantSchema);
