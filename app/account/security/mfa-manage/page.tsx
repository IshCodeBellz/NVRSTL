"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import Link from "next/link";

export default function MFAManagePage() {
  const [loading, setLoading] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  // Mock user MFA data
  const [mfaData, setMfaData] = useState({
    enabled: true,
    setupDate: "2024-01-15",
    lastUsed: "2024-09-28",
    backupCodesCount: 8,
    backupCodesUsed: 2,
  });

  async function disableMFA() {
    setLoading(true);
    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setMfaData((prev) => ({ ...prev, enabled: false }));
      setShowDisableConfirm(false);
    } catch {
      // Error handling done by UI feedback
    } finally {
      setLoading(false);
    }
  }

  async function generateNewBackupCodes() {
    setLoading(true);
    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const newCodes = Array.from({ length: 10 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );
      setBackupCodes(newCodes);
      setMfaData((prev) => ({
        ...prev,
        backupCodesCount: 10,
        backupCodesUsed: 0,
      }));
      setShowBackupCodes(true);
    } catch {
      // Error handling done by UI feedback
    } finally {
      setLoading(false);
    }
  }

  function downloadBackupCodes() {
    const content = backupCodes.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!mfaData.enabled) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold mb-2">
              Two-Factor Authentication Disabled
            </h1>
            <p className="text-neutral-600">
              Your account is not protected by two-factor authentication.
            </p>
          </div>
          <div className="space-x-3">
            <Link
              href="/account/security/mfa-setup"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Enable 2FA
            </Link>
            <Link
              href="/account/security"
              className="bg-neutral-100 hover:bg-neutral-200 px-6 py-2 rounded border"
            >
              Back to Security
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-semibold">
              Manage Two-Factor Authentication
            </h1>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              <svg
                className="w-3 h-3 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Enabled
            </span>
          </div>
          <p className="text-neutral-600">
            Your account is protected with two-factor authentication using an
            authenticator app.
          </p>
        </div>

        {/* MFA Status */}
        <section className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Authentication Status</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-neutral-600">
                Setup Date
              </label>
              <div className="text-sm mt-1">
                {new Date(mfaData.setupDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-600">
                Last Used
              </label>
              <div className="text-sm mt-1">
                {new Date(mfaData.lastUsed).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Backup Codes */}
        <section className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Backup Codes</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Recovery Codes</h3>
                <p className="text-sm text-neutral-600">
                  {mfaData.backupCodesCount - mfaData.backupCodesUsed} of{" "}
                  {mfaData.backupCodesCount} codes remaining
                </p>
              </div>
              <button
                onClick={generateNewBackupCodes}
                disabled={loading}
                className="text-sm bg-neutral-100 hover:bg-neutral-200 px-3 py-2 rounded border disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate New Codes"}
              </button>
            </div>

            {mfaData.backupCodesUsed > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <div className="flex items-start">
                  <svg
                    className="w-4 h-4 text-yellow-600 mt-0.5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="text-yellow-800 font-medium">
                      Some backup codes have been used
                    </p>
                    <p className="text-yellow-700">
                      Consider generating new backup codes if you&apos;re
                      running low.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Show New Backup Codes */}
        {showBackupCodes && backupCodes.length > 0 && (
          <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5 text-yellow-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">
                  New backup codes generated
                </h3>
                <p className="text-sm text-yellow-700 mb-4">
                  Save these backup codes in a safe place. They replace your
                  previous codes.
                </p>
                <div className="bg-white rounded border p-4 mb-4">
                  <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="text-center py-1">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={downloadBackupCodes}
                    className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                  >
                    Download Codes
                  </button>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(backupCodes.join("\n"))
                    }
                    className="bg-neutral-100 hover:bg-neutral-200 px-3 py-1 rounded text-sm border"
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    onClick={() => setShowBackupCodes(false)}
                    className="text-neutral-600 hover:text-neutral-800 text-sm"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Danger Zone */}
        <section className="bg-white rounded-lg border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-600 mb-4">
            Danger Zone
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">
                  Disable Two-Factor Authentication
                </h3>
                <p className="text-sm text-neutral-600">
                  This will remove the extra security layer from your account.
                </p>
              </div>
              <button
                onClick={() => setShowDisableConfirm(true)}
                className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded"
              >
                Disable 2FA
              </button>
            </div>
          </div>
        </section>

        {/* Disable Confirmation Modal */}
        {showDisableConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">
                  Disable Two-Factor Authentication
                </h3>
              </div>

              <p className="text-sm text-neutral-600 mb-6">
                Are you sure you want to disable two-factor authentication? This
                will make your account less secure.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={disableMFA}
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? "Disabling..." : "Yes, Disable 2FA"}
                </button>
                <button
                  onClick={() => setShowDisableConfirm(false)}
                  className="px-4 py-2 border rounded hover:bg-neutral-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="text-center">
          <Link
            href="/account/security"
            className="text-neutral-600 hover:text-neutral-800 text-sm"
          >
            ← Back to Security Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
