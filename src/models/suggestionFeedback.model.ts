import mongoose, { Document, Schema } from "mongoose";

export interface ISuggestionFeedback extends Document {
  userId: mongoose.Types.ObjectId;
  suggestion: string;
  suggestionKey: string;
  sentiment: "up" | "down";
  createdAt: Date;
  updatedAt: Date;
}

const suggestionFeedbackSchema = new Schema<ISuggestionFeedback>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    suggestion: {
      type: String,
      required: true,
      trim: true,
      maxlength: 220,
    },
    suggestionKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 220,
    },
    sentiment: {
      type: String,
      enum: ["up", "down"],
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

suggestionFeedbackSchema.index({ userId: 1, suggestionKey: 1 }, { unique: true });

export const SuggestionFeedback =
  mongoose.models.SuggestionFeedback ||
  mongoose.model<ISuggestionFeedback>("SuggestionFeedback", suggestionFeedbackSchema);
