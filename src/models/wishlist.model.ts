import mongoose, { Document, Schema } from "mongoose";

export type WishlistPrivacy = "private" | "shared" | "public";

export interface IWishlistItem {
	grocery: mongoose.Types.ObjectId;
	addedAt?: Date;
}

export interface IWishlist extends Document {
	user: mongoose.Types.ObjectId;
	name: string;
	slug?: string;
	privacy: WishlistPrivacy;
	items: IWishlistItem[];
	createdAt?: Date;
	updatedAt?: Date;
}

const wishlistItemSchema = new Schema<IWishlistItem>(
	{
		grocery: { type: Schema.Types.ObjectId, ref: "Grocery", required: true },
		addedAt: { type: Date, default: Date.now },
	},
	{ _id: false }
);

const wishlistSchema = new Schema<IWishlist>(
	{
		user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
		name: { type: String, required: true, trim: true },
		slug: { type: String, unique: true, sparse: true },
		privacy: {
			type: String,
			enum: ["private", "shared", "public"],
			default: "private",
		},
		items: { type: [wishlistItemSchema], default: [] },
	},
	{ timestamps: true }
);

wishlistSchema.index({ user: 1, name: 1 }, { unique: true });

// Generate a short shareable slug for links
wishlistSchema.pre("save", function (this: any) {
	if (!this.slug) {
		const rnd = Math.random().toString(36).slice(2, 10); // 8 chars
		this.slug = rnd;
	}
});

export const Wishlist =
	mongoose.models.Wishlist || mongoose.model<IWishlist>("Wishlist", wishlistSchema);
