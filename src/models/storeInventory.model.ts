// src/models/storeInventory.model.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IStoreInventory extends Document {
  store: mongoose.Types.ObjectId;
  grocery: mongoose.Types.ObjectId;
  variant: mongoose.Types.ObjectId;
  stock: number;
  priceOverride?: {
    mrp: number;
    selling: number;
  };
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const storeInventorySchema = new Schema<IStoreInventory>(
  {
    store: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },

    grocery: {
      type: Schema.Types.ObjectId,
      ref: "Grocery",
      required: true,
      index: true,
    },

    variant: {
      type: Schema.Types.ObjectId,
      ref: "GroceryVariant",
      required: true,
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    priceOverride: {
      mrp: { type: Number, min: 0 },
      selling: { type: Number, min: 0 },
    },

    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Each variant can only appear once per store
storeInventorySchema.index({ store: 1, variant: 1 }, { unique: true });

// Efficient query: find all available items in a store
storeInventorySchema.index({ store: 1, isAvailable: 1, grocery: 1 });

export const StoreInventory =
  mongoose.models.StoreInventory ||
  mongoose.model<IStoreInventory>("StoreInventory", storeInventorySchema);
