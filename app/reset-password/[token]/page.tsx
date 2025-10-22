"use client";
export const dynamic = "force-dynamic";
import { FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PageProps {
  params: { token: string };
}

export default function ResetPasswordPage({ params }: PageProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      try {
        const res = await fetch("/api/auth/password/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: params.token, validate: true }),
        });

        setTokenValid(res.ok);
      } catch {
        setTokenValid(false);
      }
    }

    validateToken();
  }, [params.token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: params.token,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "token_expired") {
          setError(
            "This password reset link has expired. Please request a new one."
          );
        } else if (data.error === "token_invalid") {
          setError(
            "This password reset link is invalid. Please request a new one."
          );
        } else {
          setError("An error occurred. Please try again.");
        }
      } else {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login?message=password-reset-success");
        }, 3000);
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  // Loading state while validating token
  if (tokenValid === null) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Validating reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid token
  if (tokenValid === false) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold">Invalid reset link</h1>
          <p className="text-neutral-600">
            This password reset link is invalid or has expired.
          </p>
          <div className="space-y-2 pt-4">
            <Link
              href="/forgot-password"
              className="block w-full rounded bg-neutral-900 text-white py-2 text-sm font-medium hover:bg-neutral-800 text-center"
            >
              Request new reset link
            </Link>
            <Link
              href="/login"
              className="block text-sm text-neutral-600 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
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
          <h1 className="text-2xl font-semibold">Password updated!</h1>
          <p className="text-neutral-600">
            Your password has been successfully reset. You can now sign in with
            your new password.
          </p>
          <p className="text-sm text-neutral-500">
            Redirecting to sign in page...
          </p>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold mb-2">Set new password</h1>
        <p className="text-neutral-600">Enter your new password below.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">New password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            className="w-full rounded border px-3 py-2 text-sm bg-white/50 focus:outline-none focus:ring focus:ring-neutral-300"
          />
          <p className="text-xs text-neutral-500">
            Must be at least 8 characters
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Confirm new password</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded border px-3 py-2 text-sm bg-white/50 focus:outline-none focus:ring focus:ring-neutral-300"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-neutral-900 text-white py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm text-neutral-600 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
