import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import connectDB from "@/lib/server/db";
import Review from "@/models/review.model";
import { Order } from "@/models/order.model";
import { OrderItem } from "@/models/orderItem.model";

// GET - Fetch all reviews for a grocery
export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ groceryId: string }> }
) {
	try {
		await connectDB();

		const { groceryId } = await params;

		const reviews = await Review.find({ grocery: groceryId })
			.populate("user", "name email image")
			.sort({ createdAt: -1 });

		// Calculate average rating
		const avgRating =
			reviews.length > 0
				? reviews.reduce((sum, review) => sum + review.rating, 0) /
				  reviews.length
				: 0;

		return NextResponse.json({
			success: true,
			data: {
				reviews,
				averageRating: Number(avgRating.toFixed(1)),
				totalReviews: reviews.length,
			},
		});
	} catch (error: any) {
		console.error("Get reviews error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Failed to fetch reviews" },
			{ status: 500 }
		);
	}
}

// POST - Create a new review (only if user purchased the product)
export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ groceryId: string }> }
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

		const { groceryId } = await params;
		const { rating, comment } = await req.json();

		// Validation
		if (!rating || rating < 1 || rating > 5) {
			return NextResponse.json(
				{ success: false, message: "Rating must be between 1 and 5" },
				{ status: 400 }
			);
		}

		if (!comment || comment.trim().length === 0) {
			return NextResponse.json(
				{ success: false, message: "Comment is required" },
				{ status: 400 }
			);
		}

		// Check if user has purchased this product
		const groceryObjectId = new mongoose.Types.ObjectId(groceryId);
		const userObjectId = new mongoose.Types.ObjectId(session.user.id);

		console.log("DEBUG: Checking purchase");
		console.log("userId:", session.user.id, "userObjectId:", userObjectId.toString());
		console.log("groceryId:", groceryId, "groceryObjectId:", groceryObjectId.toString());

		// Find order items for this grocery
		const orderItemsForGrocery = await OrderItem.find({
			grocery: groceryObjectId,
		}).lean();
		console.log("ORDER ITEMS FOR GROCERY:", JSON.stringify(orderItemsForGrocery, null, 2));

		const orderIdsForItem = orderItemsForGrocery.map((item: any) => item.order);
		console.log("ORDER IDS FOR ITEM:", orderIdsForItem);

		// Find user's orders (not cancelled)
		const userOrders = await Order.find({
			userId: userObjectId,
			orderStatus: { $nin: ["cancelled"] },
		}).lean();
		console.log("USER ORDERS:", JSON.stringify(userOrders, null, 2));

		// Find intersection
		const matchingOrders = await Order.find({
			_id: { $in: orderIdsForItem },
			userId: userObjectId,
			orderStatus: { $nin: ["cancelled"] },
		}).lean();
		console.log("MATCHING ORDERS:", JSON.stringify(matchingOrders, null, 2));

		const hasPurchased = matchingOrders.length > 0;
		console.log("HAS PURCHASED:", hasPurchased);

		if (!hasPurchased) {
			return NextResponse.json(
				{
					success: false,
					message: "You can only review products you have purchased",
				},
				{ status: 403 }
			);
		}

		// Check if user already reviewed this product
		const existingReview = await Review.findOne({
			user: session.user.id,
			grocery: groceryId,
		});

		if (existingReview) {
			return NextResponse.json(
				{
					success: false,
					message: "You have already reviewed this product. Please edit your existing review.",
				},
				{ status: 400 }
			);
		}

		// Create review
		const review = await Review.create({
			user: session.user.id,
			grocery: groceryId,
			rating: Number(rating),
			comment: comment.trim(),
		});

		const populatedReview = await Review.findById(review._id).populate(
			"user",
			"name email image"
		);

		return NextResponse.json({
			success: true,
			data: populatedReview,
			message: "Review submitted successfully",
		});
	} catch (error: any) {
		console.error("Create review error:", error);
		return NextResponse.json(
			{ success: false, message: error.message || "Failed to create review" },
			{ status: 500 }
		);
	}
}
