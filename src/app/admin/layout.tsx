"use client";
import React, { useState } from "react";
import Sidebar from "@/components/admin/Sidebar";
import AdminHeader from "@/components/admin/AdminHeader";

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const [isCollapsed, setCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleCollapse = () => {
    setCollapsed(!isCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

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
        className={`transition-all duration-300 ease-in-out z-50 will-change-[width] ${
          // Mobile: overlay behavior
          isMobileSidebarOpen
            ? "fixed inset-y-0 left-0 w-64 md:hidden"
            : "hidden md:block"
        } ${
          // Desktop: fixed width
          !isMobileSidebarOpen && isCollapsed ? "w-20" : "w-64"
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
