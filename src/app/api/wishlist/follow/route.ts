import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Wishlist } from "@/models/wishlist.model";
import { WishlistFollow } from "@/models/wishlistFollow.model";
import { getIO } from "@/lib/server/socket";

// Helper to get follow count
async function getFollowCount(wishlistId: string) {
	return await WishlistFollow.countDocuments({ following: wishlistId });
}

// Get all followed collections for current user
export async function GET(req: Request) {
	try {
		await connectDb();
		const session = await auth();
		if (!session?.user?.id)
			return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

				const followed = await WishlistFollow.find({ follower: session.user.id })
						.populate({
								path: "following",
								select: "name slug privacy items user",
								match: { privacy: { $in: ["shared", "public"] } },
								populate: [
									{
										path: "items.grocery",
										select: "images name",
									},
									{
										path: "user",
										select: "name",
									},
								],
						})
						.lean()
						.sort({ followedAt: -1 });

		// Filter out nulls (private wishlists that shouldn't be accessible)
		const validFollows = followed.filter((f: any) => f.following);

		return NextResponse.json({ success: true, followed: validFollows });
	} catch (error: any) {
		return NextResponse.json(
			{ success: false, message: error.message || "Failed to load followed" },
			{ status: 500 }
		);
	}
}

// Follow a public/shared collection
export async function POST(req: Request) {
	try {
		await connectDb();
		const session = await auth();
		if (!session?.user?.id)
			return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

		const { wishlistId } = await req.json();
		if (!wishlistId || !mongoose.Types.ObjectId.isValid(wishlistId))
			return NextResponse.json({ success: false, message: "Invalid wishlist ID" }, { status: 400 });

		// Ensure wishlist exists and is public/shared
		const wishlist = await Wishlist.findById(wishlistId).select("privacy");
		if (!wishlist)
			return NextResponse.json({ success: false, message: "Wishlist not found" }, { status: 404 });
		if (wishlist.privacy === "private")
			return NextResponse.json({ success: false, message: "Not accessible" }, { status: 403 });

		// Create follow relationship
		const follow = await WishlistFollow.create({
			follower: session.user.id,
			following: wishlistId,
		});

		// Get updated follow count
		const followCount = await getFollowCount(wishlistId);

		// Emit socket event for real-time updates
		try {
			const io = getIO();
			if (io) {
				// Emit to socket server which will broadcast to all clients
				io.emit("wishlist:follow", { wishlistId, followCount });
			}
		} catch (socketErr) {
			console.error("Socket emit error:", socketErr);
		}

		return NextResponse.json({ success: true, follow, followCount });
	} catch (error: any) {
		if (error?.code === 11000)
			return NextResponse.json({ success: false, message: "Already following" }, { status: 400 });
		return NextResponse.json(
			{ success: false, message: error.message || "Failed to follow" },
			{ status: 500 }
		);
	}
}

// Unfollow a collection
export async function DELETE(req: Request) {
	try {
		await connectDb();
		const session = await auth();
		if (!session?.user?.id)
			return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

		const { wishlistId } = await req.json();
		if (!wishlistId)
			return NextResponse.json({ success: false, message: "Wishlist ID required" }, { status: 400 });

		const deleted = await WishlistFollow.findOneAndDelete({
			follower: session.user.id,
			following: wishlistId,
		});

		if (!deleted)
			return NextResponse.json({ success: false, message: "Not following" }, { status: 404 });

		// Get updated follow count
		const followCount = await getFollowCount(wishlistId);

		// Emit socket event for real-time updates
		try {
			const io = getIO();
			if (io) {
				// Emit to socket server which will broadcast to all clients
				io.emit("wishlist:unfollow", { wishlistId, followCount });
			}
		} catch (socketErr) {
			console.error("Socket emit error:", socketErr);
		}

		return NextResponse.json({ success: true, followCount });
	} catch (error: any) {
		return NextResponse.json(
			{ success: false, message: error.message || "Failed to unfollow" },
			{ status: 500 }
		);
	}
}
