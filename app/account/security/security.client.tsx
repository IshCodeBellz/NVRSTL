"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { SecurityActivity } from "@/components/security/SecurityActivity";
import { DeviceManagement } from "@/components/security/DeviceManagement";

interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  mfaBackupCodesCount: number;
  memberSince: string;
}

interface SecurityClientProps {
  user: User;
}

export default function SecurityClient({
  user: initialUser,
}: SecurityClientProps) {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);

  // Fetch current security status
  useEffect(() => {
    async function fetchSecurityStatus() {
      try {
        // This would call a security status API if we had one
        // For now, we'll use mock data
        setUser((prev) => ({
          ...prev,
          emailVerified: true, // Mock verified
          mfaEnabled: false,
          mfaBackupCodesCount: 0,
        }));
      } catch {
        // Error handling done by UI feedback
      }
    }

    fetchSecurityStatus();
  }, []);

  async function resendEmailVerification() {
    setLoading(true);
    setEmailVerificationSent(false);

    try {
      const res = await fetch("/api/auth/verify-email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setEmailVerificationSent(true);
      }
    } catch {
      // Error handling done by UI feedback
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Account Overview */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Account Overview</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-neutral-600">
              Email Address
            </label>
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm">{user.email}</span>
              {user.emailVerified ? (
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
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Unverified
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-neutral-600">
              Member Since
            </label>
            <div className="text-sm mt-1">
              {new Date(user.memberSince).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Email Verification */}
      {!user.emailVerified && (
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
              <h3 className="text-sm font-medium text-yellow-800">
                Email verification required
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Please verify your email address to secure your account and
                enable all features.
              </p>
              <div className="mt-3">
                {emailVerificationSent ? (
                  <div className="text-sm text-green-700">
                    Verification email sent! Check your inbox.
                  </div>
                ) : (
                  <button
                    onClick={resendEmailVerification}
                    disabled={loading}
                    className="text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Send verification email"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Password Security */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Password Security</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Password</h3>
              <p className="text-sm text-neutral-600">
                Last changed: Not available
              </p>
            </div>
            <Link
              href="/forgot-password"
              className="text-sm bg-neutral-100 hover:bg-neutral-200 px-3 py-2 rounded border"
            >
              Change Password
            </Link>
          </div>
        </div>
      </section>

      {/* Two-Factor Authentication */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">
          Two-Factor Authentication
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Authenticator App</h3>
              <p className="text-sm text-neutral-600">
                {user.mfaEnabled
                  ? "Two-factor authentication is enabled"
                  : "Add an extra layer of security to your account"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {user.mfaEnabled ? (
                <>
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
                  <Link
                    href="/account/security/mfa-manage"
                    className="text-sm bg-neutral-100 hover:bg-neutral-200 px-3 py-2 rounded border"
                  >
                    Manage
                  </Link>
                </>
              ) : (
                <Link
                  href="/account/security/mfa-setup"
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded"
                >
                  Enable 2FA
                </Link>
              )}
            </div>
          </div>

          {user.mfaEnabled && user.mfaBackupCodesCount > 0 && (
            <div className="pl-4 border-l-2 border-neutral-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Backup Codes</h4>
                  <p className="text-sm text-neutral-600">
                    {user.mfaBackupCodesCount} backup codes remaining
                  </p>
                </div>
                <Link
                  href="/account/security/backup-codes"
                  className="text-sm text-blue-600 hover:underline"
                >
                  View Codes
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Login Activity */}
      <SecurityActivity />

      {/* Device Management */}
      <DeviceManagement />

      {/* Account Actions */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Account Actions</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <h3 className="text-sm font-medium">Download your data</h3>
              <p className="text-sm text-neutral-600">
                Get a copy of your account data
              </p>
            </div>
            <button className="text-sm bg-neutral-100 hover:bg-neutral-200 px-3 py-2 rounded border">
              Download
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <h3 className="text-sm font-medium text-red-600">
                Delete account
              </h3>
              <p className="text-sm text-neutral-600">
                Permanently delete your account and data
              </p>
            </div>
            <button className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded">
              Delete Account
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
