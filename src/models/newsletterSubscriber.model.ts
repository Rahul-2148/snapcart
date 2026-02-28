// src/models/newsletterSubscriber.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface INewsletterSubscriber extends Document {
  email: string;
  subscribedAt: Date;
  verified?: boolean;
  verificationToken?: string;
  verificationExpires?: Date;
  unsubscribedAt?: Date | null;
}

const newsletterSubscriberSchema = new Schema<INewsletterSubscriber>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: /[^@\s]+@[^@\s]+\.[^@\s]+/,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationToken: {
      type: String,
      index: true,
    },
    verificationExpires: {
      type: Date,
      index: true,
    },
    unsubscribedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

const MODEL_NAME = "NewsletterSubscriber";

export const NewsletterSubscriber =
  mongoose.models[MODEL_NAME] ||
  mongoose.model<INewsletterSubscriber>(MODEL_NAME, newsletterSubscriberSchema);
