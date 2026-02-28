"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useConfirmation } from "@/components/common/ConfirmationModal";
import Image from "next/image";
import {
  Trash2,
  Edit,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Leaf,
  Truck,
  ShoppingBag,
  Store,
  Gift,
  Zap,
  Heart,
  Star,
  Package,
  MapPin,
} from "lucide-react";
import { useSocket } from "@/contexts/SocketContext";

interface BannerImage {
  url: string;
  publicId: string;
}

interface Banner {
  _id: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink?: string;
  image: BannerImage;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  icon?: string;
  iconColor?: string;
}

export default function BannerManagement() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);
  const socket = useSocket();
  const { confirm, Modal: ConfirmationModal } = useConfirmation();

  const formatUpdatedLabel = (banner: Banner) => {
    const parseDate = (value?: string | null) => {
      if (!value) return null;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const updated = parseDate(banner.updatedAt);
    const created = parseDate(banner.createdAt);

    // Show updated date only if it truly differs from created date
    if (updated && (!created || updated.getTime() !== created.getTime())) {
      return `Last Updated: ${updated.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })}`;
    }

    return "Not updated yet";
  };

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    buttonText: "",
    buttonLink: "/user/products",
    order: "0",
    icon: "",
    iconColor: "#ffffff",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Available lucide icons for banners
  const ICON_OPTIONS = [
    { name: "Leaf", component: Leaf },
    { name: "Truck", component: Truck },
    { name: "ShoppingBag", component: ShoppingBag },
    { name: "Store", component: Store },
    { name: "Gift", component: Gift },
    { name: "Zap", component: Zap },
    { name: "Heart", component: Heart },
    { name: "Star", component: Star },
    { name: "Package", component: Package },
    { name: "MapPin", component: MapPin },
  ];

  // Fetch banners
  const fetchBanners = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/banners");
      if (response.data.success) {
        setBanners(response.data.banners);
      }
    } catch (error) {
      console.error("Error fetching banners:", error);
      toast.error("Failed to fetch banners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Listen for real-time banner updates via socket
  useEffect(() => {
    if (!socket) return;

    const handleBannerCreated = (data: any) => {
      setBanners((prev) => [...prev, data.banner]);
      toast.success("New banner created");
    };

    const handleBannerUpdated = (data: any) => {
      setBanners((prev) =>
        prev.map((b) => (b._id === data.banner._id ? data.banner : b)),
      );
      toast.success("Banner updated");
    };

    const handleBannerDeleted = (data: any) => {
      setBanners((prev) => prev.filter((b) => b._id !== data.bannerId));
      toast.success("Banner deleted");
    };

    socket.on("banner:created", handleBannerCreated);
    socket.on("banner:updated", handleBannerUpdated);
    socket.on("banner:deleted", handleBannerDeleted);

    return () => {
      socket.off("banner:created", handleBannerCreated);
      socket.off("banner:updated", handleBannerUpdated);
      socket.off("banner:deleted", handleBannerDeleted);
    };
  }, [socket]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      subtitle: "",
      buttonText: "",
      buttonLink: "/user/products",
      order: "0",
      icon: "",
      iconColor: "#ffffff",
    });
    setImageFile(null);
    setPreviewImage(null);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = async (banner: Banner) => {
    setEditingId(banner._id);
    // Normalize icon - remove whitespace and get actual value
    let bannerIcon = banner.icon ? String(banner.icon).trim() : "";
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle,
      buttonText: banner.buttonText,
      buttonLink: banner.buttonLink || "/user/products",
      order: banner.order?.toString() ?? "0",
      icon: bannerIcon,
      iconColor: banner.iconColor || "#ffffff",
    });
    setPreviewImage(banner.image.url);
    setShowForm(true);
    // Scroll to form for quick editing even when scrolled deep in the list
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.subtitle || !formData.buttonText) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!editingId && !imageFile) {
      toast.error("Please select an image for the new banner");
      return;
    }

    try {
      setSubmitting(true);
      const form = new FormData();
      form.append("title", formData.title);
      form.append("subtitle", formData.subtitle);
      form.append("buttonText", formData.buttonText);
      form.append("buttonLink", formData.buttonLink || "/user/products");
      const orderValue = formData.order?.trim() === "" ? "0" : formData.order;
      form.append("order", orderValue);

      form.append("icon", formData.icon || "");
      form.append("iconColor", formData.iconColor || "#ffffff");

      if (imageFile) {
        form.append("image", imageFile);
      }

      const url = editingId ? `/api/banners/${editingId}` : "/api/banners";
      const method = editingId ? "PUT" : "POST";

      const response = await axios({
        method,
        url,
        data: form,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        toast.success(
          editingId
            ? "Banner updated successfully"
            : "Banner created successfully",
        );

        // Emit socket event for real-time updates
        if (socket) {
          if (editingId) {
            socket.emit("banner:update", response.data.banner);
          } else {
            socket.emit("banner:create", response.data.banner);
          }
        }

        fetchBanners();
        resetForm();
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Failed to save banner";
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await confirm({
      title: "Delete Banner",
      message: "Are you sure you want to delete this banner?",
      confirmText: "Delete",
      isDangerous: true,
      onConfirm: async () => {
        try {
          setDeletingId(id);
          const response = await axios.delete(`/api/banners/${id}`);

          if (response.data.success) {
            toast.success("Banner deleted successfully");
            setBanners(banners.filter((b) => b._id !== id));
            if (socket) {
              socket.emit("banner_deleted", id);
            }
          }
        } catch (error: any) {
          const errorMsg = error.response?.data?.message || "Failed to delete banner";
          toast.error(errorMsg);
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Banner Management</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Banner
          </button>
        )}
      </div>

      {/* Form Section */}
      {showForm && (
        <div
          ref={formRef}
          className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
        >
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {editingId ? "Edit Banner" : "Create New Banner"}
            </h2>
            <button
              type="button"
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  maxLength={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Banner title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Button Text *
                </label>
                <input
                  type="text"
                  value={formData.buttonText}
                  onChange={(e) =>
                    setFormData({ ...formData, buttonText: e.target.value })
                  }
                  maxLength={50}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Shop Now"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Button Link
                </label>
                <input
                  type="text"
                  value={formData.buttonLink}
                  onChange={(e) =>
                    setFormData({ ...formData, buttonLink: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., /user/products or /user/products?category=123"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default: /user/products (e.g., /user/products?category=xyz for specific category)
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subtitle *
              </label>
              <textarea
                value={formData.subtitle}
                onChange={(e) =>
                  setFormData({ ...formData, subtitle: e.target.value })
                }
                maxLength={200}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Banner subtitle description"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon (Optional)
                </label>
                {/* Custom input for emoji */}
                <input
                  type="text"
                  maxLength={5}
                  value={formData.icon}
                  onChange={(e) =>
                    setFormData({ ...formData, icon: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-3"
                  placeholder="e.g., 🍎 or custom emoji"
                />
                {/* Icon preview */}
                {formData.icon && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg flex items-center gap-3 border border-gray-200">
                    {(() => {
                      const IconComp = ICON_OPTIONS.find(
                        (opt) => opt.name === formData.icon,
                      )?.component;
                      return IconComp ? (
                        <IconComp
                          className="w-6 h-6"
                          style={{ color: formData.iconColor }}
                        />
                      ) : (
                        <span
                          className="text-2xl"
                          style={{ color: formData.iconColor }}
                        >
                          {formData.icon}
                        </span>
                      );
                    })()}
                    <span className="text-sm font-medium text-gray-700">
                      {ICON_OPTIONS.find((opt) => opt.name === formData.icon)
                        ?.name || "Custom"}
                    </span>
                  </div>
                )}
                {/* Quick preset lucide icons */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: "" })}
                    className={`px-3 py-1 rounded border text-xs transition-all ${
                      !formData.icon
                        ? "bg-gray-200 border-gray-500"
                        : "bg-white border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    None
                  </button>
                  {ICON_OPTIONS.map(({ name, component: IconComponent }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, icon: name });
                      }}
                      className={`p-2 rounded border transition-all ${
                        formData.icon === name
                          ? "bg-green-100 border-green-500"
                          : "bg-white border-gray-300 hover:border-green-300"
                      }`}
                      title={name}
                    >
                      <IconComponent className="w-5 h-5 text-gray-700" />
                    </button>
                  ))}
                </div>

                {/* Icon Color Picker */}
                {formData.icon && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icon Color
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={formData.iconColor}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            iconColor: e.target.value,
                          })
                        }
                        className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.iconColor}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            iconColor: e.target.value,
                          })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order
                </label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) =>
                    setFormData({ ...formData, order: e.target.value })
                  }
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 noSpin"
                  placeholder="Display order"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower number shows earlier in the carousel.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banner Image {!editingId && "*"}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required={!editingId}
              />
            </div>

            {/* Image Preview */}
            {previewImage && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Image Preview
                </p>
                <div className="relative w-full h-44 bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={previewImage}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {editingId ? "Update Banner" : "Create Banner"}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Banners List */}
      <div className="space-y-4">
        {banners.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <p className="text-blue-800">
              No banners created yet. Create your first banner to get started.
            </p>
          </div>
        ) : (
          banners.map((banner) => (
            <div
              key={banner._id}
              className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col md:flex-row gap-4">
                {/* Image */}
                <div className="relative w-full md:w-64 aspect-[16/9] bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={banner.image.url}
                    alt={banner.title}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <span>{banner.title}</span>
                        {(() => {
                          const IconComp = ICON_OPTIONS.find(
                            (opt) => opt.name === banner.icon,
                          )?.component;
                          const iconColor = banner.iconColor || "#6b7280"; // default slate-500
                          if (IconComp) {
                            return (
                              <IconComp
                                className="w-5 h-5"
                                style={{ color: iconColor }}
                              />
                            );
                          }
                          const iconStr = banner.icon;
                          return iconStr ? (
                            <span
                              className="text-base"
                              style={{ color: iconColor }}
                            >
                              {iconStr}
                            </span>
                          ) : null;
                        })()}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {banner.subtitle}
                      </p>
                    </div>
                    <div className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      Order: {banner.order}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                      {banner.buttonText}
                    </span>
                    {banner.isActive && (
                      <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        Active
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-500">
                    {formatUpdatedLabel(banner)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(banner)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit banner"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(banner._id)}
                    disabled={deletingId === banner._id}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete banner"
                  >
                    {deletingId === banner._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Confirmation Modal */}
      {ConfirmationModal}
    </div>
  );
}
