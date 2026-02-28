// src/models/newsletterCampaign.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface INewsletterCampaign extends Document {
  title: string;
  subject: string;
  content: string;
  htmlContent?: string;
  templateId?: string;
  status: "draft" | "scheduled" | "sent" | "failed";
  scheduledAt?: Date;
  sentAt?: Date;
  recipientCount: number;
  openCount: number;
  clickCount: number;
  createdBy: mongoose.Types.ObjectId;
  sentTo: "all" | "verified" | "custom";
  customRecipients?: string[];
  metadata?: {
    subject?: string;
    previewText?: string;
    fromName?: string;
    replyTo?: string;
  };
}

const newsletterCampaignSchema = new Schema<INewsletterCampaign>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    htmlContent: {
      type: String,
    },
    templateId: {
      type: String,
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "sent", "failed"],
      default: "draft",
      index: true,
    },
    scheduledAt: {
      type: Date,
      index: true,
    },
    sentAt: {
      type: Date,
      index: true,
    },
    recipientCount: {
      type: Number,
      default: 0,
    },
    openCount: {
      type: Number,
      default: 0,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sentTo: {
      type: String,
      enum: ["all", "verified", "custom"],
      default: "verified",
    },
    customRecipients: [
      {
        type: String,
      },
    ],
    metadata: {
      subject: String,
      previewText: String,
      fromName: String,
      replyTo: String,
    },
  },
  { timestamps: true },
);

// Index for finding campaigns to send
newsletterCampaignSchema.index({ status: 1, scheduledAt: 1 });

const MODEL_NAME = "NewsletterCampaign";

export const NewsletterCampaign =
  (mongoose.models[MODEL_NAME] as mongoose.Model<INewsletterCampaign>) ||
  mongoose.model<INewsletterCampaign>(MODEL_NAME, newsletterCampaignSchema);
