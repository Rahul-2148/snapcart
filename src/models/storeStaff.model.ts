// src/models/storeStaff.model.ts
import mongoose, { Document, Schema } from "mongoose";

export interface IStoreStaff extends Document {
  name: string;
  role: "picker" | "loader" | "unloader" | "cleaner";
  gender: "male" | "female" | "other";
  phone: string;
  status: "on-duty" | "off-duty" | "leave";
  store: mongoose.Types.ObjectId;
  salary: number;
  powers: string[];
  createdAt: Date;
  updatedAt: Date;
}

const storeStaffSchema = new Schema<IStoreStaff>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["picker", "loader", "unloader", "cleaner"],
      required: true,
      index: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["on-duty", "off-duty", "leave"],
      default: "on-duty",
      index: true,
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    salary: {
      type: Number,
      default: 0,
    },
    powers: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export const StoreStaff =
  mongoose.models.StoreStaff || mongoose.model<IStoreStaff>("StoreStaff", storeStaffSchema);

