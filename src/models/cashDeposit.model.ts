import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICashDeposit extends Document {
  deliveryPartner: Types.ObjectId;
  amount: number;
  status: "pending" | "approved" | "rejected";
  method: "upi" | "store_manager";
  transactionId?: string; // UPI Ref No or hand-over receipt
  storeId?: Types.ObjectId; // Store where offline deposit happened
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const cashDepositSchema = new Schema<ICashDeposit>(
  {
    deliveryPartner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    method: {
      type: String,
      enum: ["upi", "store_manager"],
      required: true,
    },
    transactionId: {
      type: String,
      trim: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      index: true,
    },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

export const CashDeposit =
  mongoose.models.CashDeposit ||
  mongoose.model<ICashDeposit>("CashDeposit", cashDepositSchema);
