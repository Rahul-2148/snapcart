"use client";

import Provider from "@/Provider";
import { SnackbarProvider } from "notistack";
import StoreProvider from "@/redux/StoreProvider";
import InitUser from "@/InitUser";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <Provider>
      <SnackbarProvider
        maxSnack={3}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <StoreProvider>
          <InitUser />
          {children}
        </StoreProvider>
      </SnackbarProvider>
    </Provider>
  );
}
