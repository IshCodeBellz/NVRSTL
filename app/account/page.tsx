import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { redirect } from "next/navigation";
import AccountSettingsClient from "./settingsClient";
import { AccountNavigation } from "@/components/account/AccountNavigation";
import Link from "next/link";
import { ClientPrice } from "@/components/ui/ClientPrice";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = (session?.user as { id: string })?.id;
  if (!uid) redirect("/login?callbackUrl=/account");

  const [user, primaryAddress, lastOrder] = await Promise.all([
    prisma.user.findUnique({
      where: { id: uid },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true,
      },
    }),
    prisma.address.findFirst({
      where: { userId: uid },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findFirst({
      where: { userId: uid },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        status: true,
        totalCents: true,
        currency: true,
      },
    }),
  ]);

  if (!user) redirect("/login?callbackUrl=/account");

  function formatDate(d: Date) {
    return new Date(d).toLocaleDateString(undefined, {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-8">My Account</h1>
      <div className="md:grid md:grid-cols-[230px_1fr] md:gap-10 lg:gap-16">
        {/* Left Navigation */}
        <AccountNavigation />

        {/* Main Content */}
        <div className="space-y-12">
          {/* Summary Cards */}
          <div className="space-y-12" id="overview">
            <section id="account-details" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="uppercase tracking-wide text-xs font-semibold text-neutral-600">
                  Account Details
                </h2>
                <Link
                  href="/account/details"
                  className="text-xs underline font-medium hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  View details &gt;
                </Link>
              </div>
              <div className="border rounded p-5 flex gap-5 bg-white dark:bg-neutral-800 dark:border-neutral-700">
                <div className="w-16 h-16 rounded flex items-center justify-center bg-neutral-50 dark:bg-neutral-700 border dark:border-neutral-600 text-neutral-500 dark:text-neutral-400">
                  {/* User Icon */}
                  <svg
                    width="34"
                    height="34"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-70"
                  >
                    <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5Zm0 2c-4 0-8 2-8 5v3h16v-3c0-3-4-5-8-5Z" />
                  </svg>
                </div>
                <div className="text-sm leading-relaxed">
                  <p className="font-semibold dark:text-white">
                    {user.name || "Unnamed User"}
                  </p>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    {formatDate(user.createdAt)}
                  </p>
                  <p className="text-neutral-600 dark:text-neutral-400 break-all">
                    {user.email}
                  </p>
                </div>
              </div>
            </section>
            <section id="security-overview" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="uppercase tracking-wide text-xs font-semibold text-neutral-600">
                  Account Security
                </h2>
                <Link
                  href="/account/security"
                  className="text-xs underline font-medium"
                >
                  Manage Security &gt;
                </Link>
              </div>
              <div className="border rounded p-5 flex gap-5 bg-white dark:bg-neutral-800 dark:border-neutral-700">
                <div className="w-16 h-16 rounded flex items-center justify-center bg-neutral-50 dark:bg-neutral-700 border dark:border-neutral-600 text-neutral-500 dark:text-neutral-400">
                  {/* Security Shield Icon */}
                  <svg
                    width="34"
                    height="34"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-70"
                  >
                    <path d="M12 22s8-4.5 8-11a8 8 0 1 0-16 0c0 6.5 8 11 8 11Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div className="text-sm leading-relaxed">
                  <p className="font-semibold dark:text-white">
                    Security Settings
                  </p>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    Two-factor authentication, trusted devices, and more
                  </p>
                  <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                    Keep your account secure with advanced security features
                  </p>
                </div>
              </div>
            </section>
            <section id="delivery-address" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="uppercase tracking-wide text-xs font-semibold text-neutral-600">
                  Delivery Address
                </h2>
                <Link
                  href="/account/addresses"
                  className="text-xs underline font-medium"
                >
                  All Addresses &gt;
                </Link>
              </div>
              <div className="border rounded p-5 flex gap-5 bg-white dark:bg-neutral-800 dark:border-neutral-700">
                <div className="w-16 h-16 rounded flex items-center justify-center bg-neutral-50 dark:bg-neutral-700 border dark:border-neutral-600 text-neutral-500 dark:text-neutral-400">
                  {/* Address Icon */}
                  <svg
                    width="34"
                    height="34"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-70"
                  >
                    <path d="M12 22s8-4.5 8-11a8 8 0 1 0-16 0c0 6.5 8 11 8 11Z" />
                    <circle cx="12" cy="11" r="3" />
                  </svg>
                </div>
                <div className="text-sm leading-relaxed">
                  {primaryAddress ? (
                    <>
                      <p className="font-semibold dark:text-white">
                        {primaryAddress.fullName}
                      </p>
                      <p className="text-neutral-600 dark:text-neutral-400 whitespace-pre-line">
                        {primaryAddress.line1}
                        {primaryAddress.line2
                          ? `\n${primaryAddress.line2}`
                          : ""}
                        {"\n"}
                        {primaryAddress.city}
                        {primaryAddress.region
                          ? `, ${primaryAddress.region}`
                          : ""}
                        {", "}
                        {primaryAddress.postalCode}
                        {"\n"}
                        {primaryAddress.country}
                        {primaryAddress.phone
                          ? `\nPhone Number ${primaryAddress.phone}`
                          : ""}
                      </p>
                    </>
                  ) : (
                    <p className="text-neutral-500 dark:text-neutral-400">
                      No address saved yet.
                    </p>
                  )}
                </div>
              </div>
            </section>
            <section id="order-history" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="uppercase tracking-wide text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                  Order History
                </h2>
                <Link
                  href="/account/orders"
                  className="text-xs underline font-medium dark:text-neutral-300"
                >
                  View All Orders &gt;
                </Link>
              </div>
              <div className="border rounded p-5 flex gap-5 bg-white dark:bg-neutral-800 dark:border-neutral-700">
                <div className="w-16 h-16 rounded flex items-center justify-center bg-neutral-50 dark:bg-neutral-700 border dark:border-neutral-600 text-neutral-500 dark:text-neutral-400">
                  {/* Order Icon */}
                  <svg
                    width="34"
                    height="34"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-70"
                  >
                    <path d="M8 2v4M16 2v4M4 10h16M3 22h18V6H3v16Z" />
                  </svg>
                </div>
                <div className="text-sm leading-relaxed">
                  {lastOrder ? (
                    <>
                      <p className="dark:text-neutral-200">
                        <span className="font-semibold">Order Number:</span>{" "}
                        {lastOrder.id.slice(0, 12).toUpperCase()}
                      </p>
                      <p className="dark:text-neutral-200">
                        <span className="font-semibold">Date Ordered:</span>{" "}
                        {formatDate(lastOrder.createdAt)}
                      </p>
                      <p className="dark:text-neutral-200">
                        <span className="font-semibold">Order Status:</span>{" "}
                        {lastOrder.status}
                      </p>
                      <p className="mt-1 text-neutral-600 dark:text-neutral-400">
                        Total <ClientPrice cents={lastOrder.totalCents} />
                      </p>
                    </>
                  ) : (
                    <p className="text-neutral-500 dark:text-neutral-400">
                      No orders yet.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Editable Profile Form */}
          <section id="profile-settings" className="space-y-6 pt-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-600">
              Profile Settings
            </h2>
            <AccountSettingsClient
              initialName={user.name || ""}
              email={user.email}
            />
            <div className="text-xs text-neutral-500">
              Need to manage your wishlist?{" "}
              <Link href="/saved" className="underline">
                Go to Wishlist
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
