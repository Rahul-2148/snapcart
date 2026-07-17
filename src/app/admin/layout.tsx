"use client";
import React, { useState, useEffect } from "react";
import Sidebar from "@/components/admin/Sidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push(`/login?redirect=${encodeURIComponent(pathname || "/admin")}`);
    },
  });
  const router = useRouter();
  const pathname = usePathname();

  const [isCollapsed, setCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    const isAdmin = session?.user?.currentRole === "admin";
    if (!isAdmin) {
      router.push("/unauthorized");
    }
  }, [session, status, router]);

  const toggleCollapse = () => {
    setCollapsed(!isCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  if (status === "loading" || session?.user?.currentRole !== "admin") {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-500">Checking administrator privileges...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-gray-100 text-gray-900">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out md:relative ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
      >
        <Sidebar
          isCollapsed={isCollapsed}
          toggleCollapse={toggleCollapse}
          isMobile={isMobileSidebarOpen}
          onCloseMobile={isMobileSidebarOpen ? toggleMobileSidebar : undefined}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader onToggleMobileSidebar={toggleMobileSidebar} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-slate-50 to-gray-100 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
