"use client";

import ProductImageGallery from "@/components/admin/ProductImageGallery";
import { calculateDiscountPercentUI } from "@/lib/client/price";
import axios from "axios";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Edit,
  Loader2,
  Package,
  Star,
  Trash2,
  AlertCircle,
  TrendingUp,
  MessageSquare,
  Users,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Variant {
  _id: string;
  label: string;
  unit: string;
  value: number;
  multiplier?: number;
  price: {
    mrp: number;
    selling: number;
  };
  countInStock: number;
}

interface Review {
  _id: string;
  user: {
    _id: string;
    name: string;
    image?: {
      url: string;
    };
  };
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

interface Grocery {
  _id: string;
  name: string;
  description: string;
  brand: string;
  category: {
    _id: string;
    name: string;
  };
  variants: Variant[];
  images: Array<{
    url: string;
    _id: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const AdminProductDetails = () => {
  const router = useRouter();
  const params = useParams();
  const [id, setId] = useState<string | null>(null);
  const [product, setProduct] = useState<Grocery | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Await params
  useEffect(() => {
    const getParams = async () => {
      const p = await params;
      setId(typeof p.id === "string" ? p.id : null);
    };
    getParams();
  }, [params]);

  // Fetch product data
  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchReviews();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/admin/groceries/${id}`);
      if (response.data.success) {
        setProduct(response.data.grocery);
      } else {
        toast.error("Product not found");
        router.push("/admin/groceries");
      }
    } catch (error) {
      console.error("Failed to fetch product:", error);
      toast.error("Failed to fetch product");
      router.push("/admin/groceries");
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await axios.get(`/api/reviews/${id}`);
      if (response.data.success) {
        setReviews(response.data.data.reviews);
        setAvgRating(response.data.data.averageRating);
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) return;

    try {
      setDeleting(true);
      const response = await axios.delete(`/api/admin/groceries/${id}`);
      if (response.data.success) {
        toast.success("Product deleted successfully");
        router.push("/admin/groceries");
      } else {
        toast.error(response.data.message || "Failed to delete product");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-12 flex flex-col items-center gap-6">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
          <p className="text-gray-600 font-semibold text-lg">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-md">
          <Package className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Product Not Found</h2>
          <p className="text-gray-600 mb-8 text-lg">The product you're looking for doesn't exist.</p>
          <Link
            href="/admin/groceries"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg font-semibold"
          >
            <ArrowLeft className="w-6 h-6" />
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  const activeVariant = product.variants[activeVariantIdx];
  const totalStock = product.variants.reduce((sum, v) => sum + v.countInStock, 0);
  const discountPercent = calculateDiscountPercentUI(activeVariant?.price.mrp, activeVariant?.price.selling);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 bg-white rounded-3xl shadow-xl p-6"
        >
          <div className="flex flex-col gap-4 flex-1">
            <Link
              href="/admin/groceries"
              className="inline-flex items-center gap-2 text-blue-700 font-semibold hover:text-blue-800 transition-colors bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded-xl w-fit"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Products
            </Link>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {product.name}
              </h1>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <span className="inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold">
                  {product.category.name}
                </span>
                <span className="inline-block bg-gray-100 text-gray-800 px-4 py-2 rounded-full text-sm font-semibold">
                  Brand: {product.brand || "Unbranded"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href={`/admin/add-grocery/${product._id}`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg font-semibold"
            >
              <Edit className="w-5 h-5" />
              Edit
            </Link>
            <button
              onClick={handleDeleteProduct}
              disabled={deleting}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 transition-all shadow-lg font-semibold"
            >
              <Trash2 className="w-5 h-5" />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Images */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-1"
          >
            <ProductImageGallery
              images={product.images}
              productName={product.name}
            />
          </motion.div>

          {/* Middle Column - Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Pricing & Rating */}
            <div className="bg-white rounded-3xl shadow-xl p-6">
              <div className="flex items-baseline gap-4 mb-4">
                <span className="text-5xl font-bold text-gray-900">
                  ₹{Math.round(activeVariant?.price.selling || 0)}
                </span>
                <span className="text-2xl text-gray-400 line-through">
                  ₹{Math.round(activeVariant?.price.mrp || 0)}
                </span>
                {discountPercent > 0 && (
                  <span className="bg-green-100 text-green-800 px-4 py-2 rounded-xl font-bold text-lg">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>

              <div className="flex items-center gap-6 mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(avgRating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{avgRating.toFixed(1)}</p>
                    <p className="text-sm text-gray-500">({reviews.length} reviews)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Variants Tabs */}
            {product.variants.length > 0 && (
              <div className="bg-white rounded-3xl shadow-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Variants ({product.variants.length})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {product.variants.map((variant, idx) => (
                    <button
                      key={variant._id}
                      onClick={() => setActiveVariantIdx(idx)}
                      className={`p-4 rounded-xl border-2 transition-all text-center ${
                        activeVariantIdx === idx
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className="font-semibold text-gray-900">{variant.label}</p>
                      <p className="text-sm text-gray-600 mt-1">₹{Math.round(variant.price.selling)}</p>
                      <p className={`text-xs font-semibold mt-2 ${
                        variant.countInStock > 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        {variant.countInStock > 0 ? `${variant.countInStock} units` : "Out of Stock"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <p className="text-sm font-semibold text-gray-600">Total Stock</p>
                </div>
                <p className="text-3xl font-bold text-blue-900">{totalStock}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-4 border-2 border-amber-200">
                <div className="flex items-center gap-3 mb-2">
                  <MessageSquare className="w-5 h-5 text-amber-600" />
                  <p className="text-sm font-semibold text-gray-600">Total Reviews</p>
                </div>
                <p className="text-3xl font-bold text-amber-900">{reviews.length}</p>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-3xl shadow-xl p-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Description</h4>
              <p className="text-gray-600 leading-relaxed text-sm lg:text-base">
                {product.description}
              </p>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-3xl shadow-xl p-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Timeline</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-500 mb-2 font-semibold">Created</p>
                  <p className="text-gray-800">
                    {new Date(product.createdAt).toLocaleString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-gray-500 mb-2 font-semibold">Last Updated</p>
                  <p className="text-gray-800">
                    {new Date(product.updatedAt).toLocaleString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Reviews Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-3xl shadow-xl p-6 lg:p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Customer Reviews</h2>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold ml-auto">
              {reviews.length} reviews
            </span>
          </div>

          {reviewsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No reviews yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review._id} className="border border-gray-200 rounded-2xl p-4 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      {review.user.image?.url ? (
                        <img
                          src={review.user.image.url}
                          alt={review.user.name}
                          className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                          {review.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900">{review.user.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminProductDetails;
