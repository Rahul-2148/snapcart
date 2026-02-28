"use client";

import React, { useEffect, useState } from "react";

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
}

export default function DeliverySettingsPage() {
  const [settings, setSettings] = useState<DeliverySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState<DeliverySettings | null>(null);

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
          <h2 className="text-lg font-semibold mb-4">Store Location</h2>
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
    </div>
  );
}
