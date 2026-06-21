"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import SideNav from "./SideNav";
import useGetMe from "@/hooks/useGetMe";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useGetMe();
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const mobilePageTitle = useMemo(() => {
    if (!pathname) return "Profile";
    if (pathname.includes("/wallet")) return "Wallet & Rewards";
    if (pathname.includes("/addresses")) return "Addresses";
    if (pathname.includes("/orders")) return "Orders";
    if (pathname.includes("/notifications")) return "Notifications";
    if (pathname.includes("/sessions")) return "Devices & Sessions";
    return "Profile";
  }, [pathname]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileNavOpen]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileNavOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileNavOpen]);

  const handleDrawerTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  };

  const handleDrawerTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (touchStartXRef.current === null) {
      return;
    }

    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = touchEndX - touchStartXRef.current;
    touchStartXRef.current = null;

    // Close drawer on intentional left swipe.
    if (deltaX < -60) {
      setIsMobileNavOpen(false);
    }
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-6 pt-3 pb-6 sm:pb-8 md:pb-12">
      <div className="md:hidden mb-4 rounded-xl border border-gray-200 bg-white shadow-sm px-3 py-2.5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{mobilePageTitle}</p>
          <p className="text-xs text-gray-500">Manage profile and settings</p>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileNavOpen(true)}
          className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          aria-label="Open account menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div
        className={`fixed inset-0 z-[100] md:hidden transition-opacity duration-200 ${
          isMobileNavOpen
            ? "opacity-100 bg-black/40 backdrop-blur-[1px] pointer-events-auto"
            : "opacity-0 bg-black/0 pointer-events-none"
        }`}
        onClick={() => setIsMobileNavOpen(false)}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-[101] w-[88vw] max-w-sm bg-white p-3 md:hidden shadow-2xl overflow-y-auto transition-transform duration-300 ease-out ${
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
        onTouchStart={handleDrawerTouchStart}
        onTouchEnd={handleDrawerTouchEnd}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-semibold text-gray-900">My Account</p>
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(false)}
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            aria-label="Close account menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <SideNav onNavigate={() => setIsMobileNavOpen(false)} className="w-full" />
      </aside>

      <div className="flex min-h-[calc(100vh-8rem)] gap-4 md:gap-8">
        <div className="hidden md:block md:w-80 md:flex-shrink-0">
          <SideNav />
        </div>
        <div className="flex-grow min-w-0">{children}</div>
      </div>
    </div>
  );
}
