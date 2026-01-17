import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
	user: mongoose.Types.ObjectId;
	grocery: mongoose.Types.ObjectId;
	rating: number;
	comment: string;
	createdAt: Date;
	updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
	{
		user: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		grocery: {
			type: Schema.Types.ObjectId,
			ref: "Grocery",
			required: true,
		},
		rating: {
			type: Number,
			required: true,
			min: 1,
			max: 5,
		},
		comment: {
			type: String,
			required: true,
			trim: true,
			maxlength: 1000,
		},
	},
	{
		timestamps: true,
	}
);

// Compound index to ensure one review per user per product
reviewSchema.index({ user: 1, grocery: 1 }, { unique: true });

// Index for querying reviews by grocery
reviewSchema.index({ grocery: 1, createdAt: -1 });

const Review =
	mongoose.models.Review || mongoose.model<IReview>("Review", reviewSchema);

export default Review;
