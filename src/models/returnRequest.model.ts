// src/models/returnRequest.model.ts
import mongoose, { Schema, Document } from "mongoose";

export type ReturnRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "in-transit"
  | "received"
  | "completed"
  | "cancelled";

export type ReturnRequestType = "return" | "replacement";

export interface IReturnRequest extends Document {
  order: mongoose.Types.ObjectId;
  orderItem: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  grocery: mongoose.Types.ObjectId;
  requestType: ReturnRequestType; // "return" or "replacement"
  status: ReturnRequestStatus;
  reason: string;
  description?: string;
  images?: {
    url: string;
    publicId: string;
  }[];
  
  // Pickup assignment for return collection
  deliveryPartner?: mongoose.Types.ObjectId;
  pickupScheduledAt?: Date;
  pickupLocation?: {
    address: string;
    coordinates: [number, number]; // [lat, lng]
  };

  // Return/Replacement tracking
  requestedAt: Date;
  approvedAt?: Date;
  pickedUpAt?: Date;
  receivedAt?: Date;
  completedAt?: Date;
  rejectedAt?: Date;

  rejectionReason?: string;

  // Refund details (for returns)
  refund?: {
    amount: number;
    method: "original-payment" | "wallet";
    transactionId?: string;
    completedAt?: Date;
  };

  // Replacement tracking
  replacement?: {
    variantId?: mongoose.Types.ObjectId;
    quantity?: number;
    shippedAt?: Date;
    deliveredAt?: Date;
  };

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnRequestSchema = new Schema<IReturnRequest>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderItem: {
      type: Schema.Types.ObjectId,
      ref: "OrderItem",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    grocery: {
      type: Schema.Types.ObjectId,
      ref: "Grocery",
      required: true,
    },
    requestType: {
      type: String,
      enum: ["return", "replacement"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "in-transit",
        "received",
        "completed",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },
    reason: {
      type: String,
      required: true,
      enum: [
        "defective",
        "damaged",
        "not-as-described",
        "expired",
        "wrong-item",
        "quality-issue",
        "other",
      ],
    },
    description: String,
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],

    // Timestamps
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: Date,
    pickedUpAt: Date,
    receivedAt: Date,
    completedAt: Date,
    rejectedAt: Date,

    rejectionReason: String,

    // Refund
    refund: {
      amount: Number,
      method: {
        type: String,
        enum: ["original-payment", "wallet"],
      },
      transactionId: String,
      completedAt: Date,
    },

    // Replacement
    replacement: {
      variantId: {
        type: Schema.Types.ObjectId,
        ref: "GroceryVariant",
      },
      quantity: Number,
      shippedAt: Date,
      deliveredAt: Date,
    },

    notes: String,
    
    // Pickup Assignment
    deliveryPartner: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryPartner",
    },
    pickupScheduledAt: Date,
    pickupLocation: {
      address: String,
      coordinates: {
        type: [Number],
        index: "2dsphere",
      },
    },
  },
  { timestamps: true },
);

// Index for user's return requests
ReturnRequestSchema.index({ user: 1, status: 1 });
ReturnRequestSchema.index({ deliveryPartner: 1, status: 1 });
// Note: Path-level index is already defined on `order`. Avoid duplicate index.

export const ReturnRequest =
  mongoose.models.ReturnRequest ||
  mongoose.model<IReturnRequest>("ReturnRequest", ReturnRequestSchema);
