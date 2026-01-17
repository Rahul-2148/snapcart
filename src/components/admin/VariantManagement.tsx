/**
 * Professional Variant Management Component
 * Allows admins to add, edit, and manage multiple variants with dynamic pricing
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, Check, X, AlertCircle, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { calculateDiscountPercent } from "@/lib/utils/priceUtils";

interface IVariant {
  id?: string;
  _id?: string;
  label: string;
  unit: {
    unit: string;
    value: number;
    multiplier?: number;
  };
  price: {
    mrp: number;
    selling: number;
    discountPercent?: number;
  };
  countInStock: number;
  isDefault?: boolean;
}

interface VariantManagementProps {
  variants: IVariant[];
  onVariantsChange: (variants: IVariant[]) => void;
  allowedUnits: string[];
}

const VariantManagement = ({
  variants,
  onVariantsChange,
  allowedUnits,
}: VariantManagementProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<IVariant>({
    id: "",
    label: "",
    unit: { unit: "", value: 0, multiplier: 1 },
    price: { mrp: 0, selling: 0 },
    countInStock: 0,
    isDefault: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Add or update variant
  const handleSaveVariant = () => {
    const newErrors: Record<string, string> = {};

    // Validation
    if (!formData.unit.unit) newErrors.unit = "Unit required";
    if (formData.unit.value <= 0) newErrors.value = "Value must be positive";
    if (formData.price.mrp <= 0) newErrors.mrp = "MRP must be positive";
    if (formData.price.selling <= 0)
      newErrors.selling = "Selling price must be positive";
    if (formData.price.selling > formData.price.mrp)
      newErrors.selling = "Selling price cannot exceed MRP";
    if (formData.countInStock < 0) newErrors.stock = "Stock cannot be negative";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix the errors");
      return;
    }

    setErrors({});

    // Generate label if not set
    const generatedLabel = generateLabel();
    const variantToSave = {
      ...formData,
      label: formData.label || generatedLabel,
    };

    if (editingId) {
      // Update existing variant - preserve the ID
      const updated = variants.map((v) => {
        const vId = v._id || v.id;
        return vId === editingId ? { ...variantToSave, _id: v._id, id: editingId } : v;
      });
      onVariantsChange(updated);
      toast.success("Variant updated");
    } else {
      // Add new variant - generate new ID
      const newVariant: IVariant = {
        ...variantToSave,
        id: Date.now().toString(),
      };
      onVariantsChange([...variants, newVariant]);
      toast.success("Variant added");
    }

    resetForm();
  };

  const handleEditVariant = (variant: IVariant) => {
    const variantId = variant._id || variant.id || "";
    setEditingId(variantId);
    setFormData({ ...variant, id: variantId });
    console.log("Edit mode activated. Variant ID:", variantId);
  };

  const handleDeleteVariant = (id: string) => {
    const updated = variants.filter((v) => (v._id || v.id) !== id);
    onVariantsChange(updated);
    if (editingId === id) resetForm();
    toast.success("Variant deleted");
  };

  const handleDuplicateVariant = (variant: IVariant) => {
    const newVariant: IVariant = {
      ...variant,
      _id: undefined,
      id: Date.now().toString(),
    };
    onVariantsChange([...variants, newVariant]);
    toast.success("Variant duplicated");
  };

  const handleSetDefault = (id: string) => {
    const updated = variants.map((v) => ({
      ...v,
      isDefault: (v._id || v.id) === id,
    }));
    onVariantsChange(updated);
    toast.success("Default variant set");
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      id: "",
      label: "",
      unit: { unit: "", value: 0, multiplier: 1 },
      price: { mrp: 0, selling: 0 },
      countInStock: 0,
      isDefault: false,
    });
    setErrors({});
  };

  const generateLabel = () => {
    const { unit, value, multiplier = 1 } = formData.unit;
    if (!unit || value <= 0) return "";
    if (multiplier > 1) {
      return `${multiplier} × ${value} ${unit}`;
    }
    return `${value} ${unit}`;
  };

  const discount = calculateDiscountPercent(
    formData.price.mrp,
    formData.price.selling
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            📦 Product Variants
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Add multiple variants with different sizes and prices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-semibold">
            {variants.length} variant{variants.length !== 1 ? "s" : ""}
          </span>
          {editingId && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={resetForm}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-1"
              title="Cancel edit and add new variant"
            >
              <Plus className="w-4 h-4" /> Add New
            </motion.button>
          )}
        </div>
      </div>

      {/* Variant Form */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100"
      >
        <h4 className="font-semibold text-gray-900 mb-4">
          {editingId ? "✏️ Edit Variant" : "➕ Add New Variant"}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Unit Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.unit.unit}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  unit: { ...formData.unit, unit: e.target.value },
                });
                setErrors({ ...errors, unit: "" });
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                errors.unit ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Select unit</option>
              {allowedUnits.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            {errors.unit && (
              <p className="text-red-500 text-xs mt-1">{errors.unit}</p>
            )}
          </div>

          {/* Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Value <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.unit.value || ""}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  unit: {
                    ...formData.unit,
                    value: parseFloat(e.target.value) || 0,
                  },
                });
                setErrors({ ...errors, value: "" });
              }}
              placeholder="e.g., 500"
              className={`noSpin w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                errors.value ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.value && (
              <p className="text-red-500 text-xs mt-1">{errors.value}</p>
            )}
          </div>

          {/* Multiplier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Multiplier
            </label>
            <input
              type="number"
              min="1"
              value={formData.unit.multiplier || 1}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  unit: {
                    ...formData.unit,
                    multiplier: parseInt(e.target.value) || 1,
                  },
                });
              }}
              placeholder="e.g., 1"
              className="noSpin w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-gray-500 mt-1">For multi-packs (e.g., 4)</p>
          </div>

          {/* Label Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Label Preview
            </label>
            <div className="w-full px-3 py-3 bg-white border border-gray-300 rounded-lg text-xs text-gray-500 font-medium">
              {generateLabel() || "Enter details"}
            </div>
          </div>
        </div>

        {/* Prices */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* MRP */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              MRP <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price.mrp || ""}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  price: { ...formData.price, mrp: parseFloat(e.target.value) || 0 },
                });
                setErrors({ ...errors, mrp: "" });
              }}
              placeholder="e.g., 100"
              className={`noSpin w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                errors.mrp ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.mrp && (
              <p className="text-red-500 text-xs mt-1">{errors.mrp}</p>
            )}
          </div>

          {/* Selling Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selling Price <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price.selling || ""}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  price: {
                    ...formData.price,
                    selling: parseFloat(e.target.value) || 0,
                  },
                });
                setErrors({ ...errors, selling: "" });
              }}
              placeholder="e.g., 80"
              className={`noSpin w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                errors.selling ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.selling && (
              <p className="text-red-500 text-xs mt-1">{errors.selling}</p>
            )}
          </div>

          {/* Discount Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount %
            </label>
            <div className={`w-full px-3 py-3 bg-white border rounded-lg text-xs font-semibold ${
              discount > 0 ? "text-emerald-700 border-emerald-300" : "text-gray-400 border-gray-300"
            }`}>
              {discount > 0 ? `${discount}% OFF` : "No discount"}
            </div>
          </div>

          {/* Stock */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock Count
            </label>
            <input
              type="number"
              min="0"
              value={formData.countInStock}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  countInStock: parseInt(e.target.value) || 0,
                });
                setErrors({ ...errors, stock: "" });
              }}
              placeholder="e.g., 100"
              className={`noSpin w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                errors.stock ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.stock && (
              <p className="text-red-500 text-xs mt-1">{errors.stock}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          {editingId && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Cancel
            </motion.button>
          )}
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={handleSaveVariant}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {editingId ? "Update Variant" : "Add Variant"}
          </motion.button>
        </div>
      </motion.div>

      {/* Variants List */}
      {variants.length > 0 ? (
        <motion.div className="space-y-3">
          <h4 className="font-semibold text-gray-900">
            {variants.length > 1 && "🎯"} Available Variants
          </h4>
          <AnimatePresence>
            {variants.map((variant, index) => {
              const discount = calculateDiscountPercent(
                variant.price.mrp,
                variant.price.selling
              );

              return (
                <motion.div
                  key={variant._id || variant.id || `variant-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {variant.label}
                        </span>
                        {variant.isDefault && (
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-semibold">
                            🏷️ Default
                          </span>
                        )}
                        {discount > 0 && (
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">
                            {discount}% OFF
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">MRP</p>
                          <p className="font-semibold text-gray-900 line-through">
                            ₹{variant.price.mrp.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Selling</p>
                          <p className="font-semibold text-emerald-700">
                            ₹{variant.price.selling.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Saving</p>
                          <p className="font-semibold text-blue-700">
                            ₹{(variant.price.mrp - variant.price.selling).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Stock</p>
                          <p
                            className={`font-semibold ${
                              variant.countInStock > 0
                                ? "text-emerald-700"
                                : "text-red-700"
                            }`}
                          >
                            {variant.countInStock} units
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={() =>
                          handleSetDefault(variant._id || variant.id || "")
                        }
                        className={`p-2 rounded-lg transition-all ${
                          variant.isDefault
                            ? "bg-emerald-600 text-white"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                        title="Set as default"
                      >
                        ⭐
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={() =>
                          handleDuplicateVariant(variant)
                        }
                        className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                        title="Duplicate variant"
                      >
                        <Copy className="w-4 h-4" />
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={() =>
                          handleEditVariant(variant)
                        }
                        className="p-2 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200"
                        title="Edit variant"
                      >
                        <Edit2 className="w-4 h-4" />
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={() =>
                          handleDeleteVariant(variant._id || variant.id || "")
                        }
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        title="Delete variant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center"
        >
          <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <p className="text-amber-900 font-medium">No variants added yet</p>
          <p className="text-amber-700 text-sm mt-1">
            Add at least one variant with size and price to create a product
          </p>
        </motion.div>
      )}

      {/* Price Range Summary */}
      {variants.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200"
        >
          <h4 className="font-semibold text-gray-900 mb-3">📊 Price Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Min Price</p>
              <p className="text-xl font-bold text-emerald-700">
                ₹{Math.min(...variants.map((v) => v.price.selling)).toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Max Price</p>
              <p className="text-xl font-bold text-emerald-700">
                ₹{Math.max(...variants.map((v) => v.price.selling)).toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Max Discount</p>
              <p className="text-xl font-bold text-red-600">
                {Math.max(
                  ...variants.map((v) =>
                    calculateDiscountPercent(v.price.mrp, v.price.selling)
                  )
                )}
                %
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Stock</p>
              <p className="text-xl font-bold text-blue-700">
                {variants.reduce((sum, v) => sum + v.countInStock, 0)}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default VariantManagement;
