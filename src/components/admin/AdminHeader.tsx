"use client";
import Link from "next/link";
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

  const [isSitemapOpen, setIsSitemapOpen] = useState(false);
  const [sitemapSearch, setSitemapSearch] = useState("");

  const sitemapData = [
    {
      group: "Admin Control Panel",
      routes: [
        { name: "Dashboard", path: "/admin", desc: "Main statistics & charts" },
        { name: "Manage Stores", path: "/admin/stores", desc: "View & edit storefront locations" },
        { name: "Add Grocery Product", path: "/admin/add-grocery", desc: "Create new inventory item" },
        { name: "Groceries List", path: "/admin/groceries", desc: "Manage current products list" },
        { name: "Categories", path: "/admin/categories", desc: "Manage grocery categories" },
        { name: "Banners", path: "/admin/banners", desc: "Promotional hero banners" },
        { name: "Orders Tracker", path: "/admin/orders", desc: "Track customer order shipments" },
        { name: "Returns Desk", path: "/admin/returns", desc: "Manage return requests" },
        { name: "Incentives & KYC", path: "/admin/incentives", desc: "Review partner incentives" },
        { name: "Users Directory", path: "/admin/users", desc: "Manage and block user accounts" },
        { name: "Staff Directory", path: "/admin/staff", desc: "Manage admin & staff accounts" },
        { name: "Delivery Partners", path: "/admin/delivery-partners", desc: "Fleet KYC & management" },
        { name: "Delivery Settings", path: "/admin/delivery-settings", desc: "Configure charges & thresholds" },
        { name: "Payouts Desk", path: "/admin/payouts", desc: "Manage store and fleet payouts" },
        { name: "Coupons & Promos", path: "/admin/coupons", desc: "Promotional discount codes" },
        { name: "Gift Cards", path: "/admin/gift-cards", desc: "Issue voucher gift codes" },
        { name: "Newsletter", path: "/admin/newsletter", desc: "Send mass subscriber emails" },
        { name: "System Settings", path: "/admin/settings", desc: "Global store configurations" },
        { name: "Audit Logs", path: "/admin/audit-logs", desc: "Security actions tracking history" },
        { name: "COD Settings", path: "/admin/cod-settings", desc: "Manage Cash On Delivery status" },
      ]
    },
    {
      group: "Customer Application",
      routes: [
        { name: "Storefront Home", path: "/", desc: "Guest/Customer shopping page" },
        { name: "Login Portal", path: "/login", desc: "Account authentication portal" },
        { name: "Signup Portal", path: "/register", desc: "New customer registration" },
        { name: "User Profile", path: "/user/profile", desc: "Personal settings & passwords" },
        { name: "Shopping Cart", path: "/user/cart", desc: "Selected products & checkout options" },
        { name: "My Orders Desk", path: "/user/orders", desc: "Order tracking & history list" },
        { name: "Wishlist", path: "/user/wishlist", desc: "Saved favorite items list" },
      ]
    },
    {
      group: "Delivery Partner Panel",
      routes: [
        { name: "Delivery Dashboard", path: "/delivery-boy", desc: "Active orders and cash-in-hand" },
      ]
    },
    {
      group: "Store Manager Console",
      routes: [
        { name: "Manager Dashboard", path: "/store-manager", desc: "Store order queues and inventory stats" },
      ]
    }
  ];

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
        {/* Sitemap Button */}
        <button
          onClick={() => setIsSitemapOpen(true)}
          className="p-3 rounded-xl hover:bg-gray-100 transition-colors duration-200"
          title="View Sitemap"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5 text-gray-600"
          >
            <circle cx="12" cy="5" r="2" />
            <circle cx="5" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
            <path d="M12 7v3M5 10v0a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v0M12 12v5" />
          </svg>
        </button>

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

      {/* Sitemap Modal Overlay */}
      {isSitemapOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          {/* Backdrop to close */}
          <div className="absolute inset-0" onClick={() => setIsSitemapOpen(false)} />
          
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col border border-gray-100 dark:border-slate-800 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-xl">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5 text-blue-600 dark:text-blue-400"
                  >
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="19" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                    <path d="M12 7v3M5 10v0a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v0M12 12v5" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Application Sitemap
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Quickly navigate to any route in the application
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSitemapOpen(false)}
                className="p-1.5 hover:bg-gray-250 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Search filter bar */}
            <div className="px-6 py-3 border-b border-gray-100 dark:border-slate-850 bg-white dark:bg-slate-900 flex items-center">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter routes by name or path..."
                  value={sitemapSearch}
                  onChange={(e) => setSitemapSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 rounded-lg text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Content list */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sitemapData.map((section, sIdx) => {
                  const filteredRoutes = section.routes.filter(
                    (r) =>
                      r.name.toLowerCase().includes(sitemapSearch.toLowerCase()) ||
                      r.path.toLowerCase().includes(sitemapSearch.toLowerCase())
                  );

                  if (filteredRoutes.length === 0) return null;

                  return (
                    <div
                      key={sIdx}
                      className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-gray-100 dark:border-slate-800/80 shadow-sm flex flex-col"
                    >
                      <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                        {section.group}
                      </h4>
                      <div className="space-y-1 flex-1">
                        {filteredRoutes.map((route, rIdx) => (
                          <Link
                            key={rIdx}
                            href={route.path}
                            onClick={() => setIsSitemapOpen(false)}
                            className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group text-left w-full"
                          >
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 group-hover:scale-125 transition-transform" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {route.name}
                              </p>
                              <p className="text-[10px] font-mono text-gray-400 dark:text-slate-500">
                                {route.path}
                              </p>
                              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                                {route.desc}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default AdminHeader;
