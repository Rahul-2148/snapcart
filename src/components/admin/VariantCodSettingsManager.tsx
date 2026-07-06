"use client";

import React, { useState } from "react";
import {
  Settings,
  Truck,
  IndianRupee,
  Check,
  X,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { motion } from "motion/react";

interface Variant {
  _id: string;
  label: string;
  price?: {
    selling: number;
  };
  cod?: {
    isCodAllowed: boolean;
    handlingCharge: number;
  };
}

interface VariantCodSettingsManagerProps {
  variants: Variant[];
  productName: string;
  onSuccess?: () => void;
}

export const VariantCodSettingsManager: React.FC<
  VariantCodSettingsManagerProps
> = ({ variants, productName, onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    variants[0]?._id || "",
  );
  const [applyToAll, setApplyToAll] = useState(false);
  const [isCodAllowed, setIsCodAllowed] = useState(
    variants[0]?.cod?.isCodAllowed ?? true,
  );
  const [handlingCharge, setHandlingCharge] = useState(
    variants[0]?.cod?.handlingCharge ?? 0,
  );
  const [loading, setLoading] = useState(false);

  const selectedVariant = variants.find((v) => v._id === selectedVariantId);

  const handleVariantChange = (variantId: string) => {
    setSelectedVariantId(variantId);
    const variant = variants.find((v) => v._id === variantId);
    if (variant) {
      setIsCodAllowed(variant.cod?.isCodAllowed ?? true);
      setHandlingCharge(variant.cod?.handlingCharge ?? 0);
    }
  };

  const handleSave = async () => {
    if (handlingCharge < 0) {
      toast.error("Handling charge cannot be negative");
      return;
    }

    setLoading(true);
    try {
      if (applyToAll) {
        // Apply to all variants
        const updatePromises = variants.map((variant) =>
          axios.put(`/api/admin/variants/${variant._id}/cod-settings`, {
            isCodAllowed,
            handlingCharge: isCodAllowed ? handlingCharge : 0,
          }),
        );

        const responses = await Promise.all(updatePromises);
        const allSuccess = responses.every((r) => r.data.success);

        if (allSuccess) {
          toast.success(
            `✓ COD settings saved for all ${variants.length} variants of ${productName}`,
            {
              description: isCodAllowed
                ? `Each variant: ₹${handlingCharge.toFixed(2)} per order`
                : "COD disabled for all variants",
            },
          );
          setIsOpen(false);
          onSuccess?.();
        }
      } else {
        // Apply to single variant
        const response = await axios.put(
          `/api/admin/variants/${selectedVariantId}/cod-settings`,
          {
            isCodAllowed,
            handlingCharge: isCodAllowed ? handlingCharge : 0,
          },
        );

        if (response.data.success) {
          const variantLabel = selectedVariant?.label || "Product";
          toast.success(`✓ COD settings saved for ${productName}`, {
            description: isCodAllowed
              ? `${variantLabel}: ₹${handlingCharge.toFixed(2)} per order`
              : `${variantLabel}: COD disabled`,
          });
          setIsOpen(false);
          onSuccess?.();
        }
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to update COD settings";
      toast.error("Failed to save COD settings", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-blue-600 hover:text-blue-900"
        title={`COD Settings (${variants.length} variants)`}
      >
        <Settings className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                COD Settings
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Product: <span className="font-semibold">{productName}</span>
              </p>
            </div>

            {/* Variant Selector */}
            {variants.length > 1 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Variant
                </label>
                <div className="relative">
                  <select
                    value={selectedVariantId}
                    onChange={(e) => handleVariantChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none cursor-pointer bg-white pr-10"
                  >
                    {variants.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.label}{" "}
                        {v.price?.selling ? `(₹${v.price.selling})` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Variant Info */}
            {selectedVariant && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-gray-700">
                  Current Settings
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  📦 {selectedVariant.label}
                </p>
                {selectedVariant.price?.selling && (
                  <p className="text-xs text-gray-600">
                    💵 ₹{selectedVariant.price.selling}
                  </p>
                )}
              </div>
            )}

            {/* Apply to All Checkbox */}
            {variants.length > 1 && (
              <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <input
                  type="checkbox"
                  id="applyToAll"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-purple-300 rounded focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="applyToAll" className="flex-1 cursor-pointer">
                  <p className="text-sm font-medium text-gray-800">
                    Apply to all {variants.length} variants
                  </p>
                  <p className="text-xs text-gray-600">
                    Same settings for all variant options
                  </p>
                </label>
              </div>
            )}

            {/* COD Allowed Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="font-medium text-gray-800">Allow COD</p>
                <p className="text-xs text-gray-600">
                  {applyToAll
                    ? `Enable/disable for all ${variants.length} variants`
                    : "Enable/disable for this variant"}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCodAllowed}
                  onChange={(e) => {
                    setIsCodAllowed(e.target.checked);
                    if (!e.target.checked) setHandlingCharge(0);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Handling Charge Input */}
            {isCodAllowed && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Handling Charge (₹)
                </label>
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={handlingCharge}
                    onChange={(e) =>
                      setHandlingCharge(
                        Math.max(0, parseFloat(e.target.value) || 0),
                      )
                    }
                    placeholder="Enter charge"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <p className="text-xs text-gray-600">
                  Added to order total when customer chooses COD
                </p>
              </div>
            )}

            {!isCodAllowed && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200 flex gap-2">
                <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">
                  Customers won't be able to use COD for this variant
                </p>
              </div>
            )}

            {isCodAllowed && handlingCharge > 0 && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex gap-2">
                <Truck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-700">
                  ₹{handlingCharge.toFixed(2)} will be added to order total
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>

            {/* Variants Summary */}
            {variants.length > 1 && (
              <div className="border-t pt-4">
                <p className="text-xs font-medium text-gray-600 mb-2">
                  All Variants COD Status:
                </p>
                <div className="space-y-1">
                  {variants.map((v) => (
                    <div
                      key={v._id}
                      className="flex justify-between text-xs text-gray-600"
                    >
                      <span>{v.label}</span>
                      <span>
                        {v.cod?.isCodAllowed === false ? (
                          <span className="text-red-600">Not Allowed</span>
                        ) : v.cod?.handlingCharge &&
                          v.cod?.handlingCharge > 0 ? (
                          <span className="text-amber-600">
                            ₹{v.cod.handlingCharge.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-green-600">Free</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </>
  );
};

export default VariantCodSettingsManager;
