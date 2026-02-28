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
} from "@heroicons/react/24/outline";
import { signOut } from "next-auth/react";
import Link from "next/link";

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
  // On mobile overlay, always show full sidebar (not collapsed)
  const shouldShowText = isMobile || !isCollapsed;

  return (
    <div
      className={`sidebar-scrollable ${isCollapsed ? 'sidebar-collapsed scrollbar-hide px-0' : 'sidebar-expanded'} h-screen flex flex-col bg-gradient-to-b from-slate-800 to-slate-900 text-white transition-all duration-500 overflow-y-auto`}
      style={{
        overflowY: isCollapsed ? 'auto' : 'scroll',
        scrollbarWidth: isCollapsed ? 'none' : 'thin',
        scrollbarColor: isCollapsed ? 'transparent transparent' : 'rgba(120, 113, 108, 0.3) transparent',
        scrollbarGutter: 'auto',
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'width',
      }}
    >
      <div
        className={`sticky top-0 z-10 flex items-center transition-all duration-500 ${
          shouldShowText ? "justify-between px-4" : "justify-center px-0"
        } border-b border-slate-700 bg-gradient-to-b from-slate-800 to-slate-900`}
        style={{
          paddingTop: '18px',
          paddingBottom: '18px',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Link
          href="/"
          className={`transition-all duration-500 ${
            shouldShowText
              ? "opacity-100 w-auto"
              : "opacity-0 w-0 overflow-hidden"
          }`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
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
            className="p-2 rounded-lg hover:bg-slate-700 transition-all duration-500 cursor-e-resize flex-shrink-0"
            style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <ChevronDoubleLeftIcon
              className={`h-6 w-6 text-slate-300 transition-transform duration-500 ${
                isCollapsed ? "rotate-180" : ""
              }`}
              style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </button>
        )}
      </div>
      <nav className={`mt-0 flex-1 overflow-y-auto ${isCollapsed ? 'pr-0' : 'pr-2'}`}>
        <ul className={`space-y-1 ${isCollapsed ? 'pr-0' : 'pr-1'}`}>
          <li>
            <Link
              href="/admin"
              title={isCollapsed ? "Dashboard" : ""}
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 ${
                isCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <HomeIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                  shouldShowText
                    ? "opacity-100 w-auto"
                    : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                Dashboard
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/add-grocery"
              title={isCollapsed ? "Add Grocery" : ""}
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 ${
                isCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <PlusIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                  shouldShowText
                    ? "opacity-100 w-auto"
                    : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                Add Grocery
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/groceries"
              title={isCollapsed ? "Groceries" : ""}
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 ${
                isCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <ShoppingBagIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                  shouldShowText
                    ? "opacity-100 w-auto"
                    : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                Groceries
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/categories"
              title={isCollapsed ? "Categories" : ""}
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 ${
                isCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <TagIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                  shouldShowText
                    ? "opacity-100 w-auto"
                    : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                Categories
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/banners"
              title={isCollapsed ? "Banners" : ""}
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 ${
                isCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <PhotoIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                  shouldShowText
                    ? "opacity-100 w-auto"
                    : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                Banners
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/orders"
              title={isCollapsed ? "Orders" : ""}
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 ${
                isCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <ClipboardDocumentListIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                  shouldShowText
                    ? "opacity-100 w-auto"
                    : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                Orders
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/returns"
              title={isCollapsed ? "Returns" : ""}
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 ${
                isCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <ArrowPathIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                  shouldShowText
                    ? "opacity-100 w-auto"
                    : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                Returns
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/incentives"
              title={isCollapsed ? "Incentives" : ""}
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 ${
                isCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <TicketIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                  shouldShowText
                    ? "opacity-100 w-auto"
                    : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                Incentives
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/users"
              title={isCollapsed ? "Users" : ""}
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 ${
                isCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <UsersIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                  shouldShowText
                    ? "opacity-100 w-auto"
                    : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                Users
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/delivery-partners"
              title={isCollapsed ? "Delivery Partners" : ""}
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 ${
                isCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <svg className="h-6 w-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span
                className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                  shouldShowText
                    ? "opacity-100 w-auto"
                    : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                Delivery Partners
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/delivery-settings"
              title={isCollapsed ? "Delivery Settings" : ""}
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 ${
                isCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <Cog6ToothIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                  shouldShowText
                    ? "opacity-100 w-auto"
                    : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                Delivery Settings
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/payouts"
              title={isCollapsed ? "Payouts" : ""}
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 ${
                isCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <CreditCardIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                  shouldShowText
                    ? "opacity-100 w-auto"
                    : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                Payouts
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/coupons"
              title={isCollapsed ? "Coupons" : ""}
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 ${
                isCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <TicketIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                  shouldShowText
                    ? "opacity-100 w-auto"
                    : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                Coupons
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/newsletter"
              title={isCollapsed ? "Newsletter" : ""}
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 ${
                isCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <EnvelopeIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                  shouldShowText
                    ? "opacity-100 w-auto"
                    : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                Newsletter
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/settings"
              title={isCollapsed ? "Settings" : ""}
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 ${
                isCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <Cog6ToothIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                  shouldShowText
                    ? "opacity-100 w-auto"
                    : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                Settings
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/audit-logs"
              title={isCollapsed ? "Audit Logs" : ""}
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 ${
                isCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <DocumentTextIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                  shouldShowText
                    ? "opacity-100 w-auto"
                    : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                Audit Logs
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/cod-settings"
              title={isCollapsed ? "COD Settings" : ""}
              className={`flex items-center p-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all duration-200 ${
                isCollapsed ? "mx-0" : "mx-2"
              } ${
                shouldShowText ? "" : "justify-center"
              }`}
            >
              <CreditCardIcon className="h-6 w-6 flex-shrink-0" />
              <span
                className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
                  shouldShowText
                    ? "opacity-100 w-auto"
                    : "opacity-0 w-0 overflow-hidden"
                }`}
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
            className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 ease-in-out ${
              shouldShowText
                ? "opacity-100 w-auto"
                : "opacity-0 w-0 overflow-hidden"
            }`}
          >
            Logout
          </span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
