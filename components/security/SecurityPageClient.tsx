"use client";

import { useState } from "react";
import { SecuritySettings } from "./SecuritySettings";

interface SecurityPageClientProps {
  initialSecurityData: {
    user: {
      id: string;
      email: string;
      name: string | null;
      createdAt: Date;
      emailVerified: boolean;
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
  };
}

export function SecurityPageClient({
  initialSecurityData,
}: SecurityPageClientProps) {
  const [mfaEnabled, setMfaEnabled] = useState(
    initialSecurityData.mfaStatus.enabled
  );

  const handleMfaStatusChange = (enabled: boolean) => {
    setMfaEnabled(enabled);
  };

  return (
    <div className="space-y-8">
      {/* Quick Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Account Status */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg border dark:border-neutral-700 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                Account Status
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                {initialSecurityData.user.emailVerified
                  ? "Verified"
                  : "Pending Verification"}
              </p>
            </div>
          </div>
        </div>

        {/* MFA Status - Now reactive */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg border dark:border-neutral-700 p-4">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                mfaEnabled
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-yellow-100 dark:bg-yellow-900/30"
              }`}
            >
              <svg
                className={`w-5 h-5 ${
                  mfaEnabled
                    ? "text-green-600 dark:text-green-400"
                    : "text-yellow-600 dark:text-yellow-400"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                Two-Factor Auth
              </p>
              <p
                className={`text-xs ${
                  mfaEnabled
                    ? "text-green-600 dark:text-green-400"
                    : "text-yellow-600 dark:text-yellow-400"
                }`}
              >
                {mfaEnabled ? "Enabled" : "Not Enabled"}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg border dark:border-neutral-700 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                Last Activity
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                {initialSecurityData.user.lastLogin
                  ? new Date(
                      initialSecurityData.user.lastLogin
                    ).toLocaleDateString()
                  : "No recent activity"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Recommendations */}
      {!mfaEnabled && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-8">
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Security Recommendation
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Enable two-factor authentication to significantly improve your
                account security. This adds an extra layer of protection even if
                your password is compromised.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Security Settings Component */}
      <SecuritySettings
        initialMfaStatus={initialSecurityData.mfaStatus}
        onMfaStatusChange={handleMfaStatusChange}
      />
    </div>
  );
}
