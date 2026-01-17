// src/models/groceryVariant.model.ts
import mongoose, { Document } from "mongoose";

export interface IGroceryVariant {
  _id?: mongoose.Types.ObjectId;
  grocery: mongoose.Types.ObjectId;
  label: string;
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
