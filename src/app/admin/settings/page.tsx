"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";

type NotificationPrefs = {
  email: boolean;
  sms: boolean;
  inApp: boolean;
};

type AdminSettings = {
  theme: "system" | "light" | "dark";
  notifications: NotificationPrefs;
  orderAlerts: boolean;
  autoApproveReturns: boolean;
};

const STORAGE_KEY = "admin-settings";

const quickLinks = [
  {
    title: "Profile & Access",
    description: "Update your profile info and manage admin roles.",
    href: "/admin/users",
  },
  {
    title: "Payments & COD",
    description: "Configure COD limits, charges, and payment rules.",
    href: "/admin/cod-settings",
  },
  {
    title: "Notifications",
    description: "Tune how you get alerts across channels.",
    href: "/admin/settings#notifications",
  },
];

const defaultSettings: AdminSettings = {
  theme: "system",
  notifications: { email: true, sms: false, inApp: true },
  orderAlerts: true,
  autoApproveReturns: false,
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load settings from API on mount (with localStorage fallback).
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get("/api/admin/settings");
        if (response.data.success && response.data.settings) {
          setSettings(response.data.settings);
        }
      } catch (err) {
        // Fallback to localStorage if API fails
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored) as AdminSettings;
            setSettings({ ...defaultSettings, ...parsed });
          }
        } catch (lsErr) {
          console.error("Failed to load settings", err, lsErr);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(defaultSettings),
    [settings],
  );

  const persistSettings = async () => {
    setSaving(true);
    try {
      const response = await axios.put("/api/admin/settings", { settings });
      if (response.data.success) {
        toast.success("Settings saved successfully");
        // Also cache locally as fallback
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } else {
        toast.error(response.data.message || "Failed to save settings");
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Unable to save settings right now";
      toast.error(message);
      console.error("Failed to persist settings", err);
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = async () => {
    setSaving(true);
    try {
      const response = await axios.delete("/api/admin/settings");
      if (response.data.success) {
        setSettings(defaultSettings);
        localStorage.removeItem(STORAGE_KEY);
        toast("Settings reset to defaults");
      } else {
        toast.error(response.data.message || "Failed to reset settings");
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Unable to reset settings right now";
      toast.error(message);
      console.error("Failed to reset settings", err);
    } finally {
      setSaving(false);
    }
  };

  const updateNotifications = (key: keyof NotificationPrefs) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: !prev.notifications[key] },
    }));
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
        <div className="h-48 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
          Admin
        </p>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">
              Central place for admin-level controls and preferences.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </Link>
            <Link
              href="/admin/cod-settings"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Go to COD Settings
            </Link>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickLinks.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-500 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {item.title}
                </h2>
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              </div>
              <span className="text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Open
              </span>
            </div>
          </Link>
        ))}
      </section>

      <section
        id="notifications"
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Notifications
            </h3>
            <p className="text-gray-600 mt-1">
              Choose how you want to receive admin alerts.
            </p>
          </div>
          <div className="text-xs px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">
            Applies to this device
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {["email", "sms", "inApp"].map((key) => (
            <label
              key={key}
              className="flex items-start gap-3 border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer"
            >
              <input
                type="checkbox"
                checked={settings.notifications[key as keyof NotificationPrefs]}
                onChange={() =>
                  updateNotifications(key as keyof NotificationPrefs)
                }
                className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div>
                <p className="font-medium text-gray-900 capitalize">
                  {key === "inApp" ? "In-app" : key}
                </p>
                <p className="text-sm text-gray-600">
                  {key === "email" && "Send critical alerts to your inbox."}
                  {key === "sms" &&
                    "Trigger SMS for urgent operational updates."}
                  {key === "inApp" &&
                    "Show real-time alerts inside the admin UI."}
                </p>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Operations</h3>
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={settings.orderAlerts}
              onChange={() =>
                setSettings((prev) => ({
                  ...prev,
                  orderAlerts: !prev.orderAlerts,
                }))
              }
              className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <div>
              <p className="font-medium text-gray-900">Order risk alerts</p>
              <p className="text-sm text-gray-600">
                Highlight orders that look risky or need manual review.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoApproveReturns}
              onChange={() =>
                setSettings((prev) => ({
                  ...prev,
                  autoApproveReturns: !prev.autoApproveReturns,
                }))
              }
              className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <div>
              <p className="font-medium text-gray-900">
                Auto-approve low-value returns
              </p>
              <p className="text-sm text-gray-600">
                Skip manual review for inexpensive items to speed up resolution.
              </p>
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Theme</h3>
        <p className="text-sm text-gray-600">
          Pick how the admin UI should look on this device.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(["system", "light", "dark"] as AdminSettings["theme"][]).map(
            (value) => (
              <button
                key={value}
                onClick={() =>
                  setSettings((prev) => ({ ...prev, theme: value }))
                }
                className={`rounded-lg border p-4 text-left transition-all ${
                  settings.theme === value
                    ? "border-blue-600 bg-blue-50 text-blue-900"
                    : "border-gray-200 bg-white text-gray-800 hover:border-blue-400"
                }`}
              >
                <p className="font-semibold capitalize">{value}</p>
                <p className="text-sm text-gray-600">
                  {value === "system" && "Match device preference."}
                  {value === "light" && "Bright background and shadows."}
                  {value === "dark" && "Dim palette for low-light work."}
                </p>
              </button>
            ),
          )}
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <button
          onClick={persistSettings}
          disabled={saving || loading}
          className="px-5 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
        <button
          onClick={resetSettings}
          disabled={saving || loading}
          className="px-5 py-3 rounded-lg border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "Processing..." : "Reset to defaults"}
        </button>
        {!dirty && (
          <span className="text-sm text-gray-500">
            Using default preferences
          </span>
        )}
      </section>
    </div>
  );
}
