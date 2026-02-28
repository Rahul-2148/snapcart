"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Globe2,
  Link2,
  Lock,
  Share2,
  Trash2,
  Pencil,
  Heart,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import EditWishlistModal from "@/components/EditWishlistModal";
import Navbar from "@/components/Navbar";
import axios from "axios";
import { IUser } from "@/models/user.model";
import { useSocket } from "@/contexts/SocketContext";

type CollectionPrivacy = "private" | "shared" | "public";

type Collection = {
  _id: string;
  name: string;
  slug?: string;
  privacy?: CollectionPrivacy;
  items?: { grocery: string }[];
  updatedAt?: string;
  itemsCount?: number;
  previewImages?: string[];
  user?: { _id: string; name: string };
  followCount?: number;
};

type FollowedCollection = {
  _id?: string;
  following: Collection & { user?: string };
  followedAt?: string;
};

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

export default function WishlistsPage() {
  const socket = useSocket();
  const [tab, setTab] = useState<"my" | "follow" | "explore">("my");
  const [explore, setExplore] = useState<Collection[]>([]);
  const [exploreLoading, setExploreLoading] = useState(false);
  // Load public wishlists for Explore tab
  useEffect(() => {
    if (tab !== "explore") return;
    setExploreLoading(true);
    fetch("/api/wishlist/explore", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setExplore(data.collections || []))
      .catch(() => setExplore([]))
      .finally(() => setExploreLoading(false));
  }, [tab]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [followed, setFollowed] = useState<FollowedCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null);
  const [user, setUser] = useState<IUser | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/wishlist", { cache: "no-store" });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Failed to load");
      setCollections(data.collections || []);
    } catch (err: any) {
      toast.error(err?.message || "Unable to load wishlists");
    } finally {
      setLoading(false);
    }
  };

  const loadFollowed = async () => {
    try {
      const res = await fetch("/api/wishlist/follow", { cache: "no-store" });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Failed to load");
      setFollowed(data.followed || []);
    } catch (err: any) {
      toast.error(err?.message || "Unable to load followed");
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
    load();
    loadFollowed();
  }, []);

  // Listen for real-time follow count updates on followed collections
  useEffect(() => {
    if (!socket) return;

    const handleWishlistFollow = (data: any) => {
      const { wishlistId, followCount } = data;
      // Update followed collections with new follow count
      setFollowed((prev) =>
        prev.map((f) =>
          f.following?._id === wishlistId
            ? { ...f, following: { ...f.following, followCount } }
            : f,
        ),
      );
    };

    socket.on("wishlist:follow", handleWishlistFollow);
    socket.on("wishlist:unfollow", handleWishlistFollow);

    return () => {
      socket.off("wishlist:follow", handleWishlistFollow);
      socket.off("wishlist:unfollow", handleWishlistFollow);
    };
  }, [socket]);

  const copyShareLink = async (c: Collection) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${base}/user/wishlists/public/${c.slug || c._id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied");
  };

  const handleEditCollection = (c: Collection) => {
    setSelectedCollection(c);
    setEditOpen(true);
  };

  const handleSaveEdit = async (name: string, privacy: CollectionPrivacy) => {
    if (!selectedCollection) return;
    try {
      const res = await fetch(`/api/wishlist/${selectedCollection._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, privacy }),
      });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Failed to update");
      setCollections((prev) =>
        prev.map((x) =>
          x._id === selectedCollection._id ? { ...x, name, privacy } : x,
        ),
      );
      toast.success("Collection updated");
    } catch (err: any) {
      throw err;
    }
  };

  const deleteCollection = async (c: Collection) => {
    try {
      const res = await fetch(`/api/wishlist/${c._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data?.success) throw new Error(data?.message || "Failed to delete");
      setCollections((prev) => prev.filter((x) => x._id !== c._id));
      toast.success("Deleted");
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    }
  };

  const handleUnfollow = async (followId?: string) => {
    if (!followId) return;
    try {
      const follow = followed.find((f) => f._id === followId);
      if (!follow) return;

      const res = await fetch("/api/wishlist/follow", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wishlistId: follow.following._id }),
      });
      const data = await res.json();
      if (!data?.success)
        throw new Error(data?.message || "Failed to unfollow");
      setFollowed((prev) => prev.filter((x) => x._id !== followId));
      toast.success("Unfollowed");
    } catch (err: any) {
      toast.error(err?.message || "Unfollow failed");
    }
  };

  const renderExploreCard = (c: Collection) => (
    <Link
      key={c._id}
      href={`/user/wishlists/public/${c.slug || c._id}`}
      className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow transition flex flex-col"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-emerald-700 font-semibold">{c.name}</span>
        {c.user?.name && (
          <span className="ml-2 text-xs text-gray-500">by {c.user.name}</span>
        )}
        <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
          <Heart className="w-4 h-4 text-rose-500" />
          {c.followCount || 0}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1 mb-2">
        {(c.previewImages || []).slice(0, 5).map((src, idx) => (
          <div
            key={idx}
            className="relative h-10 w-full rounded bg-gray-50 overflow-hidden"
          >
            {src ? (
              <Image
                src={src}
                alt="Preview"
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <div className="w-full h-full bg-gray-200" />
            )}
          </div>
        ))}
        {(c.itemsCount ?? 0) > 5 && (
          <div className="relative h-10 w-full rounded bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-700">
            + {(c.itemsCount ?? 0) - 5} more
          </div>
        )}
      </div>
      <span className="text-xs text-gray-500">{c.itemsCount || 0} items</span>
    </Link>
  );

  const renderCollectionCard = (
    c: Collection,
    showUnfollow = false,
    followId?: string,
  ) => {
    const privacyKey: CollectionPrivacy = c.privacy ?? "private";
    const MetaIcon = privacyMeta[privacyKey].icon;
    const tone = privacyMeta[privacyKey].tone;
    // If items are populated, use grocery images for previewImages
    let previewImages: string[] = c.previewImages || [];
    let ownerName: string | undefined = c.user?.name;
    if (
      showUnfollow &&
      Array.isArray(c.items) &&
      c.items.length > 0 &&
      (c as any).items[0].grocery &&
      (c as any).items[0].grocery.images
    ) {
      previewImages = (c.items as any[])
        .slice(0, 5)
        .map((item: any) => item.grocery.images?.[0]?.url || null)
        .filter(Boolean);
      // Try to get owner name from populated user field if available
      if (
        (c as any).user &&
        typeof (c as any).user === "object" &&
        (c as any).user.name
      ) {
        ownerName = (c as any).user.name;
      }
    }
    if (showUnfollow) {
      // Custom layout for Following tab
      return (
        <div key={c._id} className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-semibold text-gray-900 mb-2">{c.name}</p>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${tone}`}
                >
                  <MetaIcon className="w-3 h-3" />{" "}
                  {privacyMeta[privacyKey].label}
                </span>
                <div className="flex flex-col ml-2">
                  {ownerName && (
                    <span className="text-xs text-gray-500 font-normal">
                      by {ownerName}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {c.itemsCount ??
                      (Array.isArray(c.items) ? c.items.length : 0)}{" "}
                    items
                  </span>
                </div>
              </div>
              {c.updatedAt && (
                <div className="text-xs text-gray-400">
                  Updated {new Date(c.updatedAt).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyShareLink(c)}
                className="p-2 rounded-md hover:bg-gray-100"
                title="Copy share link"
              >
                <Link2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleUnfollow(followId)}
                className="p-2 rounded-md hover:bg-gray-100"
                title="Unfollow"
              >
                <Heart className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* Thumbnails row */}
          <div className="mt-3 grid grid-cols-5 gap-2">
            {previewImages.length > 0 ? (
              previewImages.slice(0, 5).map((src, idx) => (
                <div
                  key={`${c._id}-prev-${idx}`}
                  className="relative h-14 w-full rounded-md overflow-hidden bg-gray-50 border"
                >
                  <Image
                    src={src}
                    alt="Preview"
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
              ))
            ) : (
              <div className="col-span-5 text-xs text-gray-500">
                No previews yet — add items to see thumbnails.
              </div>
            )}
            {(c.itemsCount ?? (Array.isArray(c.items) ? c.items.length : 0)) >
              5 && (
              <div className="relative h-14 w-full rounded-md overflow-hidden bg-gray-100 border flex items-center justify-center text-xs font-semibold text-gray-700">
                +{" "}
                {(c.itemsCount ??
                  (Array.isArray(c.items) ? c.items.length : 0)) - 5}{" "}
                more
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Link
              href={`/user/wishlists/${c._id}`}
              className="text-emerald-700 font-semibold"
            >
              Open
            </Link>
            <button
              onClick={() => copyShareLink(c)}
              className="inline-flex items-center gap-1 text-sm text-gray-700"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </div>
      );
    }

    // Default layout for My Collections and Explore
    return (
      <div key={c._id} className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{c.name}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${tone}`}
              >
                <MetaIcon className="w-3 h-3" /> {privacyMeta[privacyKey].label}
              </span>
              {ownerName && (
                <span className="ml-2 text-gray-400">by {ownerName}</span>
              )}
              <span>
                {c.itemsCount ?? (Array.isArray(c.items) ? c.items.length : 0)}{" "}
                items
              </span>
              {c.updatedAt && (
                <span>
                  Updated {new Date(c.updatedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => copyShareLink(c)}
              className="p-2 rounded-md hover:bg-gray-100"
              title="Copy share link"
            >
              <Link2 className="w-4 h-4" />
            </button>
            {!showUnfollow && (
              <button
                onClick={() => handleEditCollection(c)}
                className="p-2 rounded-md hover:bg-gray-100"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() =>
                showUnfollow ? handleUnfollow(followId) : deleteCollection(c)
              }
              className="p-2 rounded-md hover:bg-gray-100"
              title={showUnfollow ? "Unfollow" : "Delete"}
            >
              {showUnfollow ? (
                <Heart className="w-4 h-4" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Thumbnails row */}
        <div className="mt-3 grid grid-cols-5 gap-2">
          {previewImages.length > 0 ? (
            previewImages.slice(0, 5).map((src, idx) => (
              <div
                key={`${c._id}-prev-${idx}`}
                className="relative h-14 w-full rounded-md overflow-hidden bg-gray-50 border"
              >
                <Image
                  src={src}
                  alt="Preview"
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
            ))
          ) : (
            <div className="col-span-5 text-xs text-gray-500">
              No previews yet — add items to see thumbnails.
            </div>
          )}
          {(c.itemsCount ?? (Array.isArray(c.items) ? c.items.length : 0)) >
            5 && (
            <div className="relative h-14 w-full rounded-md overflow-hidden bg-gray-100 border flex items-center justify-center text-xs font-semibold text-gray-700">
              +{" "}
              {(c.itemsCount ?? (Array.isArray(c.items) ? c.items.length : 0)) -
                5}{" "}
              more
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <Link
            href={`/user/wishlists/${c._id}`}
            className="text-emerald-700 font-semibold"
          >
            Open
          </Link>
          <button
            onClick={() => copyShareLink(c)}
            className="inline-flex items-center gap-1 text-sm text-gray-700"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Navbar user={user} />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-2">Wishlist & Collections</h1>
        <p className="text-sm text-gray-600 mb-6">
          Make collections{" "}
          <span className="font-semibold text-blue-600">shared</span> or{" "}
          <span className="font-semibold text-emerald-600">public</span> to
          share with friends. They can follow your public collections.
        </p>

        {/* Tabs */}
        <div className="flex items-center gap-4 mb-6 border-b">
          <button
            onClick={() => setTab("my")}
            className={`pb-3 font-semibold transition flex items-center gap-2 ${
              tab === "my"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Heart className="w-4 h-4" /> My Collections
          </button>
          <button
            onClick={() => setTab("follow")}
            className={`pb-3 font-semibold transition flex items-center gap-2 ${
              tab === "follow"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Users className="w-4 h-4" /> Following ({followed.length})
          </button>
          <button
            onClick={() => setTab("explore")}
            className={`pb-3 font-semibold transition flex items-center gap-2 ${
              tab === "explore"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Globe2 className="w-4 h-4" /> Explore Public
          </button>
        </div>

        {/* My Collections Tab */}
        {tab === "my" && (
          <>
            {loading && <p className="text-sm text-gray-500">Loading…</p>}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map((c) => renderCollectionCard(c))}
            </div>
            {collections.length === 0 && !loading && (
              <div className="rounded-2xl border bg-gray-50 p-6 mt-4 text-center text-gray-600">
                No collections yet. Save items using the heart button.
              </div>
            )}
          </>
        )}

        {/* Following Tab */}
        {tab === "follow" && (
          <>
            {loading && <p className="text-sm text-gray-500">Loading…</p>}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {followed.map((f) =>
                renderCollectionCard(f.following, true, f._id),
              )}
            </div>
            {followed.length === 0 && !loading && (
              <div className="rounded-2xl border bg-gray-50 p-6 mt-4 text-center text-gray-600">
                Not following any collections yet. Browse shared wishlists to
                start following.
              </div>
            )}
          </>
        )}

        {/* Explore Public Wishlists Tab */}
        {tab === "explore" && (
          <>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-emerald-600" /> Explore Public
              Wishlists
            </h2>
            {exploreLoading && <p className="text-gray-500">Loading…</p>}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {explore.map((c) => renderExploreCard(c))}
            </div>
            {explore.length === 0 && !exploreLoading && (
              <div className="rounded-2xl border bg-gray-50 p-6 mt-4 text-center text-gray-600">
                No public wishlists yet.
              </div>
            )}
          </>
        )}

        {/* Edit Modal */}
        <EditWishlistModal
          isOpen={editOpen}
          onClose={() => {
            setEditOpen(false);
            setSelectedCollection(null);
          }}
          collection={
            selectedCollection
              ? {
                  ...selectedCollection,
                  privacy: selectedCollection.privacy ?? "private",
                }
              : null
          }
          onSave={handleSaveEdit}
        />
      </div>
    </>
  );
}
