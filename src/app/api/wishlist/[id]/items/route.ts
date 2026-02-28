import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Wishlist } from "@/models/wishlist.model";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		if (!mongoose.Types.ObjectId.isValid(id))
			return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 });

		const { groceryId } = await req.json();
		if (!groceryId || !mongoose.Types.ObjectId.isValid(groceryId))
			return NextResponse.json({ success: false, message: "Invalid grocery" }, { status: 400 });

		await connectDb();
		const session = await auth();
		if (!session?.user?.id)
			return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

		const collection = await Wishlist.findOne({ _id: id, user: session.user.id });
		if (!collection)
			return NextResponse.json({ success: false, message: "Collection not found" }, { status: 404 });

		const exists = collection.items.some((i) => i.grocery.toString() === groceryId);
		collection.items = exists
			? collection.items.filter((i) => i.grocery.toString() !== groceryId)
			: [...collection.items, { grocery: groceryId, addedAt: new Date() }];
		collection.updatedAt = new Date();
		await collection.save();

		return NextResponse.json({ success: true, collection, added: !exists });
	} catch (error: any) {
		return NextResponse.json(
			{ success: false, message: error.message || "Failed to toggle item" },
			{ status: 500 }
		);
	}
}
