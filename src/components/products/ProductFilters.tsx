// src/components/products/ProductFilters.tsx
"use client";

import { useState } from "react";
import { ChevronDown, X, Star } from "lucide-react";

interface Category {
  _id: string;
  name: string;
}

interface ProductFiltersProps {
  categories: Category[];
  brands: string[];
  selectedCategory: string;
  selectedBrand: string;
  priceRange: [number, number];
  minRating: number;
  onCategoryChange: (category: string) => void;
  onBrandChange: (brand: string) => void;
  onPriceChange: (range: [number, number]) => void;
  onRatingChange: (rating: number) => void;
  onReset: () => void;
}

const ProductFilters = ({
  categories,
  brands = [],
  selectedCategory,
  selectedBrand,
  priceRange,
  minRating,
  onCategoryChange,
  onBrandChange,
  onPriceChange,
  onRatingChange,
  onReset,
}: ProductFiltersProps) => {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "category",
    "price",
  ]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section],
    );
  };

  const hasActiveFilters =
    selectedCategory ||
    selectedBrand ||
    priceRange[0] > 0 ||
    priceRange[1] < 10000 ||
    minRating > 0;

  return (
    <div className="sticky top-20 bg-white rounded-lg shadow-md p-6">
      {/* Reset Filters */}
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="w-full mb-6 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium flex items-center justify-center gap-2"
        >
          <X className="h-4 w-4" />
          Reset Filters
        </button>
      )}

      {/* Category Filter */}
      <div className="mb-6">
        <button
          onClick={() => toggleSection("category")}
          className="flex items-center justify-between w-full mb-4 font-semibold text-gray-900"
        >
          <span>Categories</span>
          <ChevronDown
            className={`h-5 w-5 transition ${
              expandedSections.includes("category") ? "rotate-180" : ""
            }`}
          />
        </button>

        {expandedSections.includes("category") && (
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="category"
                value=""
                checked={selectedCategory === ""}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
              />
              <span className="text-gray-700">All Categories</span>
            </label>

            {categories.map((category) => (
              <label
                key={category._id}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="category"
                  value={category._id}
                  checked={selectedCategory === category._id}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
                />
                <span className="text-gray-700">{category.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Brand Filter */}
      {brands.length > 0 && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <button
            onClick={() => toggleSection("brand")}
            className="flex items-center justify-between w-full mb-4 font-semibold text-gray-900"
          >
            <span>Brands</span>
            <ChevronDown
              className={`h-5 w-5 transition ${
                expandedSections.includes("brand") ? "rotate-180" : ""
              }`}
            />
          </button>

          {expandedSections.includes("brand") && (
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="brand"
                  value=""
                  checked={selectedBrand === ""}
                  onChange={(e) => onBrandChange(e.target.value)}
                  className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
                />
                <span className="text-gray-700">All Brands</span>
              </label>

              {brands.map((brand) => (
                <label
                  key={brand}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="brand"
                    value={brand}
                    checked={selectedBrand === brand}
                    onChange={(e) => onBrandChange(e.target.value)}
                    className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
                  />
                  <span className="text-gray-700">{brand}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Price Filter */}
      <div>
        <button
          onClick={() => toggleSection("price")}
          className="flex items-center justify-between w-full mb-4 font-semibold text-gray-900"
        >
          <span>Price Range</span>
          <ChevronDown
            className={`h-5 w-5 transition ${
              expandedSections.includes("price") ? "rotate-180" : ""
            }`}
          />
        </button>

        {expandedSections.includes("price") && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Minimum Price: ₹{priceRange[0]}
              </label>
              <input
                type="range"
                min="0"
                max="10000"
                step="100"
                value={priceRange[0]}
                onChange={(e) =>
                  onPriceChange([parseInt(e.target.value), priceRange[1]])
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Maximum Price: ₹{priceRange[1]}
              </label>
              <input
                type="range"
                min="0"
                max="10000"
                step="100"
                value={priceRange[1]}
                onChange={(e) =>
                  onPriceChange([priceRange[0], parseInt(e.target.value)])
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                max="10000"
                value={priceRange[0]}
                onChange={(e) =>
                  onPriceChange([parseInt(e.target.value) || 0, priceRange[1]])
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Min"
              />
              <span className="text-gray-500 text-sm flex items-center">-</span>
              <input
                type="number"
                min="0"
                max="10000"
                value={priceRange[1]}
                onChange={(e) =>
                  onPriceChange([
                    priceRange[0],
                    parseInt(e.target.value) || 10000,
                  ])
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Max"
              />
            </div>
          </div>
        )}
      </div>

      {/* Rating Filter */}
      <div>
        <button
          onClick={() => toggleSection("rating")}
          className="flex items-center justify-between w-full mb-4 font-semibold text-gray-900"
        >
          <span>Rating</span>
          <ChevronDown
            className={`h-5 w-5 transition ${
              expandedSections.includes("rating") ? "rotate-180" : ""
            }`}
          />
        </button>

        {expandedSections.includes("rating") && (
          <div className="space-y-3">
            {[0, 4, 3, 2, 1].map((rating) => (
              <label
                key={rating}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="rating"
                  value={rating}
                  checked={minRating === rating}
                  onChange={(e) => onRatingChange(parseInt(e.target.value))}
                  className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
                />
                <div className="flex items-center gap-1">
                  {rating === 0 ? (
                    <span className="text-gray-700">All Ratings</span>
                  ) : (
                    <>
                      {Array.from({ length: rating }, (_, i) => (
                        <Star
                          key={i}
                          className="w-4 h-4 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                      {Array.from({ length: 5 - rating }, (_, i) => (
                        <Star
                          key={`empty-${i}`}
                          className="w-4 h-4 text-gray-300"
                        />
                      ))}
                      <span className="text-gray-700 text-sm ml-1">
                        {rating}+ Stars
                      </span>
                    </>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductFilters;
