import mongoose, { Schema, Document } from "mongoose";

export interface IScratchCard {
  _id: mongoose.Types.ObjectId;
  status: "unscratched" | "scratched";
  rewardType?: "cashback" | "voucher" | "better_luck";
  value: number;
  voucherCode?: string;
  voucherTitle?: string;
  earnedForOrder: string;
  createdAt: Date;
  scratchedAt?: Date;
}

export interface IReward extends Document {
  userId: mongoose.Types.ObjectId;
  coins: number;
  scratchCards: IScratchCard[];
  createdAt: Date;
  updatedAt: Date;
}

const scratchCardSchema = new Schema<IScratchCard>({
  status: {
    type: String,
    enum: ["unscratched", "scratched"],
    default: "unscratched",
  },
  rewardType: {
    type: String,
    enum: ["cashback", "voucher", "better_luck"],
  },
  value: {
    type: Number,
    default: 0,
  },
  voucherCode: {
    type: String,
  },
  voucherTitle: {
    type: String,
  },
  earnedForOrder: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  scratchedAt: {
    type: Date,
  },
});

const rewardSchema = new Schema<IReward>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    coins: {
      type: Number,
      default: 0,
      min: 0,
    },
    scratchCards: [scratchCardSchema],
  },
  { timestamps: true }
);

const Reward = mongoose.models.Reward || mongoose.model<IReward>("Reward", rewardSchema);
export default Reward;
