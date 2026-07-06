"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ShieldCheck, Heart } from "lucide-react";
import { toast } from "sonner";

import axios from "axios";
import { IUser } from "@/models/user.model";
import { useSocket } from "@/contexts/SocketContext";

export default function PublicWishlistPage() {
	const params = useParams<{ id: string }>();
	const id = params?.id;
	const socket = useSocket();
	const [collection, setCollection] = useState<any>(null);
	const [loading, setLoading] = useState(false);
	const [isFollowing, setIsFollowing] = useState(false);
	const [followLoading, setFollowLoading] = useState(false);
	const [user, setUser] = useState<IUser | null>(null);
	const [followCount, setFollowCount] = useState(0);

	const load = async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/wishlist/public/${id}`, { cache: "no-store" });
			const data = await res.json();
			if (!data?.success) throw new Error(data?.message || "Not accessible");
			setCollection(data.collection);
			setFollowCount(data.collection?.followCount || 0);

			// Check if already following
			try {
				const followRes = await fetch("/api/wishlist/follow", { cache: "no-store" });
				const followData = await followRes.json();
				if (followData?.success) {
					const alreadyFollowing = (followData.followed || []).some(
						(f: any) => f.following?._id === data.collection._id
					);
					setIsFollowing(alreadyFollowing);
				}
			} catch {
				// Silent fail for follow check
			}
		} catch (err: any) {
			toast.error(err?.message || "Unable to load public wishlist");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		const fetchUser = async () => {
			try {
				const response = await axios.get("/api/me");
				if (response.data?.success) {
					setUser(response.data.user);
				}
			} catch (error) {
				if (axios.isAxiosError(error) && error.response?.status === 401) {
					return;
				}
				console.error("Error fetching user:", error);
			}
		};
		fetchUser();
		if (id) load();
	}, [id]);

	// Listen for real-time follow count updates
	useEffect(() => {
		if (!socket || !id) return;

		const followEventName = `wishlist:follow:${id}`;
		socket.on(followEventName, (data: any) => {
			if (data?.followCount !== undefined) {
				setFollowCount(data.followCount);
			}
		});

		return () => {
			socket.off(followEventName);
		};
	}, [socket, id]);

	const handleToggleFollow = async () => {
		if (!collection?._id) return;
		try {
			setFollowLoading(true);
			const method = isFollowing ? "DELETE" : "POST";
			const res = await fetch("/api/wishlist/follow", {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ wishlistId: collection._id }),
			});
			const data = await res.json();
			if (!data?.success) throw new Error(data?.message || "Failed");
			
			// Update local state
			setIsFollowing(!isFollowing);
			if (data?.followCount !== undefined) {
				setFollowCount(data.followCount);
			}
			
			// Emit socket event for other clients
			if (socket) {
				socket.emit(isFollowing ? "wishlist:unfollow" : "wishlist:follow", {
					wishlistId: collection._id,
					followCount: data?.followCount || followCount,
				});
			}
			
			toast.success(isFollowing ? "Unfollowed" : "Following!");
		} catch (err: any) {
			toast.error(err?.message || "Action failed");
		} finally {
			setFollowLoading(false);
		}
	};

	if (loading)
		return (
			<>
				<div className="max-w-5xl mx-auto px-4 pt-2 pb-6 text-sm text-gray-500">Loading…</div>
			</>
		);
	if (!collection)
		return (
			<>
				<div className="max-w-5xl mx-auto px-4 pt-2 pb-6">Not found or private</div>
			</>
		);

	return (
		<>
			<div className="max-w-6xl mx-auto px-4 pt-2 pb-6">				{/* Info Banner */}
				<div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
					<ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
					<div className="text-sm text-blue-900">
						<p className="font-semibold mb-1">Shared Collection</p>
						<p className="text-blue-700">This is a {collection.privacy} wishlist. You can view all items and follow this collection to get updates.</p>
					</div>
				</div>
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold">{collection.name}</h1>
					<p className="text-sm text-gray-500">{collection.items?.length || 0} items • <span className="text-blue-600 font-semibold">{followCount}</span> {followCount === 1 ? "person following" : "people following"}</p>
				</div>
				<button
					onClick={handleToggleFollow}
					disabled={followLoading}
					className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold transition ${
						isFollowing
							? "border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
							: "bg-emerald-600 text-white hover:bg-emerald-700"
					}`}
				>
					<Heart className={`w-4 h-4 ${isFollowing ? "fill-rose-700" : ""}`} />
					{isFollowing ? "Following" : "Follow"}
				</button>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
				{(collection.items || []).map((item: any) => {
					const g = item?.grocery;
					return (
						<Link
							key={item._id || g?._id}
							href={`/user/product-details/${g?._id}`}
							className="rounded-2xl border bg-white p-3 shadow-sm hover:shadow transition"
						>
							<div className="relative h-40 w-full rounded-xl overflow-hidden bg-gray-50">
								{g?.images?.[0]?.url && (
									<Image
										src={g.images[0].url}
										alt={g?.name || "Product"}
										fill
										className="object-cover"
									/>
								)}
							</div>
							<p className="mt-2 text-sm font-semibold text-gray-900 line-clamp-2">
								{g?.name}
							</p>
							<p className="text-xs text-gray-500">{g?.category?.name}</p>
							<div className="mt-2 inline-flex items-center gap-2 text-xs text-emerald-700">
								<ShieldCheck className="w-4 h-4" /> Curated
							</div>
						</Link>
					);
				})}
			</div>

			{(collection.items || []).length === 0 && (
				<div className="rounded-2xl border bg-gray-50 p-6 mt-4 text-center text-gray-600">
					No items yet.
				</div>
			)}
			</div>
		</>
	);
}
