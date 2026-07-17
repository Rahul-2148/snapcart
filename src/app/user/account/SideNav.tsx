"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, MapPin, Bell, Package, Shield, Wallet, Crown } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

const links = [
  { href: "/user/account/profile", label: "Profile", icon: User },
  { href: "/user/account/wallet", label: "Wallet & Rewards", icon: Wallet },
  { href: "/user/account/gold", label: "Snapcart Gold", icon: Crown },
  { href: "/user/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/user/account/orders", label: "Orders", icon: Package },
  { href: "/user/account/notifications", label: "Notifications", icon: Bell },
  { href: "/user/account/sessions", label: "Devices & Sessions", icon: Shield },
];

type SideNavProps = {
  onNavigate?: () => void;
  className?: string;
};

export default function SideNav({ onNavigate, className = "" }: SideNavProps) {
  const pathname = usePathname();
  const userData = useSelector((state: RootState) => state.user.userData);

  // Filter links based on user role - Orders, Wallet and Gold should only show for regular users
  const filteredLinks = links.filter((link) => {
    if (
      link.href === "/user/account/orders" ||
      link.href === "/user/account/wallet" ||
      link.href === "/user/account/gold"
    ) {
      return userData?.currentRole === "user";
    }
    return true;
  });

  return (
    <nav className={`bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden h-full ${className}`}>
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
        <h2 className="text-white text-xl font-semibold">My Account</h2>
        <p className="text-green-100 text-sm mt-1">
          Manage your profile and preferences
        </p>
      </div>
      <ul className="p-4">
        {filteredLinks.map((link) => {
          const IconComponent = link.icon;
          const isActive = pathname === link.href;
          return (
            <li key={link.href} className="mb-2">
              <Link
                href={link.href}
                onClick={onNavigate}
                className={`flex items-center py-3 px-4 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm"
                    : "text-gray-700 hover:bg-gray-50 hover:shadow-md border border-transparent"
                }`}
              >
                <IconComponent
                  className={`w-5 h-5 mr-3 transition-colors ${
                    isActive
                      ? "text-emerald-600"
                      : "text-gray-500 group-hover:text-emerald-500"
                  }`}
                />
                <span
                  className={`font-medium ${
                    isActive ? "text-emerald-700" : "text-gray-700"
                  }`}
                >
                  {link.label}
                </span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 bg-emerald-500 rounded-full"></div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
