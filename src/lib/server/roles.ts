import { Session } from "next-auth";
import { User } from "@/models/user.model";
import connectDb from "./db";

export const hasRole = (
  session: Session | null | undefined,
  role: string,
): boolean => {
  return !!(
    session?.user?.currentRole === role ||
    session?.user?.roles?.includes(role)
  );
};

export const isAdmin = (session: Session | null | undefined): boolean => {
  return hasRole(session, "admin");
};

export const isDeliveryPartner = async (
  session: Session | null | undefined,
): Promise<boolean> => {
  // First check session for quick response
  if (hasRole(session, "deliveryBoy") || isAdmin(session)) {
    return true;
  }

  // If session doesn't have the role, check database as fallback
  // This handles cases where role was added by admin but session wasn't refreshed
  if (session?.user?.id) {
    try {
      await connectDb();
      const user = await User.findById(session.user.id).select("roles").lean();
      if (user?.roles?.includes("deliveryBoy")) {
        return true;
      }
    } catch (error) {
      console.error("Error checking delivery partner role in database:", error);
    }
  }

  return false;
};
