// src/models/groupCart.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IGroupCartMember {
  memberId: string; // client-generated unique UUID
  name: string;
  joinedAt: Date;
}

export interface IGroupCart extends Document {
  host: mongoose.Types.ObjectId; // User ID of the host who created the session
  code: string; // unique invite code (6 characters)
  isActive: boolean;
  members: IGroupCartMember[];
  createdAt: Date;
  updatedAt: Date;
}

const groupCartSchema = new Schema<IGroupCart>(
  {
    host: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    members: [
      {
        memberId: { type: String, required: true },
        name: { type: String, required: true },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const GroupCart =
  mongoose.models.GroupCart ||
  mongoose.model<IGroupCart>("GroupCart", groupCartSchema);
