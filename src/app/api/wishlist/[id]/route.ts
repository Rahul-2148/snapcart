import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Wishlist } from "@/models/wishlist.model";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		if (!mongoose.Types.ObjectId.isValid(id))
			return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 });

		await connectDb();
		const session = await auth();
		if (!session?.user?.id)
			return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

		const collection = await Wishlist.findOne({ _id: id, user: session.user.id })
			.populate({
				path: "items.grocery",
				select: "name images category",
			})
			.lean();

		if (!collection)
			return NextResponse.json({ success: false, message: "Collection not found" }, { status: 404 });

		return NextResponse.json({ success: true, collection });
	} catch (error: any) {
		return NextResponse.json(
			{ success: false, message: error.message || "Failed to fetch" },
			{ status: 500 }
		);
	}
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		if (!mongoose.Types.ObjectId.isValid(id))
			return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 });

		await connectDb();
		const session = await auth();
		if (!session?.user?.id)
			return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

		const { name, privacy } = await req.json();
		const update: any = {};
		if (typeof name === "string" && name.trim()) update.name = name.trim();
		if (privacy && ["private", "shared", "public"].includes(privacy)) update.privacy = privacy;

		const collection = await Wishlist.findOneAndUpdate(
			{ _id: id, user: session.user.id },
			{ $set: update },
			{ new: true }
		);

		if (!collection)
			return NextResponse.json({ success: false, message: "Collection not found" }, { status: 404 });

		return NextResponse.json({ success: true, collection });
	} catch (error: any) {
		const message = error?.code === 11000 ? "Collection name already exists" : error.message;
		return NextResponse.json({ success: false, message: message || "Failed to update" }, { status: 500 });
	}
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		if (!mongoose.Types.ObjectId.isValid(id))
			return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 });

		await connectDb();
		const session = await auth();
		if (!session?.user?.id)
			return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

		const deleted = await Wishlist.findOneAndDelete({ _id: id, user: session.user.id });
		if (!deleted)
			return NextResponse.json({ success: false, message: "Collection not found" }, { status: 404 });

		return NextResponse.json({ success: true, message: "Deleted" });
	} catch (error: any) {
		return NextResponse.json(
			{ success: false, message: error.message || "Failed to delete" },
			{ status: 500 }
		);
	}
}
