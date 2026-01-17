import mongoose, { Schema, Document } from "mongoose";
import { CURRENCY_CODES } from "@/constants/currencies";

export interface IPayment extends Document {
  order: mongoose.Types.ObjectId;
  provider: "stripe" | "razorpay";
  currency: string;
  amount: number;
  transactionId?: string; // razorpay_payment_id / stripe_payment_intent
  providerOrderId?: string; // razorpay_order_id
  status: "created" | "success" | "failed" | "refunded";
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    provider: {
      type: String,
      enum: ["stripe", "razorpay"],
      required: true,
    },

    currency: {
      type: String,
      enum: CURRENCY_CODES,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    transactionId: {
      type: String,
      index: true,
    },

    providerOrderId: {
      type: String,
      index: true,
    },

    status: {
      type: String,
      enum: ["created", "success", "failed", "refunded"],
      default: "created",
      index: true,
    },
  },
  { timestamps: true }
);

export const Payment =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
