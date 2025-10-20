"use client";

import { useState } from "react";

interface MfaStatusCardsProps {
  initialMfaEnabled: boolean;
  userEmailVerified: boolean;
  userLastLogin: Date | null;
}

export function MfaStatusCards({
  initialMfaEnabled,
  userEmailVerified,
  userLastLogin,
}: MfaStatusCardsProps) {
  const [mfaEnabled] = useState(initialMfaEnabled);

  return (
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
              {userEmailVerified ? "Verified" : "Pending Verification"}
            </p>
          </div>
        </div>
      </div>

      {/* MFA Status */}
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
              {userLastLogin
                ? new Date(userLastLogin).toLocaleDateString()
                : "No recent activity"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export a function to update MFA status from parent
export function useMfaStatusUpdate() {
  return {
    updateMfaStatus: () => {
      // This would be handled by the parent component's state
      // We'll pass this as a callback to the SecuritySettings component
    },
  };
}
