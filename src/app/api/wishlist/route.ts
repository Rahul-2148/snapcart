import { NextResponse } from "next/server";
import { auth } from "@/auth";
import connectDb from "@/lib/server/db";
import { Wishlist } from "@/models/wishlist.model";
import { Grocery } from "@/models/grocery.model";

export async function GET() {
	try {
		await connectDb();
		const session = await auth();
		if (!session?.user?.id)
			return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

		const collections = await Wishlist.find({ user: session.user.id })
			.sort({ updatedAt: -1 })
			.lean();

		// Attach lightweight preview images and item counts for index UI
		const collectionsWithPreview = await Promise.all(
			(collections || []).map(async (c: any) => {
				const previewIds: string[] = (c.items || [])
					.slice(0, 5)
					.map((it: any) => it?.grocery)
					.filter(Boolean);

				let previewImages: string[] = [];
				if (previewIds.length) {
					const groceries = await Grocery.find(
						{ _id: { $in: previewIds } },
						{ images: 1 },
					)
						.lean();
					previewImages = (groceries || [])
						.map((g: any) => g?.images?.[0]?.url)
						.filter(Boolean);
				}

				return {
					...c,
					itemsCount: (c.items || []).length,
					previewImages,
				};
			})
		);

		return NextResponse.json({ success: true, collections: collectionsWithPreview });
	} catch (error: any) {
		return NextResponse.json(
			{ success: false, message: error.message || "Failed to load wishlists" },
			{ status: 500 }
		);
	}
}

export async function POST(req: Request) {
	try {
		await connectDb();
		const session = await auth();
		if (!session?.user?.id)
			return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

		const { name, privacy = "private" } = await req.json();
		if (!name || typeof name !== "string")
			return NextResponse.json({ success: false, message: "Name is required" }, { status: 400 });

		const collection = await Wishlist.create({
			user: session.user.id,
			name: name.trim(),
			privacy,
			items: [],
		});

		return NextResponse.json({ success: true, collection });
	} catch (error: any) {
		const message = error?.code === 11000 ? "Collection name already exists" : error.message;
		return NextResponse.json({ success: false, message: message || "Failed to create" }, { status: 500 });
	}
}
