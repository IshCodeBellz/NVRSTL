"use client";
import Link from "next/link";
import EnhancedSearchBar from "../search/EnhancedSearchBar";
import { useCart, useWishlist } from "../providers/CartProvider";
import { useSession, signOut } from "next-auth/react";
import { DarkModeToggle } from "./DarkModeToggle";
import { CurrencySelector } from "../ui/CurrencySelector";
import { DynamicLogo } from "./DynamicLogo";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

export function Header() {
  const { totalQuantity, clear: clearCart } = useCart();
  const { items: wishItems, clear: clearWishlist } = useWishlist();
  const { data: session, status } = useSession();
  const prevAuth = useRef<boolean>(!!session);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuOpenedAt = useRef<number>(0);
  const pathname = usePathname();
  const [paidCount, setPaidCount] = useState<number | null>(null);

  // Fetch admin orders summary for PAID count
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        if (!session?.user?.isAdmin) {
          setPaidCount(null);
          return;
        }
        const res = await fetch("/api/admin/orders/summary", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { totalPaid?: number };
        if (!ignore)
          setPaidCount(typeof data.totalPaid === "number" ? data.totalPaid : 0);
      } catch {
        if (!ignore) setPaidCount(null);
      }
    }
    load();
    const id = setInterval(load, 60_000); // refresh every minute
    return () => {
      ignore = true;
      clearInterval(id);
    };
  }, [session?.user?.isAdmin]);

  // Listen to admin SSE events for real-time badge updates and notifications
  useEffect(() => {
    if (!session?.user?.isAdmin) return;
    const es = new EventSource("/api/admin/events");
    es.addEventListener("order-status", () => {
      // Refresh paid count quickly when an order changes status
      fetch("/api/admin/orders/summary", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && typeof d.totalPaid === "number") setPaidCount(d.totalPaid);
        })
        .catch(() => {});
    });
    es.addEventListener("new-paid-order", (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data || "{}");
        if ("Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification("New PAID order", {
              body: `Order ${String(data.orderId || "").slice(
                0,
                8
              )} is ready to fulfill`,
            });
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission();
          }
        }
      } catch {}
    });
    return () => es.close();
  }, [session?.user?.isAdmin]);

  // Clear local state when auth ends
  useEffect(() => {
    if (prevAuth.current && !session) {
      try {
        clearCart();
        clearWishlist();
        if (typeof window !== "undefined") {
          localStorage.removeItem("app.cart.v1");
          localStorage.removeItem("app.wishlist.v1");
        }
      } catch {}
    }
    prevAuth.current = !!session;
  }, [session, clearCart, clearWishlist]);

  // Close drawer after navigation (only when the route changes)
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Body scroll lock
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = mobileMenuOpen ? "hidden" : prev;
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  // Close on Escape
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-blue-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Skip to main content
      </a>
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-40">
        <div className="container mx-auto px-2 md:px-4 lg:px-6">
          {/* Main Header Row */}
          <div className="flex items-center h-16 gap-2 md:gap-4 justify-between">
            {/* Logo */}
            <DynamicLogo
              className="flex items-center shrink-0"
              linkClassName="font-bold text-lg md:text-xl tracking-tight"
            />

            {/* Desktop Search Bar - Centered */}
            <div className="hidden md:flex flex-1 justify-center max-w-none min-w-0">
              <div className="w-full max-w-sm lg:max-w-md xl:max-w-lg min-w-0">
                <EnhancedSearchBar />
              </div>
            </div>

            {/* Right Side - Currency, Auth, Actions */}
            <nav className="hidden md:flex header-nav shrink-0">
              <CurrencySelector variant="minimal" showLabel={false} size="sm" />
              <DarkModeToggle />
              {session ? (
                <div className="flex items-center gap-2 text-sm">
                  {session.user?.isAdmin && (
                    <>
                      <Link
                        href="/admin"
                        className="hover:underline font-medium text-neutral-900 dark:text-white text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded"
                      >
                        Admin
                      </Link>
                      <Link
                        href="/admin/orders?status=PAID"
                        className="relative hover:underline font-medium text-neutral-900 dark:text-white text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded"
                        title="Manage orders"
                      >
                        Orders
                        {typeof paidCount === "number" && (
                          <span
                            className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-[9px] leading-none h-4 min-w-4 px-1 flex items-center justify-center"
                            aria-label={`${paidCount} paid orders`}
                          >
                            {paidCount}
                          </span>
                        )}
                      </Link>
                    </>
                  )}
                  <div className="relative group">
                    <button
                      onClick={() => {
                        menuOpenedAt.current = Date.now();
                        setMobileMenuOpen(true);
                      }}
                      aria-controls="site-mobile-menu"
                      aria-expanded={mobileMenuOpen}
                      className="text-neutral-900 dark:text-white font-medium hover:text-red-600 dark:hover:text-red-400 text-xs truncate max-w-20"
                    >
                      {session.user?.name?.split(" ")[0] || "Account"}
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="text-xs hover:underline text-neutral-900 dark:text-white px-2 py-1"
                >
                  Sign in
                </Link>
              )}
              <Link
                href="/saved"
                className="relative text-xs hover:underline text-neutral-900 dark:text-white px-1"
              >
                Saved
                <span
                  className={
                    "absolute -top-1 -right-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-full text-[9px] leading-none h-3 min-w-3 px-0.5 flex items-center justify-center transition-opacity " +
                    (wishItems.length === 0 ? "opacity-0" : "opacity-100")
                  }
                  aria-hidden={wishItems.length === 0}
                >
                  {wishItems.length}
                </span>
              </Link>
              <Link
                href="/social/wishlists"
                className="text-xs hover:underline text-neutral-900 dark:text-white px-1"
              >
                Social
              </Link>
              <Link
                href="/bag"
                className="relative text-xs hover:underline text-neutral-900 dark:text-white px-1"
              >
                Bag
                <span
                  className={
                    "absolute -top-1 -right-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-full text-[9px] leading-none h-3 min-w-3 px-0.5 flex items-center justify-center transition-opacity " +
                    (totalQuantity === 0 ? "opacity-0" : "opacity-100")
                  }
                  aria-hidden={totalQuantity === 0}
                >
                  {totalQuantity}
                </span>
              </Link>
            </nav>

            {/* Mobile Controls */}
            <div className="flex md:hidden items-center gap-2 ml-auto">
              <DarkModeToggle />
              <Link
                href="/saved"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-600 text-[11px] text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                aria-label="Saved items"
              >
                ♥
                <span
                  className={
                    "absolute -top-1 -right-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-full text-[10px] leading-none h-4 min-w-4 px-1 flex items-center justify-center " +
                    (wishItems.length === 0 ? "opacity-0" : "opacity-100")
                  }
                  aria-hidden={wishItems.length === 0}
                >
                  {wishItems.length}
                </span>
              </Link>
              <Link
                href="/bag"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-600 text-[11px] text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
                aria-label="Bag"
              >
                👜
                <span
                  className={
                    "absolute -top-1 -right-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-full text-[10px] leading-none h-4 min-w-4 px-1 flex items-center justify-center " +
                    (totalQuantity === 0 ? "opacity-0" : "opacity-100")
                  }
                  aria-hidden={totalQuantity === 0}
                >
                  {totalQuantity}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
                aria-expanded={mobileMenuOpen}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="md:hidden pb-3">
            <EnhancedSearchBar />
          </div>

          {/* Navigation Row - Desktop Only */}
          <div className="hidden md:block border-t border-neutral-200 dark:border-neutral-700">
            <nav className="flex items-center justify-center gap-4 lg:gap-6 xl:gap-8 py-3 overflow-x-auto">
              <Link
                href="/new-in"
                className="text-sm font-medium text-neutral-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 whitespace-nowrap"
              >
                New In
              </Link>
              <Link
                href="/womens"
                className="text-sm font-medium text-neutral-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 whitespace-nowrap"
              >
                Women
              </Link>
              <Link
                href="/mens"
                className="text-sm font-medium text-neutral-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 whitespace-nowrap"
              >
                Men
              </Link>
              <Link
                href="/shoes"
                className="text-sm font-medium text-neutral-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 whitespace-nowrap"
              >
                Shoes
              </Link>
              <Link
                href="/accessories"
                className="text-sm font-medium text-neutral-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 whitespace-nowrap"
              >
                Accessories
              </Link>
              <Link
                href="/brands"
                className="text-sm font-medium text-neutral-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 whitespace-nowrap"
              >
                Brands
              </Link>
            </nav>
          </div>
        </div>
      </header>
      {mobileMenuOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div>
            <div
              className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[100]"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <div
              className="fixed top-0 right-0 h-full w-80 max-w-[92%] bg-white dark:bg-neutral-900 z-[101] shadow-xl flex flex-col will-change-transform animate-slide-in"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile menu"
            >
              <div className="flex items-center justify-between pl-4 pr-2 h-16 border-b border-neutral-200 dark:border-neutral-700">
                <span className="font-semibold text-sm text-neutral-900 dark:text-white">
                  Menu
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="rounded-full h-10 w-10 inline-flex items-center justify-center border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-900 dark:text-white"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-5 text-sm space-y-6">
                {status === "loading" && (
                  <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded" />
                )}
                {status !== "loading" && session && (
                  <div className="space-y-2">
                    <div className="font-medium truncate text-neutral-900 dark:text-white">
                      {session.user?.name || session.user?.email}
                    </div>
                    {session.user?.isAdmin && (
                      <div className="space-y-1">
                        <Link
                          href="/admin"
                          onClick={() => setMobileMenuOpen(false)}
                          className="block hover:text-brand-accent text-neutral-700 dark:text-neutral-300"
                        >
                          Admin Dashboard
                        </Link>
                        <Link
                          href="/admin/orders?status=PAID"
                          onClick={() => setMobileMenuOpen(false)}
                          className="block hover:text-brand-accent text-neutral-700 dark:text-neutral-300"
                        >
                          Orders
                        </Link>
                      </div>
                    )}
                    <Link
                      href="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block hover:text-brand-accent text-neutral-700 dark:text-neutral-300"
                    >
                      My Account
                    </Link>
                    <button
                      onClick={() => {
                        try {
                          clearCart();
                          clearWishlist();
                          if (typeof window !== "undefined") {
                            localStorage.removeItem("app.cart.v1");
                            localStorage.removeItem("app.wishlist.v1");
                          }
                        } catch {}
                        signOut();
                      }}
                      className="block hover:text-brand-accent text-left w-full text-neutral-700 dark:text-neutral-300"
                    >
                      Sign out
                    </button>
                  </div>
                )}
                {status !== "loading" && !session && (
                  <div className="space-y-2">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block hover:text-brand-accent font-medium text-neutral-900 dark:text-white"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block hover:text-brand-accent text-neutral-700 dark:text-neutral-300"
                    >
                      Create account
                    </Link>
                  </div>
                )}
                <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-[10px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 uppercase">
                    Categories
                  </p>
                  {/* Primary Categories */}
                  <div className="space-y-3">
                    {[
                      { href: "/new-in", label: "New In" },
                      { href: "/womens", label: "Women" },
                      { href: "/mens", label: "Men" },
                      { href: "/footwear", label: "Shoes" },
                      { href: "/accessories", label: "Accessories" },
                      { href: "/brands", label: "Brands" },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-base font-medium text-neutral-900 dark:text-white hover:text-brand-accent py-1"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>

                  {/* Subcategories */}
                  <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700">
                    <p className="text-[10px] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400 uppercase mb-2">
                      Popular Categories
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 text-[13px]">
                      {[
                        { href: "/women/dresses", label: "Women · Dresses" },
                        {
                          href: "/women/outerwear",
                          label: "Women · Outerwear",
                        },
                        { href: "/men/outerwear", label: "Men · Outerwear" },
                        { href: "/men/denim", label: "Men · Denim" },
                      ].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600 text-neutral-700 dark:text-neutral-300"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <Link
                    href="/saved"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between text-neutral-700 dark:text-neutral-300 hover:text-brand-accent"
                  >
                    <span>Saved Items</span>
                    <span className="text-xs bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center">
                      {wishItems.length}
                    </span>
                  </Link>
                  <Link
                    href="/social/wishlists"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block hover:text-brand-accent text-neutral-700 dark:text-neutral-300"
                  >
                    Social Wishlists
                  </Link>
                  <Link
                    href="/bag"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between text-neutral-700 dark:text-neutral-300 hover:text-brand-accent"
                  >
                    <span>Bag</span>
                    <span className="text-xs bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center">
                      {totalQuantity}
                    </span>
                  </Link>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 text-[10px] text-neutral-500 dark:text-neutral-400">
                © {new Date().getFullYear()} NVRSTL
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
