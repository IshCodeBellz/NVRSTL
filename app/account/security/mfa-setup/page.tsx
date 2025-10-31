"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

export default function MFASetupPage() {
  const [step, setStep] = useState<"loading" | "setup" | "verify" | "complete">(
    "loading"
  );
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function initMFASetup() {
      try {
        const res = await fetch("/api/auth/mfa/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (res.ok) {
          const json = await res.json();
          setQrCode(json.data?.qrCodeUrl || "");
          setSecret(json.data?.secret || "");
          setStep("setup");
        } else {
          setError("Failed to initialize MFA setup");
        }
      } catch {
        setError("Network error occurred");
      }
    }

    initMFASetup();
  }, []);

  async function verifyAndEnable() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verificationCode }),
      });

      const data = await res.json();

      if (res.ok) {
        setBackupCodes(data.data?.backupCodes || []);
        setStep("complete");
      } else {
        setError(
          data.error === "invalid_token"
            ? "Invalid verification code"
            : "Verification failed"
        );
      }
    } catch {
      setError("Network error occurred");
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

  if (step === "loading") {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 mx-auto"></div>
          <h1 className="text-2xl font-semibold">Setting up 2FA</h1>
          <p className="text-neutral-600">
            Preparing your authentication setup...
          </p>
        </div>
      </div>
    );
  }

  if (step === "setup") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-2">
              Set up Two-Factor Authentication
            </h1>
            <p className="text-neutral-600">
              Add an extra layer of security to your account using an
              authenticator app.
            </p>
          </div>

          <div className="bg-white rounded-lg border p-6 space-y-6">
            <div>
              <h2 className="text-lg font-medium mb-4">
                Step 1: Install an authenticator app
              </h2>
              <p className="text-sm text-neutral-600 mb-4">
                Download one of these authenticator apps on your mobile device:
              </p>
              <ul className="text-sm space-y-2">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-neutral-400 rounded-full mr-3"></span>
                  Google Authenticator (iOS/Android)
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-neutral-400 rounded-full mr-3"></span>
                  Authy (iOS/Android/Desktop)
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-neutral-400 rounded-full mr-3"></span>
                  Microsoft Authenticator (iOS/Android)
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-medium mb-4">
                Step 2: Scan the QR code
              </h2>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-shrink-0">
                  {qrCode && (
                    <div className="p-4 bg-white border rounded-lg">
                      <QRCodeSVG value={qrCode} size={192} includeMargin />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <p className="text-sm text-neutral-600">
                    Open your authenticator app and scan this QR code to add
                    your account.
                  </p>
                  <div>
                    <label className="text-sm font-medium">
                      Or enter this code manually:
                    </label>
                    <div className="mt-1 p-3 bg-neutral-100 rounded border font-mono text-sm break-all">
                      {secret}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-medium mb-4">
                Step 3: Enter verification code
              </h2>
              <p className="text-sm text-neutral-600 mb-4">
                Enter the 6-digit code from your authenticator app to verify the
                setup.
              </p>
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) =>
                      setVerificationCode(
                        e.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    className="w-32 text-center text-lg font-mono border rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-300"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={verifyAndEnable}
                    disabled={verificationCode.length !== 6 || loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Verifying..." : "Enable 2FA"}
                  </button>
                  <Link
                    href="/account/security"
                    className="bg-neutral-100 hover:bg-neutral-200 px-4 py-2 rounded text-sm border"
                  >
                    Cancel
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-green-600"
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
            <h1 className="text-2xl font-semibold mb-2">
              2FA Successfully Enabled!
            </h1>
            <p className="text-neutral-600">
              Your account is now protected with two-factor authentication.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
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
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">
                  Save your backup codes
                </h3>
                <p className="text-sm text-yellow-700 mb-4">
                  Store these backup codes in a safe place. You can use them to
                  access your account if you lose your authenticator device.
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
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/account/security"
              className="bg-neutral-900 text-white px-6 py-2 rounded text-sm font-medium hover:bg-neutral-800"
            >
              Return to Security Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
