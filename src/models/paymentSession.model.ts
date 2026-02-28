import mongoose, { Schema, Document } from "mongoose";
import { CURRENCY_CODES, DEFAULT_CURRENCY } from "@/constants/currencies";

export type PaymentSessionStatus =
  | "pending"
  | "processing"
  | "paid"
  | "cancelled"
  | "expired"
  | "failed";

export interface IPaymentSessionItem {
  variantId: mongoose.Types.ObjectId;
  groceryId: mongoose.Types.ObjectId;
  groceryName: string;
  variantLabel: string;
  unit: string;
  value?: string;
  quantity: number;
  price: {
    mrpPrice: number;
    sellingPrice: number;
  };
}

export interface IPaymentSession extends Document {
  userId: mongoose.Types.ObjectId;
  items: IPaymentSessionItem[];
  subTotal: number;
  totalMRP: number;
  savings: number;
  deliveryFee: number;
  finalTotal: number;
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
    location?: {
      lat: number;
      lng: number;
    };
  };
  paymentMethod: "online";
  onlinePaymentType: "stripe" | "razorpay";
  status: PaymentSessionStatus;
  providerSessionId?: string;
  currency: string;
  orderId?: mongoose.Types.ObjectId;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSessionItemSchema = new Schema<IPaymentSessionItem>(
  {
    variantId: { type: Schema.Types.ObjectId, ref: "GroceryVariant", required: true },
    groceryId: { type: Schema.Types.ObjectId, ref: "Grocery", required: true },
    groceryName: { type: String, required: true },
    variantLabel: { type: String, required: true },
    unit: { type: String, required: true },
    value: String,
    quantity: { type: Number, required: true, min: 1 },
    price: {
      mrpPrice: { type: Number, required: true },
      sellingPrice: { type: Number, required: true },
    },
  },
  { _id: false },
);

const PaymentSessionSchema = new Schema<IPaymentSession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: { type: [PaymentSessionItemSchema], required: true },
    subTotal: { type: Number, required: true },
    totalMRP: { type: Number, required: true },
    savings: { type: Number, required: true },
    deliveryFee: { type: Number, required: true, default: 0 },
    finalTotal: { type: Number, required: true },
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
      location: {
        lat: Number,
        lng: Number,
      },
    },
    paymentMethod: { type: String, enum: ["online"], default: "online" },
    onlinePaymentType: { type: String, enum: ["stripe", "razorpay"], required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "paid", "cancelled", "expired", "failed"],
      default: "pending",
    },
    providerSessionId: String,
    currency: { type: String, enum: CURRENCY_CODES, default: DEFAULT_CURRENCY, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    expiresAt: Date,
  },
  { timestamps: true },
);

PaymentSessionSchema.index({ status: 1, createdAt: 1 });

export const PaymentSession =
  mongoose.models.PaymentSession ||
  mongoose.model<IPaymentSession>("PaymentSession", PaymentSessionSchema);
