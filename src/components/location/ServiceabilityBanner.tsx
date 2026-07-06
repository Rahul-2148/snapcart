// src/components/location/ServiceabilityBanner.tsx
"use client";

import { motion, AnimatePresence } from "motion/react";
import { MapPin, AlertTriangle, Bell, X } from "lucide-react";
import { useState } from "react";
import { useAppSelector, useAppDispatch } from "@/redux/store";
import { setLocationPickerOpen } from "@/redux/features/locationSlice";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

/**
 * Banner shown below Navbar when area is not serviceable or has limited service.
 * Hidden when serviceable. Shows "Notify Me" for not-serviceable areas.
 */
const ServiceabilityBanner = () => {
  const dispatch = useAppDispatch();
  const { data: session } = useSession();

  const serviceableStatus = useAppSelector(
    (state) => state.location.serviceableStatus,
  );
  const city = useAppSelector((state) => state.location.city);
  const pincode = useAppSelector((state) => state.location.pincode);
  const latitude = useAppSelector((state) => state.location.latitude);
  const longitude = useAppSelector((state) => state.location.longitude);
  const nearbyStores = useAppSelector((state) => state.location.nearbyStores);

  const hasInitialized = useAppSelector(
    (state) => state.location.hasInitialized,
  );
  const hasLocation = useAppSelector(
    (state) => state.location.latitude !== null,
  );

  const [dismissed, setDismissed] = useState(false);
  const [notifyRequested, setNotifyRequested] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);

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

  const getAvailableAreasText = () => {
    if (!nearbyStores || nearbyStores.length === 0) return "";
    
    // Filter stores in the same city
    const sameCityStores = city 
      ? nearbyStores.filter(s => s.location?.city?.toLowerCase() === city.toLowerCase())
      : nearbyStores;
      
    const targetStores = sameCityStores.length > 0 ? sameCityStores : nearbyStores;
    
    // Extract clean area names (removing SnapCart prefix)
    const areaNames = Array.from(new Set(targetStores.map(s => {
      return s.name.replace(/^SnapCart\s+/i, "").trim();
    })));

    if (areaNames.length === 0) return "";
    
    const displayCity = targetStores[0]?.location?.city || city || "your city";

    if (areaNames.length === 1) {
      return `We are currently serving ${areaNames[0]} in ${displayCity}.`;
    }
    
    const listStr = areaNames.slice(0, -1).join(", ") + " & " + areaNames[areaNames.length - 1];
    return `We are currently serving ${listStr} in ${displayCity}.`;
  };

  const submitNotification = async (email: string) => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/location/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          pincode: pincode || "000000",
          city: city || "Unknown City",
          latitude: latitude || 0,
          longitude: longitude || 0,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotifyRequested(true);
        setShowEmailInput(false);
        toast.success(data.message || "We'll notify you when we launch in your area!");
      } else {
        toast.error(data.error || "Failed to submit request.");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyMe = async () => {
    if (session?.user?.email) {
      // Logged in: register automatically
      await submitNotification(session.user.email);
    } else {
      // Guest: show inline input
      setShowEmailInput(true);
    }
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
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 flex-grow-0 ${
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
              {serviceableStatus === "not_serviceable" ? (
                <>
                  {getAvailableAreasText() && (
                    <span className="block font-medium text-gray-600 mb-0.5">
                      {getAvailableAreasText()}
                    </span>
                  )}
                  Try a different address or get notified when we launch here.
                </>
              ) : (
                "Some delivery features may be limited in your area."
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {serviceableStatus === "not_serviceable" && !notifyRequested && !showEmailInput && (
              <button
                onClick={handleNotifyMe}
                className="flex items-center gap-1 bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-red-600 transition"
              >
                <Bell className="w-3 h-3" />
                Notify Me
              </button>
            )}

            {showEmailInput && (
              <div className="flex items-center gap-1 bg-white border border-red-200 rounded-full px-2 py-0.5 shadow-sm">
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      submitNotification(emailInput);
                    }
                  }}
                  className="text-xs text-gray-800 placeholder-gray-400 bg-transparent outline-none py-1 px-1 w-40 min-w-0"
                />
                <button
                  onClick={() => submitNotification(emailInput)}
                  disabled={loading}
                  className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full hover:bg-red-600 transition disabled:opacity-50"
                >
                  {loading ? "..." : "Submit"}
                </button>
                <button
                  onClick={() => setShowEmailInput(false)}
                  disabled={loading}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
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
