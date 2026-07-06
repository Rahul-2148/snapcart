"use client";
import { RootState } from "@/redux/store";
import {
  Bars3Icon,
  ChevronDownIcon,
  ComputerDesktopIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  SunIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { NotificationDropdown } from "../common/NotificationDropdown";
import { ProfileDropdown } from "../common/ProfileDropdown";
import { useTheme } from "next-themes";

interface AdminHeaderProps {
  onToggleMobileSidebar?: () => void;
}

const AdminHeader = ({ onToggleMobileSidebar }: AdminHeaderProps) => {
  // @ts-ignore
  const { userData: user } = useSelector((state: RootState) => state.user);

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const router = useRouter();

  // Load search history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem("adminSearchHistory");
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save search to history
  const addToSearchHistory = (query: string) => {
    if (!query.trim() || query.length < 3) return;

    const updatedHistory = [
      query,
      ...searchHistory.filter((item) => item !== query),
    ].slice(0, 10); // Keep only last 10 searches

    setSearchHistory(updatedHistory);
    localStorage.setItem("adminSearchHistory", JSON.stringify(updatedHistory));
  };

  // Clear search history
  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("adminSearchHistory");
  };

  // Remove individual search history item
  const removeFromHistory = (query: string) => {
    const updatedHistory = searchHistory.filter((item) => item !== query);
    setSearchHistory(updatedHistory);
    localStorage.setItem("adminSearchHistory", JSON.stringify(updatedHistory));
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length > 2) {
      performSearch(debouncedQuery);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [debouncedQuery]);

  const performSearch = async (query: string) => {
    setSearchLoading(true);
    setShowResults(true); // Always show dropdown when searching
    try {
      const results: any[] = [];

      // Search groceries
      const groceryRes = await axios.get(`/api/groceries?search=${query}`);
      if (groceryRes.data.success) {
        groceryRes.data.groceries.slice(0, 3).forEach((item: any) => {
          results.push({
            type: "Product",
            name: item.name,
            id: item._id,
            link: `/admin/product-details/${item._id}`,
          });
        });
      }

      // Search orders - TODO: Implement search for orders

      // Search users
      const userRes = await axios.get(`/api/admin/users?search=${query}`);
      userRes.data.users.slice(0, 3).forEach((item: any) => {
        results.push({
          type: "User",
          name: item.name,
          id: item._id,
          link: `/admin/users`,
        });
      });

      // Search coupons
      const couponRes = await axios.get(
        `/api/admin/coupon/get-all?search=${query}&page=1&limit=3`
      );
      if (couponRes.data.success) {
        couponRes.data.coupons.forEach((item: any) => {
          results.push({
            type: "Coupon",
            name: item.code,
            id: item._id,
            link: `/admin/coupons`,
          });
        });
      }

      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleResultClick = (link: string) => {
    addToSearchHistory(searchQuery);
    router.push(link);
    setSearchQuery("");
    setShowResults(false);
  };

  const handleHistoryClick = (query: string) => {
    setSearchQuery(query);
    setDebouncedQuery(query);
  };

  return (
    <header className="bg-white shadow-lg border-b border-gray-200 p-4 flex justify-between items-center">
      {/* Mobile Menu Button */}
      <button
        onClick={onToggleMobileSidebar}
        className="md:hidden p-3 rounded-xl hover:bg-gray-100 transition-colors duration-200"
      >
        <Bars3Icon className="h-6 w-6 text-gray-600" />
      </button>

      {/* Search */}
      <div className="relative flex-1 max-w-sm mx-4">
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search products, orders, users, coupons..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => {
            if (searchResults.length > 0 || (!searchQuery && searchHistory.length > 0)) {
              setShowResults(true);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchResults.length > 0) {
              handleResultClick(searchResults[0].link);
            }
          }}
          className="pl-12 pr-4 py-3 border border-gray-300 rounded-full text-sm w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
        {showResults && (
          <>
            {/* Backdrop to close dropdown */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowResults(false)}
            />
            <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
              {searchLoading ? (
                <div className="px-4 py-3 text-gray-500">Searching...</div>
              ) : searchResults.length > 0 ? (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b">
                    Search Results
                  </div>
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handleResultClick(result.link)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {result.name}
                      </div>
                      <div className="text-xs text-gray-500">{result.type}</div>
                    </button>
                  ))}
                </>
              ) : !searchQuery && searchHistory.length > 0 ? (
                <>
                  <div className="px-4 py-2 flex items-center justify-between border-b">
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      Recent Searches
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearSearchHistory();
                      }}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                  {searchHistory.map((query, index) => (
                    <div
                      key={index}
                      className="w-full px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center gap-3 justify-between group"
                    >
                      <button
                        onClick={() => handleHistoryClick(query)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{query}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromHistory(query);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                        title="Remove"
                      >
                        <XMarkIcon className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </>
              ) : searchQuery ? (
                <div className="px-4 py-3 text-gray-500">No results found</div>
              ) : null}
            </div>
          </>
        )}
      </div>

      {/* Icons */}
      <div className="flex items-center space-x-3">
        {/* Theme Dropdown */}
        <div className="relative">
          <button
            onClick={() => setThemeMenuOpen(!themeMenuOpen)}
            className="p-3 rounded-xl hover:bg-gray-100 transition-colors duration-200 flex items-center"
          >
            {mounted && theme === "dark" ? (
              <MoonIcon className="h-5 w-5 text-gray-600" />
            ) : mounted && theme === "system" ? (
              <ComputerDesktopIcon className="h-5 w-5 text-gray-600" />
            ) : (
              <SunIcon className="h-5 w-5 text-gray-600" />
            )}
            <ChevronDownIcon
              className={`h-4 w-4 ml-1 text-gray-500 transition-transform duration-200 ${themeMenuOpen ? "rotate-180" : ""
                }`}
            />
          </button>
          {themeMenuOpen && (
            <>
              {/* Backdrop to close dropdown on outside click */}
              <div
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setThemeMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                <button
                  onClick={() => {
                    setTheme("light");
                    setThemeMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left flex items-center hover:bg-gray-50 rounded-t-xl"
                >
                  <SunIcon className="h-5 w-5 mr-3 text-yellow-500" />
                  Light
                </button>
                <button
                  onClick={() => {
                    setTheme("dark");
                    setThemeMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left flex items-center hover:bg-gray-50"
                >
                  <MoonIcon className="h-5 w-5 mr-3 text-slate-600" />
                  Dark
                </button>
                <button
                  onClick={() => {
                    setTheme("system");
                    setThemeMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left flex items-center hover:bg-gray-50 rounded-b-xl"
                >
                  <ComputerDesktopIcon className="h-5 w-5 mr-3 text-blue-500" />
                  System
                </button>
              </div>
            </>
          )}
        </div>
        {user && <NotificationDropdown userId={user?._id!.toString()} fullName={user.name} />}
        {user && <ProfileDropdown user={user} />}
      </div>
    </header>
  );
};

export default AdminHeader;
