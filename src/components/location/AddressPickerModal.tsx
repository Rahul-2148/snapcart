// src/components/location/AddressPickerModal.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, MapPin, Search, Loader2, Home, Briefcase, Sparkles, AlertCircle, Check, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { extractCityStateFromLabel } from "@/lib/utils/extractCityStateFromLabel";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

interface AddressPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (addressData: any) => void;
  initialPosition?: [number, number] | null;
  editingAddressData?: any | null;
}

export default function AddressPickerModal({
  isOpen,
  onClose,
  onConfirm,
  initialPosition,
  editingAddressData,
}: AddressPickerModalProps) {
  // Navigation states: "map" | "details"
  const [step, setStep] = useState<"map" | "details">("map");

  // Map & Location States
  const [position, setPosition] = useState<[number, number]>([28.6139, 77.209]); // Default to Delhi
  const [addressText, setAddressText] = useState("");
  const [addressComponents, setAddressComponents] = useState({
    city: "",
    state: "",
    pincode: "",
    country: "India",
  });
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Form Details States
  const [details, setDetails] = useState({
    houseNumber: "",
    landmark: "",
    fullName: "",
    mobile: "",
    alternateMobile: "",
    type: "home" as "home" | "work" | "others",
    customLabel: "",
  });

  // Init position and data
  useEffect(() => {
    if (isOpen) {
      setStep("map");
      setSearchResults([]);
      setSearchQuery("");

      if (editingAddressData) {
        setDetails({
          houseNumber: editingAddressData.street || "",
          landmark: editingAddressData.label || "", // Reuse label field for landmark
          fullName: editingAddressData.fullName || "",
          mobile: editingAddressData.mobile || "",
          alternateMobile: editingAddressData.alternateMobile || "",
          type: editingAddressData.type || "home",
          customLabel: editingAddressData.customLabel || "",
        });

        if (editingAddressData.latitude && editingAddressData.longitude) {
          setPosition([editingAddressData.latitude, editingAddressData.longitude]);
        }
      } else {
        setDetails({
          houseNumber: "",
          landmark: "",
          fullName: "",
          mobile: "",
          alternateMobile: "",
          type: "home",
          customLabel: "",
        });
        if (initialPosition) {
          setPosition(initialPosition);
        } else if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
            undefined,
            { enableHighAccuracy: true, timeout: 5000 }
          );
        }
      }
    }
  }, [isOpen, initialPosition, editingAddressData]);

  // Reverse geocode when position changes
  useEffect(() => {
    if (!isOpen || !position) return;

    const reverseGeocode = async () => {
      setIsGeocoding(true);
      try {
        const response = await axios.get(
          `/api/geocode?lat=${position[0]}&lon=${position[1]}`
        );
        if (response.data) {
          setAddressText(response.data.display_name || "");
          const addr = response.data.address || {};
          setAddressComponents({
            city: addr.city || addr.town || addr.village || addr.suburb || "",
            state: addr.state || "",
            pincode: addr.postcode || "",
            country: addr.country || "India",
          });
        }
      } catch (err) {
        console.error("Reverse geocoding error:", err);
      } finally {
        setIsGeocoding(false);
      }
    };

    const delayDebounce = setTimeout(reverseGeocode, 400);
    return () => clearTimeout(delayDebounce);
  }, [position, isOpen]);

  // Search Address suggestions
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { OpenStreetMapProvider } = await import("leaflet-geosearch");
        const provider = new OpenStreetMapProvider({
          params: { countrycodes: "in", "accept-language": "en" },
        });
        const results = await provider.search({ query: searchQuery });
        setSearchResults(results.slice(0, 5));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const handleSelectSearchResult = (result: any) => {
    const raw = result.raw || {};
    const addr = raw.address || {};
    const labelFallback = extractCityStateFromLabel(result.label);

    setPosition([result.y, result.x]);
    setAddressText(result.label);
    setAddressComponents({
      city: addr.city || addr.town || addr.village || addr.suburb || labelFallback.city || "",
      state: addr.state || labelFallback.state || "",
      pincode: addr.postcode || "",
      country: addr.country || "India",
    });
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    const toastId = toast.loading("Fetching GPS coordinates...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        toast.dismiss(toastId);
        toast.success("Location centered!");
      },
      (err) => {
        toast.dismiss(toastId);
        toast.error("Failed to detect location. Please search manually.");
        console.error(err);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleConfirmLocation = () => {
    if (!addressComponents.city || !addressComponents.state) {
      toast.error("Please select a location with a valid city and state.");
      return;
    }
    setStep("details");
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!details.houseNumber.trim() || !details.fullName.trim() || !details.mobile.trim()) {
      toast.error("Please fill in all required fields (*)");
      return;
    }

    if (!/^[0-9]{10}$/.test(details.mobile)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    if (details.alternateMobile.trim() && !/^[0-9]{10}$/.test(details.alternateMobile)) {
      toast.error("Please enter a valid 10-digit alternate mobile number");
      return;
    }

    if (details.type === "others" && !details.customLabel.trim()) {
      toast.error("Please provide an address label (e.g. Gym)");
      return;
    }

    const payload = {
      street: details.houseNumber,
      fullAddress: addressText,
      city: addressComponents.city,
      state: addressComponents.state,
      zipCode: addressComponents.pincode || "000000",
      country: addressComponents.country,
      type: details.type,
      label: details.landmark, // Save landmark in label field
      landmark: details.landmark, // Explicit landmark property
      latitude: position[0],
      longitude: position[1],
      fullName: details.fullName,
      mobile: details.mobile,
      alternateMobile: details.alternateMobile,
      customLabel: details.type === "others" ? details.customLabel : "",
    };

    try {
      let savedAddress = null;
      if (editingAddressData?._id) {
        const res = await axios.put(`/api/user/addresses/${editingAddressData._id}`, payload);
        savedAddress = res.data.address;
        toast.success("Address updated successfully!");
      } else {
        const res = await axios.post("/api/user/addresses", payload);
        savedAddress = res.data.address;
        toast.success("Address added successfully!");
      }
      onConfirm(savedAddress);
    } catch (err: any) {
      console.error("Failed to save address:", err);
      // Fallback: If API fails (e.g. not logged in), confirm with temporary object
      toast.success("Address selected!");
      onConfirm({
        _id: editingAddressData?._id || `temp-${Date.now()}`,
        ...payload,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-start md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4">
        {/* Backdrop close */}
        <div className="absolute inset-0 cursor-default" onClick={onClose}></div>

        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative bg-white w-full md:max-w-xl h-[100vh] md:h-[90vh] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-1.5">
                <MapPin className="text-green-600 w-5 h-5" />
                {step === "map" ? "Select Delivery Location" : "Complete Address Details"}
              </h2>
              <p className="text-xs text-gray-500">
                {step === "map" ? "Pinpoint on map for accurate 10-minute delivery" : "Provide house number, landmark, and contact details"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-600"
            >
              <X className="w-5.5 h-5.5" />
            </button>
          </div>

          {/* Step 1: Map Picker */}
          {step === "map" && (
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {/* Search Autocomplete Bar */}
              <div className="absolute top-4 left-4 right-4 z-20">
                <div className="relative shadow-lg rounded-2xl bg-white border border-gray-100 overflow-hidden">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for area, building, street name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-10 py-3 text-sm outline-none focus:ring-0 bg-transparent placeholder-gray-400 text-gray-700 font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 text-gray-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Suggestions List */}
                <AnimatePresence>
                  {(isSearching || searchResults.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto pr-1 z-30"
                    >
                      {isSearching && (
                        <div className="flex items-center justify-center py-6 gap-2 text-sm text-gray-500 font-medium">
                          <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                          Searching location...
                        </div>
                      )}
                      {!isSearching &&
                        searchResults.map((result, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectSearchResult(result)}
                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition border-b border-slate-50 last:border-b-0 text-left"
                          >
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm text-slate-800 font-semibold truncate">
                                {result.label?.split(",")[0]}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {result.label}
                              </p>
                            </div>
                          </button>
                        ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Leaflet Map Viewer */}
              <div className="flex-1 z-0 relative">
                <MapView
                  position={position}
                  radius={0} // No radius display needed for picker
                  onPositionChange={setPosition}
                  handleCurrentLocation={handleCurrentLocation}
                />
              </div>

              {/* Bottom Address display sheet */}
              <div className="bg-white px-6 py-5 border-t border-gray-100 flex-shrink-0 shadow-2xl relative z-10">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Select Location
                </p>
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 text-green-600">
                    <MapPin className="w-5 h-5 animate-bounce" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isGeocoding ? (
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 py-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-green-600" />
                        Fetching location details...
                      </div>
                    ) : (
                      <>
                        <h4 className="text-sm font-bold text-gray-800 truncate">
                          {addressComponents.city || "Pinpoint Location"}
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {addressText || "Move map or drag marker to set address"}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleConfirmLocation}
                  disabled={isGeocoding || !addressText}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-6 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-green-600/10"
                >
                  Confirm Location & Proceed
                </motion.button>
              </div>
            </div>
          )}

          {/* Step 2: Complete Address Details */}
          {step === "details" && (
            <form onSubmit={handleSaveAddress} className="flex-1 flex flex-col justify-between overflow-y-auto">
              <div className="p-6 space-y-5">
                {/* Location Summary card */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-green-600 uppercase tracking-wide">
                      Selected Location
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1 mt-0.5">
                      {addressComponents.city}, {addressComponents.state}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-normal">
                      {addressText}
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep("map")}
                      className="text-xs font-bold text-green-600 hover:text-green-700 mt-2 underline block underline-offset-2"
                    >
                      Change location pin
                    </button>
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      House / Flat / Floor / Building Number *
                    </label>
                    <input
                      type="text"
                      value={details.houseNumber}
                      onChange={(e) => setDetails({ ...details, houseNumber: e.target.value })}
                      placeholder="e.g. Flat 402, Block B, Silver Palms Apartment"
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      Nearby Landmark / Delivery Instructions (Optional)
                    </label>
                    <input
                      type="text"
                      value={details.landmark}
                      onChange={(e) => setDetails({ ...details, landmark: e.target.value })}
                      placeholder="e.g. Opposite Central Park, next to Apollo Pharmacy"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                        Receiver's Name *
                      </label>
                      <input
                        type="text"
                        value={details.fullName}
                        onChange={(e) => setDetails({ ...details, fullName: e.target.value })}
                        placeholder="Full Name"
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                        Receiver's Phone *
                      </label>
                      <input
                        type="tel"
                        value={details.mobile}
                        onChange={(e) => setDetails({ ...details, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                        placeholder="10-digit Mobile Number"
                        maxLength={10}
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition"
                      />
                      {details.mobile && !/^[0-9]{10}$/.test(details.mobile) && (
                        <p className="text-red-500 text-[11px] mt-1">Must be a valid 10-digit number</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      Alternate Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={details.alternateMobile}
                      onChange={(e) => setDetails({ ...details, alternateMobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      placeholder="10-digit Alternate Mobile Number"
                      maxLength={10}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition"
                    />
                    {details.alternateMobile && !/^[0-9]{10}$/.test(details.alternateMobile) && (
                      <p className="text-red-500 text-[11px] mt-1">Must be a valid 10-digit number</p>
                    )}
                  </div>

                  {/* Save As Chips */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                      Save Address As
                    </label>
                    <div className="flex gap-2">
                      {[
                        { key: "home", label: "Home", icon: Home, color: "text-blue-500 border-blue-100 bg-blue-50/30" },
                        { key: "work", label: "Work", icon: Briefcase, color: "text-emerald-500 border-emerald-100 bg-emerald-50/30" },
                        { key: "others", label: "Other", icon: MapPin, color: "text-purple-500 border-purple-100 bg-purple-50/30" },
                      ].map((chip) => {
                        const Icon = chip.icon;
                        const isSelected = details.type === chip.key;
                        return (
                          <button
                            key={chip.key}
                            type="button"
                            onClick={() => setDetails({ ...details, type: chip.key as any })}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border text-xs font-bold transition cursor-pointer ${
                              isSelected
                                ? "border-green-600 bg-green-50 text-green-700 font-extrabold shadow-sm"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isSelected ? "text-green-600" : "text-slate-400"}`} />
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <AnimatePresence>
                    {details.type === "others" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                          Address Designation Label (e.g., Gym, Friend's house) *
                        </label>
                        <input
                          type="text"
                          value={details.customLabel}
                          onChange={(e) => setDetails({ ...details, customLabel: e.target.value })}
                          placeholder="e.g. Gym, Parents' Home, Friend's house"
                          required
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Save Address Button */}
              <div className="bg-white px-6 py-5 border-t border-gray-100 flex-shrink-0">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-6 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-green-600/10"
                >
                  <Check className="w-5 h-5" />
                  Save & Deliver Here
                </motion.button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
