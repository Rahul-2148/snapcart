// src/models/category.model.ts
import mongoose from "mongoose";

export interface ICategory {
  _id?: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  allowedUnits: string[];
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const categorySchema = new mongoose.Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      // enum: [
      //   "Fruits & Vegetables",
      //   "Dairy & Eggs",
      //   "Rice, Atta & Grains",
      //   "Oil & Ghee",
      //   "Snacks & Biscuits",
      //   "Beverages & Drinks",
      //   "Breakfast & Cereals",
      //   "Spices & Condiments",
      //   "Dry Fruits & Nuts",
      //   "Instant & Packaged Foods",
      //   "Bakery & Breads",
      //   "Sweets & Chocolates",
      //   "Frozen Foods",
      //   "Meat & Seafood",
      //   "Baby & Pet Care",
      //   "Personal Care",
      //   "Cleaning & Laundry",
      //   "Household Essentials",
      //   "Pooja Needs",
      //   "Pharmacy & Health",
      //   "Stationery & Office",
      //   "Others",
      // ],
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    // Category-wise allowed units
    allowedUnits: [
      {
        type: String,
        enum: [
          "kg",
          "g",
          "liter",
          "ml",
          "piece",
          "dozen",
          "pack",
          "packet",
          "pouch",
          "box",
          "bag",
          "tray",
          "bottle",
          "jar",
          "can",
          "tin",
          "bar",
          "loaf",
          "slice",
          "roll",
          "cup",
          "cone",
          "sachet",
          "strip",
          "tub",
          "sheet",
        ],
        required: true,
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Category =
  mongoose.models.Category ||
  mongoose.model<ICategory>("Category", categorySchema);
