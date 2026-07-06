"use client";

import React, { useState } from "react";
import { Settings, Truck, IndianRupee, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { motion } from "motion/react";

interface Variant {
  _id: string;
  label: string;
  grocery: {
    _id: string;
    name: string;
  };
  price?: {
    selling: number;
  };
  cod?: {
    isCodAllowed: boolean;
    handlingCharge: number;
  };
}

interface CodSettingsManagerProps {
  variant: Variant;
  productName?: string;
  onSuccess?: () => void;
}

export const CodSettingsManager: React.FC<CodSettingsManagerProps> = ({
  variant,
  productName,
  onSuccess,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCodAllowed, setIsCodAllowed] = useState(
    variant.cod?.isCodAllowed ?? true,
  );
  const [handlingCharge, setHandlingCharge] = useState(
    variant.cod?.handlingCharge ?? 0,
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (handlingCharge < 0) {
      toast.error("Handling charge cannot be negative");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put(
        `/api/admin/variants/${variant._id}/cod-settings`,
        {
          isCodAllowed,
          handlingCharge: isCodAllowed ? handlingCharge : 0,
        },
      );

      if (response.data.success) {
        const displayName = productName || variant.grocery?.name || "Product";
        toast.success(`✓ COD settings saved for ${displayName}`, {
          description: isCodAllowed
            ? `Charge: ₹${handlingCharge.toFixed(2)} per order`
            : "COD disabled for this product",
        });
        setIsOpen(false);
        onSuccess?.();
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
        title="COD Settings"
      >
        <Settings className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full space-y-4"
          >
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                COD Settings
              </h3>
              <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-gray-700">Product</p>
                <p className="text-base font-semibold text-gray-900">
                  {productName || variant.grocery?.name || "Product"}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  📦 Variant: {variant.label}
                </p>
                {variant.price?.selling && (
                  <p className="text-xs text-gray-600">
                    💵 Price: ₹{variant.price.selling}
                  </p>
                )}
              </div>
            </div>

            {/* COD Allowed Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="font-medium text-gray-800">Allow COD</p>
                <p className="text-xs text-gray-600">
                  Enable/disable COD for this variant
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
                  Customers won't be able to use COD for this product
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
            <div className="flex gap-3 pt-4">
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
          </motion.div>
        </div>
      )}
    </>
  );
};

export default CodSettingsManager;
