"use client";
export const dynamic = "force-dynamic";
import { FormEvent, useState, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Shield, AlertCircle } from "lucide-react";
import { ExtendedSession } from "@/lib/types";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { data: session } = useSession();
  const callbackUrl = search?.get("callbackUrl") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        if (res.error === "mfa_required") {
          // Redirect to MFA verification page
          const mfaUrl = `/mfa-verify?email=${encodeURIComponent(
            email
          )}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
          router.push(mfaUrl);
          return;
        } else if (
          res.error === "ACCOUNT_LOCKED" ||
          res.error === "account_locked"
        ) {
          // Redirect to reset password page when account is locked
          router.push(
            `/forgot-password?email=${encodeURIComponent(email)}&locked=true`
          );
          return;
        } else if (res.error === "ONE_ATTEMPT_LEFT") {
          setError(
            "🚨 Final Warning: You have 1 login attempt remaining before your account will be locked. Please verify your credentials carefully or use password reset."
          );
        } else if (res.error === "TWO_ATTEMPTS_LEFT") {
          setError(
            "⚠️ Warning: You have 2 login attempts remaining before your account will be locked for security reasons. Please verify your credentials carefully."
          );
        } else if (res.error === "USER_NOT_FOUND") {
          setError(
            "No account found with this email address. Please register first or check your email address."
          );
        } else if (res.error === "email_not_verified") {
          setError("Please verify your email address before signing in.");
        } else if (res.error === "invalid_credentials") {
          setError(
            "Invalid email or password. Please check your credentials and try again."
          );
        } else {
          setError("Sign in failed. Please try again.");
        }
      } else if (res?.ok) {
        // Successful login without MFA
        // Use window.location.href for immediate redirect to ensure session is properly set
        if (typeof window !== "undefined") {
          if (callbackUrl === "/" || callbackUrl.startsWith("/login")) {
            window.location.href = "/admin";
          } else {
            window.location.href = callbackUrl;
          }
        }
      }
    } catch {
      // Error logging handled by form submission, just set user-facing error
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // If already logged in and admin, auto-redirect away from login
  if ((session as ExtendedSession | null)?.user?.isAdmin) {
    if (typeof window !== "undefined") {
      const target = search?.get("callbackUrl");
      if (!target || target === "/" || target.startsWith("/login")) {
        router.replace("/admin");
      }
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full mb-4">
          <Shield className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">
          Welcome back
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Sign in to your account to continue
        </p>
      </div>

      {/* Security Notice */}
      <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
        <div className="flex items-start space-x-2">
          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium">Secure Sign In</p>
            <p className="mt-1">
              Your account is protected with advanced security features
              including two-factor authentication when enabled.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="email"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 px-3 py-2 text-sm bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email address"
            disabled={loading}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 px-3 py-2 pr-10 text-sm bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              disabled={loading}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-neutral-300 rounded"
            disabled={loading}
          />
          <label
            htmlFor="remember-me"
            className="ml-2 block text-sm text-neutral-700 dark:text-neutral-300"
          >
            Keep me signed in for 30 days
          </label>
        </div>

        {/* Error Display */}
        {error && (
          <div
            className={`p-3 rounded-md ${
              error.includes("1 login attempt remaining")
                ? "bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700"
                : error.includes("2 login attempts remaining")
                ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            }`}
          >
            <div className="flex items-start space-x-2">
              <AlertCircle
                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  error.includes("1 login attempt remaining")
                    ? "text-orange-600 dark:text-orange-400"
                    : error.includes("2 login attempts remaining")
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              />
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    error.includes("1 login attempt remaining")
                      ? "text-orange-800 dark:text-orange-300"
                      : error.includes("2 login attempts remaining")
                      ? "text-yellow-800 dark:text-yellow-300"
                      : "text-red-800 dark:text-red-300"
                  }`}
                >
                  {error}
                </p>
                {error.includes("1 login attempt remaining") && (
                  <Link
                    href={`/forgot-password?email=${encodeURIComponent(email)}`}
                    className="text-sm text-orange-700 dark:text-orange-400 hover:underline mt-2 inline-block font-medium"
                  >
                    Reset password now →
                  </Link>
                )}
                {error.includes("No account found") && (
                  <Link
                    href="/account/signup"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
                  >
                    Create an account →
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-neutral-900 dark:bg-neutral-700 text-white py-2.5 text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Signing in...
            </div>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Create account
          </Link>
        </p>
      </div>

      {/* Additional Help */}
      <div className="mt-8 text-center">
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          Need help?{" "}
          <Link
            href="/support"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
