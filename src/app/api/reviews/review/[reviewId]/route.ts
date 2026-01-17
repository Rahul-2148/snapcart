import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDB from "@/lib/server/db";
import Review from "@/models/review.model";

// PUT - Update a review (only by the user who created it)
export async function PUT(
	req: NextRequest,
	{ params }: { params: Promise<{ reviewId: string }> }
) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 }
			);
		}

		await connectDB();

		const { reviewId } = await params;
		const { rating, comment } = await req.json();

		// Validation
		if (rating && (rating < 1 || rating > 5)) {
			return NextResponse.json(
				{ success: false, message: "Rating must be between 1 and 5" },
				{ status: 400 }
			);
		}

		// Find review
		const review = await Review.findById(reviewId);

		if (!review) {
			return NextResponse.json(
				{ success: false, message: "Review not found" },
				{ status: 404 }
			);
		}

		// Check if user owns the review
		if (review.user.toString() !== session.user.id) {
			return NextResponse.json(
				{ success: false, message: "You can only edit your own reviews" },
				{ status: 403 }
			);
		}

		// Update review
		if (rating) review.rating = Number(rating);
		if (comment !== undefined) review.comment = comment.trim();

		await review.save();

		const updatedReview = await Review.findById(reviewId).populate(
			"user",
			"name email image"
		);

		return NextResponse.json({
			success: true,
			data: updatedReview,
			message: "Review updated successfully",
		});
	} catch (error: any) {
		console.error("Update review error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Failed to update review" },
			{ status: 500 }
		);
	}
}

// DELETE - Delete a review (only by the user who created it)
export async function DELETE(
	req: NextRequest,
	{ params }: { params: Promise<{ reviewId: string }> }
) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 }
			);
		}

		await connectDB();

		const { reviewId } = await params;

		// Find review
		const review = await Review.findById(reviewId);

		if (!review) {
			return NextResponse.json(
				{ success: false, message: "Review not found" },
				{ status: 404 }
			);
		}

		// Check if user owns the review
		if (review.user.toString() !== session.user.id) {
			return NextResponse.json(
				{ success: false, message: "You can only delete your own reviews" },
				{ status: 403 }
			);
		}

		await Review.findByIdAndDelete(reviewId);

		return NextResponse.json({
			success: true,
			message: "Review deleted successfully",
		});
	} catch (error: any) {
		console.error("Delete review error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Failed to delete review" },
			{ status: 500 }
		);
	}
}
