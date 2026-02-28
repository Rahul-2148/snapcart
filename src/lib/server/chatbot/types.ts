export type SnapcartRole = "guest" | "user" | "deliveryBoy" | "admin";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatProductContext {
  productId: string;
  name: string;
  brand?: string;
  categoryName?: string;
  description?: string;
  variantLabel?: string;
  sellingPrice?: number;
  mrpPrice?: number;
  stock?: number;
}

export interface RoleAwareContext {
  role: SnapcartRole;
  userName?: string;
  timestampISO: string;
  global: {
    totalOrders: number;
    openOrders: number;
    pendingReturns: number;
  };
  roleStats: Record<string, string | number | boolean | string[]>;
  quickActions: string[];
}
