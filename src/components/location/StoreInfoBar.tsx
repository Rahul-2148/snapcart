// src/components/location/StoreInfoBar.tsx
"use client";

import { motion } from "motion/react";
import { Store, Clock, MapPin, ChevronRight } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/redux/store";
import { setLocationPickerOpen } from "@/redux/features/locationSlice";
import { StoreInfoSkeleton } from "./LocationSkeleton";

/**
 * Compact bar showing selected store details — appears on home page.
 * Shows store name, distance, delivery ETA, and open/closed status.
 */
const StoreInfoBar = () => {
  const dispatch = useAppDispatch();
  const selectedStore = useAppSelector(
    (state) => state.location.selectedStore,
  );
  const deliveryEta = useAppSelector((state) => state.store.deliveryEta);
  const isFetchingStores = useAppSelector(
    (state) => state.location.isFetchingStores,
  );
  const serviceableStatus = useAppSelector(
    (state) => state.location.serviceableStatus,
  );

  // Show skeleton while loading
  if (isFetchingStores) {
    return <StoreInfoSkeleton />;
  }

  // Don't show if no store selected or not serviceable
  if (!selectedStore || serviceableStatus === "not_serviceable") {
    return null;
  }

  const eta = deliveryEta || selectedStore.estimatedDeliveryMinutes;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="w-[95%] mx-auto mt-2"
    >
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl px-4 py-3 flex items-center justify-between border border-green-200/60 shadow-sm">
        {/* Left: Store Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
            <Store className="w-5 h-5 text-green-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {selectedStore.name}
              </p>
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  selectedStore.isOpen ? "bg-green-500" : "bg-red-400"
                }`}
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />
                {selectedStore.distanceKm} km
              </span>
              <span>•</span>
              <span>
                {selectedStore.isOpen ? "Open now" : "Closed"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: ETA Badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {eta && (
            <div className="flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              <Clock className="w-3 h-3" />
              {eta.min}-{eta.max} min
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default StoreInfoBar;
