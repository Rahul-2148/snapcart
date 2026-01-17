"use client";
import { RootState } from "@/redux/store";
import {
  Bars3Icon,
  ChevronDownIcon,
  ComputerDesktopIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  SunIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { NotificationDropdown } from "../common/NotificationDropdown";
import { ProfileDropdown } from "../common/ProfileDropdown";

interface AdminHeaderProps {
  onToggleMobileSidebar?: () => void;
}

const AdminHeader = ({ onToggleMobileSidebar }: AdminHeaderProps) => {
  // @ts-ignore
  const { userData: user } = useSelector((state: RootState) => state.user);

  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const router = useRouter();

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
      setShowResults(results.length > 0);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleResultClick = (link: string) => {
    router.push(link);
    setSearchQuery("");
    setShowResults(false);
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
          onFocus={() => setShowResults(searchResults.length > 0)}
          className="pl-12 pr-4 py-3 border border-gray-300 rounded-full text-sm w-full text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
        {showResults && (
          <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
            {searchLoading ? (
              <div className="px-4 py-3 text-gray-500">Searching...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map((result, index) => (
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
              ))
            ) : (
              <div className="px-4 py-3 text-gray-500">No results found</div>
            )}
          </div>
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
            <SunIcon className="h-5 w-5 text-gray-600" />
            <ChevronDownIcon
              className={`h-4 w-4 ml-1 text-gray-500 transition-transform duration-200 ${
                themeMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>
          {themeMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
              <button className="w-full px-4 py-3 text-left flex items-center hover:bg-gray-50 rounded-t-xl">
                <SunIcon className="h-5 w-5 mr-3 text-yellow-500" />
                Light
              </button>
              <button className="w-full px-4 py-3 text-left flex items-center hover:bg-gray-50">
                <MoonIcon className="h-5 w-5 mr-3 text-slate-600" />
                Dark
              </button>
              <button className="w-full px-4 py-3 text-left flex items-center hover:bg-gray-50 rounded-b-xl">
                <ComputerDesktopIcon className="h-5 w-5 mr-3 text-blue-500" />
                System
              </button>
            </div>
          )}
        </div>
        {user && <NotificationDropdown userId={user?._id!.toString()} />}
        {user && <ProfileDropdown user={user} />}
      </div>
    </header>
  );
};

export default AdminHeader;
