"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Search, Filter, X, ChevronDown } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setGroceries } from "@/redux/features/grocerySlice";
import { AppDispatch, RootState } from "@/redux/store";

interface Category {
  _id: string;
  name: string;
}

interface SearchFilters {
  search: string;
  category: string;
  brand: string;
  sortBy: string;
}

const AdvancedGrocerySearch = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    search: "",
    category: "",
    brand: "",
    sortBy: "newest",
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const { groceries } = useSelector((state: RootState) => state.grocery);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get("/api/categories");
        setCategories(response.data.categories || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  // Fetch brands based on selected category
  useEffect(() => {
    const fetchBrands = async () => {
      if (!filters.category) {
        setBrands([]);
        return;
      }

      try {
        const response = await axios.get(
          `/api/groceries?category=${filters.category}&getBrands=true`
        );
        setBrands(response.data.brands || []);
      } catch (error) {
        console.error("Error fetching brands:", error);
      }
    };

    fetchBrands();
  }, [filters.category]);

  // Perform search
  const performSearch = useCallback(async () => {
    setIsLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();

      if (filters.search) params.append("search", filters.search);
      if (filters.category) params.append("category", filters.category);
      if (filters.brand) params.append("brand", filters.brand);
      if (filters.sortBy) params.append("sort", filters.sortBy);

      const response = await axios.get(
        `/api/groceries/search?${params.toString()}`
      );
      dispatch(setGroceries(response.data.groceries || []));
    } catch (error) {
      console.error("Error performing search:", error);
      dispatch(setGroceries([]));
    } finally {
      setIsLoading(false);
    }
  }, [filters, dispatch]);

  // Debounced search on filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasSearched || filters.search) {
        performSearch();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [filters, performSearch, hasSearched]);

  const handleFilterChange = (
    key: keyof SearchFilters,
    value: string
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReset = () => {
    setFilters({
      search: "",
      category: "",
      brand: "",
      sortBy: "newest",
    });
    setHasSearched(false);
    dispatch(setGroceries([]));
  };

  const isFilterActive =
    filters.search || filters.category || filters.brand;

  return (
    <div className="w-[90%] md:w-[80%] mx-auto my-8">
      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search groceries by name..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full px-4 py-3 pl-12 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-500 transition-colors"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-4 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${
              isFilterActive
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Filter className="w-5 h-5" />
            <span className="hidden sm:inline">Filters</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* Advanced Filters */}
        {isExpanded && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-green-200 rounded-lg shadow-xl p-6 z-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) =>
                    handleFilterChange("category", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Brand Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Brand
                </label>
                <select
                  value={filters.brand}
                  onChange={(e) => handleFilterChange("brand", e.target.value)}
                  disabled={!filters.category || brands.length === 0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">All Brands</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-green-500"
                >
                  <option value="newest">Newest</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                </select>
              </div>

              {/* Reset Button */}
              <div className="flex items-end">
                <button
                  onClick={handleReset}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Results Info */}
      {hasSearched && (
        <div className="mb-4 text-gray-600">
          {isLoading ? (
            <p className="text-center">Searching...</p>
          ) : (
            <p className="text-center">
              Found <span className="font-bold text-green-600">{groceries.length}</span> results
              {filters.search && ` for "${filters.search}"`}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedGrocerySearch;
