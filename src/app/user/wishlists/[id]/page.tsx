"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Link2, ShieldCheck, Trash2, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import axios from "axios";
import { IUser } from "@/models/user.model";

type GroceryItem = {
	_id: string;
	name: string;
	brand?: string;
	images?: Array<{ url: string }>;
	category?: { name: string };
};

type WishlistItem = {
	_id?: string;
	grocery: GroceryItem;
	addedAt?: string;
};

const ITEMS_PER_PAGE = 12;

export default function WishlistDetailPage() {
	const params = useParams<{ id: string }>();
	const id = params?.id;
	const [collection, setCollection] = useState<any>(null);
	const [loading, setLoading] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [currentPage, setCurrentPage] = useState(1);
	const [otherCollections, setOtherCollections] = useState<any[]>([]);
	const [moving, setMoving] = useState(false);
	const [hoveredItem, setHoveredItem] = useState<string | null>(null);
	const [user, setUser] = useState<IUser | null>(null);

	const load = async () => {
		try {
			setLoading(true);
			const res = await fetch(`/api/wishlist/${id}`, { cache: "no-store" });
			const data = await res.json();
			if (!data?.success) throw new Error(data?.message || "Failed to load");
			setCollection(data.collection);

			// Load other collections for move action
			const res2 = await fetch("/api/wishlist", { cache: "no-store" });
			const data2 = await res2.json();
			setOtherCollections((data2.collections || []).filter((c: any) => c._id !== id) || []);
		} catch (err: any) {
			toast.error(err?.message || "Unable to load wishlist");
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
				console.error("Error fetching user:", error);
			}
		};
		fetchUser();
		if (id) load();
	}, [id]);

	const copyShareLink = async () => {
		const base = typeof window !== "undefined" ? window.location.origin : "";
		const url = `${base}/user/wishlists/public/${collection?.slug || collection?._id}`;
		await navigator.clipboard.writeText(url);
		toast.success("Share link copied");
	};

	const toggleSelect = (itemId: string) => {
		const newSelected = new Set(selected);
		if (newSelected.has(itemId)) {
			newSelected.delete(itemId);
		} else {
			newSelected.add(itemId);
		}
		setSelected(newSelected);
	};

	const toggleSelectAll = () => {
		if (selected.size === items.length) {
			setSelected(new Set());
		} else {
			setSelected(new Set(items.map((item) => item.grocery._id)));
		}
	};

	const handleBulkRemove = async () => {
		if (selected.size === 0) {
			toast.error("Select items to remove");
			return;
		}
		try {
			const res = await fetch(`/api/wishlist/${id}/bulk`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "remove",
					groceryIds: Array.from(selected),
				}),
			});
			const data = await res.json();
			if (!data?.success) throw new Error(data?.message || "Failed to remove");
			setCollection(data.collection);
			setSelected(new Set());
			toast.success(`Removed ${selected.size} item${selected.size > 1 ? "s" : ""}`);
		} catch (err: any) {
			toast.error(err?.message || "Remove failed");
		}
	};

	const handleBulkMove = async (targetId: string) => {
		if (selected.size === 0) {
			toast.error("Select items to move");
			return;
		}
		try {
			setMoving(true);
			const res = await fetch(`/api/wishlist/${id}/bulk`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "move",
					groceryIds: Array.from(selected),
					targetCollectionId: targetId,
				}),
			});
			const data = await res.json();
			if (!data?.success) throw new Error(data?.message || "Failed to move");
			setCollection(data.collection);
			setSelected(new Set());
			toast.success(`Moved ${selected.size} item${selected.size > 1 ? "s" : ""}`);
		} catch (err: any) {
			toast.error(err?.message || "Move failed");
		} finally {
			setMoving(false);
		}
	};

	if (loading)
		return (
			<>
				<Navbar user={user} />
				<div className="max-w-6xl mx-auto px-4 py-6 text-sm text-gray-500">Loading…</div>
			</>
		);
	if (!collection)
		return (
			<>
				<Navbar user={user} />
				<div className="max-w-6xl mx-auto px-4 py-6">Not found</div>
			</>
		);

	const items = (collection.items || []) as WishlistItem[];
	const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
	const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
	const paginatedItems = items.slice(startIdx, startIdx + ITEMS_PER_PAGE);

	return (
		<>
			<Navbar user={user} />
			<div className="max-w-6xl mx-auto px-4 py-6">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold">{collection.name}</h1>
					<p className="text-sm text-gray-500">
						{items.length} items {items.length > ITEMS_PER_PAGE && `• Page ${currentPage} of ${totalPages}`}
					</p>
				</div>
				<button
					onClick={copyShareLink}
					className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
				>
					<Link2 className="w-4 h-4" /> Copy share link
				</button>
			</div>

			{/* Multi-select toolbar */}
			{selected.size > 0 && (
				<div className="mb-4 flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
					<div className="flex items-center gap-3">
						<input
							type="checkbox"
							checked={selected.size === paginatedItems.length}
							onChange={toggleSelectAll}
							className="h-5 w-5 rounded border-gray-300 text-emerald-600"
						/>
						<span className="font-semibold text-emerald-900">
							{selected.size} selected
						</span>
					</div>
					<div className="flex items-center gap-2">
						{otherCollections.length > 0 && (
							<div className="flex items-center gap-2">
								<label className="text-sm font-semibold text-gray-700">Move to:</label>
								<select
									onChange={(e) => {
										if (e.target.value) handleBulkMove(e.target.value);
										e.target.value = "";
									}}
									disabled={moving}
									className="rounded-lg border border-gray-300 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
								>
									<option value="">Select collection…</option>
									{otherCollections.map((c) => (
										<option key={c._id} value={c._id}>
											{c.name}
										</option>
									))}
								</select>
							</div>
						)}
						<button
							onClick={handleBulkRemove}
							className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
						>
							<Trash2 className="w-4 h-4" /> Remove
						</button>
					</div>
				</div>
			)}

			{/* Items Grid */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
				{paginatedItems.map((item) => {
					const g = item?.grocery;
					const isSelected = selected.has(g._id);
					return (
						<div
							key={g._id}
							className="rounded-2xl border bg-white p-3 shadow-sm hover:shadow transition"
							onMouseEnter={() => setHoveredItem(g._id)}
							onMouseLeave={() => setHoveredItem(null)}
						>
							{/* Checkbox & Image */}
							<div className="relative h-40 w-full rounded-xl overflow-hidden bg-gray-50">
								<input
									type="checkbox"
									checked={isSelected}
									onChange={() => toggleSelect(g._id)}
									className="absolute top-2 left-2 z-10 h-5 w-5 rounded border-gray-300 text-emerald-600"
								/>
								{g?.images?.[0]?.url && (
									<Image
										src={g.images[0].url}
										alt={g?.name || "Product"}
										fill
										className="object-cover"
									/>
								)}
								{/* Tooltip on hover */}
								{hoveredItem === g._id && (
									<div className="absolute inset-0 bg-black/40 flex items-end p-2 z-5">
										<div className="text-white text-xs">
											<p className="font-semibold">{g?.name}</p>
											{g?.brand && <p className="text-gray-100">{g.brand}</p>}
										</div>
									</div>
								)}
							</div>

							{/* Product Info */}
							<Link
								href={`/user/product-details/${g?._id}`}
								className="block mt-2 text-sm font-semibold text-gray-900 line-clamp-2 hover:text-emerald-600"
							>
								{g?.name}
							</Link>
							<p className="text-xs text-gray-500">{g?.category?.name}</p>
							<div className="mt-2 inline-flex items-center gap-2 text-xs text-emerald-700">
								<ShieldCheck className="w-4 h-4" /> Curated
							</div>
						</div>
					);
				})}
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-center gap-2 mb-6">
					<button
						onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
						disabled={currentPage === 1}
						className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
					>
						<ChevronLeft className="w-4 h-4" />
					</button>
					{Array.from({ length: totalPages }).map((_, i) => (
						<button
							key={i + 1}
							onClick={() => setCurrentPage(i + 1)}
							className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${
								currentPage === i + 1
									? "bg-emerald-600 text-white"
									: "border hover:bg-gray-50"
							}`}
						>
							{i + 1}
						</button>
					))}
					<button
						onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
						disabled={currentPage === totalPages}
						className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50"
					>
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>
			)}

			{items.length === 0 && (
				<div className="rounded-2xl border bg-gray-50 p-6 mt-4 text-center text-gray-600">
					No items yet. Use the heart button on product pages to add.
				</div>
			)}
			</div>
		</>
	);
}
