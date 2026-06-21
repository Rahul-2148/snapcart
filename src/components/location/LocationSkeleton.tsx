// src/components/location/LocationSkeleton.tsx
"use client";

import { motion } from "motion/react";

/** Skeleton for location header while loading */
export function LocationHeaderSkeleton() {
  return (
    <div className="flex items-center gap-2 animate-pulse">
      <div className="w-4 h-4 bg-green-300 rounded-full" />
      <div className="flex flex-col gap-1">
        <div className="h-2.5 w-16 bg-green-300/60 rounded" />
        <div className="h-3.5 w-28 bg-green-300/80 rounded" />
      </div>
      <div className="w-3 h-3 bg-green-300/60 rounded" />
    </div>
  );
}

/** Skeleton for store info bar */
export function StoreInfoSkeleton() {
  return (
    <div className="w-[95%] mx-auto mt-2 animate-pulse">
      <div className="bg-gray-100 rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          <div className="flex flex-col gap-1">
            <div className="h-3 w-32 bg-gray-200 rounded" />
            <div className="h-2.5 w-20 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="h-6 w-20 bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}

/** Skeleton for product sections during store switch */
export function ProductSectionSkeleton() {
  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-6 animate-pulse">
      <div className="h-7 w-48 bg-gray-200 rounded mb-6" />
      <div className="flex gap-3 md:gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[46%] sm:w-[32%] md:w-[28%] lg:w-[23%] xl:w-[19%]"
          >
            <div className="bg-gray-100 rounded-2xl p-3">
              <div className="w-full aspect-square bg-gray-200 rounded-xl mb-3" />
              <div className="h-3.5 w-3/4 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-1/2 bg-gray-200 rounded mb-3" />
              <div className="h-8 w-full bg-gray-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
