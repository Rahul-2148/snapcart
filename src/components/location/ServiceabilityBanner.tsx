// src/components/location/ServiceabilityBanner.tsx
"use client";

import { motion, AnimatePresence } from "motion/react";
import { MapPin, AlertTriangle, Bell, X } from "lucide-react";
import { useState } from "react";
import { useAppSelector, useAppDispatch } from "@/redux/store";
import { setLocationPickerOpen } from "@/redux/features/locationSlice";
import { toast } from "sonner";

/**
 * Banner shown below Navbar when area is not serviceable or has limited service.
 * Hidden when serviceable. Shows "Notify Me" for not-serviceable areas.
 */
const ServiceabilityBanner = () => {
  const dispatch = useAppDispatch();
  const serviceableStatus = useAppSelector(
    (state) => state.location.serviceableStatus,
  );
  const city = useAppSelector((state) => state.location.city);
  const hasInitialized = useAppSelector(
    (state) => state.location.hasInitialized,
  );
  const hasLocation = useAppSelector(
    (state) => state.location.latitude !== null,
  );
  const [dismissed, setDismissed] = useState(false);
  const [notifyRequested, setNotifyRequested] = useState(false);

  // Don't show if: not initialized, no location set, serviceable, checking, or dismissed
  if (
    !hasInitialized ||
    !hasLocation ||
    serviceableStatus === "serviceable" ||
    serviceableStatus === "checking" ||
    serviceableStatus === "unknown" ||
    dismissed
  ) {
    return null;
  }

  const handleNotifyMe = () => {
    setNotifyRequested(true);
    toast.success("We'll notify you when we launch in your area!");
  };

  const handleChangeLocation = () => {
    dispatch(setLocationPickerOpen(true));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div
          className={`w-[95%] mx-auto mt-1 rounded-xl px-4 py-3 flex items-center gap-3 ${
            serviceableStatus === "not_serviceable"
              ? "bg-gradient-to-r from-red-50 to-orange-50 border border-red-200"
              : "bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200"
          }`}
        >
          {/* Icon */}
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              serviceableStatus === "not_serviceable"
                ? "bg-red-100"
                : "bg-amber-100"
            }`}
          >
            {serviceableStatus === "not_serviceable" ? (
              <MapPin className="w-4 h-4 text-red-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
          </div>

          {/* Message */}
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-semibold ${
                serviceableStatus === "not_serviceable"
                  ? "text-red-700"
                  : "text-amber-700"
              }`}
            >
              {serviceableStatus === "not_serviceable"
                ? `We're not in ${city || "your area"} yet`
                : "Limited delivery available"}
            </p>
            <p className="text-xs text-gray-500">
              {serviceableStatus === "not_serviceable"
                ? "Try a different address or get notified when we launch here"
                : "Some delivery features may be limited in your area"}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {serviceableStatus === "not_serviceable" && !notifyRequested && (
              <button
                onClick={handleNotifyMe}
                className="flex items-center gap-1 bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-red-600 transition"
              >
                <Bell className="w-3 h-3" />
                Notify Me
              </button>
            )}
            {notifyRequested && (
              <span className="text-xs text-green-600 font-medium">
                ✅ Subscribed
              </span>
            )}
            <button
              onClick={handleChangeLocation}
              className="text-xs text-green-600 font-semibold hover:text-green-700 underline"
            >
              Change
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 hover:bg-white/50 rounded-full"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ServiceabilityBanner;
