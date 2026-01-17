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
  MessageSquare,
  BarChart3,
  ChevronRight,
  Clock,
  Tag,
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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-14 h-14 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-semibold text-lg">Loading product...</p>
        </motion.div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-md"
        >
          <Package className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Not Found</h2>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
          <Link
            href="/admin/groceries"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>
        </motion.div>
      </div>
    );
  }

  const activeVariant = product.variants[activeVariantIdx];
  const totalStock = product.variants.reduce((sum, v) => sum + v.countInStock, 0);
  const discountPercent = calculateDiscountPercentUI(activeVariant?.price.mrp, activeVariant?.price.selling);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm text-gray-600 mb-6"
        >
          <Link href="/admin/groceries" className="hover:text-blue-600">Admin</Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/admin/groceries" className="hover:text-blue-600">Products</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-semibold">{product.name}</span>
        </motion.div>

        {/* Header with actions */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              {product.name}
            </h1>
            <p className="text-gray-600">by <span className="font-semibold text-gray-900">{product.brand || "Unbranded"}</span></p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/admin/add-grocery/${product._id}`}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
            <button
              onClick={handleDeleteProduct}
              disabled={deleting}
              className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-semibold"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </motion.div>

        {/* Main Content - Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          {/* Left - Images */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <ProductImageGallery
                images={product.images}
                productName={product.name}
              />
            </div>
          </motion.div>

          {/* Right - Product Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3 space-y-4"
          >
            {/* Category & Badges */}
            <div className="flex flex-wrap gap-2">
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                {product.category.name}
              </span>
            </div>

            {/* Price Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-end gap-3 mb-4">
                <span className="text-5xl font-bold text-gray-900">
                  ₹{Math.round(activeVariant?.price.selling || 0)}
                </span>
                <span className="text-2xl text-gray-400 line-through">
                  ₹{Math.round(activeVariant?.price.mrp || 0)}
                </span>
                {discountPercent > 0 && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-lg font-bold text-sm">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(avgRating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-gray-900">{avgRating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm">({reviews.length} reviews)</span>
              </div>
            </div>

            {/* Variants */}
            {product.variants.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-blue-600" />
                  Available Variants ({product.variants.length})
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {product.variants.map((variant, idx) => (
                    <motion.button
                      key={variant._id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setActiveVariantIdx(idx)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        activeVariantIdx === idx
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className="font-semibold text-gray-900 text-sm">{variant.label}</p>
                      <p className="text-blue-600 font-bold text-sm mt-1">₹{Math.round(variant.price.selling)}</p>
                      <p className={`text-xs font-semibold mt-1 ${
                        variant.countInStock > 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        {variant.countInStock > 0 ? `${variant.countInStock} in stock` : "Out of Stock"}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                whileHover={{ y: -2 }}
                className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200"
              >
                <BarChart3 className="w-5 h-5 text-blue-600 mb-2" />
                <p className="text-xs text-gray-600 font-semibold">Total Stock</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{totalStock}</p>
              </motion.div>
              <motion.div
                whileHover={{ y: -2 }}
                className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200"
              >
                <MessageSquare className="w-5 h-5 text-amber-600 mb-2" />
                <p className="text-xs text-gray-600 font-semibold">Reviews</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">{reviews.length}</p>
              </motion.div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h4 className="font-bold text-gray-900 mb-3">About</h4>
              <p className="text-gray-600 leading-relaxed text-sm">{product.description}</p>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-600" />
                Timeline
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-sm font-semibold text-gray-600">Created</span>
                  <span className="text-sm text-gray-900">
                    {new Date(product.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-600">Last Updated</span>
                  <span className="text-sm text-gray-900">
                    {new Date(product.updatedAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Reviews Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-6 lg:p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-blue-600" />
              Customer Reviews
            </h2>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
              {reviews.length}
            </span>
          </div>

          {reviewsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No reviews yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {reviews.map((review) => (
                <motion.div
                  key={review._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      {review.user.image?.url ? (
                        <img
                          src={review.user.image.url}
                          alt={review.user.name}
                          className="w-9 h-9 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                          {review.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{review.user.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < review.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm">{review.comment}</p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminProductDetails;
