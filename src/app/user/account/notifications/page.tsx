"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ChannelKey = "push" | "email" | "sms";
type FrequencyKey = "instant" | "daily" | "weekly";

type ToggleOption = {
  key: string;
  title: string;
  description: string;
  locked?: boolean;
};

const timeOptions = [
  "12:00 AM",
  "01:00 AM",
  "02:00 AM",
  "03:00 AM",
  "04:00 AM",
  "05:00 AM",
  "06:00 AM",
  "07:00 AM",
  "08:00 AM",
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
  "07:00 PM",
  "08:00 PM",
  "09:00 PM",
  "10:00 PM",
  "11:00 PM",
];

type NotificationSettings = {
  channels: Record<ChannelKey, boolean>;
  frequency: FrequencyKey;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  preferences: Record<string, boolean>;
  updatedAt?: string;
};

const defaultSettings: NotificationSettings = {
  channels: { push: true, email: true, sms: false },
  frequency: "instant",
  quietHours: {
    enabled: true,
    start: "10:00 PM",
    end: "07:00 AM",
    timezone: "Asia/Kolkata",
  },
  preferences: {
    security_alerts: true,
    payment_updates: true,
    policy_updates: true,
    order_updates: true,
    delivery_eta: true,
    returns_refunds: true,
    offers: true,
    price_drops: true,
    back_in_stock: true,
    wishlist: false,
  },
};

export default function NotificationsPage() {
  const [channels, setChannels] = useState(defaultSettings.channels);
  const [frequency, setFrequency] = useState<FrequencyKey>(
    defaultSettings.frequency,
  );
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(
    defaultSettings.quietHours.enabled,
  );
  const [quietStart, setQuietStart] = useState(
    defaultSettings.quietHours.start,
  );
  const [quietEnd, setQuietEnd] = useState(defaultSettings.quietHours.end);
  const [timezone, setTimezone] = useState(defaultSettings.quietHours.timezone);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const preferenceGroups = useMemo(
    () => [
      {
        title: "Account & Security",
        description: "Important alerts you should not miss.",
        options: [
          {
            key: "security_alerts",
            title: "Security alerts",
            description:
              "New device logins, password changes, and suspicious activity.",
            locked: true,
          },
          {
            key: "payment_updates",
            title: "Payment updates",
            description: "Payment failures, refunds, and wallet changes.",
          },
          {
            key: "policy_updates",
            title: "Policy updates",
            description:
              "Terms, privacy policy, and critical platform changes.",
          },
        ] as ToggleOption[],
      },
      {
        title: "Orders & Delivery",
        description: "Real-time order progress and delivery details.",
        options: [
          {
            key: "order_updates",
            title: "Order status updates",
            description:
              "Order confirmed, packed, out for delivery, delivered.",
          },
          {
            key: "delivery_eta",
            title: "Live delivery ETA",
            description: "Driver location updates and arrival reminders.",
          },
          {
            key: "returns_refunds",
            title: "Returns & refunds",
            description:
              "Return approvals, pickup scheduling, and refund progress.",
          },
        ] as ToggleOption[],
      },
      {
        title: "Promotions & Insights",
        description: "Personalized deals and product signals.",
        options: [
          {
            key: "offers",
            title: "Exclusive offers",
            description: "Coupons, flash sales, and seasonal promotions.",
          },
          {
            key: "price_drops",
            title: "Price drops",
            description: "Price drop alerts for items you view or buy often.",
          },
          {
            key: "back_in_stock",
            title: "Back in stock",
            description: "Get notified when saved items return.",
          },
          {
            key: "wishlist",
            title: "Wishlist activity",
            description: "Restocks and low inventory alerts for your wishlist.",
          },
        ] as ToggleOption[],
      },
    ],
    [],
  );

  const [preferences, setPreferences] = useState<Record<string, boolean>>(
    defaultSettings.preferences,
  );

  const applySettings = (settings: NotificationSettings) => {
    setChannels(settings.channels);
    setFrequency(settings.frequency);
    setQuietHoursEnabled(settings.quietHours.enabled);
    setQuietStart(settings.quietHours.start);
    setQuietEnd(settings.quietHours.end);
    setTimezone(settings.quietHours.timezone || timezone);
    setPreferences(settings.preferences);
    if (settings.updatedAt) {
      setLastSavedAt(new Date(settings.updatedAt).toLocaleString());
    }
  };

  useEffect(() => {
    const resolvedTimezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      defaultSettings.quietHours.timezone;
    setTimezone(resolvedTimezone);

    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/user/notification-settings", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Failed to load notification settings.");
        }
        const data = (await response.json()) as NotificationSettings;
        applySettings({
          ...defaultSettings,
          ...data,
          quietHours: {
            ...defaultSettings.quietHours,
            ...data.quietHours,
            timezone: data.quietHours?.timezone || resolvedTimezone,
          },
        });
      } catch (error) {
        console.error(error);
        setErrorMessage("Unable to load notification settings.");
        toast.error("Unable to load notification settings.");
        applySettings(defaultSettings);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleTogglePreference = (key: string, locked?: boolean) => {
    if (locked) return;
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleToggleChannel = (key: ChannelKey) => {
    setChannels((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/user/notification-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channels,
          frequency,
          quietHours: {
            enabled: quietHoursEnabled,
            start: quietStart,
            end: quietEnd,
            timezone,
          },
          preferences,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save notification settings.");
      }

      const data = (await response.json()) as NotificationSettings;
      applySettings({ ...defaultSettings, ...data });
      setLastSavedAt(new Date().toLocaleString());
      toast.success("Notification settings updated.");
    } catch (error) {
      console.error(error);
      setErrorMessage("Unable to save notification settings.");
      toast.error("Unable to save notification settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    applySettings({
      ...defaultSettings,
      quietHours: {
        ...defaultSettings.quietHours,
        timezone,
      },
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500">
          Control how Snapcart keeps you updated across orders, security, and
          promotions.
        </p>
        {isLoading && (
          <p className="text-xs text-gray-400">Loading preferences...</p>
        )}
        {errorMessage && (
          <p className="text-xs text-rose-600">{errorMessage}</p>
        )}
        {lastSavedAt && (
          <p className="text-xs text-emerald-600">Last saved {lastSavedAt}</p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Channels</h2>
          <p className="text-xs text-gray-500 mt-1">
            Choose where you want to receive alerts.
          </p>
          <div className="mt-4 space-y-4">
            {(
              [
                {
                  key: "push",
                  label: "Push notifications",
                  description: "Instant alerts to your device.",
                },
                {
                  key: "email",
                  label: "Email",
                  description: "Receipts, summaries, and updates.",
                },
                {
                  key: "sms",
                  label: "SMS",
                  description: "Delivery and critical updates.",
                },
              ] as Array<{
                key: ChannelKey;
                label: string;
                description: string;
              }>
            ).map((channel) => (
              <div
                key={channel.key}
                className="flex items-start justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {channel.label}
                  </p>
                  <p className="text-xs text-gray-500">{channel.description}</p>
                </div>
                <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={channels[channel.key]}
                    onChange={() => handleToggleChannel(channel.key)}
                    className="peer sr-only"
                    disabled={isLoading}
                    aria-label={channel.label}
                  />
                  <span className="absolute inset-0 rounded-full bg-gray-200 transition peer-checked:bg-emerald-600 peer-disabled:opacity-60" />
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Quiet hours</h2>
          <p className="text-xs text-gray-500 mt-1">
            Pause non-critical alerts during your rest time.
          </p>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Enable quiet hours
                </p>
                <p className="text-xs text-gray-500">
                  Security alerts are always delivered.
                </p>
              </div>
              <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={quietHoursEnabled}
                  onChange={() => setQuietHoursEnabled((current) => !current)}
                  className="peer sr-only"
                  disabled={isLoading}
                  aria-label="Enable quiet hours"
                />
                <span className="absolute inset-0 rounded-full bg-gray-200 transition peer-checked:bg-emerald-600 peer-disabled:opacity-60" />
                <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-2 text-xs font-medium text-gray-600">
                From
                <select
                  value={quietStart}
                  onChange={(event) => setQuietStart(event.target.value)}
                  disabled={!quietHoursEnabled || isLoading}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-gray-100"
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-xs font-medium text-gray-600">
                To
                <select
                  value={quietEnd}
                  onChange={(event) => setQuietEnd(event.target.value)}
                  disabled={!quietHoursEnabled || isLoading}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-gray-100"
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs font-medium text-gray-600">Time zone</p>
              <p className="text-sm text-gray-900">{timezone}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">
            Delivery cadence
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Control how frequently promotional alerts arrive.
          </p>
          <div className="mt-4 space-y-3">
            {(
              [
                {
                  key: "instant",
                  label: "Instant",
                  description: "As soon as updates happen.",
                },
                {
                  key: "daily",
                  label: "Daily digest",
                  description: "A once-daily summary at 8:00 AM.",
                },
                {
                  key: "weekly",
                  label: "Weekly digest",
                  description: "Every Monday morning.",
                },
              ] as Array<{
                key: FrequencyKey;
                label: string;
                description: string;
              }>
            ).map((option) => (
              <button
                type="button"
                key={option.key}
                onClick={() => setFrequency(option.key)}
                className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                  frequency === option.key
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 bg-white hover:border-emerald-200"
                }`}
                disabled={isLoading}
              >
                <p className="text-sm font-medium text-gray-900">
                  {option.label}
                </p>
                <p className="text-xs text-gray-500">{option.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {preferenceGroups.map((group) => (
          <div
            key={group.title}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                {group.title}
              </h2>
              <p className="text-sm text-gray-500">{group.description}</p>
            </div>
            <div className="space-y-4">
              {group.options.map((option) => (
                <div
                  key={option.key}
                  className="flex items-start justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {option.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {option.description}
                    </p>
                  </div>
                  <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={preferences[option.key]}
                      onChange={() =>
                        handleTogglePreference(option.key, option.locked)
                      }
                      className="peer sr-only"
                      disabled={option.locked || isLoading}
                      aria-label={option.title}
                    />
                    <span className="absolute inset-0 rounded-full bg-gray-200 transition peer-checked:bg-emerald-600 peer-disabled:opacity-60" />
                    <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          Changes apply across all your devices and browsers.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300"
            disabled={isSaving || isLoading}
          >
            Reset to default
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
            disabled={isSaving || isLoading}
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
