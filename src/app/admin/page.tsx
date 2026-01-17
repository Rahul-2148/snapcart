"use client";
import AdminDashboard from "@/components/AdminDashboard";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";


export default function AdminPage() {
    // This is a workaround to use useSession in app router
    // In a real app, you would have a more robust way of fetching session on the client
    // Or you would fetch it on the server in a layout and pass it down.
    const { data: session, status } = useSession({
        required: true,
        onUnauthenticated() {
            router.push('/unauthorized');
        },
    });
    const router = useRouter();


    useEffect(() => {
        if (status === "loading") return; // Do nothing while loading
        if (session?.user?.role !== 'admin') {
            router.push('/unauthorized');
        }
    }, [session, status, router]);


    if (status === "loading" || session?.user?.role !== 'admin') {
        return <div>Loading...</div>; // Or a spinner
    }


  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <AdminDashboard />
    </div>
  );
}
