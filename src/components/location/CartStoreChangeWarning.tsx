// src/components/location/CartStoreChangeWarning.tsx
"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ShoppingCart, X, Trash2 } from "lucide-react";
import { useCartStoreValidation } from "@/hooks/useCartStoreValidation";

/**
 * Modal shown when user changes location and cart has items
 * that are unavailable at the new store.
 */
const CartStoreChangeWarning = () => {
  const { warningItems, showWarning, dismissWarning } =
    useCartStoreValidation();

  if (!showWarning || warningItems.length === 0) return null;

  const unavailableItems = warningItems.filter(
    (w) => w.reason === "unavailable",
  );
  const priceChangedItems = warningItems.filter(
    (w) => w.reason === "price_changed",
  );

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={dismissWarning}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
          >
            {/* Header */}
            <div className="bg-amber-50 px-5 pt-5 pb-4 border-b border-amber-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                  <h3 className="text-base font-bold text-gray-800">
                    Cart Update Required
                  </h3>
                </div>
                <button
                  onClick={dismissWarning}
                  className="p-1 hover:bg-amber-100 rounded-full"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <p className="text-sm text-gray-600">
                Some items in your cart aren&apos;t available at the new store location.
              </p>
            </div>

            {/* Item List */}
            <div className="px-5 py-4 max-h-60 overflow-y-auto">
              {unavailableItems.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">
                    Unavailable Items ({unavailableItems.length})
                  </p>
                  {unavailableItems.map((item) => (
                    <div
                      key={item.variantId}
                      className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      <p className="text-sm text-gray-700 truncate">
                        {item.groceryName}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {priceChangedItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-2">
                    Price Changed ({priceChangedItems.length})
                  </p>
                  {priceChangedItems.map((item) => (
                    <div
                      key={item.variantId}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <p className="text-sm text-gray-700 truncate">
                        {item.groceryName}
                      </p>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-gray-400 line-through">
                          ₹{item.oldPrice}
                        </span>
                        <span className="text-green-600 font-semibold">
                          ₹{item.newPrice}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={dismissWarning}
                className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2 text-sm"
              >
                <ShoppingCart className="w-4 h-4" />
                Got it, continue
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CartStoreChangeWarning;
