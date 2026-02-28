import mongoose, { Document, Schema, Types } from "mongoose";

export type DeliveryShiftStatus = "scheduled" | "active" | "completed" | "cancelled";

export interface IDeliveryShift extends Document {
  partner: Types.ObjectId;
  startAt: Date;
  endAt: Date;
  status: DeliveryShiftStatus;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryShiftSchema = new Schema<IDeliveryShift>(
  {
    partner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["scheduled", "active", "completed", "cancelled"],
      default: "scheduled",
      index: true,
    },
  },
  { timestamps: true },
);

deliveryShiftSchema.index({ partner: 1, startAt: 1, endAt: 1 });

export const DeliveryShift =
  mongoose.models.DeliveryShift ||
  mongoose.model<IDeliveryShift>("DeliveryShift", deliveryShiftSchema);
