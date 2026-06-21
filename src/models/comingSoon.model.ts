// src/models/comingSoon.model.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IComingSoon extends Document {
  email: string;
  pincode: string;
  city: string;
  coordinates: [number, number]; // [longitude, latitude]
  createdAt: Date;
  updatedAt: Date;
}

const comingSoonSchema = new Schema<IComingSoon>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function (v: number[]) {
          return (
            v.length === 2 &&
            v[0] >= -180 &&
            v[0] <= 180 &&
            v[1] >= -90 &&
            v[1] <= 90
          );
        },
        message: "Invalid coordinates. Must be [longitude, latitude].",
      },
    },
  },
  { timestamps: true }
);

// Optional: compound index on email and pincode to prevent multiple signups for the same pincode
comingSoonSchema.index({ email: 1, pincode: 1 }, { unique: true });

export const ComingSoon =
  mongoose.models.ComingSoon ||
  mongoose.model<IComingSoon>("ComingSoon", comingSoonSchema);
