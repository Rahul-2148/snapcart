import mongoose, { Schema, Document } from "mongoose";

export interface IGiftCard extends Document {
  code: string;
  pin: string;
  amount: number;
  status: "active" | "redeemed" | "expired";
  purchasedBy?: mongoose.Types.ObjectId;
  redeemedBy?: mongoose.Types.ObjectId;
  redeemedAt?: Date;
  expiresAt: Date;
  stripeSessionId?: string;
  razorpayOrderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const giftCardSchema = new Schema<IGiftCard>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    pin: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["active", "redeemed", "expired"],
      default: "active",
      index: true,
    },
    purchasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    redeemedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    redeemedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
    },
    stripeSessionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    razorpayOrderId: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

const GiftCard = mongoose.models.GiftCard || mongoose.model<IGiftCard>("GiftCard", giftCardSchema);
export default GiftCard;
