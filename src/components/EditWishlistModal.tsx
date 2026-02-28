"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Share2, Globe2 } from "lucide-react";
import { toast } from "sonner";

type CollectionPrivacy = "private" | "shared" | "public";

interface EditWishlistModalProps {
	isOpen: boolean;
	onClose: () => void;
	collection?: {
		_id: string;
		name: string;
		privacy: CollectionPrivacy;
	} | null;
	onSave?: (name: string, privacy: CollectionPrivacy) => Promise<void>;
}

const privacyMeta: Record<CollectionPrivacy, { label: string; icon: any; desc: string }> = {
	private: { label: "Private", icon: Lock, desc: "Only you can see this" },
	shared: { label: "Shared", icon: Share2, desc: "Shareable via link" },
	public: { label: "Public", icon: Globe2, desc: "Anyone can discover" },
};

const EditWishlistModal = ({ isOpen, onClose, collection, onSave }: EditWishlistModalProps) => {
	const [name, setName] = useState("");
	const [privacy, setPrivacy] = useState<CollectionPrivacy>("private");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (collection) {
			setName(collection.name);
			setPrivacy(collection.privacy);
		}
	}, [collection, isOpen]);

	const handleSave = async () => {
		if (!name.trim()) {
			toast.error("Name is required");
			return;
		}
		try {
			setSaving(true);
			await onSave?.(name.trim(), privacy);
			onClose();
		} catch (err: any) {
			toast.error(err?.message || "Failed to save");
		} finally {
			setSaving(false);
		}
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 0.4 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black z-40"
						onClick={onClose}
					/>
					<motion.div
						initial={{ scale: 0.9, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.9, opacity: 0 }}
						className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-3xl bg-white shadow-2xl p-6"
					>
						<div className="flex items-center justify-between mb-6">
							<h2 className="text-2xl font-bold text-gray-900">Edit Collection</h2>
							<button
								onClick={onClose}
								className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
								aria-label="Close"
							>
								<X className="w-5 h-5" />
							</button>
						</div>

						<div className="space-y-4">
							{/* Name Input */}
							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-2">
									Collection Name
								</label>
								<input
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="e.g., Summer Fit, Gadgets…"
									className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
								/>
							</div>

							{/* Privacy Selection */}
							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-3">
									Who can see this?
								</label>
								<div className="space-y-2">
									{(Object.keys(privacyMeta) as CollectionPrivacy[]).map((key) => {
										const meta = privacyMeta[key];
										const Icon = meta.icon;
										const isActive = privacy === key;
										return (
											<button
												key={key}
												onClick={() => setPrivacy(key)}
												className={`w-full flex items-start gap-3 rounded-2xl p-3 border-2 transition ${
													isActive
														? "border-emerald-500 bg-emerald-50"
														: "border-gray-200 bg-white hover:border-emerald-200"
												}`}
											>
												<Icon
													className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
														isActive ? "text-emerald-600" : "text-gray-400"
													}`}
												/>
												<div className="text-left">
													<p className={`font-semibold ${isActive ? "text-emerald-900" : "text-gray-900"}`}>
														{meta.label}
													</p>
													<p className="text-xs text-gray-600">{meta.desc}</p>
												</div>
											</button>
										);
									})}
								</div>
							</div>

							{/* Action Buttons */}
							<div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
								<button
									onClick={onClose}
									className="px-4 py-2 rounded-xl text-gray-700 font-semibold hover:bg-gray-100"
								>
									Cancel
								</button>
								<button
									onClick={handleSave}
									disabled={saving}
									className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
								>
									{saving ? "Saving…" : "Save"}
								</button>
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
};

export default EditWishlistModal;
