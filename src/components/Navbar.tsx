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
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import useSocket from "@/hooks/useSocket"; // Import useSocket hook
import axios from "axios"; // Import axios
import { NotificationClient } from "@/types/custom.d"; // Import Notification interface
import { IUser } from "@/models/user.model";

const Navbar = ({ user }: { user: IUser }) => {
  const [open, setOpen] = useState(false);
  const profileDropdown = useRef<HTMLDivElement>(null);
  const [searchBarOpen, setSearchBarOpen] = useState(false);


  // Notification states
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationClient[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  const socket = useSocket(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ); // Initialize socket

  // Updated: cartItems use karo, cartData ki jagah
  const totalItems = useSelector((state: RootState) => state.cart.totalItems);

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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch initial notifications
  useEffect(() => {
    if (user?._id) {
      const fetchNotifications = async () => {
        try {
          const res = await axios.get("/api/notifications");
          setNotifications(res.data);
          setUnreadCount(
            res.data.filter((n: NotificationClient) => !n.read).length
          );
        } catch (error) {
          console.error("Error fetching notifications:", error);
        }
      };
      fetchNotifications();
    }
  }, [user?._id]);

  useEffect(() => {
    if (socket && user?._id) {
      socket.emit("join_user_room", user._id); // Join user's room for targeted notifications

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
  }, [socket, user?._id]); // Add user?._id to dependency array



  return (
    <div className="w-[95%] fixed top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white rounded-2xl shadow-lg shadow-black/30 flex justify-between items-center h-20 px-4 md:px-8 z-50">
      {/* Logo or website name */}
      <Link
        href={"/"}
        className="font-extrabold text-2xl sm:text-3xl tracking-wide hover:scale-105 transition-transform"
      >
        Snapcart
      </Link>

      {user?.role === "user" && (
        <form className="hidden md:flex items-center bg-white rounded-full px-4 py-2 w-1/2 max-w-lg shadow-md">
          <Search className="text-gray-500 w-5 h-5 mr-2" />
          <input
            type="text"
            placeholder="Search groceries..."
            className="w-full outline-none text-gray-700 placeholder-gray-400"
          />
        </form>
      )}

      <div className="flex items-center gap-3 md:gap-6">
        {/* search, notifications & cart for user */}
        {user?.role === "user" && (
          <>
            <div
              className="bg-white rounded-full w-11 h-11 flex items-center justify-center shadow-md hover:scale-105 transition md:hidden"
              onClick={() => setSearchBarOpen((prev) => !prev)}
            >
              <Search className="text-green-600 w-6 h-6" />
            </div>
            <Link
              href={"/user/cart"}
              className="relative bg-white rounded-full w-11 h-11 flex items-center justify-center shadow-md hover:scale-105 transition"
            >
                                <ShoppingCartIcon className="text-green-600 w-6 h-6" />
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-semibold shadow">                {totalItems || 0}
              </span>
            </Link>
          </>
        )}

        {/* Notifications for all roles */}
        <div
          className="relative"
          onMouseEnter={() => setShowNotifications(true)}
          onMouseLeave={() => setShowNotifications(false)}
          ref={notificationDropdownRef} // Keep ref on the parent container for better hover area
        >
          <div
            className="relative bg-white rounded-full w-11 h-11 flex items-center justify-center shadow-md hover:scale-105 transition-transform cursor-pointer" // Added cursor-pointer
            // onClick={() => setShowNotifications((prev) => !prev)} // Removed onClick
          >
            <Bell className="text-green-600 w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full font-semibold shadow">
                {unreadCount}
              </span>
            )}
          </div>
          <AnimatePresence>
            {showNotifications && user?._id && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.8 }}
                className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 p-3 z-[9999] max-h-96 overflow-y-auto"
              >
                <h3 className="font-semibold text-lg mb-3 text-gray-800">
                  Notifications
                </h3>
                {notifications.length === 0 ? (
                  <p className="text-gray-500 text-sm">No new notifications.</p>
                ) : (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          await axios.put("/api/notifications/read-all");
                          setNotifications(
                            notifications.map((n) => ({ ...n, read: true }))
                          );
                          setUnreadCount(0);
                        } catch (error) {
                          console.error("Error marking all as read:", error);
                        }
                      }}
                      className="w-full text-right text-sm text-green-600 hover:text-green-800 mb-2"
                    >
                      Mark all as read
                    </button>
                    {notifications.map((notification) => (
                      <div
                        key={notification._id as any}
                        onClick={async () => {
                          if (!notification.read) {
                            try {
                              await axios.put(
                                `/api/notifications/${notification._id}/read`
                              );
                              setNotifications((prev) =>
                                prev.map((n) =>
                                  n._id === notification._id
                                    ? { ...n, read: true }
                                    : n
                                )
                              );
                              setUnreadCount((prev) => prev - 1);
                            } catch (error) {
                              console.error(
                                "Error marking notification as read:",
                                error
                              );
                            }
                          }
                          if (notification.link) {
                            window.location.href = notification.link;
                          }
                        }}
                        className={`p-2 rounded-lg mb-2 cursor-pointer ${
                          notification.read
                            ? "bg-gray-50 text-gray-600"
                            : "bg-green-50 text-gray-800 font-medium"
                        } hover:bg-green-100 transition-all`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm">{notification.message}</p>
                          <span className="text-green-600 bg-green-100 px-2 py-1 rounded-full uppercase font-semibold">
                            {notification.type}
                          </span>
                        </div>

                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* admin */}
        {user?.role === "admin" && (
          <>



          </>
        )}

        {/* profile dropdown */}
        <div className="relative" ref={profileDropdown}>
          <div
            className="bg-white rounded-full w-11 h-11 flex items-center justify-center overflow-hidden shadow-md hover:scale-105 transition-transform"
            onClick={() => setOpen((prev) => !prev)}
          >
            {user?.image?.url ? (
              <Image
                src={user?.image?.url}
                alt="user"
                fill
                className="object-cover rounded-full"
              />
            ) : (
              <User />
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
                <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center overflow-hidden relative">
                    {user?.image?.url ? (
                      <Image
                        src={user?.image?.url}
                        alt="user"
                        fill
                        className="object-cover rounded-full"
                      />
                    ) : (
                      <User />
                    )}
                  </div>
                  <div>
                    <div className="text-gray-800 font-semibold">
                      {user.name}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {user.role}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-700 px-3 py-2 border-b border-gray-100">
                  {user.email}
                </p>

                <p className="text-sm text-gray-700 px-3 py-2 border-b border-gray-100">
                  Mobile:{" "}
                  <span className="text-black">{user.mobileNumber}</span>
                </p>

                <Link
                  href={"/user/account"}
                  className="flex items-center gap-2 px-3 py-3 hover:bg-green-50 rounded-lg text-gray-700 font-medium"
                  onClick={() => setOpen(false)}
                >
                  <User className="w-5 h-5 text-green-600" />
                  My Account
                </Link>

                {user?.role === "user" && (
                  <Link
                    href={"/user/orders"}
                    className="flex items-center gap-2 px-3 py-3 hover:bg-green-50 rounded-lg text-gray-700 font-medium"
                    onClick={() => setOpen(false)}
                  >
                    <Package className="w-5 h-5 text-green-600" />
                    My Orders
                  </Link>
                )}

                <button
                  type="button"
                  className="flex items-center gap-2 w-full text-left px-3 py-3 hover:bg-red-50 rounded-lg text-gray-700 font-medium"
                  onClick={() => {
                    setOpen(false);
                    signOut({ redirect: true, callbackUrl: "/login" });
                  }}
                >
                  <LogOut className="w-5 h-5 text-red-600" />
                  Logout
                </button>
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
            className="fixed top-24 left-1/2 -translate-x-1/2 w-[90%] bg-white rounded-full shadow-lg z-40 flex items-center px-4 py-2"
          >
            <Search className="text-gray-500 w-5 h-5 mr-2" />
            <form className="grow">
              <input
                type="text"
                placeholder="Search groceries..."
                className="w-full outline-none text-gray-700 placeholder:gray-400"
              />
            </form>
            <X
              className="text-gray-500 w-5 h-5"
              onClick={() => setSearchBarOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Navbar;
