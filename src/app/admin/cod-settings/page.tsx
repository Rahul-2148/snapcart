"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import axios from "axios";

export default function CodSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [settings, setSettings] = useState({
    isEnabled: true,
    flatCharge: 10,
    minOrderValue: 100,
    maxOrderValue: 1000,
  });

  // Fetch current settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get("/api/admin/cod-settings");
        if (response.data.success) {
          setSettings({
            isEnabled: response.data.data.isEnabled,
            flatCharge: response.data.data.flatCharge,
            minOrderValue: response.data.data.minOrderValue,
            maxOrderValue: response.data.data.maxOrderValue,
          });
        }
      } catch (error) {
        console.error("Error fetching COD settings:", error);
        toast.error("Failed to fetch COD settings");
      } finally {
        setFetching(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    // Validation
    if (settings.minOrderValue >= settings.maxOrderValue) {
      toast.error("Min order value must be less than max order value");
      return;
    }

    if (
      settings.flatCharge < 0 ||
      settings.minOrderValue < 0 ||
      settings.maxOrderValue < 0
    ) {
      toast.error("Values cannot be negative");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.put("/api/admin/cod-settings", settings);
      if (response.data.success) {
        toast.success("✓ COD settings saved successfully");
      }
    } catch (error: any) {
      console.error("Error saving COD settings:", error);
      toast.error(error.response?.data?.error || "Failed to save COD settings");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            COD Settings
          </h1>
          <p className="text-gray-600 mb-8">
            Configure Cash on Delivery options
          </p>

          <div className="space-y-6">
            {/* Enable/Disable COD */}
            <div className="border border-gray-200 rounded-lg p-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.isEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, isEnabled: e.target.checked })
                  }
                  className="w-5 h-5 rounded border-gray-300"
                />
                <span className="ml-3 text-lg font-medium text-gray-900">
                  Enable Cash on Delivery
                </span>
              </label>
              <p className="text-sm text-gray-500 mt-2">
                When disabled, COD will not be available for any orders
              </p>
            </div>

            {/* Flat Charge */}
            <div className="border border-gray-200 rounded-lg p-6">
              <label className="block text-lg font-medium text-gray-900 mb-2">
                COD Flat Charge (₹)
              </label>
              <p className="text-sm text-gray-600 mb-3">
                This is a single fee charged per order, regardless of number of
                items
              </p>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.flatCharge}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    flatCharge: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter flat charge amount"
              />
              <p className="text-xs text-gray-500 mt-2">
                Example: Enter 10 for ₹10 per order
              </p>
            </div>

            {/* Minimum Order Value */}
            <div className="border border-gray-200 rounded-lg p-6">
              <label className="block text-lg font-medium text-gray-900 mb-2">
                Minimum Order Value (₹)
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Minimum cart value to enable COD
              </p>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.minOrderValue}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    minOrderValue: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter minimum order value"
              />
              <p className="text-xs text-gray-500 mt-2">
                COD will not be available for orders below this value
              </p>
            </div>

            {/* Maximum Order Value */}
            <div className="border border-gray-200 rounded-lg p-6">
              <label className="block text-lg font-medium text-gray-900 mb-2">
                Maximum Order Value (₹)
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Maximum cart value to enable COD
              </p>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.maxOrderValue}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxOrderValue: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter maximum order value"
              />
              <p className="text-xs text-gray-500 mt-2">
                COD will not be available for orders above this value
              </p>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-3">
                Current Configuration
              </h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p>
                  <strong>Status:</strong>{" "}
                  {settings.isEnabled ? "✓ COD Enabled" : "✗ COD Disabled"}
                </p>
                <p>
                  <strong>Flat Charge:</strong> ₹
                  {settings.flatCharge.toFixed(2)} per order
                </p>
                <p>
                  <strong>Min Order:</strong> ₹
                  {settings.minOrderValue.toFixed(2)}
                </p>
                <p>
                  <strong>Max Order:</strong> ₹
                  {settings.maxOrderValue.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save COD Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
