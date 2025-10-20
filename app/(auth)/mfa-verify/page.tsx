"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

function MFAVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const email = searchParams.get("email") || "";
  const callbackUrl = searchParams.get("callbackUrl") || "";

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return; // Prevent multiple characters

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const digits = pastedText.replace(/\D/g, "").slice(0, 6);

    if (digits.length === 6) {
      const newCode = digits.split("");
      setCode(newCode);
      inputRefs.current[5]?.focus();
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const authCode = isBackupCode ? backupCode.trim() : code.join("");

    if (
      !authCode ||
      (isBackupCode ? authCode.length < 8 : authCode.length !== 6)
    ) {
      setError(
        isBackupCode
          ? "Backup code must be at least 8 characters"
          : "Please enter a 6-digit code"
      );
      setLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email,
        mfaCode: authCode,
        isBackupCode: isBackupCode.toString(),
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "invalid_mfa_code") {
          setError(
            isBackupCode ? "Invalid backup code" : "Invalid verification code"
          );
        } else if (result.error === "backup_code_used") {
          setError("This backup code has already been used");
        } else if (result.error === "mfa_required") {
          setError("Please try again");
        } else {
          setError("Authentication failed");
        }
      } else if (result?.ok) {
        router.push(callbackUrl);
      }
    } catch {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (resendCooldown > 0) return;

    try {
      const res = await fetch("/api/auth/mfa/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setResendCooldown(60);
      } else {
        setError("Failed to resend code");
      }
    } catch {
      setError("Network error occurred");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">
            Two-Factor Authentication
          </h1>
          <p className="text-sm text-neutral-600">
            {isBackupCode
              ? "Enter one of your backup codes"
              : "Enter the 6-digit code from your authenticator app"}
          </p>
          {email && (
            <p className="text-xs text-neutral-500 mt-2">
              Signing in as: {email}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isBackupCode ? (
            <div className="flex justify-center space-x-2">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-12 text-center text-lg font-mono border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                />
              ))}
            </div>
          ) : (
            <div>
              <label htmlFor="backup-code" className="sr-only">
                Backup Code
              </label>
              <input
                id="backup-code"
                type="text"
                placeholder="Enter backup code"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={
                loading ||
                (!isBackupCode && code.join("").length !== 6) ||
                (isBackupCode && !backupCode.trim())
              }
              className="w-full bg-neutral-900 text-white py-2 px-4 rounded-md hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsBackupCode(!isBackupCode);
                setCode(["", "", "", "", "", ""]);
                setBackupCode("");
                setError(null);
              }}
              className="w-full text-sm text-blue-600 hover:text-blue-500"
            >
              {isBackupCode
                ? "Use authenticator code instead"
                : "Use backup code instead"}
            </button>
          </div>
        </form>

        <div className="text-center space-y-2">
          <button
            onClick={resendCode}
            disabled={resendCooldown > 0}
            className="text-sm text-neutral-600 hover:text-neutral-500 disabled:opacity-50"
          >
            {resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Didn't receive a code? Resend"}
          </button>

          <div>
            <Link
              href="/login"
              className="text-sm text-neutral-600 hover:text-neutral-500"
            >
              ← Back to login
            </Link>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Lost your device?</strong> Use one of your backup codes
                to sign in, then visit your security settings to reconfigure
                2FA.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MFAVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <MFAVerificationContent />
    </Suspense>
  );
}
