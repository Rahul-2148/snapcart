"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, MapPin, Bell, Package } from "lucide-react";

const links = [
  { href: "/user/account/profile", label: "Profile", icon: User },
  { href: "/user/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/user/account/orders", label: "Orders", icon: Package },
  { href: "/user/account/notifications", label: "Notifications", icon: Bell },
];

export default function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden h-full">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
        <h2 className="text-white text-xl font-semibold">My Account</h2>
        <p className="text-green-100 text-sm mt-1">
          Manage your profile and preferences
        </p>
      </div>
      <ul className="p-4">
        {links.map((link) => {
          const IconComponent = link.icon;
          const isActive = pathname === link.href;
          return (
            <li key={link.href} className="mb-2">
              <Link
                href={link.href}
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
