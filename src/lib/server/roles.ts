import { Session } from "next-auth";

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

export const isDeliveryPartner = (
  session: Session | null | undefined,
): boolean => {
  return hasRole(session, "deliveryBoy") || isAdmin(session);
};
