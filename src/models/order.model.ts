// src/models/order.model.ts
import mongoose, { Schema, Document } from "mongoose";
import { CURRENCY_CODES, DEFAULT_CURRENCY } from "@/constants/currencies";
import "@/models/orderItem.model";

export type PaymentMethod = "cod" | "online";
export type OnlinePaymentType = "stripe" | "razorpay";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "packed"
  | "shipped"
  | "out-for-delivery"
  | "delivered"
  | "cancelled";

// Expanded payment details
export interface IPaymentDetails {
  provider?: OnlinePaymentType;
  transactionId?: string;
  paymentMethod?: string;
  amount?: number;
  currency?: string;
  status?: string;
  paidAt?: Date;
}

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  orderItems: mongoose.Types.ObjectId[];
  subTotal: number;
  totalMRP: number;
  savings: number;
  deliveryFee: number;
  packagingFee?: number;
  weightSurcharge?: number;
  taxes?: number;
  codHandlingCharge?: number;
  finalTotal: number;
  walletDeduction?: number;
  coupon?: {
    couponId?: mongoose.Types.ObjectId;
    code?: string;
    discountType?: "flat" | "percentage";
    discountValue?: number;
    discountAmount?: number;
  };
  couponDiscount?: number;
  deliveryAddress: {
    fullName: string;
    mobile: string;
    city: string;
    state: string;
    pincode: string;
    fullAddress: string;
    street?: string;
    landmark?: string;
    alternateMobile?: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  refundStatus?: "initiated" | "processing" | "completed" | "failed";
  refundInitiatedAt?: Date;
  onlinePaymentType?: OnlinePaymentType;
  paymentDetails: IPaymentDetails[];
  orderStatus: OrderStatus;
  currency: string;
  storeId?: mongoose.Types.ObjectId;
  assignment?: mongoose.Types.ObjectId;
  assignedDeliveryPartner?: mongoose.Types.ObjectId;
  packedAt?: Date;
  confirmedAt?: Date;
  shippedAt?: Date;
  outForDeliveryAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  orderNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentDetailsSchema = new Schema<IPaymentDetails>(
  {
    provider: { type: String, enum: ["stripe", "razorpay"] },
    transactionId: String,
    paymentMethod: String,
    amount: Number,
    currency: String,
    status: String,
    paidAt: Date,
  },
  { _id: false },
);

const OrderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderItems: [
      { type: Schema.Types.ObjectId, ref: "OrderItem", required: true },
    ],
    subTotal: { type: Number, required: true },
    totalMRP: { type: Number, required: true },
    savings: { type: Number, required: true },
    deliveryFee: { type: Number, required: true, default: 0 },
    packagingFee: { type: Number, default: 0 },
    weightSurcharge: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    codHandlingCharge: { type: Number, default: 0, min: 0 },
    finalTotal: { type: Number, required: true },
    walletDeduction: { type: Number, default: 0 },
    coupon: {
      couponId: { type: Schema.Types.ObjectId, ref: "Coupon" },
      code: String,
      discountType: { type: String, enum: ["flat", "percentage"] },
      discountValue: Number,
      discountAmount: Number,
    },
    couponDiscount: Number,
    deliveryAddress: {
      fullName: { type: String, required: true },
      mobile: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      fullAddress: { type: String, required: true },
      street: { type: String },
      landmark: { type: String },
      alternateMobile: { type: String },
      location: {
        lat: Number,
        lng: Number,
      },
    },
    paymentMethod: { type: String, enum: ["cod", "online"], required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    refundStatus: {
      type: String,
      enum: ["initiated", "processing", "completed", "failed"],
      default: null,
    },
    refundInitiatedAt: Date,
    onlinePaymentType: {
      type: String,
      enum: ["stripe", "razorpay"],
    },
    paymentDetails: [PaymentDetailsSchema],
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "packed",
        "shipped",
        "out-for-delivery",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    currency: {
      type: String,
      enum: CURRENCY_CODES,
      default: DEFAULT_CURRENCY,
      required: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      default: null,
      index: true,
    },
    assignment: {
      type: Schema.Types.ObjectId,
      ref: "DeliveryAssignment",
      default: null,
      index: true,
    },
    assignedDeliveryPartner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    packedAt: Date,
    confirmedAt: Date,
    shippedAt: Date,
    outForDeliveryAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    orderNumber: { type: String, unique: true, index: true },
  },
  { timestamps: true },
);

export const Order =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);
