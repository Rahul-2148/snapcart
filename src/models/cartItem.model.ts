// src/models/cartItem.model.ts
import mongoose from "mongoose";

export interface ICartItem {
  variant: mongoose.Types.ObjectId;
  quantity: number;
  cart: mongoose.Types.ObjectId;
  priceAtAdd: {
    mrp: number;
    selling: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const cartItemSchema = new mongoose.Schema<ICartItem>(
  {
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroceryVariant",
      required: true,
    },
    quantity: { type: Number, required: true, default: 1, min: 1, max: 99 },
    cart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cart",
      required: true,
      index: true,
    },
    priceAtAdd: {
      mrp: { type: Number, required: true },
      selling: { type: Number, required: true },
    },
  },
  { timestamps: true }
);

cartItemSchema.index({ cart: 1, variant: 1 }, { unique: true });

export const CartItem =
  mongoose.models.CartItem ||
  mongoose.model<ICartItem>("CartItem", cartItemSchema);
