"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
  iconClassName?: string;
}

export default function ThemeToggle({ className = "", iconClassName = "w-4.5 h-4.5" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by waiting for client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`rounded-xl opacity-50 animate-pulse ${className}`} />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`rounded-xl transition duration-200 cursor-pointer flex items-center justify-center ${className}`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? (
        <Sun className={iconClassName} />
      ) : (
        <Moon className={iconClassName} />
      )}
    </button>
  );
}
