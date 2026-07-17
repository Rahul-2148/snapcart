// src/components/location/LocationPickerModal.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  X,
  MapPin,
  Search,
  Navigation,
  Loader2,
  Home,
  Briefcase,
  Clock,
  Crosshair,
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/redux/store";
import {
  setLocationPickerOpen,
  setLocation,
  setDetecting,
  setPermissionStatus,
  reverseGeocodeCoords,
  fetchNearbyStores,
  setShowGpsOverlay,
} from "@/redux/features/locationSlice";
import {
  getCurrentPosition,
  type GeolocationError,
} from "@/lib/services/geolocation.service";
import axios from "axios";
import { toast } from "sonner";

const LocationPickerModal = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.location.isLocationPickerOpen);
  const currentLocation = useAppSelector((state) => state.location);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetectingGPS, setIsDetectingGPS] = useState(false);
  const [pincodeInput, setPincodeInput] = useState("");
  const [pincodeStatus, setPincodeStatus] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch saved addresses
  useEffect(() => {
    if (isOpen) {
      const fetchAddresses = async () => {
        try {
          const res = await axios.get("/api/user/addresses");
          setSavedAddresses(res.data.addresses || []);
        } catch {
          // Not logged in or error — skip
        }
      };
      fetchAddresses();

      // Focus search input
      setTimeout(() => searchInputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // ── GPS Detection ─────────────────────────────────────────────────
  const handleUseCurrentLocation = useCallback(async () => {
    setIsDetectingGPS(true);
    dispatch(setDetecting(true));
    dispatch(setShowGpsOverlay(true));
    dispatch(setLocationPickerOpen(false));

    try {
      const pos = await getCurrentPosition({ 
        timeout: 15000,
        enableHighAccuracy: true,
        maximumAge: 0
      });
      const geocodeResult = await dispatch(
        reverseGeocodeCoords({ lat: pos.latitude, lng: pos.longitude }),
      ).unwrap();

      dispatch(
        setLocation({
          latitude: pos.latitude,
          longitude: pos.longitude,
          fullAddress: geocodeResult.fullAddress,
          shortAddress: geocodeResult.shortAddress,
          area: geocodeResult.area,
          city: geocodeResult.city,
          state: geocodeResult.state,
          country: geocodeResult.country,
          pincode: geocodeResult.pincode,
          source: "gps",
        }),
      );

      dispatch(fetchNearbyStores({ lat: pos.latitude, lng: pos.longitude }));
      dispatch(setPermissionStatus("granted"));
      toast.success("Location updated!");

      // Set snapcart_gps_detected_this_session so it doesn't auto-detect again this session
      if (typeof window !== "undefined") {
        sessionStorage.setItem("snapcart_gps_detected_this_session", "true");
      }

      // Short celebration delay so the user sees "Location Found!" in the overlay
      setTimeout(() => {
        dispatch(setShowGpsOverlay(false));
      }, 2500);
    } catch (err) {
      dispatch(setShowGpsOverlay(false));
      const geoErr = err as GeolocationError;
      toast.error(geoErr.message || "Failed to detect location");
      if (geoErr.type === "PERMISSION_DENIED") {
        dispatch(setPermissionStatus("denied"));
      }
    } finally {
      setIsDetectingGPS(false);
      dispatch(setDetecting(false));
    }
  }, [dispatch]);

  // ── Search with debounce ──────────────────────────────────────────
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
        setSearchResults(results.slice(0, 6));
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

  // ── Select search result ──────────────────────────────────────────
  const handleSelectResult = async (result: any) => {
    const raw = result.raw as any;
    const addr = raw?.address || {};

    const lat = result.y;
    const lng = result.x;

    const landmark =
      raw?.name ||
      addr.building ||
      addr.amenity ||
      addr.shop ||
      addr.office ||
      addr.apartments ||
      addr.house_name ||
      addr.residential ||
      "";
    let shortAddress = landmark;
    if (!shortAddress) {
      const parts = (result.label || "").split(",");
      shortAddress = parts.slice(0, 2).join(",").trim();
    }

    dispatch(
      setLocation({
        latitude: lat,
        longitude: lng,
        fullAddress: result.label || "",
        shortAddress,
        area:
          addr.suburb ||
          addr.neighbourhood ||
          addr.village ||
          addr.town ||
          "",
        city:
          addr.city ||
          addr.town ||
          addr.village ||
          addr.county ||
          "",
        state: addr.state || "",
        country: addr.country || "India",
        pincode: addr.postcode || "",
        source: "manual",
      }),
    );

    dispatch(fetchNearbyStores({ lat, lng }));
    dispatch(setLocationPickerOpen(false));
    toast.success("Location updated!");
  };

  // ── Select saved address ──────────────────────────────────────────
  const handleSelectSavedAddress = async (address: any) => {
    // Instantly update the local UI state so the active card reflects the selection!
    setSavedAddresses((prev) =>
      prev.map((addr) => ({
        ...addr,
        isDefault: addr._id === address._id,
      })),
    );

    try {
      await axios.post("/api/address/select", { addressId: address._id });

      if (address.latitude && address.longitude) {
        dispatch(
          setLocation({
            latitude: address.latitude,
            longitude: address.longitude,
            fullAddress: address.fullAddress || address.street,
            shortAddress: address.name || address.street,
            area: "",
            city: address.city,
            state: address.state,
            country: address.country || "India",
            pincode: address.zipCode,
            source: "saved",
          }),
        );
        dispatch(
          fetchNearbyStores({
            lat: address.latitude,
            lng: address.longitude,
          }),
        );
      } else {
        // Address without coordinates — use city name for geocoding
        dispatch(
          setLocation({
            latitude: 0,
            longitude: 0,
            fullAddress: address.street,
            shortAddress: address.name || address.street,
            area: "",
            city: address.city,
            state: address.state,
            country: address.country || "India",
            pincode: address.zipCode,
            source: "saved",
          }),
        );
      }

      dispatch(setLocationPickerOpen(false));
      toast.success("Delivery address updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to select address");
    }
  };

  // ── Pincode check ─────────────────────────────────────────────────
  const handleCheckPincode = async () => {
    if (!pincodeInput || pincodeInput.length < 4) return;

    try {
      const res = await axios.get(
        `/api/location/check-pincode?pincode=${pincodeInput}`,
      );
      setPincodeStatus(res.data.status);
      if (res.data.status === "serviceable") {
        toast.success("Great! We deliver to this pincode!");
      } else if (res.data.status === "limited") {
        toast.info(res.data.message);
      } else {
        toast.error(res.data.message || "Not serviceable");
      }
    } catch {
      toast.error("Failed to check pincode");
    }
  };

  const close = () => dispatch(setLocationPickerOpen(false));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-start md:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl mt-auto md:mt-0 max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">
                  Choose your delivery location
                </h2>
                <button
                  onClick={close}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Use Current Location Button */}
              <button
                onClick={handleUseCurrentLocation}
                disabled={isDetectingGPS}
                className="w-full flex items-center gap-3 p-3 border-2 border-dashed border-green-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
              >
                {isDetectingGPS ? (
                  <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                ) : (
                  <Crosshair className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform" />
                )}
                <div className="text-left">
                  <p className="text-sm font-semibold text-green-700">
                    {isDetectingGPS
                      ? "Detecting your location..."
                      : "Use current location"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Using GPS for accurate delivery
                  </p>
                </div>
              </button>
            </div>

            {/* Saved Addresses (Vertical Stack) */}
            {savedAddresses.length > 0 && !searchQuery && (
              <div className="px-5 pt-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2.5">
                  Saved Addresses
                </p>
                <div 
                  className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin"
                >
                  {savedAddresses.map((addr) => {
                    const isActive = currentLocation.source === "saved" && addr.isDefault;
                    const nameLower = (addr.type || "").toLowerCase();
                    
                    const AddressIcon = () => {
                      if (nameLower.includes("home")) return <Home className="w-4 h-4 text-green-600" />;
                      if (nameLower.includes("work") || nameLower.includes("office")) return <Briefcase className="w-4 h-4 text-green-600" />;
                      return <MapPin className="w-4 h-4 text-green-600" />;
                    };

                    return (
                      <button
                        key={addr._id}
                        onClick={() => handleSelectSavedAddress(addr)}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition cursor-pointer relative group ${
                          isActive
                            ? "bg-green-50/70 border-green-500 shadow-sm shadow-green-500/10"
                            : "bg-gray-50 border-gray-150 hover:bg-gray-100 hover:border-gray-200"
                        }`}
                      >
                        {/* Icon Bubble */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border transition-all ${
                          isActive
                            ? "bg-white border-green-200 shadow-sm"
                            : "bg-gray-100 border-transparent group-hover:bg-white"
                        }`}>
                          <AddressIcon />
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-gray-800 capitalize truncate">
                              {addr.type === "others" ? (addr.customLabel || "Other") : addr.type}
                            </span>
                            {isActive && (
                              <span className="bg-green-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                                <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                                Active
                              </span>
                            )}
                          </div>
                          <p className={`text-[10px] mt-0.5 leading-relaxed truncate ${isActive ? "text-green-900/80 font-medium" : "text-gray-500"}`}>
                            {addr.street}
                          </p>
                          <p className={`text-[9px] ${isActive ? "text-green-800/60" : "text-gray-400"}`}>
                            {addr.city}, {addr.zipCode}
                          </p>
                        </div>

                        {/* Radio indicator */}
                        <div className="self-center pl-1 flex-shrink-0">
                          <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${
                            isActive
                              ? "bg-green-600 border-green-600 text-white"
                              : "border-gray-300 group-hover:border-green-500 bg-white"
                          }`}>
                            {isActive ? (
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-green-500 transition-all" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search Box */}
            <div className="px-5 pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for area, street name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Search Results */}
              {isSearching && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                </div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="mt-2 space-y-1">
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectResult(result)}
                      className="w-full flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition text-left"
                    >
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 font-medium truncate">
                          {result.label?.split(",")[0]}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {result.label}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Pincode Entry */}
            <div className="px-5 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Or enter pincode
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter 6-digit pincode"
                  value={pincodeInput}
                  onChange={(e) => {
                    setPincodeInput(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setPincodeStatus(null);
                  }}
                  maxLength={6}
                  className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm focus:border-green-500 outline-none"
                  onKeyDown={(e) => e.key === "Enter" && handleCheckPincode()}
                />
                <button
                  onClick={handleCheckPincode}
                  disabled={pincodeInput.length < 4}
                  className="px-4 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
                >
                  Check
                </button>
              </div>
              {pincodeStatus && (
                <p
                  className={`text-xs mt-1.5 font-medium ${
                    pincodeStatus === "serviceable"
                      ? "text-green-600"
                      : pincodeStatus === "limited"
                        ? "text-amber-600"
                        : "text-red-500"
                  }`}
                >
                  {pincodeStatus === "serviceable" && "✅ We deliver here!"}
                  {pincodeStatus === "limited" && "⚠️ Limited service"}
                  {pincodeStatus === "not_serviceable" &&
                    "❌ Not available yet"}
                </p>
              )}
            </div>



            {/* Current Location Info */}
            {currentLocation.fullAddress && !searchQuery && (
              <div className="px-5 pt-4 pb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Current location
                </p>
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
                  <Navigation className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-800 truncate">
                      {currentLocation.shortAddress || currentLocation.area || "Detected Location"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 leading-normal">
                      {currentLocation.fullAddress}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom padding for mobile */}
            <div className="h-6 md:hidden" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LocationPickerModal;
