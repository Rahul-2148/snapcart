/**
 * Admin component to manage COD settings for a product variant
 */

"use client";

import React, { useState } from "react";
import { AlertCircle, Check, Loader2, Truck, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

interface CodSettingsModalProps {
  variantId: string;
  variantLabel: string;
  productName: string;
  initialCodAllowed?: boolean;
  initialHandlingCharge?: number;
  onSuccess?: () => void;
  onClose?: () => void;
}

export const CodSettingsModal: React.FC<CodSettingsModalProps> = ({
  variantId,
  variantLabel,
  productName,
  initialCodAllowed = true,
  initialHandlingCharge = 0,
  onSuccess,
  onClose,
}) => {
  const [isCodAllowed, setIsCodAllowed] = useState(initialCodAllowed);
  const [handlingCharge, setHandlingCharge] = useState(initialHandlingCharge);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!isCodAllowed && handlingCharge > 0) {
      toast.error("Handling charge should be 0 if COD is not allowed");
      return;
    }

    if (isCodAllowed && handlingCharge < 0) {
      toast.error("Handling charge cannot be negative");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put(
        `/api/admin/variants/${variantId}/cod-settings`,
        {
          isCodAllowed,
          handlingCharge: isCodAllowed ? handlingCharge : 0,
        },
      );

      if (response.data.success) {
        toast.success("COD settings updated successfully");
        onSuccess?.();
        onClose?.();
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message || "Failed to update COD settings";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-gray-800">COD Settings</h3>
        <p className="text-sm text-gray-600 mt-1">
          {productName} - {variantLabel}
        </p>
      </div>

      <div className="space-y-4">
        {/* COD Allowed Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-gray-800">Allow COD</p>
              <p className="text-xs text-gray-600">
                Enable Cash on Delivery for this variant
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isCodAllowed}
              onChange={(e) => {
                setIsCodAllowed(e.target.checked);
                if (!e.target.checked) {
                  setHandlingCharge(0);
                }
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
          </label>
        </div>

        {/* Handling Charge Input */}
        {isCodAllowed && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              COD Handling Charge (₹)
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
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
                placeholder="Enter handling charge"
                className="pl-10 w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>
            <p className="text-xs text-gray-600">
              This charge will be added to order total for COD payments
            </p>
          </div>
        )}

        {!isCodAllowed && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200 flex gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Customers won't be able to use COD for this product
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
    </div>
  );
};

export default CodSettingsModal;
