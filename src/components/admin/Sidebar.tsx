"use client";
import {
  ArrowLeftOnRectangleIcon,
  ChevronDoubleLeftIcon,
  ClipboardDocumentListIcon,
  HomeIcon,
  PlusIcon,
  ShoppingBagIcon,
  TagIcon,
  TicketIcon,
  UsersIcon,
  XMarkIcon,
  CreditCardIcon,
  ArrowPathIcon,
  PhotoIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  BuildingStorefrontIcon,
  IdentificationIcon,
} from "@heroicons/react/24/outline";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  
  // On mobile overlay, always show full sidebar (not collapsed)
  const effectiveIsCollapsed = isMobile ? false : isCollapsed;
  const shouldShowText = !effectiveIsCollapsed;

  // Helper to check if a link is active
  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  // Handle link click - close mobile sidebar
  const handleLinkClick = () => {
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <div
      className={`sidebar-scrollable ${effectiveIsCollapsed ? 'sidebar-collapsed scrollbar-hide px-0' : 'sidebar-expanded'} h-screen flex flex-col bg-gradient-to-b from-slate-800 to-slate-900 text-white overflow-y-auto`}
      style={{
        width: effectiveIsCollapsed ? '80px' : '280px',
        transition: 'width 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        overflowY: effectiveIsCollapsed ? 'auto' : 'scroll',
        scrollbarWidth: effectiveIsCollapsed ? 'none' : 'thin',
        scrollbarColor: effectiveIsCollapsed ? 'transparent transparent' : 'rgba(120, 113, 108, 0.3) transparent',
        scrollbarGutter: 'auto',
        willChange: 'width',
      }}
    >
      <div
        className={`sticky top-0 z-10 flex items-center border-b border-slate-700 bg-gradient-to-b from-slate-800 to-slate-900`}
        style={{
          paddingTop: '18px',
          paddingBottom: '18px',
          justifyContent: shouldShowText ? 'space-between' : 'center',
          paddingLeft: shouldShowText ? '16px' : '0',
          paddingRight: shouldShowText ? '16px' : '0',
          transition: 'padding 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s, justify-content 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s',
        }}
      >
        <Link
          href="/"
          style={{
            opacity: shouldShowText ? 1 : 0,
            width: shouldShowText ? 'auto' : '0',
            overflow: 'hidden',
            transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s',
          }}
        >
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-all duration-300 ease-in-out whitespace-nowrap">
            Snapcart
          </h1>
        </Link>
        {isMobile ? (
          <button
            onClick={onCloseMobile}
            className="p-2 rounded-lg hover:bg-slate-700 transition-all duration-300 ease-in-out"
          >
            <XMarkIcon className="h-6 w-6 text-slate-300" />
          </button>
        ) : (
          <button
            onClick={toggleCollapse}
            className="p-2 rounded-lg hover:bg-slate-700 flex-shrink-0"
            style={{ transition: 'background-color 0.2s' }}
          >
            <ChevronDoubleLeftIcon
              className="h-6 w-6 text-slate-300"
              style={{
                transform: effectiveIsCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s',
              }}
            />
          </button>
        )}
      </div>
      <nav className={`mt-0 flex-1 overflow-y-auto ${effectiveIsCollapsed ? 'pr-0' : 'pr-2'}`}>
        <ul className={`space-y-1 ${effectiveIsCollapsed ? 'pr-0' : 'pr-1'}`}>
          <li>
            <Link
              href="/admin"
              title={effectiveIsCollapsed ? "Dashboard" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <HomeIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s',
                }}
              >
                Dashboard
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/stores"
              title={effectiveIsCollapsed ? "Stores" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin/stores")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <BuildingStorefrontIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s',
                }}
              >
                Stores
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/add-grocery"
              title={effectiveIsCollapsed ? "Add Grocery" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin/add-grocery")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <PlusIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.22s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.22s',
                }}
              >
                Add Grocery
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/groceries"
              title={effectiveIsCollapsed ? "Groceries" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin/groceries")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <ShoppingBagIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.24s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.24s',
                }}
              >
                Groceries
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/categories"
              title={effectiveIsCollapsed ? "Categories" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin/categories")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <TagIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.26s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.26s',
                }}
              >
                Categories
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/banners"
              title={effectiveIsCollapsed ? "Banners" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin/banners")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <PhotoIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.28s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.28s',
                }}
              >
                Banners
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/orders"
              title={effectiveIsCollapsed ? "Orders" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin/orders")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <ClipboardDocumentListIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s',
                }}
              >
                Orders
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/returns"
              title={effectiveIsCollapsed ? "Returns" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin/returns")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <ArrowPathIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.32s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.32s',
                }}
              >
                Returns
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/incentives"
              title={effectiveIsCollapsed ? "Incentives" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin/incentives")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <TicketIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.34s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.34s',
                }}
              >
                Incentives
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/users"
              title={effectiveIsCollapsed ? "Users" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin/users")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <UsersIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.36s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.36s',
                }}
              >
                Users
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/staff"
              title={effectiveIsCollapsed ? "Staff Directory" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin/staff")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <IdentificationIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.36s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.36s',
                }}
              >
                Staff Directory
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/delivery-partners"
              title={effectiveIsCollapsed ? "Delivery Partners" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin/delivery-partners")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <svg className="h-6 w-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.38s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.38s',
                }}
              >
                Delivery Partners
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/delivery-settings"
              title={effectiveIsCollapsed ? "Delivery Settings" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin/delivery-settings")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <Cog6ToothIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s',
                }}
              >
                Delivery Settings
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/payouts"
              title={effectiveIsCollapsed ? "Payouts" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin/payouts")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <CreditCardIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.42s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.42s',
                }}
              >
                Payouts
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/coupons"
              title={effectiveIsCollapsed ? "Coupons" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin/coupons")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <TicketIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.44s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.44s',
                }}
              >
                Coupons
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/gift-cards"
              title={effectiveIsCollapsed ? "Gift Cards" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin/gift-cards")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <TicketIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.44s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.44s',
                }}
              >
                Gift Cards
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/newsletter"
              title={effectiveIsCollapsed ? "Newsletter" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin/newsletter")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <EnvelopeIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.46s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.46s',
                }}
              >
                Newsletter
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/settings"
              title={effectiveIsCollapsed ? "Settings" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin/settings")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <Cog6ToothIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.48s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.48s',
                }}
              >
                Settings
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/audit-logs"
              title={effectiveIsCollapsed ? "Audit Logs" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin/audit-logs")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <DocumentTextIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.5s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.5s',
                }}
              >
                Audit Logs
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/cod-settings"
              title={effectiveIsCollapsed ? "COD Settings" : ""}
              onClick={handleLinkClick}
              className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                isActive("/admin/cod-settings")
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              } ${
                effectiveIsCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <CreditCardIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className="ml-3 font-medium whitespace-nowrap"
                style={{
                  opacity: shouldShowText ? 1 : 0,
                  width: shouldShowText ? 'auto' : '0',
                  overflow: 'hidden',
                  transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.52s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.52s',
                }}
              >
                COD Settings
              </span>
            </Link>
          </li>
        </ul>
      </nav>
      <div className="sticky bottom-0 z-10 px-2 py-2 border-t border-slate-700 bg-gradient-to-t from-slate-900 to-slate-800">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={`flex items-center p-3 text-red-500 bg-red-500/5 hover:bg-red-500/10 hover:text-red-600 rounded-lg transition-colors duration-200 w-full ${
            shouldShowText ? "" : "justify-center"
          }`}
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5 flex-shrink-0 text-red-500" />
          <span
            className="ml-3 font-medium whitespace-nowrap"
            style={{
              opacity: shouldShowText ? 1 : 0,
              width: shouldShowText ? 'auto' : '0',
              overflow: 'hidden',
              transition: 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.54s, width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.54s',
            }}
          >
            Logout
          </span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
