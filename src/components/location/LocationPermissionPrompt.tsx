// src/components/location/LocationPermissionPrompt.tsx
"use client";

import { AnimatePresence, motion } from "motion/react";
import { MapPin, Navigation, X } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/redux/store";
import {
  setPermissionPromptShown,
  setLocationPickerOpen,
} from "@/redux/features/locationSlice";
import { useLocationDetection } from "@/hooks/useLocationDetection";

/**
 * Prompt shown on first visit when location permission is "prompt".
 * Asks user to allow location access or enter manually.
 */
const LocationPermissionPrompt = () => {
  const dispatch = useAppDispatch();
  const isShown = useAppSelector(
    (state) => state.location.isPermissionPromptShown,
  );
  const { detectViaGPS } = useLocationDetection();

  const handleAllow = async () => {
    dispatch(setPermissionPromptShown(false));
    detectViaGPS(true);
  };

  const handleManual = () => {
    dispatch(setPermissionPromptShown(false));
    dispatch(setLocationPickerOpen(true));
  };

  const handleDismiss = () => {
    dispatch(setPermissionPromptShown(false));
  };

  if (!isShown) return null;

  return (
    <AnimatePresence>
      {isShown && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center relative"
          >
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>

            {/* Icon */}
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-green-600" />
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              Allow location access
            </h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              We need your location to show nearby stores and deliver groceries
              to your doorstep in minutes.
            </p>

            {/* Actions */}
            <div className="space-y-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleAllow}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Allow Location Access
              </motion.button>
              <button
                onClick={handleManual}
                className="w-full py-3 text-green-600 font-medium hover:bg-green-50 rounded-xl transition-colors text-sm"
              >
                Enter address manually
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LocationPermissionPrompt;
