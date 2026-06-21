import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./user.model";

export interface IAddress extends Document {
  user: mongoose.Types.ObjectId;
  street: string;
  fullAddress?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  type: "home" | "work" | "others";
  label?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  fullName?: string;
  mobile?: string;
  alternateMobile?: string;
  customLabel?: string;
  landmark?: string;
}

const addressSchema = new Schema<IAddress>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    street: {
      type: String,
      required: true,
    },
    fullAddress: {
      type: String,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    zipCode: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["home", "work", "others"],
      default: "home",
    },
    label: {
      type: String,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    fullName: {
      type: String,
    },
    mobile: {
      type: String,
    },
    alternateMobile: {
      type: String,
    },
    customLabel: {
      type: String,
    },
    landmark: {
      type: String,
    },
  },
  { timestamps: true }
);

const Address =
  mongoose.models.Address || mongoose.model<IAddress>("Address", addressSchema);

export default Address;
