import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import dbConnect from "@/lib/server/db";
import AuditLog from "@/models/auditLog.model";
import UserNotificationSettings from "@/models/userNotificationSettings.model";

type NotificationSettingsPayload = {
  channels?: {
    push?: boolean;
    email?: boolean;
    sms?: boolean;
  };
  frequency?: "instant" | "daily" | "weekly";
  quietHours?: {
    enabled?: boolean;
    start?: string;
    end?: string;
    timezone?: string;
  };
  preferences?: {
    security_alerts?: boolean;
    payment_updates?: boolean;
    policy_updates?: boolean;
    order_updates?: boolean;
    delivery_eta?: boolean;
    returns_refunds?: boolean;
    offers?: boolean;
    price_drops?: boolean;
    back_in_stock?: boolean;
    wishlist?: boolean;
  };
};

const defaultSettings = {
  channels: {
    push: true,
    email: true,
    sms: false,
  },
  frequency: "instant" as const,
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

const sanitizePayload = (payload: NotificationSettingsPayload) => ({
  channels: {
    push: payload.channels?.push ?? defaultSettings.channels.push,
    email: payload.channels?.email ?? defaultSettings.channels.email,
    sms: payload.channels?.sms ?? defaultSettings.channels.sms,
  },
  frequency: ["instant", "daily", "weekly"].includes(payload.frequency || "")
    ? payload.frequency
    : defaultSettings.frequency,
  quietHours: {
    enabled: payload.quietHours?.enabled ?? defaultSettings.quietHours.enabled,
    start: payload.quietHours?.start ?? defaultSettings.quietHours.start,
    end: payload.quietHours?.end ?? defaultSettings.quietHours.end,
    timezone:
      payload.quietHours?.timezone ?? defaultSettings.quietHours.timezone,
  },
  preferences: {
    security_alerts:
      payload.preferences?.security_alerts ??
      defaultSettings.preferences.security_alerts,
    payment_updates:
      payload.preferences?.payment_updates ??
      defaultSettings.preferences.payment_updates,
    policy_updates:
      payload.preferences?.policy_updates ??
      defaultSettings.preferences.policy_updates,
    order_updates:
      payload.preferences?.order_updates ??
      defaultSettings.preferences.order_updates,
    delivery_eta:
      payload.preferences?.delivery_eta ??
      defaultSettings.preferences.delivery_eta,
    returns_refunds:
      payload.preferences?.returns_refunds ??
      defaultSettings.preferences.returns_refunds,
    offers: payload.preferences?.offers ?? defaultSettings.preferences.offers,
    price_drops:
      payload.preferences?.price_drops ??
      defaultSettings.preferences.price_drops,
    back_in_stock:
      payload.preferences?.back_in_stock ??
      defaultSettings.preferences.back_in_stock,
    wishlist:
      payload.preferences?.wishlist ?? defaultSettings.preferences.wishlist,
  },
});

const getClientIp = (req: NextRequest) => {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfIp = req.headers.get("cf-connecting-ip");

  const raw =
    forwarded?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    cfIp?.trim() ||
    "";

  if (!raw) return undefined;
  if (raw.startsWith("::ffff:")) return raw.replace("::ffff:", "");
  if (raw === "::1" || raw === "0:0:0:0:0:0:0:1") return "127.0.0.1";
  return raw;
};

const extractSettings = (
  value?: Partial<{
    channels: Record<string, boolean>;
    frequency: string;
    quietHours: Record<string, unknown>;
    preferences: Record<string, boolean>;
  }> | null
) => {
  if (!value) return null;
  return {
    channels: value.channels,
    frequency: value.frequency,
    quietHours: value.quietHours,
    preferences: value.preferences,
  };
};

const buildDiff = (
  before: ReturnType<typeof extractSettings>,
  after: ReturnType<typeof extractSettings>
) => {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  if (!before || !after) {
    return diff;
  }

  if (JSON.stringify(before.channels) !== JSON.stringify(after.channels)) {
    diff.channels = { from: before.channels, to: after.channels };
  }
  if (before.frequency !== after.frequency) {
    diff.frequency = { from: before.frequency, to: after.frequency };
  }
  if (JSON.stringify(before.quietHours) !== JSON.stringify(after.quietHours)) {
    diff.quietHours = { from: before.quietHours, to: after.quietHours };
  }
  if (
    JSON.stringify(before.preferences) !== JSON.stringify(after.preferences)
  ) {
    diff.preferences = { from: before.preferences, to: after.preferences };
  }

  return diff;
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const settings = await UserNotificationSettings.findOne({
      userId: session.user.id,
    }).lean();

    if (!settings) {
      return NextResponse.json(defaultSettings);
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    return NextResponse.json(
      { message: "Error fetching notification settings" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  try {
    const payload = (await req.json()) as NotificationSettingsPayload;
    const sanitized = sanitizePayload(payload);
    const existing = await UserNotificationSettings.findOne({
      userId: session.user.id,
    }).lean();

    const updated = await UserNotificationSettings.findOneAndUpdate(
      { userId: session.user.id },
      sanitized,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    const beforeSettings = extractSettings(existing);
    const afterSettings = extractSettings(sanitized);
    const diff = buildDiff(beforeSettings, afterSettings);
    const changes = beforeSettings ? Object.keys(diff) : ["created"];

    await AuditLog.create({
      userId: session.user.id,
      action: "user.notification_settings.updated",
      metadata: {
        changes,
        source: "account.notifications",
        before: beforeSettings,
        after: afterSettings,
        diff,
      },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating notification settings:", error);
    return NextResponse.json(
      { message: "Error updating notification settings" },
      { status: 500 }
    );
  }
}
