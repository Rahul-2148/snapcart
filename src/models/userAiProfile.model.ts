import mongoose, { Document, Schema } from "mongoose";

export interface IRecurringItem {
  variantId: mongoose.Types.ObjectId;
  frequencyDays: number;            // 7 = weekly, 30 = monthly, etc.
  lastOrderedAt?: Date;
  nextPredictedNeed?: Date;
}

export interface IUserAiProfile extends Document {
  userId: mongoose.Types.ObjectId;
  dietaryPreferences: string[];       // ['vegan', 'diabetic-friendly', 'high-protein']
  allergies: string[];                // ['peanuts', 'gluten', 'dairy']
  spendBracket: "budget" | "medium" | "premium";
  avgOrderValue: number;
  familySize: number;
  brandAffinities: string[];          // ['Amul', 'Epigamia', 'Tata']
  recurringItems: IRecurringItem[];
  createdAt: Date;
  updatedAt: Date;
}

const RecurringItemSchema = new Schema<IRecurringItem>(
  {
    variantId: { type: Schema.Types.ObjectId, ref: "GroceryVariant", required: true },
    frequencyDays: { type: Number, required: true },
    lastOrderedAt: { type: Date },
    nextPredictedNeed: { type: Date },
  },
  { _id: false }
);

const UserAiProfileSchema = new Schema<IUserAiProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    dietaryPreferences: [{ type: String }],
    allergies: [{ type: String }],
    spendBracket: { type: String, enum: ["budget", "medium", "premium"], default: "medium" },
    avgOrderValue: { type: Number, default: 0 },
    familySize: { type: Number, default: 1 },
    brandAffinities: [{ type: String }],
    recurringItems: [RecurringItemSchema],
  },
  { timestamps: true }
);

export const UserAiProfile =
  mongoose.models.UserAiProfile ||
  mongoose.model<IUserAiProfile>("UserAiProfile", UserAiProfileSchema);
