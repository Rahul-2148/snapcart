import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./user.model";

export interface IAddress extends Document {
  user: mongoose.Types.ObjectId;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  type: "home" | "work" | "others";
}

const addressSchema = new Schema<IAddress>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    street: {
      type: String,
      required: true,
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
  },
  { timestamps: true }
);

const Address =
  mongoose.models.Address || mongoose.model<IAddress>("Address", addressSchema);

export default Address;
