import mongoose, { Schema, Document } from "mongoose";

export interface IWithdrawal extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  paymentDetails: {
    type: "upi" | "bank";
    upiId?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    holderName?: string;
  };
  status: "pending" | "approved" | "rejected";
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const withdrawalSchema = new Schema<IWithdrawal>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    paymentDetails: {
      type: {
        type: String,
        enum: ["upi", "bank"],
        required: true,
      },
      upiId: { type: String },
      bankName: { type: String },
      accountNumber: { type: String },
      ifscCode: { type: String },
      holderName: { type: String },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    adminNote: { type: String },
  },
  { timestamps: true }
);

const Withdrawal =
  mongoose.models.Withdrawal || mongoose.model<IWithdrawal>("Withdrawal", withdrawalSchema);

export default Withdrawal;
