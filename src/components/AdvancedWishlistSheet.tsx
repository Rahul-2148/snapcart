"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Check, Globe2, Link2, Lock, Plus, Share2, X } from "lucide-react";
import { toast } from "sonner";

type CollectionPrivacy = "private" | "shared" | "public";

type ServerCollection = {
  _id: string;
  name: string;
  privacy: CollectionPrivacy;
  items: { grocery: string }[];
  updatedAt?: string;
};

type Collection = ServerCollection & { accent: string };

const privacyMeta: Record<
  CollectionPrivacy,
  { label: string; icon: any; tone: string }
> = {
  private: { label: "Private", icon: Lock, tone: "text-gray-600 bg-gray-100" },
  shared: { label: "Shared", icon: Share2, tone: "text-blue-700 bg-blue-50" },
  public: {
    label: "Public",
    icon: Globe2,
    tone: "text-emerald-700 bg-emerald-50",
  },
};

const accents = [
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-800",
  "bg-purple-100 text-purple-700",
  "bg-sky-100 text-sky-700",
];

const decorate = (data: ServerCollection[]): Collection[] =>
  data.map((c, idx) => ({ ...c, accent: accents[idx % accents.length] }));

interface AdvancedWishlistSheetProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productTitle: string;
  productImage?: string | null;
  onSavedChange?: (saved: boolean) => void;
}

const AdvancedWishlistSheet = ({
  isOpen,
  onClose,
  productId,
  productTitle,
  productImage,
  onSavedChange,
}: AdvancedWishlistSheetProps) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionPrivacy, setNewCollectionPrivacy] =
    useState<CollectionPrivacy>("private");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/wishlist", { cache: "no-store" });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Failed to load");
      setCollections(decorate(data.collections || []));
      onSavedChange?.(
        (data.collections || []).some(
          (c: any) =>
            Array.isArray(c?.items) &&
            c.items.some((i: any) => i.grocery === productId),
        ),
      );
    } catch (err: any) {
      toast.error(err?.message || "Unable to load wishlists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchCollections();
  }, [isOpen]);

  const toggleCollection = async (id: string) => {
    try {
      setTogglingId(id);
      const res = await fetch(`/api/wishlist/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groceryId: productId }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Failed to update");
      setCollections((prev) => {
        const next = prev.map((c) =>
          c._id === id ? { ...c, ...data.collection } : c,
        );
        return decorate(next);
      });
      onSavedChange?.(
        data.collection.items.some((i: any) => i.grocery === productId),
      );
      toast.success(
        data.added ? "Saved to collection" : "Removed from collection",
      );
    } catch (err: any) {
      toast.error(err?.message || "Unable to update wishlist");
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    try {
      setSaving(true);
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCollectionName.trim(),
          privacy: newCollectionPrivacy,
        }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Failed to create");
      setCollections((prev) => decorate([data.collection, ...prev]));
      setNewCollectionName("");
      setNewCollectionPrivacy("private");
      setShowCreate(false);
      toast.success("Collection created");
    } catch (err: any) {
      toast.error(err?.message || "Unable to create collection");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCollectionQuick = async (
    name: string,
    privacy: CollectionPrivacy,
  ): Promise<string | undefined> => {
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, privacy }),
      });
      const data = await res.json();
      if (data?.success) {
        setCollections((prev) => decorate([data.collection, ...prev]));
        return data.collection?._id || undefined;
      }
    } catch (err) {
      console.error(err);
    }
    return undefined;
  };

  const quickSave = async () => {
    let target: string | undefined = collections.find(
      (c) => c.name === "My Wishlist",
    )?._id;
    if (!target) {
      target =
        (await handleCreateCollectionQuick("My Wishlist", "private")) ||
        undefined;
    }
    if (target) toggleCollection(target);
  };

  // ...existing code...

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
            initial={{ y: 400, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 400, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white shadow-2xl"
          >
            <div className="mx-auto w-full max-w-3xl px-5 pt-4 pb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-start gap-3">
                  {productImage && (
                    <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                      <Image
                        src={productImage}
                        alt={productTitle}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-widest text-gray-500">
                      Wishlist
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Save item to…
                    </h3>
                    <p className="text-sm text-gray-500">{productTitle}</p>
                  </div>
                </div>
                <button
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                  onClick={onClose}
                  aria-label="Close wishlist"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {showCreate ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-semibold">
                        {newCollectionName
                          ? newCollectionName[0]?.toUpperCase()
                          : "+"}
                      </div>
                      <input
                        type="text"
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        placeholder="Summer fits, Gadgets, Home setups…"
                        className="flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(Object.keys(privacyMeta) as CollectionPrivacy[]).map(
                        (key) => {
                          const meta = privacyMeta[key];
                          const isActive = newCollectionPrivacy === key;
                          return (
                            <button
                              key={key}
                              onClick={() => setNewCollectionPrivacy(key)}
                              className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border transition ${
                                isActive
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "border-gray-200 text-gray-600"
                              }`}
                            >
                              <meta.icon className="w-4 h-4" /> {meta.label}
                            </button>
                          );
                        },
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setShowCreate(false)}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateCollection}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        <Plus className="w-4 h-4" /> Create
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-emerald-200 bg-white px-4 py-3 text-left text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold">Create a new collection</p>
                      <p className="text-sm text-gray-600">
                        Name it, choose privacy, and save
                      </p>
                    </div>
                  </button>
                )}

                <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2">
                  {loading && (
                    <p className="px-2 text-sm text-gray-500">
                      Loading collections…
                    </p>
                  )}
                  {!loading && collections.length === 0 && (
                    <p className="px-2 text-sm text-gray-500">
                      No collections yet. Create one to save.
                    </p>
                  )}
                  {collections.map((collection) => {
                    const isSelected = collection.items.some(
                      (i) => i.grocery === productId,
                    );
                    const MetaIcon = privacyMeta[collection.privacy].icon;
                    const tone = privacyMeta[collection.privacy].tone;
                    return (
                      <button
                        key={collection._id}
                        onClick={() => toggleCollection(collection._id)}
                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                          isSelected
                            ? "border-emerald-300 bg-emerald-50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-emerald-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 rounded-xl flex items-center justify-center font-semibold ${collection.accent}`}
                          >
                            {collection.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {collection.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${tone}`}
                              >
                                <MetaIcon className="w-3 h-3" />{" "}
                                {privacyMeta[collection.privacy].label}
                              </span>
                              <span>{collection.items.length} items</span>
                              {collection.updatedAt && (
                                <span>
                                  Updated{" "}
                                  {new Date(
                                    collection.updatedAt,
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`h-6 w-6 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-gray-300 text-gray-400"
                          }`}
                        >
                          {togglingId === collection._id ? (
                            <span className="h-4 w-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                          ) : isSelected ? (
                            <Check className="w-4 h-4" />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Link2 className="w-4 h-4" />
                    <span>
                      Share collections with friends when set to Shared/Public
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={quickSave}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-200"
                    >
                      Quick save
                    </button>
                    <button
                      onClick={onClose}
                      className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AdvancedWishlistSheet;
