"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/auth/password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      await res.json(); // Response data not currently used

      if (!res.ok) {
        if (res.status === 429) {
          setError("Too many requests. Please try again later.");
        } else {
          setError("An error occurred. Please try again.");
        }
      } else {
        setSuccess(true);
      }
    } catch (error) {
      
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

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
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="text-neutral-600">
            If an account with that email exists, we&apos;ve sent you a password
            reset link.
          </p>
          <p className="text-sm text-neutral-500">
            Check your spam folder if you don&apos;t see the email within a few
            minutes.
          </p>
          <div className="pt-4">
            <Link
              href="/login"
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold mb-2">Reset your password</h1>
        <p className="text-neutral-600">
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Email address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
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
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-neutral-600">
          Remember your password?{" "}
          <Link
            href="/login"
            className="underline font-medium text-neutral-900"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 pt-6 border-t">
        <p className="text-xs text-neutral-500 text-center">
          For security reasons, we don&apos;t reveal whether an email is
          registered.
          <br />
          If you have trouble, contact our support team.
        </p>
      </div>
    </div>
  );
}
