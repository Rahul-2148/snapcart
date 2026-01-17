// src/models/grocery.model.ts
import mongoose from "mongoose";
import { createSlug } from "@/lib/utils/createSlug";

export interface IGrocery {
  _id?: mongoose.Types.ObjectId;
  name: string;
  slug?: string;
  description?: string;
  category: mongoose.Types.ObjectId;
  brand?: string;
  images?: {
    url: string;
    publicId: string;
  }[];
  badges?: {
    isBestSeller?: boolean;
    isNew?: boolean;
  };
  isActive?: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const grocerySchema = new mongoose.Schema<IGrocery>(
  {
    name: { type: String, required: true, trim: true },

    slug: { type: String, unique: true, lowercase: true },

    description: String,

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    brand: { type: String, default: "Ordinary" },

    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],

    badges: {
      isBestSeller: { type: Boolean, default: false },
      isNew: { type: Boolean, default: false },
    },

    isActive: { type: Boolean, default: true },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// auto slug
grocerySchema.pre("save", function (this: any) {
  if (!this.slug) {
    this.slug = `${createSlug(this.name)}-${this._id.toString().slice(-5)}`;
  }
});

grocerySchema.index({ category: 1, isActive: 1 });

// Virtual to get all variants of this grocery
grocerySchema.virtual("variants", {
  ref: "GroceryVariant",
  localField: "_id",
  foreignField: "grocery",
});

grocerySchema.set("toObject", { virtuals: true });
grocerySchema.set("toJSON", { virtuals: true });
// ------------

export const Grocery =
  mongoose.models.Grocery || mongoose.model<IGrocery>("Grocery", grocerySchema);
