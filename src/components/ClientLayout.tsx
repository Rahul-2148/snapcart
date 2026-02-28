"use client";

import { usePathname } from "next/navigation";
import { SnackbarProvider } from "notistack";
import { useEffect } from "react";

import Footer from "@/components/common/Footer";
import Navbar from "@/components/Navbar";
import SnapcartAIChatbot from "@/components/SnapcartAIChatbot";
import { SocketProvider } from "@/contexts/SocketContext";
import InitUser from "@/InitUser";
import Provider from "@/Provider";
import StoreProvider from "@/redux/StoreProvider";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  
  // Suppress hydration warnings caused by browser extensions
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = (...args) => {
      const errorString = args[0]?.toString() || '';
      if (
        errorString.includes('Hydration') ||
        errorString.includes('hydrated') ||
        errorString.includes('server rendered HTML') ||
        errorString.includes('client properties') ||
        errorString.includes('fdprocessedid')
      ) {
        return;
      }
      originalError.apply(console, args);
    };
    
    console.warn = (...args) => {
      const warnString = args[0]?.toString() || '';
      if (
        warnString.includes('Hydration') ||
        warnString.includes('hydrated') ||
        warnString.includes('fdprocessedid')
      ) {
        return;
      }
      originalWarn.apply(console, args);
    };
    
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);
  
  const hideNavbar =
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/register") ||
    pathname?.startsWith("/forgot-password") ||
    pathname?.startsWith("/verify-otp") ||
    pathname?.startsWith("/reset-password") ||
    pathname?.startsWith("/admin");
  const hideFooter = pathname?.startsWith("/admin");
  const hideChatbot =
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/register") ||
    pathname?.startsWith("/forgot-password") ||
    pathname?.startsWith("/verify-otp") ||
    pathname?.startsWith("/reset-password");
  const hideChatbotLauncher = pathname === "/";
  const contentOffset = hideNavbar ? "" : "pt-28"; // space for fixed navbar + gap

  return (
    <Provider>
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <StoreProvider>
          <SocketProvider>
            <InitUser />
            <div className="min-h-screen flex flex-col">
              {!hideNavbar && <Navbar />}
              <main className={`flex-1 ${contentOffset}`}>{children}</main>
              {!hideFooter && <Footer />}
              {!hideChatbot && <SnapcartAIChatbot showLauncher={!hideChatbotLauncher} />}
            </div>
          </SocketProvider>
        </StoreProvider>
      </SnackbarProvider>
    </Provider>
  );
}
