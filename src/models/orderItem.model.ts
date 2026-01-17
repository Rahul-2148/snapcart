// src/models/orderItem.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IOrderItem extends Document {
  order: mongoose.Types.ObjectId;
  grocery: mongoose.Types.ObjectId;
  groceryName: string;
  variant: {
    variantId: mongoose.Types.ObjectId;
    label: string;
    unit: string;
    value: number;
  };
  price: {
    mrpPrice: number;
    sellingPrice: number;
  };
  quantity: number;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    grocery: {
      type: Schema.Types.ObjectId,
      ref: "Grocery",
      required: true,
    },
    groceryName: {
      type: String,
      required: true,
    },
    variant: {
      variantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GroceryVariant",
        required: true,
      },
      label: String, // e.g. "1 kg", "500 ml"
      unit: String, // e.g. kg, ml
      value: Number, // e.g. 1, 500
    },
    price: {
      mrpPrice: { type: Number, required: true },
      sellingPrice: { type: Number, required: true },
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 99,
    },
  },
  { timestamps: true }
);

export const OrderItem =
  mongoose.models.OrderItem ||
  mongoose.model<IOrderItem>("OrderItem", OrderItemSchema);
