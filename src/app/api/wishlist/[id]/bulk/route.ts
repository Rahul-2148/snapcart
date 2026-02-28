import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Wishlist } from "@/models/wishlist.model";

// Bulk remove items from a collection
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		if (!mongoose.Types.ObjectId.isValid(id))
			return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 });

		await connectDb();
		const session = await auth();
		if (!session?.user?.id)
			return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

		const { action, groceryIds, targetCollectionId } = await req.json();

		if (action === "remove") {
			const collection = await Wishlist.findOneAndUpdate(
				{ _id: id, user: session.user.id },
				{ $pull: { items: { grocery: { $in: groceryIds || [] } } } },
				{ new: true }
			).populate({ path: "items.grocery", select: "name images category" });

			if (!collection)
				return NextResponse.json({ success: false, message: "Collection not found" }, { status: 404 });

			return NextResponse.json({ success: true, collection });
		}

		if (action === "move") {
			if (!targetCollectionId || !mongoose.Types.ObjectId.isValid(targetCollectionId))
				return NextResponse.json({ success: false, message: "Target collection required" }, { status: 400 });

			// Remove from source
			const source = await Wishlist.findOneAndUpdate(
				{ _id: id, user: session.user.id },
				{ $pull: { items: { grocery: { $in: groceryIds || [] } } } },
				{ new: true }
			);

			if (!source)
				return NextResponse.json({ success: false, message: "Source collection not found" }, { status: 404 });

			// Add to target
			const target = await Wishlist.findOneAndUpdate(
				{ _id: targetCollectionId, user: session.user.id },
				{ $push: { items: { $each: (groceryIds || []).map((g: string) => ({ grocery: g, addedAt: new Date() })) } } },
				{ new: true }
			).populate({ path: "items.grocery", select: "name images category" });

			if (!target)
				return NextResponse.json({ success: false, message: "Target collection not found" }, { status: 404 });

			return NextResponse.json({ success: true, collection: target, sourceCollection: source });
		}

		return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
	} catch (error: any) {
		return NextResponse.json(
			{ success: false, message: error.message || "Failed to update" },
			{ status: 500 }
		);
	}
}
