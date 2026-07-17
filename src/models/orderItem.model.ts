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
  substituteOption?: "none" | "similar" | "specific";
  substituteVariantId?: mongoose.Types.ObjectId | null;
  substituteName?: string;
  isSubstituted?: boolean;
  substituteStatus?: "pending" | "original_packed" | "substituted" | "out_of_stock_refunded" | "extra_amount_requested";
  substitutedWith?: {
    variantId?: mongoose.Types.ObjectId;
    label?: string;
    price?: number;
    name?: string;
  };
  addedBy?: {
    memberId: string;
    name: string;
  };
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
    substituteOption: {
      type: String,
      enum: ["none", "similar", "specific"],
      default: "none",
    },
    substituteVariantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GroceryVariant",
      default: null,
    },
    substituteName: {
      type: String,
      default: "",
    },
    isSubstituted: {
      type: Boolean,
      default: false,
    },
    substituteStatus: {
      type: String,
      enum: [
        "pending",
        "original_packed",
        "substituted",
        "out_of_stock_refunded",
        "extra_amount_requested"
      ],
      default: "pending",
    },
    substitutedWith: {
      variantId: { type: mongoose.Schema.Types.ObjectId, ref: "GroceryVariant" },
      label: String,
      price: Number,
      name: String,
    },
    addedBy: {
      memberId: { type: String, default: null },
      name: { type: String, default: null },
    },
  },
  { timestamps: true }
);

export const OrderItem =
  mongoose.models.OrderItem ||
  mongoose.model<IOrderItem>("OrderItem", OrderItemSchema);
