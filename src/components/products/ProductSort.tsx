// src/components/products/ProductSort.tsx
"use client";

import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ProductSortProps {
  sortBy: string;
  onSortChange: (sort: string) => void;
}

const ProductSort = ({ sortBy, onSortChange }: ProductSortProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "popular", label: "Most Popular" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
  ];

  const currentLabel =
    sortOptions.find((opt) => opt.value === sortBy)?.label || "Sort by";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-gray-700"
      >
        {currentLabel}
        <ChevronDown
          className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onSortChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-3 transition ${
                sortBy === option.value
                  ? "bg-green-50 text-green-600 font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              } ${option.value !== sortOptions[sortOptions.length - 1].value ? "border-b border-gray-200" : ""}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductSort;
