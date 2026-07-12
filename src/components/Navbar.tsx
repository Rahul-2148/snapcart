"use client";
import { RootState } from "@/redux/store";
import {
  Bell, // Added Bell icon
  LogOut,
  MailCheckIcon,
  Package,
  Phone,
  Search,
  ShoppingCartIcon,
  User,
  X,
  Loader,
  Heart,
  Repeat,
  ChevronDown,
  Sparkles,
  Camera,
  ScanLine,
  ImageIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useSocket } from "@/contexts/SocketContext";
import { useRouter } from "next/navigation";
import LocationHeader from "@/components/location/LocationHeader";
import axios from "axios";
import { toast } from "sonner";
import { NotificationClient } from "@/types/custom.d";
import { IUser } from "@/models/user.model";

interface Grocery {
  _id: string;
  name: string;
  brand?: string;
  images?: { url: string }[];
}

interface NavbarProps {
  user?: IUser | null;
}

const Navbar = ({ user: propUser }: NavbarProps = {}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const profileDropdown = useRef<HTMLDivElement>(null);
  const [searchBarOpen, setSearchBarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Grocery[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [isRoleAccordionOpen, setIsRoleAccordionOpen] = useState(false);

  // Get session and update function from NextAuth
  const { data: session, update } = useSession();

  // Get user from Redux
  const {
    userData: user,
    isAuthenticated,
    isLoading,
  } = useSelector((state: RootState) => state.user);

  // Handle role switch
  const handleRoleSwitch = async (newRole: string) => {
    setIsSwitchingRole(true);
    try {
      const response = await axios.post("/api/user/switch-role", { role: newRole });
      if (response.data.success) {
        toast.success(`Switched to ${newRole === "deliveryBoy" ? "Delivery Partner" : newRole} mode`);
        // Update NextAuth session cookie before redirecting
        await update();
        // Refresh page to update session
        window.location.href = newRole === "deliveryBoy" ? "/delivery-boy" : newRole === "admin" ? "/admin" : "/";
      }
    } catch (error: any) {
      if (error.response?.data?.code === "OTP_REQUIRED" || error.response?.data?.code === "KYC_REQUIRED") {
        toast.info("Verification required before activating this role.");
        router.push(`/verify-role?role=${newRole}`);
      } else {
        toast.error(error.response?.data?.message || "Failed to switch role");
      }
    } finally {
      setIsSwitchingRole(false);
    }
  };

  // Use Redux user if available, otherwise use NextAuth session
  const authenticatedUser =
    propUser || user || (session?.user ? (session.user as any) : null);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Visual Search Lens states
  const [showLensModal, setShowLensModal] = useState(false);
  const [lensLoading, setLensLoading] = useState(false);
  const [lensResults, setLensResults] = useState<any[]>([]);
  const [lensPreview, setLensPreview] = useState<string | null>(null);
  const lensInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<Blob | File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = document.createElement("img");
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            0.7
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  const handleLensUpload = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setLensPreview(URL.createObjectURL(file));
    setLensLoading(true);
    setLensResults([]);
    try {
      const compressedBlob = await compressImage(file);
      const formData = new FormData();
      formData.append("file", compressedBlob, "lens_image.jpg");
      formData.append("k", "5");
      const res = await axios.post("/api/vision/search", formData);
      if (res.data?.success && res.data?.matchedItems?.length > 0) {
        const productIds = res.data.matchedItems
          .map((item: any) => item.productId)
          .filter(Boolean)
          .join(",");

        setShowLensModal(false);
        setLensPreview(null);
        setLensResults([]);

        toast.success("Matching products found!");
        router.push(`/user/products?ids=${productIds}`);
      } else {
        toast.error("No matching products found in store");
      }
    } catch (err: any) {
      console.error("Lens error:", err);
      toast.error("Visual search failed. Please try again.");
    } finally {
      setLensLoading(false);
    }
  };

  // Blinkit-style rotating placeholder suggestions
  const placeholderSuggestions = [
    "milk, bread, eggs...",
    "fresh vegetables...",
    "fruits & berries...",
    "snacks & beverages...",
    "dairy products...",
    "rice, atta & dal...",
    "chocolates & sweets...",
    "instant noodles...",
    "cold drinks & juices...",
    "breakfast cereals...",
  ];

  // Notification states
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationClient[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const socket = useSocket();

  // Updated: cartItems use karo, cartData ki jagah
  const totalItems = useSelector((state: RootState) => state.cart.totalItems);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recentSearches");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Rotate placeholder text every 3 seconds (Blinkit style)
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setPlaceholderIndex(
          (prev) => (prev + 1) % placeholderSuggestions.length,
        );
        setIsAnimating(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [placeholderSuggestions.length]);

  // Save recent searches to localStorage
  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;

    const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(
      0,
      10,
    );
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  // Remove a recent search
  const removeRecentSearch = (query: string) => {
    const updated = recentSearches.filter((s) => s !== query);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  // Clear all recent searches
  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recentSearches");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdown.current &&
        !profileDropdown.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
      // Close notifications dropdown if clicked outside
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      // Close search dropdown if clicked outside
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node) &&
        !searchInputRef.current?.contains(event.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Real-time search functionality
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsSearching(true);
        try {
          const response = await axios.get(
            `/api/groceries/search?search=${encodeURIComponent(
              searchQuery,
            )}&limit=8`,
          );
          console.log("[Navbar] Search Response:", response.data);
          if (response.data.groceries && response.data.groceries.length > 0) {
            console.log(
              "[Navbar] First result ID:",
              response.data.groceries[0]._id,
            );
          }
          setSearchResults(response.data.groceries || []);
          setShowSearchDropdown(true);
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowSearchDropdown(false);
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  const handleSearchItemClick = (id: string) => {
    // Basic validation - just check if ID exists and is not empty
    console.log(
      "[Navbar] Clicked product ID:",
      id,
      "Type:",
      typeof id,
      "Length:",
      String(id).length,
    );

    if (!id || typeof id !== "string" || id.trim().length === 0) {
      console.error("[Navbar] Invalid ID:", id);
      toast.error("Invalid product ID");
      return;
    }

    // Save to recent searches
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
    }

    console.log("[Navbar] Navigating to product:", id);
    // Navigate to product details page using Next.js router (client-side navigation)
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchDropdown(false);
    router.push(`/user/product-details/${id}`);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchDropdown(false);
    searchInputRef.current?.focus();
  };

  const handleRecentSearchClick = (query: string) => {
    setSearchQuery(query);
    searchInputRef.current?.focus();
  };

  // Fetch notifications from database on mount
  useEffect(() => {
    if (user?._id) {
      const fetchNotifications = async () => {
        try {
          const res = await axios.get("/api/notifications");
          setNotifications(res.data);
          setUnreadCount(res.data.filter((n: NotificationClient) => !n.read).length);
        } catch (error) {
          console.error("Error fetching notifications:", error);
        }
      };
      fetchNotifications();
    }
  }, [user?._id]);

  // Listen for new notifications in real-time
  useEffect(() => {
    if (socket && user?._id) {
      socket.on("new_notification", (notification: NotificationClient) => {
        setNotifications((prev) => [notification, ...prev]);
        if (!notification.read) {
          setUnreadCount((prev) => prev + 1);
        }
      });
    }

    return () => {
      if (socket) {
        socket.off("new_notification");
      }
    };
  }, [socket, user?._id]);

  return (
    <>
      <div className="w-[95%] fixed top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white rounded-2xl shadow-lg shadow-black/30 flex justify-between items-start md:items-center h-20 px-4 py-2.5 md:py-0 md:px-8 z-50">
        {/* Left side: Logo & Address stacked on mobile, inline on desktop */}
        <div className="flex flex-col items-start justify-start md:flex-row md:items-center gap-0 md:gap-4 leading-none flex-grow md:flex-grow-0 min-w-0 mr-2 md:mr-0 pt-1 md:pt-0">
          <Link
            href={"/"}
            className="font-extrabold text-xl sm:text-2xl md:text-3xl tracking-wide hover:scale-105 transition-transform whitespace-nowrap"
          >
            Snapcart
          </Link>

          {/* Location Header - Show for guests and users */}
          {(!authenticatedUser ||
            authenticatedUser.currentRole === "user" ||
            authenticatedUser.roles?.includes("user")) && <LocationHeader />}
        </div>

        {/* Desktop Search Bar - Show for guests and users */}
        {!authenticatedUser ||
          authenticatedUser.currentRole === "user" ||
          authenticatedUser.roles?.includes("user") ? (
          <div className="hidden md:flex items-center justify-center flex-1">
            <div className="relative w-96">
              <div className="flex items-center bg-white rounded-full px-4 py-2 w-full shadow-md relative">
                <Search className="text-gray-500 w-5 h-5 mr-2 flex-shrink-0" />
                <div className="relative flex-1 h-6 overflow-hidden">
                  <input
                    ref={searchInputRef}
                    type="text"
                    suppressHydrationWarning
                    className="absolute inset-0 w-full outline-none text-gray-700 bg-transparent z-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => {
                      if (searchQuery) {
                        setShowSearchDropdown(searchResults.length > 0);
                      } else if (recentSearches.length > 0) {
                        setShowSearchDropdown(true);
                      }
                    }}
                  />
                  {!searchQuery && (
                    <div className="absolute inset-0 flex items-center pointer-events-none">
                      <motion.div
                        key={placeholderIndex}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="text-gray-400 text-sm whitespace-nowrap"
                      >
                        Search &quot;{placeholderSuggestions[placeholderIndex]}
                        &quot;
                      </motion.div>
                    </div>
                  )}
                </div>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="ml-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {/* Visual Search Lens Icon */}
                <button
                  type="button"
                  onClick={() => setShowLensModal(true)}
                  className="ml-1.5 p-1.5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm hover:shadow-md cursor-pointer"
                  title="Visual Search — Scan product image"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {showSearchDropdown && (
                  <motion.div
                    ref={searchDropdownRef}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-full bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-96 overflow-y-auto"
                  >
                    {/* Show recent searches when no query */}
                    {!searchQuery && recentSearches.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-700">
                            Recent Searches
                          </p>
                          <button
                            onClick={clearAllRecentSearches}
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                          >
                            Clear All
                          </button>
                        </div>
                        {recentSearches.map((query, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between px-4 py-3 hover:bg-green-50 border-b border-gray-100 last:border-b-0 group"
                          >
                            <div
                              onClick={() => handleRecentSearchClick(query)}
                              className="flex items-center gap-3 flex-1 cursor-pointer"
                            >
                              <Search className="text-gray-400 w-4 h-4" />
                              <p className="text-sm text-gray-700">{query}</p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeRecentSearch(query);
                              }}
                              className="text-gray-400 hover:text-red-500 transition-colors ml-2 p-1"
                              title="Remove"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : isSearching ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader className="w-5 h-5 animate-spin text-green-600" />
                      </div>
                    ) : (
                      <div>
                        {/* Glowy AI Option */}
                        <div
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent("snapcart-ai-open", {
                              detail: { prefill: searchQuery.trim() }
                            }));
                            setShowSearchDropdown(false);
                            setSearchQuery("");
                          }}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 cursor-pointer border-b border-emerald-100 bg-emerald-50/20 text-emerald-800 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-center flex-shrink-0 shadow shadow-emerald-500/30">
                            <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-emerald-950 flex items-center gap-1.5">
                              Ask Snapcart AI about &quot;{searchQuery}&quot;
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">AI</span>
                            </p>
                            <p className="text-[10px] text-emerald-600/90 font-medium">
                              Get dynamic meal plans, organic alternatives, or diet matches
                            </p>
                          </div>
                        </div>

                        {/* Standard Search Results */}
                        {searchResults.length > 0 ? (
                          <div>
                            {searchResults.map((grocery) => (
                              <div
                                key={grocery._id}
                                onClick={() => handleSearchItemClick(grocery._id)}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                              >
                                {grocery.images && grocery.images.length > 0 ? (
                                  <div className="relative w-12 h-12 flex-shrink-0">
                                    <Image
                                      src={grocery.images[0].url}
                                      alt={grocery.name}
                                      fill
                                      className="object-cover rounded"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                                    <Search className="text-gray-400 w-5 h-5" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">
                                    {grocery.name}
                                  </p>
                                  {grocery.brand && (
                                    <p className="text-xs text-gray-500">
                                      {grocery.brand}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-6 text-center text-gray-500 border-t border-gray-100">
                            <p className="text-xs">No matching products found. Ask our AI instead!</p>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-2 sm:gap-3 md:gap-6 pt-1 md:pt-0 flex-shrink-0">
          {/* search, notifications & cart for user and guests */}
          {!authenticatedUser || authenticatedUser?.currentRole === "user" ? (
            <>
              <div
                className="bg-white rounded-full w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center shadow-md hover:scale-105 transition md:hidden cursor-pointer"
                onClick={() => setSearchBarOpen((prev) => !prev)}
              >
                <Search className="text-green-600 w-5 h-5 md:w-6 md:h-6" />
              </div>
              <Link
                href={"/user/cart"}
                className="relative bg-white rounded-full w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center shadow-md hover:scale-105 transition"
              >
                <ShoppingCartIcon className="text-green-600 w-5 h-5 md:w-6 md:h-6" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] md:text-xs w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full font-semibold shadow">
                  {totalItems || 0}
                </span>
              </Link>
            </>
          ) : null}

          {/* Notifications for all roles */}
          <div
            className="relative"
            onMouseEnter={() => setShowNotifications(true)}
            onMouseLeave={() => setShowNotifications(false)}
            ref={notificationDropdownRef} // Keep ref on the parent container for better hover area
          >
            <div
              className="relative bg-white rounded-full w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center shadow-md hover:scale-105 transition-transform cursor-pointer" // Added cursor-pointer
              onClick={() => setShowNotifications((prev) => !prev)}
            >
              <Bell className="text-green-600 w-5 h-5 md:w-6 md:h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] md:text-xs w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full font-semibold shadow">
                  {unreadCount}
                </span>
              )}
            </div>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.8 }}
                  className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 p-3 z-[9999] max-h-96 overflow-y-auto"
                >
                  <h3 className="font-semibold text-lg mb-3 text-gray-800">
                    Notifications
                  </h3>

                  {!authenticatedUser?._id ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="bg-green-50 p-4 rounded-full mb-3">
                        <Bell className="w-8 h-8 text-green-500 opacity-80" />
                      </div>
                      <h4 className="text-gray-800 font-semibold mb-1">Welcome to Snapcart! 👋</h4>
                      <p className="text-gray-500 text-sm mb-4 px-2">
                        Please log in to view your personalized notifications, track orders, and discover exclusive offers.
                      </p>
                      <Link
                        href="/login"
                        className="bg-green-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition shadow-sm"
                        onClick={() => setShowNotifications(false)}
                      >
                        Log In / Sign Up
                      </Link>
                    </div>
                  ) : (
                    <>
                      {/* Filter Tabs */}
                      <div className="flex gap-1.5 border-b border-gray-100 pb-2 mb-3">
                        {(["all", "unread", "read"] as const).map((t) => (
                          <button
                            type="button"
                            key={t}
                            onClick={() => setFilter(t)}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition uppercase tracking-wider cursor-pointer ${filter === t
                                ? "bg-green-600 text-white shadow-sm shadow-green-600/10"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
                              }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>

                      {filteredNotifications.length === 0 ? (
                        <p className="text-gray-500 text-sm py-4 text-center">No notifications found.</p>
                      ) : (
                        <>
                          <button
                            onClick={async () => {
                              try {
                                await axios.put("/api/notifications/read-all");
                                setNotifications(
                                  notifications.map((n) => ({ ...n, read: true })),
                                );
                                setUnreadCount(0);
                              } catch (error) {
                                console.error("Error marking all as read:", error);
                              }
                            }}
                            className="w-full text-right text-sm text-green-600 hover:text-green-800 mb-2 cursor-pointer font-semibold"
                          >
                            Mark all as read
                          </button>
                          {filteredNotifications.map((notification) => (
                            <div
                              key={notification._id as any}
                              onClick={async () => {
                                if (!notification.read) {
                                  try {
                                    await axios.put(
                                      `/api/notifications/${notification._id}/read`,
                                    );
                                    setNotifications((prev) =>
                                      prev.map((n) =>
                                        n._id === notification._id
                                          ? { ...n, read: true }
                                          : n,
                                      ),
                                    );
                                    setUnreadCount((prev) => prev - 1);
                                  } catch (error) {
                                    console.error(
                                      "Error marking notification as read:",
                                      error,
                                    );
                                  }
                                }
                                if (notification.link) {
                                  window.location.href = notification.link;
                                }
                              }}
                              className={`p-2.5 rounded-xl mb-2 cursor-pointer ${notification.read
                                  ? "bg-gray-50 text-gray-600 border border-gray-100"
                                  : "bg-green-50/50 text-gray-800 font-medium border border-green-100/50"
                                } hover:bg-green-100/50 transition-all`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-sm">{notification.message}</p>
                                <span className="text-[9px] text-green-600 bg-green-100 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                                  {notification.type}
                                </span>
                              </div>

                              <p className="text-[10px] text-gray-400 mt-1">
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* admin */}
          {authenticatedUser &&
            (authenticatedUser.currentRole === "admin" ||
              authenticatedUser.roles?.includes("admin")) && (
              <div className="flex items-center gap-2">
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-semibold hover:bg-purple-200 transition-colors text-sm"
                >
                  Admin Dashboard
                </Link>
              </div>
            )}

          {/* profile dropdown */}
          <div className="relative" ref={profileDropdown}>
            <div
              className="bg-white rounded-full w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 flex items-center justify-center overflow-hidden shadow-md hover:scale-105 transition-transform cursor-pointer"
              onClick={() => setOpen((prev) => !prev)}
            >
              {authenticatedUser?.image?.url || session?.user?.image ? (
                <div className="relative w-full h-full">
                  <Image
                    src={authenticatedUser?.image?.url || session?.user?.image || ""}
                    alt="user"
                    fill
                    className="object-cover rounded-full"
                    unoptimized
                  />
                </div>
              ) : (
                <User className="text-green-600 w-5 h-5 md:w-6 md:h-6" />
              )}
            </div>

            {/* dropdown */}
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.8 }}
                  className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 p-3 z-999"
                >
                  {/* GUEST USER - Show Login/Signup */}
                  {!authenticatedUser ? (
                    <>
                      <div className="border-b border-gray-100 pb-3 mb-3 text-center">
                        <p className="text-gray-700 text-sm font-semibold mb-3">
                          Welcome to Snapcart!
                        </p>
                        <Link
                          href={"/login"}
                          className="block w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition mb-2 text-sm"
                          onClick={() => setOpen(false)}
                        >
                          Login
                        </Link>
                        <Link
                          href={"/register"}
                          className="block w-full bg-gray-100 text-green-600 py-2 rounded-lg font-semibold hover:bg-gray-200 transition text-sm"
                          onClick={() => setOpen(false)}
                        >
                          Sign Up
                        </Link>
                      </div>
                      <div className="text-center px-2 py-2">
                        <p className="text-xs text-gray-500">
                          💡 Continue as guest to add items to cart
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* LOGGED IN USER - Show profile details and options */}
                      <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center overflow-hidden relative flex-shrink-0">
                          {authenticatedUser?.image?.url || session?.user?.image ? (
                            <Image
                              src={authenticatedUser?.image?.url || session?.user?.image || ""}
                              width={40}
                              height={40}
                              alt={authenticatedUser?.name || session?.user?.name || "user"}
                              className="object-cover rounded-full"
                              referrerPolicy="no-referrer"
                              unoptimized
                            />
                          ) : (
                            <User className="text-green-600" />
                          )}
                        </div>
                        <div>
                          <div className="text-gray-800 font-semibold text-sm">
                            {authenticatedUser?.name || "User"}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {authenticatedUser?.currentRole ||
                              authenticatedUser?.roles?.[0] ||
                              "user"}
                          </div>
                        </div>
                      </div>

                      <div className="px-3 py-2 border-b border-gray-100 space-y-1">
                        <p className="text-xs text-gray-700 flex items-start gap-1">
                          <span className="text-gray-500 flex-shrink-0">Email:</span>
                          <span className="truncate" title={authenticatedUser?.email}>{authenticatedUser?.email}</span>
                        </p>
                        {authenticatedUser?.mobileNumber && (
                          <p className="text-xs text-gray-700 flex items-start gap-1">
                            <span className="text-gray-500 flex-shrink-0">Mobile:</span>
                            <span className="text-black">{authenticatedUser.mobileNumber}</span>
                          </p>
                        )}
                      </div>

                      {/* ROLE SWITCHER - Show if user has multiple switchable non-admin roles */}
                      {(() => {
                        const switchableRoles = (authenticatedUser?.roles || []).filter((r: string) => r !== "admin");
                        if (switchableRoles.length <= 1) return null;
                        return (
                          <div className="border-b border-gray-100">
                            {/* Accordion Header */}
                            <button
                              onClick={() => setIsRoleAccordionOpen(!isRoleAccordionOpen)}
                              className="w-full flex items-center justify-between px-3 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <p className="text-xs text-gray-600 flex items-center gap-1 font-semibold">
                                <Repeat className="w-3.5 h-3.5" />
                                Switch Account Type
                              </p>
                              <ChevronDown
                                className={`w-4 h-4 text-gray-400 transition-transform ${isRoleAccordionOpen ? "rotate-180" : ""
                                  }`}
                              />
                            </button>

                            {/* Accordion Content */}
                            <AnimatePresence>
                              {isRoleAccordionOpen && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden bg-gray-50"
                                >
                                  <div className="px-3 py-2 space-y-2">
                                    {switchableRoles.map((role: string) => {
                                      const isActive = role === authenticatedUser.currentRole;
                                      return (
                                        <button
                                          key={role}
                                          disabled={isActive || isSwitchingRole}
                                          onClick={() => {
                                            handleRoleSwitch(role);
                                            setIsRoleAccordionOpen(false);
                                          }}
                                          className={`w-full flex items-center justify-between gap-1 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all border whitespace-nowrap ${isActive
                                              ? "bg-green-600 text-white border-green-600 shadow-sm"
                                              : "bg-white text-gray-700 border-gray-200 hover:border-green-300 hover:bg-green-50"
                                            } disabled:opacity-60`}
                                        >
                                          <span className="flex items-center gap-1 flex-shrink-0">
                                            <span className="flex-shrink-0">
                                              {role === "user" && "🛒"}
                                              {role === "deliveryBoy" && "🚴"}
                                            </span>
                                            <span className="truncate">
                                              {role === "user" && "Customer"}
                                              {role === "deliveryBoy" && "Delivery Partner"}
                                            </span>
                                          </span>
                                          {isActive ? (
                                            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full flex-shrink-0">
                                              Active
                                            </span>
                                          ) : (
                                            <span className="text-[10px] text-gray-500 flex-shrink-0">Switch</span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })()}

                      <Link
                        href={"/user/account"}
                        className="flex items-center gap-2 px-3 py-3 hover:bg-green-50 rounded-lg text-gray-700 font-medium text-sm"
                        onClick={() => setOpen(false)}
                      >
                        <User className="w-5 h-5 text-green-600" />
                        My Account
                      </Link>

                      {authenticatedUser?.currentRole === "user" && (
                        <>
                          <Link
                            href={"/user/orders"}
                            className="flex items-center gap-2 px-3 py-3 hover:bg-green-50 rounded-lg text-gray-700 font-medium text-sm"
                            onClick={() => setOpen(false)}
                          >
                            <Package className="w-5 h-5 text-green-600" />
                            My Orders
                          </Link>

                          <Link
                            href={"/user/wishlists"}
                            className="flex items-center gap-2 px-3 py-3 hover:bg-green-50 rounded-lg text-gray-700 font-medium text-sm"
                            onClick={() => setOpen(false)}
                          >
                            <Heart className="w-5 h-5 text-red-500" />
                            My Wishlists
                          </Link>
                        </>
                      )}

                      {authenticatedUser?.currentRole === "deliveryBoy" && (
                        <Link
                          href={"/delivery-boy/assignments"}
                          className="flex items-center gap-2 px-3 py-3 hover:bg-green-50 rounded-lg text-gray-700 font-medium text-sm"
                          onClick={() => setOpen(false)}
                        >
                          <Package className="w-5 h-5 text-green-600" />
                          My Deliveries
                        </Link>
                      )}

                      {authenticatedUser?.currentRole === "admin" && (
                        <Link
                          href={"/admin"}
                          className="flex items-center gap-2 px-3 py-3 hover:bg-green-50 rounded-lg text-gray-700 font-medium text-sm"
                          onClick={() => setOpen(false)}
                        >
                          <Package className="w-5 h-5 text-purple-600" />
                          Admin Dashboard
                        </Link>
                      )}

                      <button
                        type="button"
                        className="flex items-center gap-2 w-full text-left px-3 py-3 hover:bg-red-50 rounded-lg text-gray-700 font-medium text-sm"
                        onClick={() => {
                          setOpen(false);
                          signOut({ redirect: true, callbackUrl: "/" });
                        }}
                      >
                        <LogOut className="w-5 h-5 text-red-600" />
                        Logout
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* floating search bar for mobile when search bar is open */}
        <AnimatePresence>
          {searchBarOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 w-[90%] z-40"
            >
              <div className="relative">
                <div className="flex items-center bg-white rounded-full shadow-lg px-4 py-2">
                  <Search className="text-gray-500 w-5 h-5 mr-2 flex-shrink-0" />
                  <div className="relative flex-1 h-6 overflow-hidden">
                    <input
                      ref={searchInputRef}
                      type="text"
                      suppressHydrationWarning
                      className="absolute inset-0 w-full outline-none text-gray-700 bg-transparent z-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => {
                        if (searchQuery) {
                          setShowSearchDropdown(searchResults.length > 0);
                        } else if (recentSearches.length > 0) {
                          setShowSearchDropdown(true);
                        }
                      }}
                    />
                    {!searchQuery && (
                      <div className="absolute inset-0 flex items-center pointer-events-none">
                        <motion.div
                          key={placeholderIndex}
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -20, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="text-gray-400 text-sm whitespace-nowrap"
                        >
                          Search &quot;{placeholderSuggestions[placeholderIndex]}
                          &quot;
                        </motion.div>
                      </div>
                    )}
                  </div>
                  {/* Visual Search Lens Icon (Mobile) */}
                  <button
                    type="button"
                    onClick={() => setShowLensModal(true)}
                    className="p-1.5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm cursor-pointer mr-1"
                    title="Visual Search"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  ) : (
                    <X
                      className="text-gray-500 w-5 h-5 cursor-pointer"
                      onClick={() => setSearchBarOpen(false)}
                    />
                  )}
                </div>

                {/* Mobile Search Results Dropdown */}
                <AnimatePresence>
                  {showSearchDropdown && (
                    <motion.div
                      ref={searchDropdownRef}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-80 overflow-y-auto"
                    >
                      {/* Show recent searches when no query */}
                      {!searchQuery && recentSearches.length > 0 ? (
                        <div>
                          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <p className="text-sm font-semibold text-gray-700">
                              Recent Searches
                            </p>
                            <button
                              onClick={clearAllRecentSearches}
                              className="text-xs text-red-500 hover:text-red-700 font-medium"
                            >
                              Clear All
                            </button>
                          </div>
                          {recentSearches.map((query, index) => (
                            <div
                              key={`recent-search-${query}-${index}`}
                              className="flex items-center justify-between px-4 py-3 hover:bg-green-50 border-b border-gray-100 last:border-b-0 group"
                            >
                              <div
                                onClick={() => handleRecentSearchClick(query)}
                                className="flex items-center gap-3 flex-1 cursor-pointer"
                              >
                                <Search className="text-gray-400 w-4 h-4" />
                                <p className="text-sm text-gray-700">{query}</p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeRecentSearch(query);
                                }}
                                className="text-gray-400 hover:text-red-500 transition-colors ml-2 p-1"
                                title="Remove"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : isSearching ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader className="w-5 h-5 animate-spin text-green-600" />
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div>
                          {searchResults.map((grocery) => (
                            <div
                              key={grocery._id}
                              onClick={() => {
                                handleSearchItemClick(grocery._id);
                                setSearchBarOpen(false);
                              }}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                            >
                              {grocery.images && grocery.images.length > 0 ? (
                                <div className="relative w-12 h-12 flex-shrink-0">
                                  <Image
                                    src={grocery.images[0].url}
                                    alt={grocery.name}
                                    fill
                                    className="object-cover rounded"
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                                  <Search className="text-gray-400 w-5 h-5" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                  {grocery.name}
                                </p>
                                {grocery.brand && (
                                  <p className="text-xs text-gray-500">
                                    {grocery.brand}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-gray-500">
                          <p className="text-sm">No groceries found</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Visual Search Lens Modal */}
      <AnimatePresence>
        {showLensModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => {
              setShowLensModal(false);
              setLensResults([]);
              setLensPreview(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 rounded-t-3xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <ScanLine className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">Visual Search</h3>
                      <p className="text-xs text-white/80">Snap a photo to find products</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowLensModal(false);
                      setLensResults([]);
                      setLensPreview(null);
                    }}
                    className="p-1.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Upload Buttons */}
                {!lensPreview && !lensLoading && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const camInput = document.createElement("input");
                          camInput.type = "file";
                          camInput.accept = "image/*";
                          camInput.capture = "environment";
                          camInput.onchange = (ev) => {
                            const file = (ev.target as HTMLInputElement).files?.[0];
                            if (file) handleLensUpload(file);
                          };
                          camInput.click();
                        }}
                        className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-emerald-300 rounded-2xl bg-emerald-50/50 hover:bg-emerald-100/70 transition-all cursor-pointer group"
                      >
                        <div className="p-3 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors">
                          <Camera className="w-6 h-6 text-emerald-600" />
                        </div>
                        <span className="text-sm font-bold text-emerald-700">Take Photo</span>
                        <span className="text-[10px] text-emerald-500">Use your camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => lensInputRef.current?.click()}
                        className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/50 hover:bg-gray-100/70 transition-all cursor-pointer group"
                      >
                        <div className="p-3 bg-gray-100 rounded-xl group-hover:bg-gray-200 transition-colors">
                          <ImageIcon className="w-6 h-6 text-gray-600" />
                        </div>
                        <span className="text-sm font-bold text-gray-700">Upload Image</span>
                        <span className="text-[10px] text-gray-500">From your gallery</span>
                      </button>
                    </div>
                    <input
                      ref={lensInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleLensUpload(file);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Preview & Loading */}
                {lensPreview && (
                  <div className="relative">
                    <img
                      src={lensPreview}
                      alt="Scanned product"
                      className="w-full h-48 object-contain rounded-2xl bg-gray-100 border border-gray-200"
                    />
                    {lensLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-2">
                          <Loader className="w-8 h-8 text-white animate-spin" />
                          <span className="text-white text-xs font-bold">Analyzing image...</span>
                        </div>
                      </div>
                    )}
                    {!lensLoading && (
                      <button
                        onClick={() => {
                          setLensPreview(null);
                          setLensResults([]);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Results */}
                {lensResults.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-extrabold text-gray-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      {lensResults[0]?.matchedLabel ? "Products Found" : "Items Identified"}
                    </h4>
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {lensResults.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-150 hover:bg-emerald-50/55 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            {item.image ? (
                              <div
                                onClick={() => {
                                  if (item.productId) {
                                    router.push(`/user/product-details/${item.productId}`);
                                    setShowLensModal(false);
                                    setLensResults([]);
                                    setLensPreview(null);
                                  }
                                }}
                                className="relative w-10 h-10 flex-shrink-0 bg-white border border-gray-150 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                                title="View Product Details"
                              >
                                <Image
                                  src={item.image}
                                  alt={item.matchedLabel || item.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 font-bold text-xs flex-shrink-0">
                                {idx + 1}
                              </div>
                            )}
                            <div>
                              <p
                                onClick={() => {
                                  if (item.productId) {
                                    router.push(`/user/product-details/${item.productId}`);
                                    setShowLensModal(false);
                                    setLensResults([]);
                                    setLensPreview(null);
                                  }
                                }}
                                className="text-xs font-bold text-gray-800 leading-snug cursor-pointer hover:text-emerald-600 hover:underline"
                                title="View Product Details"
                              >
                                {item.matchedLabel || item.name}
                              </p>
                              <div className="flex items-center gap-1.5 text-[9px] text-gray-500 mt-0.5 select-none">
                                <span
                                  onClick={(e) => {
                                    if (item.categoryId) {
                                      e.stopPropagation();
                                      router.push(`/user/products?category=${item.categoryId}`);
                                      setShowLensModal(false);
                                      setLensResults([]);
                                      setLensPreview(null);
                                    }
                                  }}
                                  className={`hover:text-emerald-600 hover:underline ${item.categoryId ? 'cursor-pointer font-semibold' : ''}`}
                                  title={item.categoryId ? "Browse Category Products" : ""}
                                >
                                  {item.categoryName || item.category || "Grocery"}
                                </span>
                                {item.price > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="font-extrabold text-emerald-600">₹{item.price}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {item.matchedLabel && (
                            <button
                              onClick={() => {
                                setSearchQuery(item.matchedLabel);
                                setShowLensModal(false);
                                setLensResults([]);
                                setLensPreview(null);
                              }}
                              className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              Search
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Try Again */}
                {lensPreview && !lensLoading && (
                  <button
                    onClick={() => {
                      setLensPreview(null);
                      setLensResults([]);
                    }}
                    className="w-full py-2.5 text-sm font-bold text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    Scan Another Product
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
