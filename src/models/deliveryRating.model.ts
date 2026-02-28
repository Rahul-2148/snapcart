import mongoose, { Document, Schema, Types } from "mongoose";

export interface IDeliveryRating extends Document {
  assignment: Types.ObjectId;
  order: Types.ObjectId;
  deliveryPartner: Types.ObjectId;
  customer: Types.ObjectId;
  score: number; // 1-5
  review?: string;
  ratedBy: "customer" | "partner";
  categories?: {
    cleanliness?: number;
    professionalism?: number;
    speed?: number;
    communication?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const deliveryRatingSchema = new Schema<IDeliveryRating>(
  {
    assignment: {
      type: Types.ObjectId,
      ref: "DeliveryAssignment",
      required: true,
      index: true,
    },
    order: {
      type: Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    deliveryPartner: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customer: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      maxlength: 500,
    },
    ratedBy: {
      type: String,
      enum: ["customer", "partner"],
      required: true,
    },
    categories: {
      cleanliness: { type: Number, min: 1, max: 5 },
      professionalism: { type: Number, min: 1, max: 5 },
      speed: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      _id: false,
    },
  },
  { timestamps: true },
);

// Index to prevent duplicate ratings from same rater
deliveryRatingSchema.index({ assignment: 1, ratedBy: 1 }, { unique: true });

export const DeliveryRating =
  mongoose.models.DeliveryRating ||
  mongoose.model<IDeliveryRating>("DeliveryRating", deliveryRatingSchema);
