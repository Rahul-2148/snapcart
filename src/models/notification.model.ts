import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
    recipient: mongoose.Types.ObjectId;
    message: string;
    type: "order" | "promotion" | "system" | "role_change"; // Example types, can be expanded
    link?: string; // Optional URL to navigate to when clicking the notification
    read: boolean;
    createdAt: Date;
}

const NotificationSchema: Schema<INotification> = new Schema<INotification>({
    recipient: {
        type: Schema.Types.ObjectId,
        ref: "User", // Assuming a User model exists
        required: true,
        index: true, // Index for efficient lookup by user
    },
    message: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ["order", "promotion", "system", "role_change"],
        required: true,
    },
    link: {
        type: String,
    },
    read: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true, // Index for efficient sorting
    },
});

const Notification: Model<INotification> =
    (mongoose.models.Notification as Model<INotification>) ||
    mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
