// src/app/store-manager/layout.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Boxes,
  LogOut,
  Home,
  User,
  ShieldCheck,
  Building,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import axios from "axios";
import { useSocket } from "@/contexts/SocketContext";

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isCollapsed?: boolean;
}

function SidebarLink({ href, icon, label, isCollapsed }: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      title={isCollapsed ? label : undefined}
      className={`flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3"
        } ${isActive
          ? "bg-green-600 text-white shadow-lg shadow-green-900/20"
          : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`}
    >
      <div className="flex-shrink-0">{icon}</div>
      {!isCollapsed && <span className="animate-in fade-in duration-200">{label}</span>}
    </Link>
  );
}

interface NotificationItem {
  _id: string;
  recipient: string;
  recipientRole?: string;
  title?: string;
  message: string;
  type: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export default function StoreManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [storeName, setStoreName] = useState<string>("Loading Store...");
  const socket = useSocket();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Fetch real notifications from database
  useEffect(() => {
    if (session?.user?.id) {
      const fetchNotifications = async () => {
        try {
          const res = await axios.get("/api/notifications");
          setNotifications(res.data);
        } catch (error) {
          console.error("Error fetching notifications for store manager:", error);
        }
      };
      fetchNotifications();
    }
  }, [session?.user?.id]);

  // Listen for socket events in real-time
  useEffect(() => {
    if (socket && session?.user?.id) {
      const handleNewNotification = (notification: NotificationItem) => {
        if (notification.recipient === session.user.id) {
          setNotifications((prev) => [notification, ...prev]);
        }
      };

      socket.on("new_notification", handleNewNotification);

      return () => {
        socket.off("new_notification", handleNewNotification);
      };
    }
  }, [socket, session?.user?.id]);

  // Role validation client-side
  const currentRole = session?.user?.currentRole;
  const roles = session?.user?.roles || [];

  useEffect(() => {
    // Load sidebar state from localStorage
    const saved = localStorage.getItem("managerSidebarCollapsed");
    if (saved) {
      setIsCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapse = () => {
    const newVal = !isCollapsed;
    setIsCollapsed(newVal);
    localStorage.setItem("managerSidebarCollapsed", String(newVal));
  };

  useEffect(() => {
    axios.get("/api/store-manager")
      .then((res) => {
        if (res.data?.store?.name) {
          setStoreName(res.data.store.name);
        }
      })
      .catch(() => {
        setStoreName("No Store Assigned");
      });
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || "/store-manager")}`);
    } else if (session && !roles.includes("storeManager") && !roles.includes("admin")) {
      router.replace("/unauthorized");
    }
  }, [session, status, roles, router, pathname]);

  const handleSwitchRole = async (targetRole: string) => {
    try {
      const res = await axios.post("/api/user/switch-role", { role: targetRole });
      if (res.data.success) {
        toast.success(`Switched role to ${targetRole}`);
        await updateSession({ currentRole: targetRole });

        // Redirect based on role
        if (targetRole === "admin") router.push("/admin");
        else if (targetRole === "deliveryBoy") router.push("/delivery-boy");
        else router.push("/");
      }
    } catch (err: any) {
      if (err.response?.data?.code === "OTP_REQUIRED" || err.response?.data?.code === "KYC_REQUIRED") {
        toast.info("Verification required before switching to this role.");
        router.push(`/verify-role?role=${targetRole}`);
      } else {
        toast.error(err.response?.data?.message || "Failed to switch role");
      }
    }
  };

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <Building className="w-10 h-10 text-green-500 animate-bounce" />
          <p className="text-slate-400 text-sm">Authenticating Store Manager...</p>
        </div>
      </div>
    );
  }

  // Determine if manager can switch back to user or admin roles
  const canSwitchToAdmin = roles.includes("admin");
  const canSwitchToUser = roles.includes("user");

  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === 'unread') return !n.read;
    if (notifFilter === 'read') return n.read;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Dark Sidebar Panel */}
      <aside
        style={{
          width: isCollapsed ? '80px' : '280px',
          transition: 'width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          willChange: 'width',
        }}
        className="bg-slate-900 text-slate-100 flex flex-col justify-between p-4 flex-shrink-0 hidden md:flex overflow-x-hidden"
      >
        <div className="space-y-6">
          {/* Logo Brand */}
          <div className={`pt-3 flex items-center justify-between ${isCollapsed ? 'px-0 justify-center' : 'px-3'}`}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center font-bold text-white shadow-md flex-shrink-0">
                SC
              </div>
              {!isCollapsed && (
                <div className="animate-in fade-in duration-200">
                  <h2 className="font-bold text-lg text-white">SnapCart</h2>
                  <p className="text-xs text-green-400 font-semibold tracking-wider uppercase">
                    Manager Console
                  </p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                onClick={toggleCollapse}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
          </div>

          {isCollapsed && (
            <div className="flex justify-center">
              <button
                onClick={toggleCollapse}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                title="Expand Sidebar"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* User badge */}
          <div className={`p-2.5 bg-slate-800 rounded-xl flex items-center border border-slate-700/50 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div
              className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0"
              title={isCollapsed ? `${session.user?.name} (${session.user?.email})` : undefined}
            >
              {session.user?.name?.slice(0, 2) || "SM"}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1 animate-in fade-in duration-200">
                <p className="text-xs font-semibold text-white truncate">
                  {session.user?.name}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {session.user?.email}
                </p>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <SidebarLink
              href="/store-manager"
              icon={<LayoutDashboard className="w-5 h-5" />}
              label="Dashboard"
              isCollapsed={isCollapsed}
            />
            <SidebarLink
              href="/store-manager/orders"
              icon={<ShoppingBag className="w-5 h-5" />}
              label="Store Orders"
              isCollapsed={isCollapsed}
            />
            <SidebarLink
              href="/store-manager/inventory"
              icon={<Boxes className="w-5 h-5" />}
              label="Inventory Levels"
              isCollapsed={isCollapsed}
            />
            <SidebarLink
              href="/store-manager/staff"
              icon={<User className="w-5 h-5" />}
              label="Staff Registry"
              isCollapsed={isCollapsed}
            />
          </nav>
        </div>

        {/* Bottom Panel controls */}
        <div className={`space-y-3 pt-4 border-t border-slate-800 ${isCollapsed ? 'px-0' : ''}`}>
          {/* Role Switching */}
          {canSwitchToAdmin && (
            <button
              onClick={() => handleSwitchRole("admin")}
              title={isCollapsed ? "Switch to Admin Panel" : undefined}
              className={`w-full flex items-center text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition text-left cursor-pointer ${isCollapsed ? 'justify-center py-2' : 'gap-2 px-3 py-2'
                }`}
            >
              <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
              {!isCollapsed && <span className="animate-in fade-in duration-200">Switch to Admin Panel</span>}
            </button>
          )}
          {canSwitchToUser && (
            <button
              onClick={() => handleSwitchRole("user")}
              title={isCollapsed ? "Switch to Customer App" : undefined}
              className={`w-full flex items-center text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition text-left cursor-pointer ${isCollapsed ? 'justify-center py-2' : 'gap-2 px-3 py-2'
                }`}
            >
              <Home className="w-4 h-4 text-green-400 flex-shrink-0" />
              {!isCollapsed && <span className="animate-in fade-in duration-200">Switch to Customer App</span>}
            </button>
          )}

          {/* Logout */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={isCollapsed ? "Logout" : undefined}
            className={`w-full flex items-center bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold transition text-left cursor-pointer ${isCollapsed ? 'justify-center py-3' : 'gap-3 px-4 py-2.5'
              }`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="animate-in fade-in duration-200">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between px-6 py-3.5 bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
          {/* Store name context */}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Branch:</span>
            <span className="text-sm font-extrabold text-slate-800">{storeName}</span>
          </div>

          {/* Right Action Widgets */}
          <div className="flex items-center gap-4">
            {/* Notification dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen);
                  setIsProfileOpen(false);
                }}
                className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100/60 rounded-xl transition cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 border border-white rounded-full" />
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200/80 rounded-2xl shadow-xl py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800">Alerts & Notifications</span>
                    <button
                      onClick={async () => {
                        try {
                          await axios.put("/api/notifications/read-all");
                          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        } catch (error) {
                          console.error("Error marking all read:", error);
                        }
                      }}
                      className="text-[10px] text-green-600 font-bold hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  </div>
                  {/* Filter Tabs */}
                  <div className="flex gap-1.5 px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                    {(['all', 'unread', 'read'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setNotifFilter(t)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition uppercase tracking-wider cursor-pointer ${notifFilter === t
                            ? 'bg-green-600 text-white shadow-sm animate-in zoom-in-95 duration-100'
                            : 'bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-200'
                          }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                    {filteredNotifications.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-6">No notifications found.</p>
                    ) : (
                      filteredNotifications.map((n) => (
                        <div
                          key={n._id}
                          onClick={async () => {
                            if (!n.read) {
                              try {
                                await axios.put(`/api/notifications/${n._id}/read`);
                                setNotifications((prev) =>
                                  prev.map((item) =>
                                    item._id === n._id ? { ...item, read: true } : item
                                  )
                                );
                              } catch (error) {
                                console.error("Error marking notification read:", error);
                              }
                            }
                            if (n.link) {
                              router.push(n.link);
                              setIsNotifOpen(false);
                            }
                          }}
                          className={`px-4 py-3 flex flex-col gap-1 transition cursor-pointer hover:bg-slate-50 ${n.read ? 'bg-white text-slate-600' : 'bg-green-50/40 text-slate-800 font-medium'
                            }`}
                        >
                          <div className="flex justify-between items-start">
                            <p className="text-xs leading-tight">{n.message}</p>
                            {n.type && (
                              <span className="text-[8px] text-green-600 bg-green-100/80 px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider ml-2 flex-shrink-0">
                                {n.type}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 font-semibold mt-0.5">
                            {new Date(n.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsProfileOpen(!isProfileOpen);
                  setIsNotifOpen(false);
                }}
                className="flex items-center gap-2 p-1.5 hover:bg-slate-100/60 rounded-xl transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs uppercase shadow-sm">
                  {session.user?.name?.slice(0, 2) || "SM"}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-bold text-slate-800 leading-none">{session.user?.name}</p>
                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Manager Profile</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2.5 w-60 bg-white border border-slate-200/80 rounded-2xl shadow-xl py-2 z-50 overflow-hidden divide-y divide-slate-100">
                  {/* User info */}
                  <div className="px-4.5 py-3.5">
                    <p className="text-xs font-extrabold text-slate-800">{session.user?.name}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{session.user?.email}</p>
                  </div>

                  {/* Actions */}
                  <div className="py-1.5 px-2.5 space-y-0.5">
                    {canSwitchToAdmin && (
                      <button
                        onClick={() => handleSwitchRole("admin")}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-lg transition text-left cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4 text-blue-500" />
                        Admin Controls
                      </button>
                    )}
                    {canSwitchToUser && (
                      <button
                        onClick={() => handleSwitchRole("user")}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-lg transition text-left cursor-pointer"
                      >
                        <Home className="w-4 h-4 text-green-500" />
                        Customer App
                      </button>
                    )}
                  </div>

                  <div className="py-1.5 px-2.5">
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      Sign Out Session
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Navbar Header */}
        <header className="bg-slate-900 text-white p-4 flex md:hidden items-center justify-between shadow">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base">SnapCart Manager</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/store-manager" className="p-1.5 hover:bg-slate-800 rounded-lg"><LayoutDashboard className="w-5 h-5" /></Link>
            <Link href="/store-manager/orders" className="p-1.5 hover:bg-slate-800 rounded-lg"><ShoppingBag className="w-5 h-5" /></Link>
            <Link href="/store-manager/inventory" className="p-1.5 hover:bg-slate-800 rounded-lg"><Boxes className="w-5 h-5" /></Link>
            <Link href="/store-manager/staff" className="p-1.5 hover:bg-slate-800 rounded-lg"><User className="w-5 h-5" /></Link>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="p-1.5 hover:bg-red-500/10 text-red-400 rounded-lg"><LogOut className="w-5 h-5" /></button>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
