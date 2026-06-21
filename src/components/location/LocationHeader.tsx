// src/components/location/LocationHeader.tsx
"use client";

import { MapPin, ChevronDown, Clock } from "lucide-react";
import { motion } from "motion/react";
import { useAppSelector, useAppDispatch } from "@/redux/store";
import { setLocationPickerOpen, selectLocationDisplayText } from "@/redux/features/locationSlice";
import { LocationHeaderSkeleton } from "./LocationSkeleton";

/**
 * Blinkit/Zepto-style location display in the Navbar.
 * Shows delivery address, ETA badge, and opens LocationPickerModal on click.
 */
const LocationHeader = () => {
  const dispatch = useAppDispatch();
  const location = useAppSelector((state) => state.location);
  const displayText = useAppSelector(selectLocationDisplayText);
  const deliveryEta = useAppSelector((state) => state.store.deliveryEta);
  const selectedStore = location.selectedStore;

  const isLoading = location.isDetecting || location.isReverseGeocoding;

  const handleClick = () => {
    dispatch(setLocationPickerOpen(true));
  };

  // Show skeleton while detecting for the first time
  if (isLoading && !displayText) {
    return <LocationHeaderSkeleton />;
  }

  return (
    <motion.button
      onClick={handleClick}
      className="flex items-center gap-1 md:gap-2 text-left hover:bg-white/10 rounded-xl px-1 py-0.5 md:px-2 md:py-1.5 transition-colors w-full max-w-[200px] sm:max-w-[240px] md:max-w-[280px] min-w-0 cursor-pointer"
      whileTap={{ scale: 0.97 }}
    >
      {/* Map Pin Icon */}
      <div className="relative flex-shrink-0">
        <MapPin className="w-4 h-4 md:w-5 md:h-5 text-white" />
        {location.serviceableStatus === "serviceable" && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-green-600" />
        )}
        {location.serviceableStatus === "not_serviceable" && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-red-400 rounded-full border border-green-600" />
        )}
      </div>

      {/* Address Text */}
      <div className="flex flex-col min-w-0 leading-tight">
        <span className="text-[10px] md:text-xs text-green-100 font-medium flex items-center gap-1">
          Deliver to
          {deliveryEta && (
            <span className="inline-flex items-center gap-0.5 bg-white/20 text-white text-[9px] md:text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
              <Clock className="w-2.5 h-2.5" />
              {deliveryEta.min}-{deliveryEta.max} min
            </span>
          )}
        </span>
        <span className="text-xs md:text-sm font-bold text-white truncate">
          {displayText || "Set your location"}
        </span>
      </div>

      {/* Chevron */}
      <ChevronDown className="w-3.5 h-3.5 text-green-200 flex-shrink-0" />
    </motion.button>
  );
};

export default LocationHeader;
