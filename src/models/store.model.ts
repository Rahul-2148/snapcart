// src/models/store.model.ts
import mongoose, { Document, Schema } from "mongoose";
import { createSlug } from "@/lib/utils/createSlug";

export interface IStoreLocation {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude] — MongoDB GeoJSON format
  address: string;
  city: string;
  state: string;
  district?: string;
  area?: string;
  pincode: string;
}

export interface IStore extends Document {
  name: string;
  slug: string;
  location: IStoreLocation;
  serviceRadiusKm: number;
  openingHours: {
    open: string; // "06:00"
    close: string; // "23:00"
  };
  status: "active" | "inactive" | "maintenance";
  deliveryFee: {
    base: number;
    freeAbove: number;
  };
  estimatedDeliveryMinutes: {
    min: number;
    max: number;
  };
  contactPhone?: string;
  manager: mongoose.Types.ObjectId | null;
  isOpen: boolean; // virtual
  createdAt: Date;
  updatedAt: Date;
}

const storeSchema = new Schema<IStore>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
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
      address: { type: String, required: true },
      city: { type: String, required: true, index: true },
      state: { type: String, required: true },
      district: { type: String, default: "" },
      area: { type: String, default: "" },
      pincode: { type: String, required: true, index: true },
    },

    serviceRadiusKm: {
      type: Number,
      required: true,
      default: 7,
      min: 1,
      max: 50,
    },

    openingHours: {
      open: { type: String, default: "06:00" },
      close: { type: String, default: "23:00" },
    },

    status: {
      type: String,
      enum: ["active", "inactive", "maintenance"],
      default: "active",
      index: true,
    },

    deliveryFee: {
      base: { type: Number, default: 25, min: 0 },
      freeAbove: { type: Number, default: 500, min: 0 },
    },

    estimatedDeliveryMinutes: {
      min: { type: Number, default: 8, min: 1 },
      max: { type: Number, default: 15, min: 1 },
    },

    contactPhone: { type: String },
    manager: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

// 2dsphere index for geospatial queries ($nearSphere, $geoWithin)
storeSchema.index({ "location.coordinates": "2dsphere" } as any);

// Compound index for active store lookups
storeSchema.index({ status: 1, "location.city": 1 });

// Auto-generate slug from name
storeSchema.pre("save", function (this: any) {
  if (!this.slug || this.isModified("name")) {
    this.slug = `${createSlug(this.name)}-${this._id.toString().slice(-5)}`;
  }
});

// Virtual: isOpen — computed from current time vs openingHours
storeSchema.virtual("isOpen").get(function (this: IStore) {
  if (this.status !== "active") return false;

  const now = new Date();
  const nowIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const hours = nowIST.getHours();
  const minutes = nowIST.getMinutes();
  const currentTime = hours * 60 + minutes;

  const [openH, openM] = this.openingHours.open.split(":").map(Number);
  const [closeH, closeM] = this.openingHours.close.split(":").map(Number);
  const openTime = openH * 60 + openM;
  const closeTime = closeH * 60 + closeM;

  // Handle overnight hours (e.g., open: 22:00, close: 06:00)
  if (closeTime < openTime) {
    return currentTime >= openTime || currentTime <= closeTime;
  }

  return currentTime >= openTime && currentTime <= closeTime;
});

storeSchema.set("toObject", { virtuals: true });
storeSchema.set("toJSON", { virtuals: true });

export const Store =
  mongoose.models.Store || mongoose.model<IStore>("Store", storeSchema);
