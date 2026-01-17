/**
 * EXAMPLE: How to Use the Dynamic Pricing System
 * This file demonstrates various usage patterns
 */

"use client";

import { useState } from "react";
import PriceDisplay from "@/components/common/PriceDisplay";
import VariantSelector from "@/components/common/VariantSelector";
import PriceComparisonInfo from "@/components/common/PriceComparisonInfo";
import { useVariantPricing } from "@/hooks/useVariantPricing";
import {
  getPriceRange,
  formatPriceDisplay,
  getDiscountBadgeText,
  hasVariablePricing,
} from "@/lib/utils/priceUtils";

// Example product data
const exampleProduct = {
  _id: "123",
  name: "Premium Basmati Rice",
  variants: [
    {
      _id: "v1",
      label: "1kg",
      unit: { value: 1, unit: "kg" },
      price: { mrp: 200, selling: 180 },
      countInStock: 50,
      isDefault: true,
    },
    {
      _id: "v2",
      label: "5kg",
      unit: { value: 5, unit: "kg" },
      price: { mrp: 900, selling: 750 },
      countInStock: 20,
    },
    {
      _id: "v3",
      label: "10kg",
      unit: { value: 10, unit: "kg" },
      price: { mrp: 1800, selling: 1400 },
      countInStock: 5,
    },
  ],
};

/**
 * Example 1: Using Individual Utility Functions
 */
export function Example1_BasicUsage() {
  const priceRange = getPriceRange(exampleProduct.variants);
  const isVariable = hasVariablePricing(exampleProduct.variants);
  const discountBadge = getDiscountBadgeText(priceRange);

  return (
    <div className="space-y-2">
      <h3 className="font-bold">Product: {exampleProduct.name}</h3>
      <p className="text-lg font-semibold">
        Price: {formatPriceDisplay(priceRange)}
      </p>
      {discountBadge && (
        <span className="bg-red-500 text-white px-2 py-1 rounded">
          {discountBadge}
        </span>
      )}
      {isVariable && (
        <p className="text-sm text-gray-600">
          💡 This product has variable pricing across variants
        </p>
      )}
    </div>
  );
}

/**
 * Example 2: Using the Custom Hook
 */
export function Example2_UsingHook() {
  const pricing = useVariantPricing(exampleProduct.variants);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold">{exampleProduct.name}</h3>
        <p className="text-2xl font-bold text-green-600">
          {pricing.priceDisplayText}
        </p>
        {pricing.mrpDisplayText && (
          <p className="text-gray-400 line-through">
            {pricing.mrpDisplayText}
          </p>
        )}
        {pricing.discountBadge && (
          <span className="text-red-600 text-sm">{pricing.discountBadge}</span>
        )}
      </div>

      <div className="text-sm space-y-1">
        <p>📊 Stats:</p>
        <p>• Variants: {pricing.variantCount}</p>
        <p>• Price Range: ₹{pricing.stats.minPrice} - ₹{pricing.stats.maxPrice}</p>
        <p>• Max Discount: {pricing.stats.maxDiscount}%</p>
        <p>• Variable Pricing: {pricing.isVariable ? "Yes" : "No"}</p>
        {pricing.bestDeal && (
          <p>• Best Deal: {pricing.bestDeal.label}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Example 3: Using Pre-built Components (Recommended)
 */
export function Example3_UsingComponents() {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    exampleProduct.variants[0]._id
  );

  const selectedVariant = exampleProduct.variants.find(
    (v) => v._id === selectedVariantId
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6 bg-white rounded-2xl shadow-lg">
      <div>
        <h2 className="text-2xl font-bold mb-2">{exampleProduct.name}</h2>
        
        {/* Professional Price Display */}
        <PriceDisplay
          mrp={selectedVariant?.price.mrp ?? 0}
          selling={selectedVariant?.price.selling ?? 0}
          size="lg"
          showSavings={true}
          showDiscount={true}
        />
      </div>

      {/* Variant Selection with Prices */}
      <VariantSelector
        variants={exampleProduct.variants}
        selectedVariantId={selectedVariantId}
        onVariantSelect={setSelectedVariantId}
        showPrices={true}
      />

      {/* Smart Shopping Tips */}
      <PriceComparisonInfo variants={exampleProduct.variants} />

      {/* Additional Info */}
      <div className="text-sm text-gray-600">
        Selected: <strong>{selectedVariant?.label}</strong> - 
        Stock: <strong>{selectedVariant?.countInStock}</strong> units
      </div>
    </div>
  );
}

/**
 * Example 4: Product Card with Dynamic Pricing
 */
export function Example4_ProductCard() {
  const pricing = useVariantPricing(exampleProduct.variants);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden max-w-sm">
      <div className="aspect-square bg-gray-100"></div>
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-lg">{exampleProduct.name}</h3>
        
        {/* Dynamic Price Display */}
        <div className="flex items-center gap-2">
          <span className="text-green-700 font-bold text-xl">
            {pricing.priceDisplayText}
          </span>
          {pricing.mrpDisplayText && (
            <span className="text-gray-400 line-through text-sm">
              {pricing.mrpDisplayText}
            </span>
          )}
        </div>

        {pricing.discountBadge && (
          <span className="inline-block bg-red-500 text-white text-xs px-2 py-1 rounded">
            {pricing.discountBadge}
          </span>
        )}

        {pricing.isVariable && (
          <p className="text-xs text-gray-500">
            {pricing.variantCount} sizes available
          </p>
        )}

        <button className="w-full bg-green-600 text-white py-2 rounded-lg font-medium">
          Add to Cart
        </button>
      </div>
    </div>
  );
}

/**
 * Example 5: Handling Edge Cases
 */
export function Example5_EdgeCases() {
  // Single variant
  const singleVariant = [exampleProduct.variants[0]];
  
  // Out of stock variants
  const outOfStockVariants = exampleProduct.variants.map(v => ({
    ...v,
    countInStock: 0,
  }));

  // All same price
  const samePriceVariants = exampleProduct.variants.map(v => ({
    ...v,
    price: { mrp: 200, selling: 160 }, // All ₹160
  }));

  return (
    <div className="space-y-8">
      {/* Single Variant */}
      <div>
        <h3 className="font-bold mb-2">Single Variant Product</h3>
        <PriceDisplay
          mrp={singleVariant[0].price.mrp}
          selling={singleVariant[0].price.selling}
          size="md"
        />
      </div>

      {/* Out of Stock */}
      <div>
        <h3 className="font-bold mb-2">All Out of Stock</h3>
        <VariantSelector
          variants={outOfStockVariants}
          selectedVariantId={null}
          onVariantSelect={() => {}}
          showPrices={true}
        />
      </div>

      {/* Same Price Across Variants */}
      <div>
        <h3 className="font-bold mb-2">Same Price for All Sizes</h3>
        <div className="text-lg font-bold text-green-600">
          {formatPriceDisplay(getPriceRange(samePriceVariants))}
        </div>
        <p className="text-xs text-gray-500">
          (Shows single price, not range)
        </p>
      </div>
    </div>
  );
}

/**
 * Default export: Complete demo
 */
export default function DynamicPricingExamples() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 space-y-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">
            Dynamic Pricing System Examples
          </h1>
          <p className="text-gray-600">
            Professional pricing for products with multiple variants
          </p>
        </div>

        <div className="grid gap-8">
          <section className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-2xl font-bold mb-4">
              Example 1: Basic Usage
            </h2>
            <Example1_BasicUsage />
          </section>

          <section className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-2xl font-bold mb-4">
              Example 2: Using Hook
            </h2>
            <Example2_UsingHook />
          </section>

          <section className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-2xl font-bold mb-4">
              Example 3: Pre-built Components (Recommended)
            </h2>
            <Example3_UsingComponents />
          </section>

          <section className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-2xl font-bold mb-4">
              Example 4: Product Card
            </h2>
            <Example4_ProductCard />
          </section>

          <section className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-2xl font-bold mb-4">
              Example 5: Edge Cases
            </h2>
            <Example5_EdgeCases />
          </section>
        </div>
      </div>
    </div>
  );
}
