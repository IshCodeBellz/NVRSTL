"use client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export function VerifyEmailBanner() {
  const { data: session } = useSession();
  const emailVerified = session?.user?.emailVerified;
  const userEmail = session?.user?.email;
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session || emailVerified) return null;

  async function resend() {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });
      if (res.ok) setSent(true);
      else setError("Failed to send");
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm">
      <div className="max-w-6xl mx-auto px-4 py-2 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <p>
          <strong className="mr-1">Verify your email.</strong>
          We sent a verification link to{" "}
          <span className="font-medium">{userEmail}</span>. Please verify to
          unlock all features.
        </p>
        <div className="flex gap-3 items-center">
          {sent ? (
            <span className="text-green-600 font-medium">Link sent!</span>
          ) : (
            <button
              onClick={resend}
              disabled={sending}
              className="px-3 py-1 rounded bg-amber-600 text-white text-xs font-medium hover:bg-amber-500 disabled:opacity-50"
            >
              {sending ? "Sending..." : "Resend link"}
            </button>
          )}
          <Link href="/verify-email/help" className="text-xs underline">
            Need help?
          </Link>
        </div>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
    </div>
  );
}
