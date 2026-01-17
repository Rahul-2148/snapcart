// src/app/admin/add-grocery/page.tsx
"use client";

import { calculateDiscountPercentUI } from "@/lib/client/price";
import axios from "axios";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader,
  Loader2,
  Plus,
  PlusCircle,
  Trash2,
  Upload,
  X,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DragEvent, FormEvent, useRef, useState, useEffect } from "react";
import { toast } from "sonner";

interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

interface Category {
  _id: string;
  name: string;
  allowedUnits: string[];
}

const AddGrocery = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brand, setBrand] = useState("Ordinary");

  // Variant states
  const [label, setLabel] = useState("");
  const [unit, setUnit] = useState("");
  const [value, setValue] = useState("");
  const [multiplier, setMultiplier] = useState("1");
  const [mrp, setMrp] = useState("");
  const [selling, setSelling] = useState("");
  const [countInStock, setCountInStock] = useState("0");

  // UI states
  const [images, setImages] = useState<ImageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [descLoading, setDescLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Update units when category changes
  useEffect(() => {
    if (categoryId) {
      const selectedCategory = categories.find((cat) => cat._id === categoryId);
      if (selectedCategory) {
        setUnits(selectedCategory.allowedUnits);
        if (!selectedCategory.allowedUnits.includes(unit)) {
          setUnit(""); // Reset unit if not allowed for new category
        }
      }
    } else {
      setUnits([]);
    }
  }, [categoryId, categories, unit]);

  const fetchCategories = async () => {
    try {
      setIsLoadingCategories(true);
      setCategoriesError(null);

      // Try to fetch from API
      const response = await axios.get("/api/categories");

      if (response.data.success) {
        setCategories(response.data.categories || []);

        if (response.data.categories.length === 0) {
          setCategoriesError("No categories found. Please seed the database.");
          toast.warning("No categories found in database");
        }
      } else {
        throw new Error(response.data.message || "Failed to fetch categories");
      }
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      setCategoriesError(
        "Categories not available. Please run the seed script or create categories manually."
      );
      toast.error("Failed to load categories");
      setCategories([]); // Empty array instead of local fallback
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    setError(null);

    if (images.length + files.length > 8) {
      setError("Maximum 8 images allowed");
      toast.error("Maximum 8 images allowed");
      return;
    }

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        setError(`File "${file.name}" is not an image`);
        toast.error(`File "${file.name}" is not an image`);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError(`Image "${file.name}" is too large (max 10MB)`);
        toast.error(`Image "${file.name}" is too large (max 10MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setImages((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random().toString(),
            file,
            preview: e.target?.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle drag and drop
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  // Remove image
  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Reorder images
  const moveImage = (fromIndex: number, toIndex: number) => {
    const newImages = [...images];
    const [removed] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, removed);
    setImages(newImages);
  };

  // Generate label from unit, value, and multiplier
  const generateLabel = () => {
    if (!unit || !value) return "";

    const numValue = parseFloat(value);
    const numMultiplier = parseInt(multiplier) || 1;

    if (isNaN(numValue)) return "";

    if (numMultiplier > 1) {
      return `${numMultiplier} × ${numValue} ${unit}`;
    }

    return `${numValue} ${unit}`;
  };

  // Update label whenever unit, value, or multiplier changes
  useEffect(() => {
    const newLabel = generateLabel();
    setLabel(newLabel);
  }, [unit, value, multiplier]);

  const validateForm = () => {
    // Required fields
    if (!name || !categoryId || !unit || !value || !mrp || !selling) {
      setError("Please fill all required fields (*)");
      toast.error("Please fill all required fields");
      return false;
    }

    // Numeric validation
    const numValue = parseFloat(value);
    const numMultiplier = parseInt(multiplier) || 1;
    const numMrp = Math.round(parseFloat(mrp));
    const numSelling = Math.round(parseFloat(selling));
    const numStock = parseInt(countInStock) || 0;

    if (isNaN(numValue) || numValue <= 0) {
      setError("Unit value must be a positive number");
      toast.error("Unit value must be a positive number");
      return false;
    }

    if (numMultiplier < 1) {
      setError("Multiplier must be at least 1");
      toast.error("Multiplier must be at least 1");
      return false;
    }

    if (isNaN(numMrp) || isNaN(numSelling) || numMrp <= 0 || numSelling <= 0) {
      setError("Prices must be valid positive numbers");
      toast.error("Prices must be valid positive numbers");
      return false;
    }

    if (numSelling > numMrp) {
      setError("Selling price cannot be greater than MRP");
      toast.error("Selling price cannot be greater than MRP");
      return false;
    }

    if (numStock < 0) {
      setError("Stock count cannot be negative");
      toast.error("Stock count cannot be negative");
      return false;
    }

    if (images.length === 0) {
      setError("Please upload at least one product image");
      toast.error("Please upload at least one product image");
      return false;
    }

    // Check if unit is allowed for selected category
    const selectedCategory = categories.find((cat) => cat._id === categoryId);
    if (selectedCategory && !selectedCategory.allowedUnits.includes(unit)) {
      setError(
        `Unit '${unit}' is not allowed for the selected category. Allowed units: ${selectedCategory.allowedUnits.join(
          ", "
        )}`
      );
      toast.error(`Unit '${unit}' is not allowed for selected category`);
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();

      // Basic grocery info
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("category", categoryId);
      formData.append("brand", brand.trim());

      // Variant info
      formData.append("label", label || generateLabel());
      formData.append("unit", unit);
      formData.append("value", value);
      formData.append("multiplier", multiplier);
      formData.append("mrp", mrp);
      formData.append("selling", selling);
      formData.append("countInStock", countInStock);

      // Append images
      images.forEach((image) => {
        formData.append("images", image.file);
      });

      const response = await axios.post("/api/admin/add-grocery", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        setSuccess(response.data.message);
        toast.success(response.data.message);
        console.log(response.data);

        // Reset form
        setName("");
        setDescription("");
        setCategoryId("");
        setBrand("Ordinary");
        setLabel("");
        setUnit("");
        setValue("");
        setMultiplier("1");
        setMrp("");
        setSelling("");
        setCountInStock("0");
        setImages([]);

        // Redirect after 2 seconds
        setTimeout(() => {
          router.replace("/admin/groceries");
        }, 2000);
      }
    } catch (error: any) {
      console.error("Error adding grocery:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to add grocery. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const generateDescription = async () => {
    if (!name.trim()) {
      setError("Please enter a grocery name first.");
      toast.error("Please enter a grocery name first.");
      return;
    }

    try {
      setDescLoading(true);
      setError(null);

      const categoryName =
        categories.find((c) => c._id === categoryId)?.name || "";

      const response = await axios.post("/api/admin/add-grocery/description", {
        name: name.trim(),
        category: categoryName,
      });

      if (response.data.success) {
        setDescription(response.data.description);
        toast.success("Description generated!");
      } else {
        throw new Error(
          response.data.message || "Failed to generate description"
        );
      }
    } catch (error: any) {
      console.error("Error generating description:", error);
      const errorMsg =
        error.response?.data?.message ||
        "Failed to generate description. Please write manually.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setDescLoading(false);
    }
  };
  const discountPercent = calculateDiscountPercentUI(mrp, selling);

  // Unit examples for tooltips
  const unitExamples: { [key: string]: string } = {
    kg: "e.g., 1 kg, 2.5 kg",
    g: "e.g., 100 g, 250 g, 500 g",
    liter: "e.g., 1 liter, 2 liters",
    ml: "e.g., 100 ml, 250 ml, 500 ml",
    piece: "e.g., 1 piece, 12 pieces",
    dozen: "e.g., 1 dozen (12 pieces)",
    pack: "e.g., 1 pack, 2 packs",
    packet: "e.g., 1 packet, 3 packets",
    pouch: "e.g., 1 pouch, 2 pouches",
    box: "e.g., 1 box, 5 boxes",
    bag: "e.g., 1 bag, 3 bags",
    tray: "e.g., 1 tray, 2 trays",
    bottle: "e.g., 1 bottle, 6 bottles",
    jar: "e.g., 1 jar, 2 jars",
    can: "e.g., 1 can, 4 cans",
    tin: "e.g., 1 tin, 2 tins",
    bar: "e.g., 1 bar, 5 bars",
    loaf: "e.g., 1 loaf, 2 loaves",
    slice: "e.g., 1 slice, 8 slices",
    roll: "e.g., 1 roll, 4 rolls",
    cup: "e.g., 1 cup, 2 cups",
    cone: "e.g., 1 cone, 6 cones",
    sachet: "e.g., 1 sachet, 10 sachets",
    strip: "e.g., 1 strip, 5 strips",
    tub: "e.g., 1 tub, 3 tubs",
    sheet: "e.g., 1 sheet, 50 sheets",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-green-700 font-semibold hover:text-green-800 transition-colors mb-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Add New Grocery Item
            </h1>
            <p className="text-gray-600 mt-2">
              Fill in all the details below to add a new item to your inventory
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border border-green-100">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">
              Admin Mode
            </span>
          </div>
        </div>

        {/* Main Form Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Basic Info */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Categories Error Message */}
            {categoriesError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Categories Not Available</p>
                    <p className="text-sm mt-1">{categoriesError}</p>
                    <button
                      onClick={fetchCategories}
                      className="mt-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Success/Error Messages */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"
              >
                <div className="flex items-center gap-2">
                  <X
                    className="w-5 h-5 hover:text-red-600 cursor-pointer"
                    onClick={() => setError(null)}
                  />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700"
              >
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5" />
                  <span>{success}</span>
                </div>
              </motion.div>
            )}

            {/* Form */}
            <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Grocery Name */}
                <div>
                  <label className="block text-gray-800 font-semibold mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter product name (e.g., Organic Apples, Basmati Rice)"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-gray-800 placeholder-gray-400"
                    disabled={loading}
                  />
                </div>

                {/* Description */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-gray-800 font-semibold">
                      Description
                    </label>
                    <button
                      type="button"
                      onClick={generateDescription}
                      disabled={descLoading || !name.trim()}
                      className="text-sm font-medium bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1.5 rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                      {descLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "✨ Generate Description"
                      )}
                    </button>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the product features, benefits, and usage..."
                    rows={4}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-gray-800 placeholder-gray-400 resize-none"
                    disabled={loading}
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-gray-800 font-semibold mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className={`w-full border rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all bg-white text-gray-800 appearance-none ${
                        categories.length === 0
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
                      disabled={
                        loading ||
                        isLoadingCategories ||
                        categories.length === 0
                      }
                    >
                      <option value="">
                        {isLoadingCategories
                          ? "Loading categories..."
                          : categories.length === 0
                          ? "No categories available"
                          : "Select Category"}
                      </option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    {isLoadingCategories && (
                      <div className="absolute right-4 top-3.5">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      </div>
                    )}
                    {!isLoadingCategories && categories.length === 0 && (
                      <div className="absolute right-4 top-3.5">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      </div>
                    )}
                  </div>
                  {categoryId && units.length > 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Allowed units:{" "}
                      <span className="font-medium">{units.join(", ")}</span>
                    </p>
                  )}
                  {categories.length === 0 && !isLoadingCategories && (
                    <p className="text-sm text-red-500 mt-2">
                      You need to create categories first. Run the seed script
                      or use the admin panel.
                    </p>
                  )}
                </div>

                {/* Unit Configuration */}
                <div
                  className={`p-6 rounded-2xl ${
                    !categoryId
                      ? "bg-gray-50"
                      : "bg-gradient-to-r from-blue-50 to-indigo-50"
                  }`}
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Unit Configuration <span className="text-red-500">*</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Unit Type */}
                    <div>
                      <label className="block text-gray-800 font-semibold mb-2">
                        Unit Type
                      </label>
                      <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className={`w-full border rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all bg-white text-gray-800 ${
                          !categoryId
                            ? "border-gray-200 bg-gray-100"
                            : "border-gray-300"
                        }`}
                        disabled={loading || !categoryId}
                      >
                        <option value="">
                          {!categoryId
                            ? "Select category first"
                            : "Select Unit"}
                        </option>
                        {units.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      {unit && unitExamples[unit] && (
                        <p className="text-xs text-gray-500 mt-1">
                          {unitExamples[unit]}
                        </p>
                      )}
                    </div>

                    {/* Unit Value */}
                    <div>
                      <label className="block text-gray-800 font-semibold mb-2">
                        Unit Value
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          placeholder="e.g., 50"
                          min="0.01"
                          step="0.01"
                          className={`w-full border rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-gray-800 [appearance:textfield] noSpin ${
                            !categoryId
                              ? "border-gray-200 bg-gray-100"
                              : "border-gray-300"
                          }`}
                          disabled={loading || !categoryId}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Enter value like 50, 100, 250, etc.
                      </p>
                    </div>

                    {/* Multiplier */}
                    <div>
                      <label className="block text-gray-800 font-semibold mb-2">
                        Multiplier
                        <span className="text-xs text-gray-500 ml-1">
                          (optional)
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={multiplier}
                          onChange={(e) => setMultiplier(e.target.value)}
                          placeholder="1"
                          min="1"
                          step="1"
                          className={`w-full border rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-gray-800 [appearance:textfield] noSpin ${
                            !categoryId
                              ? "border-gray-200 bg-gray-100"
                              : "border-gray-300"
                          }`}
                          disabled={loading || !categoryId}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Use for packs (e.g., 2 × 50 ml)
                      </p>
                    </div>
                  </div>

                  {/* Generated Label Preview */}
                  {(unit || value) && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600">Generated Label:</p>
                      <p className="text-lg font-bold text-green-700">
                        {label || "Complete unit configuration"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        This will appear to customers as "{label || "..."}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Price Section */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Pricing Details <span className="text-red-500">*</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-800 font-semibold mb-2">
                        MRP (Maximum Retail Price)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-3.5 text-gray-700 font-bold">
                          ₹
                        </span>
                        <input
                          type="number"
                          value={mrp}
                          onChange={(e) => setMrp(e.target.value)}
                          placeholder="0"
                          min="0"
                          step="1"
                          className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-gray-800 bg-white noSpin"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-800 font-semibold mb-2">
                        Selling Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-3.5 text-gray-700 font-bold">
                          ₹
                        </span>
                        <input
                          type="number"
                          value={selling}
                          onChange={(e) => setSelling(e.target.value)}
                          placeholder="0"
                          min="0"
                          step="1"
                          className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-gray-800 bg-white noSpin"
                          disabled={loading}
                        />
                      </div>
                      {discountPercent > 0 && (
                        <div className="mt-3 inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-full">
                          <span className="text-sm font-bold">
                            🎉 {discountPercent}% OFF
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stock and Brand */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-800 font-semibold mb-2">
                      Stock Quantity
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={countInStock}
                        onChange={(e) => setCountInStock(e.target.value)}
                        placeholder="0"
                        min="0"
                        className="w-full border border-gray-300 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-gray-800 [appearance:textfield] noSpin"
                        disabled={loading}
                      />
                      <span className="absolute right-4 top-3.5 text-gray-500">
                        units
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Leave 0 for out of stock
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-800 font-semibold mb-2">
                      Brand Name
                    </label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Enter brand name (e.g., Nestle, Hindustan Unilever)"
                      className="w-full border border-gray-300 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-gray-800 placeholder-gray-400"
                      disabled={loading}
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Leave empty for "Ordinary" brand
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading || categories.length === 0}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed transition-all text-lg flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <Loader className="w-6 h-6 animate-spin" />
                      Adding Product...
                    </>
                  ) : categories.length === 0 ? (
                    "No Categories Available"
                  ) : (
                    <>
                      <Plus className="w-6 h-6" />
                      Add Grocery Product
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>

          {/* Right Column - Image Upload */}
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="sticky top-6">
              {/* Image Upload Area */}
              <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Product Images <span className="text-red-500">*</span>
                </h3>
                <p className="text-gray-600 mb-6">
                  Upload multiple product images. First image will be used as
                  thumbnail.
                </p>

                {/* Drag & Drop Area */}
                <div
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                    isDragging
                      ? "border-green-500 bg-green-50"
                      : "border-gray-300 hover:border-green-400 hover:bg-green-50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                    disabled={loading}
                  />

                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mb-4">
                      <Upload className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">
                      Drop images here or click to upload
                    </h4>
                    <p className="text-gray-500 text-sm">
                      Supports PNG, JPG, WEBP up to 10MB each
                    </p>
                    <p className="text-gray-400 text-xs mt-2">
                      Maximum 8 images allowed
                    </p>
                  </div>
                </div>

                {/* Uploaded Images Preview */}
                {images.length > 0 && (
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-gray-800">
                        Uploaded Images ({images.length}/8)
                      </h4>
                      <button
                        type="button"
                        onClick={() => setImages([])}
                        className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear All
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {images.map((image, index) => (
                        <motion.div
                          key={image.id}
                          initial={{ scale: 0.85, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          whileHover={{ scale: 1.03 }}
                          transition={{ duration: 0.2 }}
                          className="relative group"
                        >
                          <div
                            draggable
                            onDragStart={(
                              e: React.DragEvent<HTMLDivElement>
                            ) => {
                              e.dataTransfer.setData(
                                "text/plain",
                                index.toString()
                              );
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e: React.DragEvent<HTMLDivElement>) => {
                              e.preventDefault();
                              const fromIndex = Number(
                                e.dataTransfer.getData("text/plain")
                              );
                              moveImage(fromIndex, index);
                            }}
                            className="aspect-square rounded-lg overflow-hidden border border-gray-200 group-hover:border-green-400 transition-colors cursor-move"
                          >
                            <Image
                              src={image.preview}
                              alt={`Preview ${index + 1}`}
                              width={200}
                              height={200}
                              className="w-full h-full object-cover"
                            />

                            {/* Thumbnail badge */}
                            {index === 0 && (
                              <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                                Thumbnail
                              </div>
                            )}
                          </div>

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => removeImage(image.id)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {/* File name overlay */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 pointer-events-none">
                            <p className="text-white text-xs truncate">
                              {image.file.name}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Reorder Instructions */}
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800 flex items-center gap-2">
                        <span className="font-bold">💡 Tip:</span>
                        Drag and drop images to reorder them
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Panel */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 p-6">
                <h4 className="font-bold text-gray-900 mb-4">📋 Quick Tips</h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">•</span>
                    <span className="text-sm text-gray-600">
                      Fill all{" "}
                      <span className="font-semibold text-red-500">
                        required fields (*)
                      </span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">•</span>
                    <span className="text-sm text-gray-600">
                      Select category first to see allowed units
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">•</span>
                    <span className="text-sm text-gray-600">
                      Use multiplier for packs (e.g., 2 × 50 ml bottles)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">•</span>
                    <span className="text-sm text-gray-600">
                      Upload clear product images from multiple angles
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500 font-bold">•</span>
                    <span className="text-sm text-gray-600">
                      Your admin ID will be automatically set as creator
                    </span>
                  </li>
                </ul>

                {/* Field Requirements */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h5 className="font-semibold text-gray-800 mb-2">
                    Field Requirements:
                  </h5>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Product Name:</span>
                      <span className="font-medium">Required</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Category:</span>
                      <span className="font-medium">Required</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Unit & Value:</span>
                      <span className="font-medium">Required</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        MRP & Selling Price:
                      </span>
                      <span className="font-medium">Required</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Images:</span>
                      <span className="font-medium">At least 1</span>
                    </div>
                  </div>
                </div>

                {/* Database Status */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h5 className="font-semibold text-gray-800 mb-2">
                    Database Status:
                  </h5>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Categories Available:
                      </span>
                      <span
                        className={`font-medium ${
                          categories.length > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {categories.length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Selected Category:</span>
                      <span
                        className={`font-medium ${
                          categoryId ? "text-green-600" : "text-gray-600"
                        }`}
                      >
                        {categoryId ? "✓" : "✗"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Form Ready:</span>
                      <span
                        className={`font-medium ${
                          name &&
                          categoryId &&
                          unit &&
                          value &&
                          mrp &&
                          selling &&
                          images.length > 0
                            ? "text-green-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {name &&
                        categoryId &&
                        unit &&
                        value &&
                        mrp &&
                        selling &&
                        images.length > 0
                          ? "✓ Ready"
                          : "Incomplete"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AddGrocery;
