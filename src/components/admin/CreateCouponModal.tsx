"use client";

import { motion } from "framer-motion";
import { Calendar, IndianRupee, Percent, Tag, Users, X } from "lucide-react";
import MultiSelect from "../../components/common/MultiSelect";
import { useState } from "react";
import { toast } from "sonner";
import axios from "axios";

interface CreateCouponModalProps {
  onClose: () => void;
}

const CreateCouponModal = ({ onClose }: CreateCouponModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    discountType: "PERCENTAGE" as "FLAT" | "PERCENTAGE",
    discountValue: 10,
    maxDiscountAmount: 0,
    minCartValue: 0,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    usageLimit: 100,
    usagePerUser: 1,
    eventTag: "",
    isActive: true,
    applicableCategories: [] as string[],
    applicableProducts: [] as string[],
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : type === "number"
          ? Number(value) || 0
          : value,
    }));
  };

  const handleMultiSelectChange = (name: string, selected: string[]) => {
    setFormData((prev) => ({
      ...prev,
      [name]: selected,
    }));
  };

  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    setFormData((prev) => ({ ...prev, code }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post("/api/admin/coupon/create", formData, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.data.success) {
        toast.success("Coupon created successfully");
        onClose();
      } else {
        toast.error(response.data.message || "Failed to create coupon");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to create coupon");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-99">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Create New Coupon
            </h2>
            <p className="text-sm text-gray-600">
              Create a discount coupon for your customers
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Basic Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coupon Code *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    required
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="SUMMER2024"
                  />
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Tag
                </label>
                <div className="relative">
                  <Tag
                    className="absolute left-3 top-2.5 text-gray-400"
                    size={20}
                  />
                  <input
                    type="text"
                    name="eventTag"
                    value={formData.eventTag}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="SUMMER_SALE, DIWALI_2024"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Discount Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Discount Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Type *
                </label>
                <div className="flex border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        discountType: "PERCENTAGE",
                      }))
                    }
                    className={`flex-1 py-2 flex items-center justify-center gap-2 transition ${
                      formData.discountType === "PERCENTAGE"
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <Percent size={16} />
                    Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, discountType: "FLAT" }))
                    }
                    className={`flex-1 py-2 flex items-center justify-center gap-2 transition ${
                      formData.discountType === "FLAT"
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <IndianRupee size={16} />
                    Flat
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Value *
                </label>
                <div className="relative">
                  {formData.discountType === "PERCENTAGE" ? (
                    <Percent
                      className="absolute left-3 top-2.5 text-gray-400"
                      size={20}
                    />
                  ) : (
                    <IndianRupee
                      className="absolute left-3 top-2.5 text-gray-400"
                      size={20}
                    />
                  )}
                  <input
                    type="number"
                    name="discountValue"
                    value={formData.discountValue}
                    onChange={handleChange}
                    min="0"
                    max={
                      formData.discountType === "PERCENTAGE" ? "100" : undefined
                    }
                    required
                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder={
                      formData.discountType === "PERCENTAGE" ? "10%" : "100"
                    }
                  />
                </div>
              </div>

              {formData.discountType === "PERCENTAGE" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Discount (₹)
                  </label>
                  <input
                    type="number"
                    name="maxDiscountAmount"
                    value={formData.maxDiscountAmount}
                    onChange={handleChange}
                    min="0"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Unlimited"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {" "}
                Minimum Cart Value (₹)
              </label>
              <input
                type="number"
                name="minCartValue"
                value={formData.minCartValue}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0"
              />
            </div>
          </div>

          {/* Validity Period */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Validity Period
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <div className="relative">
                  <Calendar
                    className="absolute left-3 top-2.5 text-gray-400"
                    size={20}
                  />
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <div className="relative">
                  <Calendar
                    className="absolute left-3 top-2.5 text-gray-400"
                    size={20}
                  />
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                    min={formData.startDate}
                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Usage Limits */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Usage Limits
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Usage Limit
                </label>
                <div className="relative">
                  <Users
                    className="absolute left-3 top-2.5 text-gray-400"
                    size={20}
                  />
                  <input
                    type="number"
                    name="usageLimit"
                    value={formData.usageLimit}
                    onChange={handleChange}
                    min="0"
                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usage Per User
                </label>
                <input
                  type="number"
                  name="usagePerUser"
                  value={formData.usagePerUser}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="1"
                />
              </div>
            </div>
          </div>

          {/* Applicability */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Applicability
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Applicable Categories
                </label>
                <MultiSelect
                  apiUrl="/api/categories"
                  selectedItems={formData.applicableCategories}
                  onChange={(selected) =>
                    handleMultiSelectChange("applicableCategories", selected)
                  }
                  placeholder="Select applicable categories"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Applicable Products
                </label>
                <MultiSelect
                  apiUrl="/api/groceries"
                  selectedItems={formData.applicableProducts}
                  onChange={(selected) =>
                    handleMultiSelectChange("applicableProducts", selected)
                  }
                  placeholder="Select applicable products"
                  itemLabelKey="name"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-green-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Activate coupon immediately
              </span>
            </label>
          </div>

          {/* Action Buttons */}
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
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </span>
              ) : (
                "Create Coupon"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateCouponModal;
