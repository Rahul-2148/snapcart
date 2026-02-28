import mongoose, { Document, Model, Schema } from "mongoose";

type ChannelSettings = {
  push: boolean;
  email: boolean;
  sms: boolean;
};

type QuietHoursSettings = {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
};

type PreferenceSettings = {
  security_alerts: boolean;
  payment_updates: boolean;
  policy_updates: boolean;
  order_updates: boolean;
  delivery_eta: boolean;
  returns_refunds: boolean;
  offers: boolean;
  price_drops: boolean;
  back_in_stock: boolean;
  wishlist: boolean;
};

export interface IUserNotificationSettings extends Document {
  userId: mongoose.Types.ObjectId;
  channels: ChannelSettings;
  frequency: "instant" | "daily" | "weekly";
  quietHours: QuietHoursSettings;
  preferences: PreferenceSettings;
  createdAt?: Date;
  updatedAt?: Date;
}

const userNotificationSettingsSchema = new Schema<IUserNotificationSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    channels: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
    },
    frequency: {
      type: String,
      enum: ["instant", "daily", "weekly"],
      default: "instant",
    },
    quietHours: {
      enabled: { type: Boolean, default: true },
      start: { type: String, default: "10:00 PM" },
      end: { type: String, default: "07:00 AM" },
      timezone: { type: String, default: "Asia/Kolkata" },
    },
    preferences: {
      security_alerts: { type: Boolean, default: true },
      payment_updates: { type: Boolean, default: true },
      policy_updates: { type: Boolean, default: true },
      order_updates: { type: Boolean, default: true },
      delivery_eta: { type: Boolean, default: true },
      returns_refunds: { type: Boolean, default: true },
      offers: { type: Boolean, default: true },
      price_drops: { type: Boolean, default: true },
      back_in_stock: { type: Boolean, default: true },
      wishlist: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

const UserNotificationSettings: Model<IUserNotificationSettings> =
  (mongoose.models
    .UserNotificationSettings as Model<IUserNotificationSettings>) ||
  mongoose.model<IUserNotificationSettings>(
    "UserNotificationSettings",
    userNotificationSettingsSchema,
  );

export default UserNotificationSettings;
