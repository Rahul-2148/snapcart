"use client";

import axios from "axios";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface EditCategoryModalProps {
  category: any;
  onClose: () => void;
  onSuccess: () => void;
}

const EditCategoryModal = ({
  category,
  onClose,
  onSuccess,
}: EditCategoryModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    allowedUnits: "",
  });

  const categoryOptions = [
    "Fruits & Vegetables",
    "Dairy & Eggs",
    "Rice, Atta & Grains",
    "Oil & Ghee",
    "Snacks & Biscuits",
    "Beverages & Drinks",
    "Breakfast & Cereals",
    "Spices & Condiments",
    "Dry Fruits & Nuts",
    "Instant & Packaged Foods",
    "Bakery & Breads",
    "Sweets & Chocolates",
    "Frozen Foods",
    "Meat & Seafood",
    "Baby & Pet Care",
    "Personal Care",
    "Cleaning & Laundry",
    "Household Essentials",
    "Pooja Needs",
    "Pharmacy & Health",
    "Stationery & Office",
    "Others",
  ];

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        allowedUnits: category.allowedUnits.join(","),
      });
    }
  }, [category]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.put(
        `/api/admin/categories/${category._id}`,
        {
          name: formData.name,
          allowedUnits: formData.allowedUnits.split(",").map((s) => s.trim()),
        }
      );

      if (response.data.success) {
        toast.success("Category updated successfully!");
        onSuccess();
        onClose();
      } else {
        toast.error(response.data.message || "Failed to update category");
      }
    } catch (error) {
      console.error("Update category error:", error);
      toast.error("Failed to update category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md"
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-800">Edit Category</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Category Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label
              htmlFor="units"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Allowed Units (comma-separated)
            </label>
            <input
              type="text"
              id="units"
              name="allowedUnits"
              value={formData.allowedUnits}
              onChange={handleChange}
              placeholder="e.g. kg,g,l,ml,piece"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Update Category"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditCategoryModal;
