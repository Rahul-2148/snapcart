// src/app/user/products/page.tsx
"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import GroceryItemCard from "@/components/GroceryItemCard";
import ProductFilters from "@/components/products/ProductFilters";
import ProductSort from "@/components/products/ProductSort";
import {
  Search,
  Loader2,
  AlertCircle,
  ChevronRight,
  Home,
  LayoutGrid,
  List,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { IUser } from "@/models/user.model";

interface Category {
  _id: string;
  name: string;
  allowedUnits?: string[];
}

interface GroceryVariant {
  _id: string;
  label: string;
  price: {
    mrp: number;
    selling: number;
    discountPercent?: number;
  };
  countInStock: number;
}

interface Grocery {
  _id: string;
  name: string;
  slug: string;
  brand?: string;
  description?: string;
  category: Category | string;
  badges?: {
    isBestSeller?: boolean;
    isNew?: boolean;
    isFeatured?: boolean;
  };
  variants: GroceryVariant[];
  images?: Array<{
    url: string;
  }>;
  createdBy?: string;
  isActive?: boolean;
}

const ProductsPageContent = () => {
  const searchParams = useSearchParams();

  // State management
  const [groceries, setGroceries] = useState<Grocery[]>([]);
  const [filteredGroceries, setFilteredGroceries] = useState<Grocery[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<IUser | null>(null);
  const [isAiSearch, setIsAiSearch] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || "",
  );
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "",
  );
  const [selectedBrand, setSelectedBrand] = useState(
    searchParams.get("brand") || "",
  );
  const [badgeFilter, setBadgeFilter] = useState(
    searchParams.get("badge") || "",
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");
  const [minRating, setMinRating] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [productRatings, setProductRatings] = useState<Record<string, number>>(
    {},
  ); // Store average ratings per product
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [jumpToPage, setJumpToPage] = useState("");
  const [selectedIds, setSelectedIds] = useState(
    searchParams.get("ids") || "",
  );

  // Sync searchParams with states
  useEffect(() => {
    setSelectedIds(searchParams.get("ids") || "");
    setSearchTerm(searchParams.get("search") || "");
    setSelectedCategory(searchParams.get("category") || "");
  }, [searchParams]);

  const { status } = useSession();
  const isGuest = status === "unauthenticated";

  // Fetch user
  useEffect(() => {
    if (isGuest) return;
    const fetchUser = async () => {
      try {
        const response = await axios.get("/api/me");
        if (response.data.success) {
          setUser(response.data.user);
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          return; // Ignore gracefully for unauthenticated users
        }
        console.error("Failed to fetch user:", err);
      }
    };
    fetchUser();
  }, [isGuest]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get("/api/categories");
        if (response.data.success) {
          setCategories(response.data.categories);
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch brands when category changes
  useEffect(() => {
    const fetchBrands = async () => {
      if (!selectedCategory) {
        setBrands([]);
        return;
      }
      try {
        const response = await axios.get("/api/groceries", {
          params: { category: selectedCategory, getBrands: true },
        });
        if (response.data.success) {
          setBrands(response.data.brands);
        }
      } catch (err) {
        console.error("Failed to fetch brands:", err);
      }
    };
    fetchBrands();
  }, [selectedCategory]);

  // Fetch groceries
  const fetchGroceries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedIds) params.ids = selectedIds;
      if (isAiSearch && sortBy) params.sort = sortBy;

      const endpoint = isAiSearch ? "/api/groceries/search" : "/api/groceries";
      const response = await axios.get(endpoint, { params });
      if (response.data.success) {
        setGroceries(response.data.groceries);
      }
    } catch (err) {
      setError("Failed to fetch products. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, selectedIds, isAiSearch, sortBy]);

  useEffect(() => {
    if (!searchTerm) {
      setIsAiSearch(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchGroceries();
    setCurrentPage(1);
  }, [fetchGroceries]);

  // Fetch ratings for all products
  useEffect(() => {
    const fetchRatings = async () => {
      try {
        const ratings: Record<string, number> = {};
        for (const grocery of groceries) {
          try {
            const response = await axios.get(`/api/reviews/${grocery._id}`);
            if (response.data.success && response.data.data) {
              ratings[grocery._id] = response.data.data.averageRating || 0;
            } else {
              ratings[grocery._id] = 0;
            }
          } catch (err) {
            ratings[grocery._id] = 0;
          }
        }
        setProductRatings(ratings);
      } catch (err) {
        console.error("Failed to fetch ratings:", err);
      }
    };

    if (groceries.length > 0) {
      fetchRatings();
    }
  }, [groceries]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...groceries];

    // Filter by badge (featured, bestseller, new)
    if (badgeFilter) {
      filtered = filtered.filter((item) => {
        if (badgeFilter === "featured") {
          return item.badges?.isFeatured;
        } else if (badgeFilter === "bestseller") {
          return item.badges?.isBestSeller;
        } else if (badgeFilter === "new") {
          return item.badges?.isNew;
        }
        return true;
      });
    }

    // Filter by brand
    if (selectedBrand) {
      filtered = filtered.filter(
        (item) => item.brand?.toLowerCase() === selectedBrand.toLowerCase(),
      );
    }

    // Filter by price (using minimum variant price)
    filtered = filtered.filter((item) => {
      const minPrice = Math.min(...item.variants.map((v) => v.price.selling));
      return minPrice >= priceRange[0] && minPrice <= priceRange[1];
    });

    // Filter by rating
    if (minRating > 0) {
      filtered = filtered.filter((item) => {
        const rating = productRatings[item._id] || 0;
        return rating >= minRating;
      });
    }

    // Sort
    switch (sortBy) {
      case "price-low":
        filtered.sort(
          (a, b) =>
            Math.min(...a.variants.map((v) => v.price.selling)) -
            Math.min(...b.variants.map((v) => v.price.selling)),
        );
        break;
      case "price-high":
        filtered.sort(
          (a, b) =>
            Math.min(...b.variants.map((v) => v.price.selling)) -
            Math.min(...a.variants.map((v) => v.price.selling)),
        );
        break;
      case "popular":
        filtered.sort(
          (a, b) =>
            (b.badges?.isBestSeller ? 1 : 0) - (a.badges?.isBestSeller ? 1 : 0),
        );
        break;
      case "newest":
      default:
        // Already sorted by API
        break;
    }

    setFilteredGroceries(filtered);
    setCurrentPage(1);
  }, [
    groceries,
    badgeFilter,
    selectedBrand,
    priceRange,
    sortBy,
    minRating,
    productRatings,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredGroceries.length / itemsPerPage);
  const paginatedGroceries = filteredGroceries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  // Generate pagination numbers with ellipsis
  const generatePaginationNumbers = () => {
    const pages: (number | string)[] = [];
    const showEllipsisThreshold = 7;

    if (totalPages <= showEllipsisThreshold) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Show pages around current page
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // Handle jump to page
  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setJumpToPage("");
    }
  };

  const handleReset = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedBrand("");
    setPriceRange([0, 10000]);
    setMinRating(0);
    setSortBy("newest");
    setCurrentPage(1);
  };

  // Get selected category name for breadcrumb
  const selectedCategoryName = categories.find(
    (cat) => cat._id === selectedCategory,
  )?.name;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-2 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-8 flex-wrap">
          <Link
            href="/"
            className="hover:text-green-600 transition flex items-center gap-1"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link
            href="/user/products"
            className="hover:text-green-600 transition"
          >
            Products
          </Link>
          {selectedCategoryName && (
            <>
              <ChevronRight className="w-4 h-4" />
              <span className="text-gray-900 font-semibold">
                {selectedCategoryName}
              </span>
            </>
          )}
          {searchTerm && (
            <>
              <ChevronRight className="w-4 h-4" />
              <span className="text-gray-900 font-semibold">
                Search: "{searchTerm}"
              </span>
            </>
          )}
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            All Products
          </h1>
          <p className="text-gray-600">
            Discover our wide range of fresh groceries
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 relative z-30 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for groceries, brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (searchTerm.trim()) {
                setIsAiSearch(true);
              } else {
                setSearchTerm("Suggest healthy breakfast options");
                setIsAiSearch(true);
              }
            }}
            className="px-5 py-3 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition cursor-pointer"
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span>Ask AI Search</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <ProductFilters
              categories={categories}
              brands={brands}
              selectedCategory={selectedCategory}
              selectedBrand={selectedBrand}
              priceRange={priceRange}
              minRating={minRating}
              onCategoryChange={setSelectedCategory}
              onBrandChange={setSelectedBrand}
              onPriceChange={setPriceRange}
              onRatingChange={setMinRating}
              onReset={handleReset}
            />
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {/* Sort and Results Count */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-gray-600">
                  Showing{" "}
                  <span className="font-semibold">
                    {paginatedGroceries.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold">
                    {filteredGroceries.length}
                  </span>{" "}
                  products
                </p>
                {isAiSearch && (
                  <button
                    onClick={() => {
                      setIsAiSearch(false);
                      setSearchTerm("");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                    <span>AI Semantic Search Active</span>
                    <X className="w-3 h-3 ml-1 text-emerald-500 hover:text-emerald-700" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`px-3 py-2 flex items-center gap-1 text-sm transition ${
                      viewMode === "grid"
                        ? "bg-green-50 text-green-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-3 py-2 flex items-center gap-1 text-sm transition ${
                      viewMode === "list"
                        ? "bg-green-50 text-green-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                    aria-label="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
                <ProductSort sortBy={sortBy} onSortChange={setSortBy} />
              </div>
            </div>

            {/* Products Grid or Empty State */}
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 text-green-500 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Loading products...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            ) : paginatedGroceries.length > 0 ? (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 mb-8 auto-rows-fr">
                    {paginatedGroceries.map((grocery: any) => (
                      <GroceryItemCard
                        key={grocery._id}
                        grocery={grocery}
                        rating={productRatings[grocery._id]}
                        viewMode="grid"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4 mb-8">
                    {paginatedGroceries.map((grocery: any) => (
                      <GroceryItemCard
                        key={grocery._id}
                        grocery={grocery}
                        rating={productRatings[grocery._id]}
                        viewMode="list"
                      />
                    ))}
                  </div>
                )}

                {/* Advanced Pagination */}
                {filteredGroceries.length > 0 && (
                  <div className="space-y-6 bg-white p-6 rounded-lg shadow-sm">
                    {/* Pagination Info & Items Per Page */}
                    <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-gray-600">
                      <div>
                        Showing{" "}
                        <span className="font-semibold text-gray-900">
                          {(currentPage - 1) * itemsPerPage + 1}
                        </span>{" "}
                        to{" "}
                        <span className="font-semibold text-gray-900">
                          {Math.min(
                            currentPage * itemsPerPage,
                            filteredGroceries.length,
                          )}
                        </span>{" "}
                        of{" "}
                        <span className="font-semibold text-gray-900">
                          {filteredGroceries.length}
                        </span>{" "}
                        products
                      </div>

                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="itemsPerPage"
                          className="whitespace-nowrap"
                        >
                          Items per page:
                        </label>
                        <select
                          id="itemsPerPage"
                          value={itemsPerPage}
                          onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                          }}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                        >
                          <option value={6}>6</option>
                          <option value={12}>12</option>
                          <option value={24}>24</option>
                          <option value={48}>48</option>
                          <option value={96}>96</option>
                        </select>
                      </div>
                    </div>

                    {/* Pagination Buttons */}
                    {totalPages > 1 && (
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {/* First Page */}
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition text-sm font-medium"
                          title="First Page"
                        >
                          First
                        </button>

                        {/* Previous */}
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage === 1}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                        >
                          Previous
                        </button>

                        {/* Page Numbers with Ellipsis */}
                        {generatePaginationNumbers().map((page, index) => (
                          <React.Fragment key={index}>
                            {page === "..." ? (
                              <span className="px-3 py-2 text-gray-400">
                                ...
                              </span>
                            ) : (
                              <button
                                onClick={() => setCurrentPage(page as number)}
                                className={`px-4 py-2 rounded-lg transition min-w-[44px] ${
                                  currentPage === page
                                    ? "bg-green-500 text-white font-semibold shadow-md"
                                    : "border border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                {page}
                              </button>
                            )}
                          </React.Fragment>
                        ))}

                        {/* Next */}
                        <button
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                        >
                          Next
                        </button>

                        {/* Last Page */}
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition text-sm font-medium"
                          title="Last Page"
                        >
                          Last
                        </button>
                      </div>
                    )}

                    {/* Jump to Page */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-3 pt-4 border-t border-gray-200">
                        <label
                          htmlFor="jumpToPage"
                          className="text-sm text-gray-600"
                        >
                          Jump to page:
                        </label>
                        <input
                          id="jumpToPage"
                          type="number"
                          min="1"
                          max={totalPages}
                          value={jumpToPage}
                          onChange={(e) => setJumpToPage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              handleJumpToPage();
                            }
                          }}
                          placeholder={`1-${totalPages}`}
                          className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-center"
                        />
                        <button
                          onClick={handleJumpToPage}
                          disabled={
                            !jumpToPage ||
                            parseInt(jumpToPage) < 1 ||
                            parseInt(jumpToPage) > totalPages
                          }
                          className="px-4 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          Go
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg mb-4">
                  No products found matching your filters
                </p>
                <button
                  onClick={handleReset}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}
