"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import StoreLocationPickerModal from "@/components/location/StoreLocationPickerModal";
import {
  MapPin,
  Compass,
  Activity,
  Clock,
  Truck,
  IndianRupee,
  Sliders,
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Building
} from "lucide-react";

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

// ── CUSTOM PREMIUM SWITCH COMPONENT ───────────────────────────────────
const ToggleSwitch = ({
  checked,
  onChange,
  label,
  description,
  icon: Icon,
  warning
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
  icon?: any;
  warning?: boolean;
}) => (
  <div className={`flex items-start justify-between p-4 rounded-2xl border transition-all duration-200 group ${checked
    ? warning
      ? "bg-amber-50/40 border-amber-200/80 hover:bg-amber-50/60"
      : "bg-emerald-50/30 border-emerald-100 hover:bg-emerald-50/50"
    : "bg-slate-50/40 border-slate-100 hover:bg-slate-50/80"
    }`}>
    <div className="flex gap-3 mr-4">
      {Icon && (
        <div className={`p-2 rounded-xl flex items-center justify-center h-10 w-10 flex-shrink-0 transition-colors ${checked
          ? warning
            ? "bg-amber-100 text-amber-600"
            : "bg-emerald-100 text-emerald-600"
          : "bg-slate-100 text-slate-500"
          }`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
          {label}
        </h4>
        <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
          {description}
        </p>
      </div>
    </div>
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked
        ? warning
          ? "bg-amber-500"
          : "bg-emerald-500"
        : "bg-slate-200"
        }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${checked ? "translate-x-5" : "translate-x-0"
          }`}
      />
    </button>
  </div>
);

// ── CUSTOM PREMIUM INPUT FIELD COMPONENT ──────────────────────────────
const InputField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  step,
  icon: Icon,
  unit
}: any) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
      {label}
    </label>
    <div className="relative rounded-xl shadow-xs">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Icon className="w-4 h-4" />
        </div>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        step={step}
        className={`block w-full rounded-xl border border-slate-200 bg-white py-2.5 ${Icon ? "pl-10" : "pl-4"
          } ${unit ? "pr-16" : "pr-4"} text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all text-sm`}
      />
      {unit && (
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-xs font-bold text-slate-400">
          {unit}
        </div>
      )}
    </div>
  </div>
);

export default function DeliverySettingsPage() {
  const [settings, setSettings] = useState<DeliverySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState<DeliverySettings | null>(null);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [simDistance, setSimDistance] = useState(3);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
    setHasUnsavedChanges(true);
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
    } catch {
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

    setHasUnsavedChanges(true);

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

  const toggleBoolean = (key: keyof DeliverySettings) => {
    if (!formData) return;
    setHasUnsavedChanges(true);
    setFormData({
      ...formData,
      [key]: !formData[key],
    });
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
        setHasUnsavedChanges(false);
        setMessage("Settings updated successfully!");
        toastSuccessNotification();
        setTimeout(() => setMessage(""), 4000);
      }
    } catch {
      setMessage("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const toastSuccessNotification = () => {
    toast.success("Delivery settings saved successfully!");
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-bold text-slate-500">Loading delivery configuration...</p>
    </div>
  );

  if (!formData) return <div className="p-6 text-center text-slate-500">No settings found in the database.</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 text-slate-800">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-50 text-blue-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Control Panel
            </span>
            {formData.universalDeliveryMode && (
              <span className="bg-amber-50 text-amber-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Testing Mode
              </span>
            )}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1 text-slate-900">
            Delivery & Dispatch Settings
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage dark store boundary limits, partner payouts, and checkout fee waiving thresholds.
          </p>
        </div>

        <div className="flex gap-2">
          {hasUnsavedChanges && (
            <button
              onClick={() => {
                setFormData(settings);
                setHasUnsavedChanges(false);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-md ${hasUnsavedChanges
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10"
              : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
              }`}
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>

      {/* POPUP ALERT MESSAGE */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 border animate-fadeIn ${message.includes("successfully")
            ? "bg-emerald-50/50 text-emerald-800 border-emerald-200"
            : "bg-red-50 text-red-800 border-red-200"
            }`}
        >
          <div className={`p-1 rounded-full ${message.includes("successfully") ? "bg-emerald-100" : "bg-red-100"}`}>
            <Check className="w-4 h-4" />
          </div>
          <p className="text-sm font-bold">{message}</p>
        </div>
      )}

      {/* DYNAMIC METRIC OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-150 shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Universal Delivery</span>
          <span className={`text-sm font-extrabold ${formData.universalDeliveryMode ? "text-amber-600" : "text-emerald-600"}`}>
            {formData.universalDeliveryMode ? "⚠️ Enabled (Testing)" : "✅ Enforced (Production)"}
          </span>
        </div>
        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-150 shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Free Delivery Above</span>
          <span className="text-sm font-extrabold text-slate-800">
            ₹{formData.freeDeliveryThreshold ?? 199}
          </span>
        </div>
        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-150 shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Base Pay (Flat)</span>
          <span className="text-sm font-extrabold text-slate-800">
            ₹{formData.basePayFlat}
          </span>
        </div>
        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-150 shadow-xs space-y-1">
          <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Base Pay (Per KM)</span>
          <span className="text-sm font-extrabold text-slate-800">
            ₹{formData.basePayPerKm}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* SECTION 1: STORE COORDINATES */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Default Store Location</h3>
                <p className="text-xs text-slate-400">Stores reference this coordinate for dispatch simulations.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMapPickerOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-500/10 cursor-pointer"
            >
              📍 Pin Location on Map
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <InputField
                label="Full Address"
                name="storeLocation.address"
                value={formData.storeLocation.address}
                onChange={handleChange}
                icon={MapPin}
              />
            </div>
            <InputField
              label="City"
              name="storeLocation.city"
              value={formData.storeLocation.city || ""}
              onChange={handleChange}
              icon={Building}
            />
            <InputField
              label="Pincode / Zip Code"
              name="storeLocation.pincode"
              value={formData.storeLocation.pincode || ""}
              onChange={handleChange}
              icon={Compass}
            />
            <div className="grid grid-cols-2 gap-2 sm:col-span-1">
              <InputField
                label="Latitude"
                name="storeLocation.lat"
                value={formData.storeLocation.lat}
                onChange={handleChange}
                type="number"
                step="0.0001"
              />
              <InputField
                label="Longitude"
                name="storeLocation.lng"
                value={formData.storeLocation.lng}
                onChange={handleChange}
                type="number"
                step="0.0001"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: DISPATCH PARAMETERS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Dispatch & Coverage Boundaries</h3>
              <p className="text-xs text-slate-400">Manage dark store delivery limits and partner assign batches.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <InputField
                label="Store Service Radius"
                name="serviceRadiusKm"
                value={formData.serviceRadiusKm}
                onChange={handleChange}
                type="number"
                unit="km"
                icon={Compass}
              />
              <p className="text-[10px] text-slate-400 leading-relaxed px-1">
                For Zepto/Blinkit grade, set this to **3 km to 5 km**.
              </p>
            </div>

            <div className="space-y-1">
              <InputField
                label="Broadcast Batch Size"
                name="broadcastBatchSize"
                value={formData.broadcastBatchSize}
                onChange={handleChange}
                type="number"
                unit="riders"
                icon={Activity}
              />
              <p className="text-[10px] text-slate-400 leading-relaxed px-1">
                Number of delivery partners notified simultaneously per order batch.
              </p>
            </div>

            <div className="space-y-1">
              <InputField
                label="Assignment Expiry Timeout"
                name="assignmentExpiryMinutes"
                value={formData.assignmentExpiryMinutes}
                onChange={handleChange}
                type="number"
                unit="minutes"
                icon={Clock}
              />
              <p className="text-[10px] text-slate-400 leading-relaxed px-1">
                Time limit for a rider to accept the broadcast before it goes to the next batch.
              </p>
            </div>

            <div className="space-y-1">
              <InputField
                label="Max Parallel Orders per Rider"
                name="maxParallelAssignmentsPerPartner"
                value={formData.maxParallelAssignmentsPerPartner}
                onChange={handleChange}
                type="number"
                unit="orders"
                icon={Truck}
              />
              <p className="text-[10px] text-slate-400 leading-relaxed px-1">
                Max concurrent assignments a single delivery partner can load in their queue.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 3: CHECKOUT FEES CONTROLS */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <div className="p-2 bg-pink-50 rounded-xl text-pink-600">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Checkout Fees & Promotion Controls</h3>
              <p className="text-xs text-slate-400">Waive packaging, surge, or delivery charges globally.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ToggleSwitch
              checked={formData.disableDeliveryFee || false}
              onChange={() => toggleBoolean("disableDeliveryFee")}
              label="Waive Delivery Fee (Free Delivery)"
              description="Waive all delivery fees globally. Useful for weekend launch promotions."
              icon={Truck}
            />
            <ToggleSwitch
              checked={formData.disablePackagingFee || false}
              onChange={() => toggleBoolean("disablePackagingFee")}
              label="Waive Packaging Fee"
              description="Remove the fixed bag charge (defaults to ₹4) from customer carts."
              icon={Sliders}
            />
            <ToggleSwitch
              checked={formData.disableSurgeFee || false}
              onChange={() => toggleBoolean("disableSurgeFee")}
              label="Waive Surge / Weather Fees"
              description="Waive extra surcharges applied during rain, high demand, or late hours."
              icon={AlertCircle}
            />
            <ToggleSwitch
              checked={formData.disableWeightSurcharge || false}
              onChange={() => toggleBoolean("disableWeightSurcharge")}
              label="Waive Heavy Surcharge"
              description="Do not apply extra charges for heavy items (like 10kg rice or oil cans)."
              icon={Sliders}
            />
          </div>

          <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-2 mt-2">
            <InputField
              label="Global Free Delivery Threshold"
              name="freeDeliveryThreshold"
              value={formData.freeDeliveryThreshold ?? 199}
              onChange={handleChange}
              type="number"
              unit="INR (₹)"
              icon={IndianRupee}
            />
            <p className="text-xs text-slate-400 leading-relaxed px-1">
              Customers will receive free delivery automatically if their cart value exceeds this threshold. Defaults to **₹199**.
            </p>
          </div>
        </div>

        {/* SECTION 4: PARTNER PAYOUT & SIMULATOR */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Rider Payout Matrix</h3>
              <p className="text-xs text-slate-400">Configure base flat rates and per-km compensation variables.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Base Pay (Flat)"
              name="basePayFlat"
              value={formData.basePayFlat}
              onChange={handleChange}
              type="number"
              unit="INR (₹)"
              icon={IndianRupee}
            />
            <InputField
              label="Per Kilometer Rate"
              name="basePayPerKm"
              value={formData.basePayPerKm}
              onChange={handleChange}
              type="number"
              step="0.5"
              unit="₹ / km"
              icon={Compass}
            />
          </div>

          {/* INTERACTIVE PAYOUT SIMULATOR */}
          <div className="p-5 bg-gradient-to-br from-slate-50/50 to-blue-50/20 rounded-2xl border border-slate-150/70 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                <h4 className="text-xs font-extrabold text-slate-600 uppercase tracking-wide">
                  🚴 Interactive Rider Payout Simulator
                </h4>
              </div>
              <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Live Calculation
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-500">
                <span>Simulated Ride Distance:</span>
                <span className="text-slate-800 text-sm font-extrabold">{simDistance} km</span>
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
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                <span>0.5 km (Short Trip)</span>
                <span>15 km (Long Trip)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-white p-3.5 rounded-xl border border-slate-100/80 shadow-xs">
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Base Flat Pay</span>
                <span className="text-base font-extrabold text-slate-800">₹{formData.basePayFlat}</span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-100/80 shadow-xs">
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Distance Pay</span>
                <span className="text-base font-extrabold text-slate-800">₹{(formData.basePayPerKm * simDistance).toFixed(1)}</span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-100/80 shadow-xs bg-emerald-50/10">
                <span className="text-[9px] font-extrabold text-emerald-600 block uppercase tracking-wider">Total Rider Pay</span>
                <span className="text-base font-extrabold text-emerald-700">₹{Math.round(formData.basePayFlat + formData.basePayPerKm * simDistance)}</span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-100/80 shadow-xs bg-amber-50/10">
                <span className="text-[9px] font-extrabold text-amber-600 block uppercase tracking-wider">Rain / Peak (1.5x)</span>
                <span className="text-base font-extrabold text-amber-700">₹{Math.round((formData.basePayFlat + formData.basePayPerKm * simDistance) * 1.5)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: OPERATIONS & COMPLIANCE TOGGLES */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Compliance & Operation Toggles</h3>
              <p className="text-xs text-slate-400">Configure KYC requirements and sandbox testing toggles.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <ToggleSwitch
              checked={formData.allowGenderFilter}
              onChange={() => toggleBoolean("allowGenderFilter")}
              label="Allow Gender Selection Filter"
              description="If active, customers can request delivery partners of a specific gender during checkout."
              icon={Sliders}
            />

            <ToggleSwitch
              checked={formData.kycRequiredForOnline}
              onChange={() => toggleBoolean("kycRequiredForOnline")}
              label="Enforce KYC Verification"
              description="Requires riders to submit and receive approval on document KYC (e.g. Digilocker) before they can toggle themselves ONLINE."
              icon={ShieldCheck}
            />

            <ToggleSwitch
              checked={formData.universalDeliveryMode}
              onChange={() => toggleBoolean("universalDeliveryMode")}
              label="Universal Delivery Mode (Testing Bypass)"
              description="Bypasses all dark store service radius restrictions. Customers can browse and order from any location (closest active store will deliver). Keep disabled in production."
              icon={AlertCircle}
              warning={true}
            />
          </div>
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
