"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft } from "lucide-react";

interface NavigationItem {
  href: string;
  text: string;
  disabled?: boolean;
}

interface NavigationSection {
  label: string;
  items: NavigationItem[];
}

interface NavigationProps {
  showBackToAccount?: boolean;
}

export function AccountNavigation({
  showBackToAccount = false,
}: NavigationProps) {
  const pathname = usePathname();

  const sections: NavigationSection[] = [
    {
      label: "My Account",
      items: [
        { href: "/account/details", text: "Account details" },
        {
          href: "/account/details#contact-preferences",
          text: "Contact preferences",
        },
        { href: "/account/addresses", text: "Addresses" },
        { href: "/account/payment-details", text: "Payment details" },
      ],
    },
    {
      label: "Security",
      items: [
        {
          href: "/account/security",
          text: "Security Settings",
        },
        { href: "/account/change-password", text: "Change Password" },
      ],
    },
    {
      label: "Order Information",
      items: [
        { href: "/account/orders", text: "Order History" },
        { href: "#returns", text: "Returns", disabled: true },
        { href: "#start-return", text: "Start a Return", disabled: true },
      ],
    },
    {
      label: "Track My Order",
      items: [{ href: "/tracking", text: "Tracking", disabled: false }],
    },
    {
      label: "Wish List",
      items: [{ href: "/saved", text: "My Wish List" }],
    },
    {
      label: "Shop Confidently",
      items: [
        { href: "/privacy", text: "Privacy Policy", disabled: true },
        { href: "/returns", text: "Returns Information", disabled: true },
      ],
    },
  ];

  const isCurrentPath = (href: string) => {
    if (href.includes("#")) {
      return pathname === href.split("#")[0];
    }
    return pathname === href;
  };

  const handleHashNavigation = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.getElementById(href.slice(1));
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }
  };

  return (
    <aside
      className="mb-10 md:mb-0 space-y-6 text-sm"
      aria-label="Account navigation"
    >
      {/* Back to My Account Link */}
      {showBackToAccount && (
        <div className="pb-4 border-b border-neutral-200 dark:border-neutral-700">
          <Link
            href="/account"
            className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">Back to My Account</span>
          </Link>
        </div>
      )}

      {/* Navigation Sections */}
      <div className="space-y-10">
        {sections.map((group) => (
          <div key={group.label} className="space-y-4">
            <div className="px-2 py-3 bg-neutral-50 dark:bg-neutral-800 uppercase tracking-wider text-xs font-semibold text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
              {group.label}
            </div>
            <ul className="space-y-4 pl-2">
              {group.items.map((item) => {
                const disabled = item.disabled;
                const current = isCurrentPath(item.href);
                const className = clsx(
                  "block text-neutral-800 dark:text-neutral-200 hover:underline transition-colors",
                  disabled &&
                    "opacity-40 cursor-not-allowed hover:no-underline",
                  current && "font-semibold text-black dark:text-white"
                );

                return disabled ? (
                  <li key={item.href} className={className}>
                    <span aria-disabled="true">{item.text}</span>
                  </li>
                ) : item.href.startsWith("#") ? (
                  <li key={item.href}>
                    <button
                      onClick={() => handleHashNavigation(item.href)}
                      className={`${className} text-left w-full`}
                    >
                      {item.text}
                    </button>
                  </li>
                ) : (
                  <li key={item.href}>
                    <Link href={item.href} className={className}>
                      {item.text}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
