// src/lib/client/returnPolicies.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export async function getReturnPolicies(groceryIds?: string[]): Promise<any[]> {
  try {
    let url = `${API_BASE}/api/return-policies`;
    if (groceryIds?.length) {
      url += `?groceries=${groceryIds.join(",")}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch return policies");
    const data = await response.json();
    return Array.isArray(data) ? data : data.policies || [];
  } catch (error) {
    console.error("Error fetching return policies:", error);
    return [];
  }
}

export async function getReturnWindowInfo(
  deliveredAt: Date | string,
  windowDays: number,
): Promise<{
  daysPassed: number;
  daysRemaining: number;
  canReturn: boolean;
  windowExpiredAt: Date;
}> {
  const deliveryDate = new Date(deliveredAt);
  const now = new Date();

  const daysPassed = Math.floor(
    (now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const daysRemaining = Math.max(0, windowDays - daysPassed);
  const windowExpiredAt = new Date(
    deliveryDate.getTime() + windowDays * 24 * 60 * 60 * 1000,
  );

  return {
    daysPassed,
    daysRemaining,
    canReturn: daysRemaining > 0,
    windowExpiredAt,
  };
}

export const RETURN_REASONS = [
  { value: "defective", label: "Defective/Not Working" },
  { value: "damaged", label: "Damaged/Broken" },
  { value: "not-as-described", label: "Not as Described" },
  { value: "expired", label: "Expired/Damaged Packaging" },
  { value: "wrong-item", label: "Wrong Item Received" },
  { value: "quality-issue", label: "Quality Issue" },
  { value: "other", label: "Other" },
];

export const RETURN_STATUSES = [
  { value: "pending", label: "Pending", color: "yellow" },
  { value: "approved", label: "Approved", color: "blue" },
  { value: "rejected", label: "Rejected", color: "red" },
  { value: "in-transit", label: "In Transit", color: "purple" },
  { value: "received", label: "Received", color: "cyan" },
  { value: "completed", label: "Completed", color: "green" },
  { value: "cancelled", label: "Cancelled", color: "gray" },
];
