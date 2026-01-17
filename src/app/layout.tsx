import type { Metadata } from "next";
// @ts-ignore: allow side-effect import of CSS without type declarations
import "./globals.css";
import { Toaster } from "sonner";
import "leaflet/dist/leaflet.css";
import ClientLayout from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "Snapcart | 10 Minutes Grocery Delivery App",
  description: "10 Minutes Grocery Delivery App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="w-full min-h-screen bg-white"
        suppressHydrationWarning={true}
      >
        <ClientLayout>{children}</ClientLayout>
        {/* Global Toast */}
        <Toaster richColors position="top-center" duration={3000} />
      </body>
    </html>
  );
}
