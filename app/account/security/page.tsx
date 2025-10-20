import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { prisma } from "@/lib/server/prisma";
import { redirect } from "next/navigation";
import { AccountNavigation } from "@/components/account/AccountNavigation";
import { SecurityPageClient } from "@/components/security/SecurityPageClient";

export const dynamic = "force-dynamic";

interface SecurityData {
  user: {
    id: string;
    email: string;
    name: string | null;
    createdAt: Date;
    emailVerified: boolean; // Changed to match actual Prisma schema
    lastLogin: Date | null;
  };
  mfaStatus: {
    enabled: boolean;
    hasBackupCodes: boolean;
    trustedDevices: number;
  };
  recentActivity: {
    loginCount: number;
    lastLoginIp: string | null;
    lastLoginLocation: string | null;
  };
}

async function getSecurityData(userId: string): Promise<SecurityData> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      emailVerified: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Fetch actual MFA status from API
  let mfaStatus = {
    enabled: false,
    hasBackupCodes: false,
    trustedDevices: 0,
  };

  try {
    // For server-side, we'll use the MFAService directly
    const { MFAService } = await import("@/lib/server/mfa");
    const mfaData = await MFAService.getMFAStatus(userId);

    mfaStatus = {
      enabled: mfaData.enabled || false,
      hasBackupCodes: (mfaData.backupCodesRemaining || 0) > 0,
      trustedDevices: 0, // This would need to be implemented in MFAService
    };
  } catch {
    // Keep default values on error
  }

  // TODO: Replace with actual security service calls
  const recentActivity = {
    loginCount: 0, // await securityService.getRecentLoginCount(userId)
    lastLoginIp: null, // await securityService.getLastLoginIp(userId)
    lastLoginLocation: null, // await securityService.getLastLoginLocation(userId)
  };

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified,
      lastLogin: user.lastLoginAt,
    },
    mfaStatus,
    recentActivity,
  };
}

export default async function AccountSecurityPage() {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = (session?.user as { id: string })?.id;

  if (!uid) {
    redirect("/login?callbackUrl=/account/security");
  }

  let securityData: SecurityData;

  try {
    securityData = await getSecurityData(uid);
  } catch {
    redirect("/login?callbackUrl=/account/security");
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
                Account Security
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                Manage your security settings and monitor account activity
              </p>
            </div>
          </div>
        </div>

        <div className="md:grid md:grid-cols-[230px_1fr] md:gap-10 lg:gap-16">
          {/* Left Navigation */}
          <AccountNavigation showBackToAccount={true} />

          {/* Main Content */}
          <div>
            <SecurityPageClient initialSecurityData={securityData} />
          </div>
        </div>
      </div>
    </div>
  );
}
