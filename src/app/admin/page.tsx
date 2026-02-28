"use client";
import AdminDashboard from "@/components/AdminDashboard";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/unauthorized");
    },
  });
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    
    const isAdmin = session?.user?.currentRole === "admin";
    
    if (!isAdmin) {
      router.push("/unauthorized");
    }
  }, [session, status, router]);

  if (status === "loading" || session?.user?.currentRole !== "admin") {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-2 md:py-0">
      <AdminDashboard />
    </div>
  );
}
