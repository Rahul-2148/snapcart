import { NextResponse } from "next/server";
import connectDb from "@/lib/server/db";
import { Wishlist } from "@/models/wishlist.model";
import { WishlistFollow } from "@/models/wishlistFollow.model";
import { User } from "@/models/user.model";
import mongoose from "mongoose";
import { Grocery } from "@/models/grocery.model";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDb();
  // Find all public wishlists
  const wishlists = await Wishlist.find({ privacy: "public" })
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  // Get all follow counts in one go
  const ids = wishlists.map((w: any) => w._id);
  const followCounts = await WishlistFollow.aggregate([
    { $match: { wishlist: { $in: ids } } },
    { $group: { _id: "$wishlist", count: { $sum: 1 } } },
  ]);
  const followMap = Object.fromEntries(followCounts.map((f: any) => [f._id.toString(), f.count]));

  // Get user info for wishlists
  const userIds = wishlists.map((w: any) => w.user?.toString()).filter(Boolean);
  const users = await User.find({ _id: { $in: userIds } }, { _id: 1, name: 1 }).lean();
  const userMap = Object.fromEntries(users.map((u: any) => [u._id.toString(), u]));

  // Gather all grocery IDs for preview images
  const allGroceryIds = wishlists.flatMap((w: any) => (w.items || []).slice(0, 5).map((i: any) => i.grocery)).filter(Boolean);
  const groceries = await Grocery.find({ _id: { $in: allGroceryIds } }, { _id: 1, images: 1 }).lean();
  const groceryImageMap = Object.fromEntries(
    groceries.map((g: any) => [g._id.toString(), g.images?.[0]?.url || null])
  );

  // Prepare preview images and counts
  const collections = wishlists.map((w: any) => ({
    _id: w._id,
    name: w.name,
    slug: w.slug,
    previewImages: (w.items || []).slice(0, 5).map((i: any) => groceryImageMap[i.grocery?.toString()] || null),
    itemsCount: (w.items || []).length,
    user: userMap[w.user?.toString()] || null,
    followCount: followMap[w._id.toString()] || 0,
  }));

  return NextResponse.json({ collections });
}
