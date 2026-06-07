import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isDeliveryPartner } from "@/lib/server/roles";

export default async function DeliveryBoyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const hasDeliveryPartnerAccess = await isDeliveryPartner(session);

  if (!hasDeliveryPartnerAccess) {
    redirect("/unauthorized");
  }

  return <>{children}</>;
}
