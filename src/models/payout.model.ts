import mongoose, { Document, Schema, Types } from "mongoose";

export type PayoutStatus = "pending" | "processing" | "completed" | "failed";

export interface IPayout extends Document {
  deliveryPartner: Types.ObjectId;
  amount: number;
  currency: string;
  status: PayoutStatus;
  period: {
    startDate: Date;
    endDate: Date;
  };
  bankDetails?: {
    accountNumber: string;
    ifsc: string;
    beneficiaryName: string;
  };
  transactionId?: string; // Payment gateway transaction ID
  failureReason?: string;
  processedAt?: Date;
  completedAt?: Date;
  deliveriesCount?: number;
  earnedAmount?: number;
  deductedAmount?: number; // Cancellation penalties, returns, etc.
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const payoutSchema = new Schema<IPayout>(
  {
    deliveryPartner: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    period: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      _id: false,
    },
    bankDetails: {
      accountNumber: { type: String },
      ifsc: { type: String },
      beneficiaryName: { type: String },
      _id: false,
    },
    transactionId: { type: String },
    failureReason: { type: String },
    processedAt: { type: Date },
    completedAt: { type: Date },
    deliveriesCount: { type: Number, default: 0 },
    earnedAmount: { type: Number, default: 0 },
    deductedAmount: { type: Number, default: 0 },
    notes: { type: String },
  },
  { timestamps: true },
);

// Index for finding payouts by partner and period
payoutSchema.index({ deliveryPartner: 1, "period.startDate": 1 });
payoutSchema.index({ deliveryPartner: 1, status: 1 });

export const Payout =
  mongoose.models.Payout || mongoose.model<IPayout>("Payout", payoutSchema);
