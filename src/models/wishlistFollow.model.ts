import mongoose, { Document, Schema } from "mongoose";

export interface IWishlistFollow extends Document {
	follower: mongoose.Types.ObjectId; // User who is following
	following: mongoose.Types.ObjectId; // Wishlist being followed
	followedAt?: Date;
	createdAt?: Date;
	updatedAt?: Date;
}

const wishlistFollowSchema = new Schema<IWishlistFollow>(
	{
		follower: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
		following: { type: Schema.Types.ObjectId, ref: "Wishlist", required: true, index: true },
		followedAt: { type: Date, default: Date.now },
	},
	{ timestamps: true }
);

// Unique constraint: each user can follow a wishlist only once
wishlistFollowSchema.index({ follower: 1, following: 1 }, { unique: true });

export const WishlistFollow =
	mongoose.models.WishlistFollow || mongoose.model<IWishlistFollow>("WishlistFollow", wishlistFollowSchema);
