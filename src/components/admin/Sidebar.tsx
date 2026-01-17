"use client";
import React from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  HomeIcon,
  PlusIcon,
  UsersIcon,
  TicketIcon,
  ChevronDoubleLeftIcon,
  ShoppingBagIcon,
  TagIcon,
  ClipboardDocumentListIcon,
  ArrowLeftOnRectangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

const Sidebar = ({
  isCollapsed,
  toggleCollapse,
  isMobile = false,
  onCloseMobile,
}: SidebarProps) => {
  return (
    <div
      className={`h-full flex flex-col bg-gradient-to-b from-slate-800 to-slate-900 text-white`}
    >
      <div
        className={`p-6 flex items-center ${
          isCollapsed ? "justify-center" : "justify-between"
        } border-b border-slate-700`}
      >
        {!isCollapsed && (
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Snapcart
          </h1>
        )}
        {isMobile ? (
          <button
            onClick={onCloseMobile}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors duration-200"
          >
            <XMarkIcon className="h-6 w-6 text-slate-300" />
          </button>
        ) : (
          <button
            onClick={toggleCollapse}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors duration-200"
          >
            <ChevronDoubleLeftIcon
              className={`h-6 w-6 text-slate-300 transition-transform duration-300 ${
                isCollapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        )}
      </div>
      <nav className="mt-6 flex-1">
        <ul className="space-y-1">
          <li>
            <Link
              href="/admin"
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 mx-2 ${
                isCollapsed ? "justify-center" : ""
              }`}
            >
              <HomeIcon className="h-6 w-6" />
              {!isCollapsed && (
                <span className="ml-3 font-medium">Dashboard</span>
              )}
            </Link>
          </li>
          <li>
            <Link
              href="/admin/add-grocery"
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 mx-2 ${
                isCollapsed ? "justify-center" : ""
              }`}
            >
              <PlusIcon className="h-6 w-6" />
              {!isCollapsed && (
                <span className="ml-3 font-medium">Add Grocery</span>
              )}
            </Link>
          </li>
          <li>
            <Link
              href="/admin/groceries"
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 mx-2 ${
                isCollapsed ? "justify-center" : ""
              }`}
            >
              <ShoppingBagIcon className="h-6 w-6" />
              {!isCollapsed && (
                <span className="ml-3 font-medium">Groceries</span>
              )}
            </Link>
          </li>
          <li>
            <Link
              href="/admin/categories"
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 mx-2 ${
                isCollapsed ? "justify-center" : ""
              }`}
            >
              <TagIcon className="h-6 w-6" />
              {!isCollapsed && (
                <span className="ml-3 font-medium">Categories</span>
              )}
            </Link>
          </li>
          <li>
            <Link
              href="/admin/orders"
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 mx-2 ${
                isCollapsed ? "justify-center" : ""
              }`}
            >
              <ClipboardDocumentListIcon className="h-6 w-6" />
              {!isCollapsed && <span className="ml-3 font-medium">Orders</span>}
            </Link>
          </li>
          <li>
            <Link
              href="/admin/users"
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 mx-2 ${
                isCollapsed ? "justify-center" : ""
              }`}
            >
              <UsersIcon className="h-6 w-6" />
              {!isCollapsed && <span className="ml-3 font-medium">Users</span>}
            </Link>
          </li>
          <li>
            <Link
              href="/admin/coupons"
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 mx-2 ${
                isCollapsed ? "justify-center" : ""
              }`}
            >
              <TicketIcon className="h-6 w-6" />
              {!isCollapsed && (
                <span className="ml-3 font-medium">Coupons</span>
              )}
            </Link>
          </li>
        </ul>
      </nav>
      <div className="p-4 mt-auto">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={`flex items-center p-3 text-red-300 hover:bg-red-600 hover:text-white rounded-lg w-full transition-all duration-200 mx-2 ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <ArrowLeftOnRectangleIcon className="h-6 w-6" />
          {!isCollapsed && <span className="ml-3 font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
