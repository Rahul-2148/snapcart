import mongoose, { Schema, Document } from "mongoose";

interface BannerImage {
  url: string;
  publicId: string;
}

export interface IBanner extends Document {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink?: string; // URL where button should redirect
  image: BannerImage;
  order: number;
  isActive: boolean;
  icon?: string;
  iconColor?: string;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Banner title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    subtitle: {
      type: String,
      required: [true, "Banner subtitle is required"],
      trim: true,
      maxlength: [200, "Subtitle cannot exceed 200 characters"],
    },
    buttonText: {
      type: String,
      required: [true, "Button text is required"],
      trim: true,
      maxlength: [50, "Button text cannot exceed 50 characters"],
    },
    buttonLink: {
      type: String,
      default: "/user/products", // Default to products page
      trim: true,
    },
    image: {
      url: {
        type: String,
        required: [true, "Banner image URL is required"],
      },
      publicId: {
        type: String,
        required: [true, "Cloudinary public ID is required"],
      },
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
    },
    icon: {
      type: String,
      default: "📌",
    },
    iconColor: {
      type: String,
      default: "#ffffff",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate index creation
bannerSchema.index({ createdAt: -1 });

// In dev, refresh model if schema changed (avoids stale models without new fields)
const MODEL_NAME = "Banner";
if (mongoose.models[MODEL_NAME]) {
  const existing = mongoose.models[MODEL_NAME] as mongoose.Model<any>;
  const hasIcon = !!existing.schema.path("icon");
  const hasIconColor = !!existing.schema.path("iconColor");
  if (!hasIcon || !hasIconColor) {
    delete mongoose.models[MODEL_NAME];
  }
}

export const Banner =
  mongoose.models[MODEL_NAME] ||
  mongoose.model<IBanner>(MODEL_NAME, bannerSchema);
