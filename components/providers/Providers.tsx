"use client";
import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommerceProviders } from "./CartProvider";
import { CartSync } from "./CartSync";
import { ToastProvider } from "./ToastProvider";
import { CurrencyProvider } from "./CurrencyProvider";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <CurrencyProvider>
          <CommerceProviders>
            <CartSync />
            {children}
          </CommerceProviders>
        </CurrencyProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
