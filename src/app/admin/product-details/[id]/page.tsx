"use client";

import ProductImageGallery from "@/components/admin/ProductImageGallery";
import { calculateDiscountPercentUI } from "@/lib/client/price";
import axios from "axios";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Edit,
  Heart,
  Loader2,
  Package,
  Share2,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Grocery {
  _id: string;
  name: string;
  description: string;
  brand: string;
  category: {
    name: string;
  };
  variants: Array<{
    label: string;
    price: {
      mrp: number;
      selling: number;
    };
    countInStock: number;
    unit: {
      unit: string;
      value: number;
      multiplier: number;
    };
  }>;
  images: Array<{
    url: string;
    _id: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const ProductDetails = () => {
  const router = useRouter();
  const params = useParams();
  const [id, setId] = useState<string | null>(null);
  const [product, setProduct] = useState<Grocery | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-12 flex flex-col items-center gap-6">
          <div className="relative">
            <Loader2 className="w-16 h-16 animate-spin text-orange-500" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-orange-200 rounded-full animate-ping"></div>
          </div>
          <p className="text-gray-600 font-semibold text-lg">
            Loading product details...
          </p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-md">
          <Package className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Product Not Found
          </h2>
          <p className="text-gray-600 mb-8 text-lg">
            The product you're looking for doesn't exist or has been removed.
          </p>
          <Link
            href="/admin/groceries"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
          >
            <ArrowLeft className="w-6 h-6" />
            Back to Groceries
          </Link>
        </div>
      </div>
    );
  }

  const variant = product.variants[0];
  const discountPercent = calculateDiscountPercentUI(
    variant?.price.mrp,
    variant?.price.selling
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6 bg-white rounded-3xl shadow-xl p-6"
        >
          <div className="flex flex-col gap-4">
            <Link
              href="/admin/groceries"
              className="inline-flex items-center gap-3 text-orange-700 font-semibold hover:text-orange-800 transition-colors bg-orange-100 hover:bg-orange-200 px-4 py-2 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Groceries
            </Link>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                Product Details
              </h1>
              <p className="text-gray-600 mt-1 text-sm lg:text-base">
                Complete product information and management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors">
              <Heart className="w-5 h-5" />
              Favorite
            </button>
            <button className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors">
              <Share2 className="w-5 h-5" />
              Share
            </button>
            <Link
              href={`/admin/add-grocery/${product._id}`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-semibold"
            >
              <Edit className="w-5 h-5" />
              Edit Product
            </Link>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery - Left Side */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ProductImageGallery
              images={product.images}
              productName={product.name}
            />
          </motion.div>

          {/* Product Info - Right Side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-3xl shadow-2xl p-8 flex flex-col"
          >
            {/* Product Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-orange-600">
                  {product.category.name}
                </p>
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mt-1">
                  {product.name}
                </h2>
                <p className="text-md text-gray-500 mt-1">
                  by{" "}
                  <span className="font-semibold text-gray-700">
                    {product.brand || "Unbranded"}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 px-3 py-2 rounded-xl">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 text-yellow-400 fill-current"
                  />
                ))}
                <span className="text-sm text-gray-600 ml-2 font-semibold">
                  (4.5)
                </span>
              </div>
            </div>

            <div className="border-t border-gray-200 my-4"></div>

            {/* Pricing Section */}
            <div className="mb-6">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-gray-900">
                  ₹{Math.round(variant?.price.selling || 0)}
                </span>
                <span className="text-xl text-gray-400 line-through">
                  ₹{Math.round(variant?.price.mrp || 0)}
                </span>
                {discountPercent > 0 && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold text-md">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Inclusive of all taxes
              </p>
            </div>

            {/* Variant and Stock */}
            <div className="grid grid-cols-2 gap-4 text-center mb-6 bg-gray-50 p-4 rounded-2xl">
              <div>
                <p className="text-sm text-gray-500">Variant</p>
                <p className="text-lg font-semibold text-gray-800">
                  {variant?.label}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Stock</p>
                <p
                  className={`text-lg font-semibold ${
                    variant?.countInStock > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {variant?.countInStock > 0
                    ? `${variant.countInStock} units`
                    : "Out of Stock"}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h4 className="text-lg font-bold text-gray-900 mb-2">
                Description
              </h4>
              <p className="text-gray-600 leading-relaxed text-sm">
                {product.description}
              </p>
            </div>

            <div className="border-t border-gray-200 my-4"></div>

            {/* Product Timeline */}
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-4">
                Product Timeline
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 mb-1">Created</p>
                  <p className="font-semibold text-gray-800">
                    {new Date(product.createdAt).toLocaleString("en-IN", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 mb-1">Last Updated</p>
                  <p className="font-semibold text-gray-800">
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
      </div>
    </div>
  );
};

export default ProductDetails;
