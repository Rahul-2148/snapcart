import mongoose from "mongoose";

const bankAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    accountNumber: {
      type: String,
      required: true,
    },
    ifsc: {
      type: String,
      required: true,
      uppercase: true,
    },
    beneficiaryName: {
      type: String,
      required: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for quick queries
bankAccountSchema.index({ userId: 1, isPrimary: 1 });

export const BankAccount = mongoose.models.BankAccount || mongoose.model("BankAccount", bankAccountSchema);
