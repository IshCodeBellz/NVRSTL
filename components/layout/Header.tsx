"use client";
import Link from "next/link";
import EnhancedSearchBar from "../search/EnhancedSearchBar";
import { useCart, useWishlist } from "../providers/CartProvider";
import { useSession, signOut } from "next-auth/react";
import { DynamicLogo } from "./DynamicLogo";
import { CurrencySelector } from "../ui/CurrencySelector";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

export function Header() {
  const { totalQuantity, clear: clearCart } = useCart();
  const { items: wishItems, clear: clearWishlist } = useWishlist();
  const { data: session, status } = useSession();
  const prevAuth = useRef<boolean>(!!session);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
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
      <header className="bg-black border-b border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          {/* Logo Row - Centered */}
          <div className="flex justify-center py-0">
            <DynamicLogo className="flex items-center" linkClassName="" />
          </div>

          {/* Main Header Row */}
          <div className="flex items-center h-20 gap-4 md:gap-6 justify-between">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="/"
                className="text-white font-carbon uppercase tracking-wider text-base hover:text-gray-300 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/discover"
                className="text-white font-carbon uppercase tracking-wider text-base hover:text-gray-300 transition-colors"
              >
                Discover
              </Link>
              <Link
                href="/gallery"
                className="text-white font-carbon uppercase tracking-wider text-base hover:text-gray-300 transition-colors"
              >
                Gallery
              </Link>
              <Link
                href="/contact"
                className="text-white font-carbon uppercase tracking-wider text-base hover:text-gray-300 transition-colors"
              >
                Contact
              </Link>
            </nav>

            {/* Desktop Search Bar with Currency Selector - Centered */}
            <div className="hidden lg:flex flex-1 justify-center max-w-none min-w-0 mx-8">
              <div className="flex items-center gap-4 w-full max-w-md lg:max-w-lg xl:max-w-xl min-w-0">
                {/* Currency Selector */}
                <div className="text-white [&_button]:text-[#f5f5f5] [&_button]:hover:bg-gray-800 [&_button]:hover:text-[#f5f5f5] [&_button]:currency-selector [&_button]:currency-selector-button [&_button]:border [&_button]:border-gray-600 [&_button]:rounded-lg [&_button]:px-3 [&_button]:py-2 [&_button]:bg-gray-900 [&_button]:hover:border-gray-500 [&_button]:transition-all [&_button]:duration-200 [&_div]:currency-dropdown [&_button]:currency-dropdown-item">
                  <CurrencySelector
                    variant="minimal"
                    size="sm"
                    showLabel={false}
                  />
                </div>
                {/* Search Bar */}
                <div className="flex-1">
                  <EnhancedSearchBar />
                </div>
              </div>
            </div>

            {/* Right Side - Auth, Actions */}
            <nav className="hidden md:flex items-center space-x-6 shrink-0">
              {session ? (
                <div className="flex items-center gap-4 text-sm">
                  {session.user?.isAdmin && (
                    <>
                      <Link
                        href="/admin"
                        className="hover:underline font-medium text-white text-base px-3 py-2 bg-gray-800 rounded font-carbon uppercase tracking-wider"
                      >
                        Admin
                      </Link>
                      <Link
                        href="/admin/orders?status=PAID"
                        className="relative hover:underline font-medium text-white text-base px-3 py-2 bg-gray-800 rounded font-carbon uppercase tracking-wider"
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
                      className="text-white font-carbon uppercase tracking-wider hover:text-gray-300 text-base truncate max-w-20"
                    >
                      {session.user?.name?.split(" ")[0] || "Account"}
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="text-white font-carbon uppercase tracking-wider text-base hover:text-gray-300 transition-colors px-2 py-1"
                >
                  Sign in
                </Link>
              )}
              <Link
                href="/saved"
                className="relative text-white font-carbon uppercase tracking-wider text-base hover:text-gray-300 transition-colors px-2"
              >
                Saved
                <span
                  className={
                    "absolute -top-1 -right-1 bg-white text-black rounded-full text-[9px] leading-none h-3 min-w-3 px-0.5 flex items-center justify-center transition-opacity " +
                    (wishItems.length === 0 ? "opacity-0" : "opacity-100")
                  }
                  aria-hidden={wishItems.length === 0}
                >
                  {wishItems.length}
                </span>
              </Link>
              <Link
                href="/bag"
                className="relative text-white font-carbon uppercase tracking-wider text-base hover:text-gray-300 transition-colors px-2"
              >
                Bag
                <span
                  className={
                    "absolute -top-1 -right-1 bg-white text-black rounded-full text-[9px] leading-none h-3 min-w-3 px-0.5 flex items-center justify-center transition-opacity " +
                    (totalQuantity === 0 ? "opacity-0" : "opacity-100")
                  }
                  aria-hidden={totalQuantity === 0}
                >
                  {totalQuantity}
                </span>
              </Link>

              {/* SIGN UP Button */}
              {!session && (
                <Link
                  href="/register"
                  className="bg-white text-black px-4 py-2 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors font-carbon text-base"
                >
                  Sign Up
                </Link>
              )}
            </nav>

            {/* Mobile Controls */}
            <div className="flex md:hidden items-center gap-3 ml-auto">
              {/* Currency Selector for Mobile */}
              <div className="text-white [&_button]:text-[#f5f5f5] [&_button]:hover:bg-gray-800 [&_button]:hover:text-[#f5f5f5] [&_button]:currency-selector [&_button]:currency-selector-button [&_button]:border [&_button]:border-gray-600 [&_button]:rounded-lg [&_button]:px-3 [&_button]:py-2 [&_button]:bg-gray-900 [&_button]:hover:border-gray-500 [&_button]:transition-all [&_button]:duration-200 [&_div]:currency-dropdown [&_button]:currency-dropdown-item">
                <CurrencySelector
                  variant="minimal"
                  size="sm"
                  showLabel={false}
                />
              </div>
              <Link
                href="/saved"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-600 text-white hover:bg-gray-800 transition-colors"
                aria-label="Saved items"
              >
                ♥
                <span
                  className={
                    "absolute -top-1 -right-1 bg-white text-black rounded-full text-[10px] leading-none h-4 min-w-4 px-1 flex items-center justify-center " +
                    (wishItems.length === 0 ? "opacity-0" : "opacity-100")
                  }
                  aria-hidden={wishItems.length === 0}
                >
                  {wishItems.length}
                </span>
              </Link>
              <Link
                href="/bag"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-600 text-white hover:bg-gray-800 transition-colors"
                aria-label="Bag"
              >
                👜
                <span
                  className={
                    "absolute -top-1 -right-1 bg-white text-black rounded-full text-[10px] leading-none h-4 min-w-4 px-1 flex items-center justify-center " +
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-600 text-white hover:bg-gray-800 transition-colors"
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

          {/* Mobile Search Bar with Currency Selector */}
          <div className="md:hidden pb-6">
            <EnhancedSearchBar />
          </div>

          {/* Navigation Row - Desktop Only */}
          <div className="hidden md:block border-t border-gray-800">
            <nav className="flex items-center justify-center gap-4 lg:gap-6 xl:gap-8 py-4 flex-wrap">
              <Link
                href="/drops"
                className="text-sm font-medium text-white hover:text-gray-300 font-carbon uppercase tracking-wider whitespace-nowrap transition-colors"
              >
                🔥 Drops
              </Link>
              <Link
                href="/womens"
                className="text-sm font-medium text-white hover:text-gray-300 font-carbon uppercase tracking-wider whitespace-nowrap transition-colors"
              >
                Women
              </Link>
              <Link
                href="/mens"
                className="text-sm font-medium text-white hover:text-gray-300 font-carbon uppercase tracking-wider whitespace-nowrap transition-colors"
              >
                Men
              </Link>
              <div className="relative group">
                <Link
                  href="/shop"
                  className="text-sm font-medium text-white hover:text-gray-300 font-carbon uppercase tracking-wider whitespace-nowrap transition-colors flex items-center"
                  onMouseEnter={() => setShopDropdownOpen(true)}
                  onMouseLeave={() => setShopDropdownOpen(false)}
                >
                  Shop
                  <svg
                    className={`ml-1 h-4 w-4 transition-transform duration-200 ${
                      shopDropdownOpen ? "rotate-180" : "rotate-0"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </Link>

                {/* Dropdown Menu */}
                <div
                  className={`absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[9999] transition-all duration-200 ${
                    shopDropdownOpen
                      ? "opacity-100 visible"
                      : "opacity-0 invisible"
                  }`}
                  onMouseEnter={() => setShopDropdownOpen(true)}
                  onMouseLeave={() => setShopDropdownOpen(false)}
                >
                  <Link
                    href="/shop/football"
                    className="flex items-center px-4 py-3 text-gray-800 hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-lg mr-3">⚽</span>
                    <span className="font-medium">Football</span>
                  </Link>
                  <Link
                    href="/shop/international"
                    className="flex items-center px-4 py-3 text-gray-800 hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-lg mr-3">🌍</span>
                    <span className="font-medium">International</span>
                  </Link>
                  <Link
                    href="/shop/nba"
                    className="flex items-center px-4 py-3 text-gray-800 hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-lg mr-3">🏀</span>
                    <span className="font-medium">NBA</span>
                  </Link>
                  <Link
                    href="/shop/nfl"
                    className="flex items-center px-4 py-3 text-gray-800 hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-lg mr-3">🏈</span>
                    <span className="font-medium">NFL</span>
                  </Link>
                  <Link
                    href="/shop/custom"
                    className="flex items-center px-4 py-3 text-gray-800 hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-lg mr-3">👕</span>
                    <span className="font-medium">Custom</span>
                  </Link>
                </div>
              </div>
              {/* <Link
                href="/shoes"
                className="text-base font-medium text-white hover:text-gray-300 font-carbon uppercase tracking-wider whitespace-nowrap transition-colors"
              >
                Shoes
              </Link>
              <Link
                href="/accessories"
                className="text-base font-medium text-white hover:text-gray-300 font-carbon uppercase tracking-wider whitespace-nowrap transition-colors"
              >
                Accessories
              </Link> */}
              <Link
                href="/brands"
                className="text-sm font-medium text-white hover:text-gray-300 font-carbon uppercase tracking-wider whitespace-nowrap transition-colors"
              >
                Brands
              </Link>
              {/* <Link
                href="/discover"
                className="text-base font-medium text-white hover:text-gray-300 font-carbon uppercase tracking-wider whitespace-nowrap transition-colors"
              >
                Discover
              </Link>
              <Link
                href="/gallery"
                className="text-base font-medium text-white hover:text-gray-300 font-carbon uppercase tracking-wider whitespace-nowrap transition-colors"
              >
                Gallery
              </Link>
              <Link
                href="/contact"
                className="text-base font-medium text-white hover:text-gray-300 font-carbon uppercase tracking-wider whitespace-nowrap transition-colors"
              >
                Contact
              </Link> */}
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
              className="fixed top-0 right-0 h-full w-80 max-w-[92%] bg-black z-[101] shadow-xl flex flex-col will-change-transform animate-slide-in border-l border-gray-800"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile menu"
            >
              <div className="flex items-center justify-between pl-4 pr-2 h-20 border-b border-gray-800">
                <span className="font-bold text-sm text-white font-carbon uppercase tracking-wider">
                  Menu
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="rounded-full h-10 w-10 inline-flex items-center justify-center border border-gray-600 hover:bg-gray-800 text-white transition-colors"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-5 text-sm space-y-6">
                {/* Currency Selector for Mobile */}
                <div className="pb-4 border-b border-gray-800">
                  <div className="text-white [&_button]:text-[#f5f5f5] [&_button]:hover:bg-gray-800 [&_button]:hover:text-[#f5f5f5] [&_button]:currency-selector [&_button]:currency-selector-button [&_button]:border [&_button]:border-gray-600 [&_button]:rounded-lg [&_button]:px-3 [&_button]:py-2 [&_button]:bg-gray-900 [&_button]:hover:border-gray-500 [&_button]:transition-all [&_button]:duration-200 [&_div]:currency-dropdown [&_button]:currency-dropdown-item">
                    <CurrencySelector
                      variant="minimal"
                      size="sm"
                      showLabel={false}
                    />
                  </div>
                </div>

                {status === "loading" && (
                  <div className="h-5 w-32 bg-gray-700 animate-pulse rounded" />
                )}
                {status !== "loading" && session && (
                  <div className="space-y-2">
                    <div className="font-bold truncate text-white font-carbon uppercase tracking-wider">
                      {session.user?.name || session.user?.email}
                    </div>
                    {session.user?.isAdmin && (
                      <div className="space-y-1">
                        <Link
                          href="/admin"
                          onClick={() => setMobileMenuOpen(false)}
                          className="block hover:text-gray-300 text-gray-400 font-carbon uppercase tracking-wider transition-colors"
                        >
                          Admin Dashboard
                        </Link>
                        <Link
                          href="/admin/orders?status=PAID"
                          onClick={() => setMobileMenuOpen(false)}
                          className="block hover:text-gray-300 text-gray-400 font-carbon uppercase tracking-wider transition-colors"
                        >
                          Orders
                        </Link>
                      </div>
                    )}
                    <Link
                      href="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block hover:text-gray-300 text-gray-400 font-carbon uppercase tracking-wider transition-colors"
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
                      className="block hover:text-gray-300 text-left w-full text-gray-400 font-carbon uppercase tracking-wider transition-colors"
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
                      className="block hover:text-gray-300 font-bold text-white font-carbon uppercase tracking-wider transition-colors"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block hover:text-gray-300 text-gray-400 font-carbon uppercase tracking-wider transition-colors"
                    >
                      Create account
                    </Link>
                  </div>
                )}
                <div className="space-y-2 pt-2 border-t border-gray-800">
                  <p className="text-[10px] font-bold tracking-wide text-gray-400 uppercase font-carbon">
                    Categories
                  </p>
                  {/* Primary Categories */}
                  <div className="space-y-3">
                    {[
                      { href: "/drops", label: "🔥 Drops" },
                      { href: "/womens", label: "Women" },
                      { href: "/mens", label: "Men" },
                      // { href: "/footwear", label: "Shoes" },
                      // { href: "/accessories", label: "Accessories" },
                      { href: "/shop", label: "Shop" },
                      { href: "/brands", label: "Brands" },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-base font-bold text-white hover:text-gray-300 font-carbon uppercase tracking-wider py-1 transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>

                  {/* Sports Categories */}
                  <div className="pt-3 border-t border-gray-800">
                    <p className="text-[10px] font-bold tracking-wide text-gray-400 uppercase mb-2 font-carbon">
                      Sports
                    </p>
                    <div className="space-y-2">
                      {[
                        {
                          href: "/shop/football",
                          label: "⚽ Football",
                          emoji: "⚽",
                        },
                        {
                          href: "/shop/international",
                          label: "🌍 International",
                          emoji: "🌍",
                        },
                        { href: "/shop/nba", label: "🏀 NBA", emoji: "🏀" },
                        { href: "/shop/nfl", label: "🏈 NFL", emoji: "🏈" },
                        {
                          href: "/shop/custom",
                          label: "👕 Custom",
                          emoji: "👕",
                        },
                      ].map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center px-2 py-2 rounded hover:bg-gray-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-gray-600 text-gray-400 hover:text-white transition-colors font-carbon uppercase tracking-wider text-sm"
                        >
                          <span className="text-lg mr-3">{item.emoji}</span>
                          <span>
                            {item.label.replace(item.emoji + " ", "")}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Subcategories */}
                  <div className="pt-3 border-t border-gray-800">
                    <p className="text-[10px] font-bold tracking-wide text-gray-400 uppercase mb-2 font-carbon">
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
                          className="px-2 py-1 rounded hover:bg-gray-800 border border-transparent focus:outline-none focus:ring-2 focus:ring-gray-600 text-gray-400 hover:text-white transition-colors font-carbon uppercase tracking-wider text-xs"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t border-gray-800">
                  <Link
                    href="/saved"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between text-gray-400 hover:text-white transition-colors font-carbon uppercase tracking-wider"
                  >
                    <span>Saved Items</span>
                    <span className="text-xs bg-white text-black rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center">
                      {wishItems.length}
                    </span>
                  </Link>
                  <Link
                    href="/social/wishlists"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block hover:text-white text-gray-400 transition-colors font-carbon uppercase tracking-wider"
                  >
                    Social Wishlists
                  </Link>
                  <Link
                    href="/bag"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between text-gray-400 hover:text-white transition-colors font-carbon uppercase tracking-wider"
                  >
                    <span>Bag</span>
                    <span className="text-xs bg-white text-black rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center">
                      {totalQuantity}
                    </span>
                  </Link>
                </div>
              </div>
              <div className="px-4 py-3 border-t border-gray-800 text-[10px] text-gray-400 font-carbon uppercase tracking-wider">
                © {new Date().getFullYear()} NVRSTL
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
