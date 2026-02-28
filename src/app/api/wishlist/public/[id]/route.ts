import { NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Wishlist } from "@/models/wishlist.model";
import { WishlistFollow } from "@/models/wishlistFollow.model";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDb();

    // Support both slug and ObjectId
    const query = id.length === 24 ? { _id: id } : { slug: id };

    const collection = await Wishlist.findOne(query)
      .populate({ path: "items.grocery", select: "name images category" })
      .lean();

    if (!collection)
      return NextResponse.json({ success: false, message: "Collection not found" }, { status: 404 });

    if (collection.privacy === "private")
      return NextResponse.json({ success: false, message: "Not accessible" }, { status: 403 });

    // Get follow count
    const followCount = await WishlistFollow.countDocuments({ following: collection._id });

    return NextResponse.json({ success: true, collection: { ...collection, followCount } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch" },
      { status: 500 },
    );
  }
}
