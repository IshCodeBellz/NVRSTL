"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PageProps {
  params: { token: string };
}

export default function VerifyEmailPage({ params }: PageProps) {
  const router = useRouter();
  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "expired"
  >("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyEmail() {
      try {
        const res = await fetch("/api/auth/verify-email/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: params.token }),
        });

        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push("/login?message=email-verified");
          }, 3000);
        } else {
          if (data.error === "token_expired") {
            setStatus("expired");
          } else {
            setStatus("error");
            setError(data.error || "Verification failed");
          }
        }
      } catch (error) {
        
        setStatus("error");
        setError("Network error occurred");
      }
    }

    verifyEmail();
  }, [params.token, router]);

  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  async function resendVerification() {
    setResendLoading(true);
    setResendSuccess(false);

    try {
      const res = await fetch("/api/auth/verify-email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setResendSuccess(true);
      }
    } catch (error) {
      
      // Handle silently
    } finally {
      setResendLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900 mx-auto"></div>
          <h1 className="text-2xl font-semibold">Verifying your email</h1>
          <p className="text-neutral-600">
            Please wait while we confirm your email address...
          </p>
        </div>
      </div>
    );
  }

  if (status === "success") {
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
          <h1 className="text-2xl font-semibold">Email verified!</h1>
          <p className="text-neutral-600">
            Your email address has been successfully verified. You can now use
            all features of your account.
          </p>
          <p className="text-sm text-neutral-500">
            Redirecting to sign in page...
          </p>
          <div className="pt-4">
            <Link
              href="/login"
              className="inline-block bg-neutral-900 text-white px-6 py-2 rounded text-sm font-medium hover:bg-neutral-800"
            >
              Sign in now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="text-center space-y-4">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold">Verification link expired</h1>
          <p className="text-neutral-600">
            This email verification link has expired. We can send you a new one.
          </p>

          {resendSuccess ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-600">
              New verification email sent! Check your inbox.
            </div>
          ) : (
            <button
              onClick={resendVerification}
              disabled={resendLoading}
              className="w-full bg-neutral-900 text-white px-6 py-2 rounded text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
            >
              {resendLoading ? "Sending..." : "Send new verification email"}
            </button>
          )}

          <div className="pt-2">
            <Link
              href="/login"
              className="text-sm text-neutral-600 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error state
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
        <h1 className="text-2xl font-semibold">Verification failed</h1>
        <p className="text-neutral-600">
          We couldn&apos;t verify your email address. The link may be invalid or
          already used.
        </p>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-2 pt-4">
          {resendSuccess ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-600">
              New verification email sent! Check your inbox.
            </div>
          ) : (
            <button
              onClick={resendVerification}
              disabled={resendLoading}
              className="w-full bg-neutral-900 text-white px-6 py-2 rounded text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
            >
              {resendLoading ? "Sending..." : "Send new verification email"}
            </button>
          )}

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
