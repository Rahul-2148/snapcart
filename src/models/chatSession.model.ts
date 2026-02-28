import mongoose, { Document, Schema } from "mongoose";

export interface IChatSessionMessage {
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
}

export interface IChatSession extends Document {
  userId: mongoose.Types.ObjectId;
  role: "user" | "deliveryBoy" | "admin";
  title?: string;
  pinned: boolean;
  messages: IChatSessionMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IChatSessionMessage>(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const chatSessionSchema = new Schema<IChatSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "deliveryBoy", "admin"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 140,
    },
    pinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  { timestamps: true },
);

chatSessionSchema.index({ userId: 1, pinned: -1, updatedAt: -1 });

export const ChatSession =
  mongoose.models.ChatSession ||
  mongoose.model<IChatSession>("ChatSession", chatSessionSchema);
