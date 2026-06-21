"use client";

import React, { useEffect, useState } from "react";
import StoreLocationPickerModal from "@/components/location/StoreLocationPickerModal";

interface DeliverySettings {
  _id: string;
  storeLocation: {
    address: string;
    lat: number;
    lng: number;
    pincode?: string;
    city?: string;
  };
  serviceRadiusKm: number;
  broadcastBatchSize: number;
  assignmentExpiryMinutes: number;
  basePayPerKm: number;
  basePayFlat: number;
  maxParallelAssignmentsPerPartner: number;
  allowGenderFilter: boolean;
  kycRequiredForOnline: boolean;
  universalDeliveryMode: boolean;
  disablePackagingFee?: boolean;
  disableWeightSurcharge?: boolean;
  disableSurgeFee?: boolean;
  disableDeliveryFee?: boolean;
  freeDeliveryThreshold?: number;
}

export default function DeliverySettingsPage() {
  const [settings, setSettings] = useState<DeliverySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState<DeliverySettings | null>(null);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [simDistance, setSimDistance] = useState(5);

  const handleMapConfirm = (lat: number, lng: number, details: any) => {
    if (!formData) return;
    setFormData({
      ...formData,
      storeLocation: {
        address: details.address || formData.storeLocation.address,
        city: details.city || formData.storeLocation.city,
        pincode: details.pincode || formData.storeLocation.pincode,
        lat,
        lng,
      }
    });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/delivery-settings");
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setFormData(data.settings);
      }
    } catch (error) {
      setMessage("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    if (!formData) return;

    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      if (parent === "storeLocation") {
        setFormData({
          ...formData,
          storeLocation: {
            ...formData.storeLocation,
            [child]: type === "number" ? parseFloat(value) : value,
          },
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]:
          type === "number"
            ? parseFloat(value)
            : type === "checkbox"
              ? (e.target as HTMLInputElement).checked
              : value,
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/delivery-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setMessage("Settings saved successfully!");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (error) {
      setMessage("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!formData) return <div className="p-6">No settings found</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Delivery Settings</h1>
        <p className="text-gray-600">Configure delivery system parameters</p>
      </div>

      {message && (
        <div
          className={`p-4 rounded ${
            message.includes("success")
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Store Location</h2>
            <button
              type="button"
              onClick={() => setIsMapPickerOpen(true)}
              className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              📍 Pin Location on Map
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <input
                type="text"
                name="storeLocation.address"
                value={formData.storeLocation.address}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input
                type="text"
                name="storeLocation.city"
                value={formData.storeLocation.city || ""}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Latitude</label>
              <input
                type="number"
                name="storeLocation.lat"
                value={formData.storeLocation.lat}
                onChange={handleChange}
                step="0.0001"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Longitude
              </label>
              <input
                type="number"
                name="storeLocation.lng"
                value={formData.storeLocation.lng}
                onChange={handleChange}
                step="0.0001"
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pincode</label>
              <input
                type="text"
                name="storeLocation.pincode"
                value={formData.storeLocation.pincode || ""}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        </div>

        <hr />

        <div>
          <h2 className="text-lg font-semibold mb-4">Delivery Parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Service Radius (km)
              </label>
              <input
                type="number"
                name="serviceRadiusKm"
                value={formData.serviceRadiusKm}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Broadcast Batch Size
              </label>
              <input
                type="number"
                name="broadcastBatchSize"
                value={formData.broadcastBatchSize}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Assignment Expiry (minutes)
              </label>
              <input
                type="number"
                name="assignmentExpiryMinutes"
                value={formData.assignmentExpiryMinutes}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Max Parallel Assignments per Partner
              </label>
              <input
                type="number"
                name="maxParallelAssignmentsPerPartner"
                value={formData.maxParallelAssignmentsPerPartner}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        </div>

        <hr />

        <div>
          <h2 className="text-lg font-semibold mb-4">Payout Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Base Pay (Flat) - ₹
              </label>
              <input
                type="number"
                name="basePayFlat"
                value={formData.basePayFlat}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Per KM Rate - ₹
              </label>
              <input
                type="number"
                name="basePayPerKm"
                value={formData.basePayPerKm}
                onChange={handleChange}
                step="0.5"
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
          <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-700">
            Example: 5 km delivery = ₹{formData.basePayFlat} + (₹
            {formData.basePayPerKm} × 5) = ₹
            {formData.basePayFlat + formData.basePayPerKm * 5}
          </div>

          {/* Interactive Payout Simulator */}
          <div className="mt-6 p-5 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-2xl border border-slate-150 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                🚴 Delivery Partner Payout Simulator
              </h3>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                Interactive Preview
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>Simulated Distance:</span>
                <span className="text-slate-800 text-sm">{simDistance} km</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="15"
                step="0.5"
                value={simDistance}
                onChange={(e) => setSimDistance(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0.5 km</span>
                <span>15 km</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Base Pay</span>
                <span className="text-base font-extrabold text-slate-800">₹{formData.basePayFlat}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Distance Pay</span>
                <span className="text-base font-extrabold text-slate-800">₹{(formData.basePayPerKm * simDistance).toFixed(1)}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Standard Earnings</span>
                <span className="text-base font-extrabold text-green-700">₹{Math.round(formData.basePayFlat + formData.basePayPerKm * simDistance)}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
                <span className="text-[10px] font-bold text-orange-400 block uppercase">Peak Hours (1.5x)</span>
                <span className="text-base font-extrabold text-orange-700">₹{Math.round((formData.basePayFlat + formData.basePayPerKm * simDistance) * 1.5)}</span>
              </div>
            </div>
          </div>
        </div>

        <hr />

        <div>
          <h2 className="text-lg font-semibold mb-4">Feature Toggles</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                name="allowGenderFilter"
                checked={formData.allowGenderFilter}
                onChange={handleChange}
                className="h-4 w-4"
              />
              <span className="font-medium">
                Allow Gender Filter for Delivery Partners
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-7">
              If enabled, users can request male/female delivery partners during
              checkout
            </p>

            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                name="kycRequiredForOnline"
                checked={formData.kycRequiredForOnline}
                onChange={handleChange}
                className="h-4 w-4"
              />
              <span className="font-medium">
                Require KYC approval before delivery partners can go online
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-7">
              Keep this off while testing. Turn on for production enforcement.
            </p>

            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                name="universalDeliveryMode"
                checked={formData.universalDeliveryMode}
                onChange={handleChange}
                className="h-4 w-4"
              />
              <span className="font-medium text-amber-700">
                Universal Delivery Mode (Bypass Store Proximity Validation for Testing)
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-7">
              If enabled, strict proximity validation against dark stores is bypassed. Customers can place orders from any location, and the closest active store will be automatically allocated.
            </p>
          </div>
        </div>

        <hr />

        <div>
          <h2 className="text-lg font-semibold mb-4">Promotional & Checkout Fee Controls</h2>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="flex items-center gap-3 text-sm text-gray-700 font-bold">
                  <input
                    type="checkbox"
                    name="disableDeliveryFee"
                    checked={formData.disableDeliveryFee || false}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  <span>Disable Delivery Fee (Free Delivery)</span>
                </label>
                <p className="text-xs text-gray-500">
                  Enable this to waive delivery charges for all checkouts globally. Useful for special weekend promotions.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="flex items-center gap-3 text-sm text-gray-700 font-bold">
                  <input
                    type="checkbox"
                    name="disablePackagingFee"
                    checked={formData.disablePackagingFee || false}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  <span>Disable Packaging Fee</span>
                </label>
                <p className="text-xs text-gray-500">
                  Enable this to set the fixed packaging bag charge (defaults to ₹4) to ₹0 for all grocery baskets.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="flex items-center gap-3 text-sm text-gray-700 font-bold">
                  <input
                    type="checkbox"
                    name="disableSurgeFee"
                    checked={formData.disableSurgeFee || false}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  <span>Disable Surge/Peak Charges</span>
                </label>
                <p className="text-xs text-gray-500">
                  Turn off surge fee multiplier calculations (like rainy weather or peak order periods) for a smooth customer experience.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="flex items-center gap-3 text-sm text-gray-700 font-bold">
                  <input
                    type="checkbox"
                    name="disableWeightSurcharge"
                    checked={formData.disableWeightSurcharge || false}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  <span>Disable Heavy Weight Surcharges</span>
                </label>
                <p className="text-xs text-gray-500">
                  Waive the extra surcharge handling fee applied to heavy items like 10kg flour or 5L oil cans.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <label className="block text-sm font-bold text-gray-700">
                Global Free Delivery Threshold (₹)
              </label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₹</span>
                <input
                  type="number"
                  name="freeDeliveryThreshold"
                  value={formData.freeDeliveryThreshold ?? 199}
                  onChange={handleChange}
                  className="w-full pl-7 pr-3 py-2 border rounded-lg bg-white"
                  min="0"
                />
              </div>
              <p className="text-xs text-gray-500">
                Customers will automatically receive free delivery if their cart subtotal is greater than or equal to this amount. Overrides individual store configurations if lower. Default is ₹199.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
          <button
            onClick={() => setFormData(settings)}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Reset
          </button>
        </div>
      </div>

      <StoreLocationPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        initialPosition={formData.storeLocation.lat && formData.storeLocation.lng ? [formData.storeLocation.lat, formData.storeLocation.lng] : [28.6139, 77.209]}
        onConfirm={handleMapConfirm}
      />
    </div>
  );
}
