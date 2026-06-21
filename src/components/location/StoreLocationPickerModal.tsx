// src/components/location/StoreLocationPickerModal.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, MapPin, Search, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import axios from "axios";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { extractCityStateFromLabel } from "@/lib/utils/extractCityStateFromLabel";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

interface StoreLocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    lat: number,
    lng: number,
    addressDetails: {
      address: string;
      city: string;
      state: string;
      pincode: string;
      district?: string;
      area?: string;
    }
  ) => void;
  initialPosition?: [number, number] | null;
}

export default function StoreLocationPickerModal({
  isOpen,
  onClose,
  onConfirm,
  initialPosition,
}: StoreLocationPickerModalProps) {
  const [position, setPosition] = useState<[number, number]>([28.6139, 77.209]); // Delhi default
  const [addressText, setAddressText] = useState("");
  const [addressComponents, setAddressComponents] = useState({
    address: "",
    city: "",
    state: "",
    pincode: "",
    district: "",
    area: "",
  });
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Init position
  useEffect(() => {
    if (isOpen) {
      setSearchResults([]);
      setSearchQuery("");
      if (initialPosition && initialPosition[0] && initialPosition[1]) {
        setPosition(initialPosition);
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
          undefined,
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    }
  }, [isOpen, initialPosition]);

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
          
          // Form street address
          const street =
            addr.road ||
            addr.suburb ||
            addr.neighbourhood ||
            addr.hamlet ||
            addr.industrial ||
            "";
          
          setAddressComponents({
            address:
              response.data.display_name?.split(",").slice(0, 3).join(",") ||
              street ||
              "",
            city: addr.city || addr.town || addr.village || addr.suburb || "",
            state: addr.state || "",
            pincode: addr.postcode || "",
            district: addr.state_district || addr.county || "",
            area: addr.suburb || addr.neighbourhood || addr.village || "",
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

  // Search suggestions using OSM
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
    const street =
      addr.road ||
      addr.suburb ||
      addr.neighbourhood ||
      addr.hamlet ||
      addr.industrial ||
      "";

    setPosition([result.y, result.x]);
    setAddressText(result.label);
    setAddressComponents({
      address: result.label?.split(",").slice(0, 3).join(",") || street || "",
      city:
        addr.city ||
        addr.town ||
        addr.village ||
        addr.suburb ||
        labelFallback.city ||
        "",
      state: addr.state || labelFallback.state || "",
      pincode: addr.postcode || "",
      district: addr.state_district || addr.county || "",
      area: addr.suburb || addr.neighbourhood || addr.village || "",
    });
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    const toastId = toast.loading("Locating GPS position...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        toast.dismiss(toastId);
        toast.success("Location centered!");
      },
      (err) => {
        toast.dismiss(toastId);
        toast.error("Could not obtain GPS location. Search manually.");
        console.error(err);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleConfirmLocation = () => {
    if (!addressComponents.city || !addressComponents.state) {
      toast.error(
        "Unable to resolve city and state for this location. Please try dragging the marker slightly."
      );
      return;
    }
    onConfirm(position[0], position[1], addressComponents);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="absolute inset-0 cursor-default" onClick={onClose}></div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.96 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative bg-white w-full max-w-2xl h-[80vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-1.5">
                <MapPin className="text-green-600 w-5 h-5" />
                Select Location Coordinates
              </h2>
              <p className="text-xs text-gray-500">
                Drag the pin or search for a location to pinpoint store coordinates
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-600"
            >
              <X className="w-5.5 h-5.5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="absolute top-4 left-4 right-4 z-20">
              <div className="relative shadow-lg rounded-2xl bg-white border border-gray-100 overflow-hidden">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for area, building, street..."
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
                        Searching...
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

            {/* Map */}
            <div className="flex-1 z-0 relative">
              <MapView
                position={position}
                radius={0}
                onPositionChange={setPosition}
                handleCurrentLocation={handleCurrentLocation}
              />
            </div>

            {/* Bottom Panel */}
            <div className="bg-white px-6 py-5 border-t border-gray-100 flex-shrink-0 shadow-2xl relative z-10">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 text-green-600">
                  <MapPin className="w-5 h-5 animate-bounce" />
                </div>
                <div className="flex-1 min-w-0">
                  {isGeocoding ? (
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-green-600" />
                      Locating location details...
                    </div>
                  ) : (
                    <>
                      <h4 className="text-sm font-bold text-gray-800 truncate">
                        {addressComponents.city || "Pinpoint Location"}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {addressText || "Move map or drag marker to set coordinates"}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmLocation}
                  disabled={isGeocoding || !addressText}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-6 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-green-600/10"
                >
                  <Check className="w-5 h-5" />
                  Confirm Location & Coordinates
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 px-6 rounded-2xl transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
