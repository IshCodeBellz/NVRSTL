import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { Header } from "../components/layout/Header";
import { VerifyEmailBanner } from "../components/layout/VerifyEmailBanner";
import { Footer } from "../components/layout/Footer";
import Providers from "../components/providers/Providers";
import { CartSync } from "../components/providers/CartSync";
import { AuthProvider } from "../components/providers/AuthProvider";
import { LiveRegion } from "../components/a11y/LiveRegion";
import { CurrencyNotification } from "../components/ui/CurrencyNotification";

// Force all pages to be dynamically rendered
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NVRSTL",
  description:
    "NVRSTL fashion storefront built with Next.js 14 & Tailwind (educational demo)",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [
      { url: "/favicon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#000000",
      },
    ],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <Providers>
            <Header />
            <VerifyEmailBanner />
            <LiveRegion />
            <CartSync />
            <main className="flex-1">{children}</main>
            <Footer />
            <CurrencyNotification />
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
