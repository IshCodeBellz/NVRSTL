"use client";
export const dynamic = "force-dynamic";
import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle,
  CheckCircle,
  Info,
} from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/security/PasswordStrengthIndicator";
import { PasswordRequirements } from "@/components/security/PasswordRequirements";

// No auto sign-in; require email verification first.

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pendingVerify, setPendingVerify] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Enhanced password validation
  const validatePassword = (
    pwd: string
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (pwd.length < 8) {
      errors.push("Password must be at least 8 characters");
    }
    if (pwd.length > 128) {
      errors.push("Password must be less than 128 characters");
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (!/\d/.test(pwd)) {
      errors.push("Password must contain at least one number");
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(pwd)) {
      errors.push("Password must contain at least one special character");
    }
    if (/\s/.test(pwd)) {
      errors.push("Password cannot contain spaces");
    }
    if (/(.)\1{2,}/.test(pwd)) {
      errors.push("Password cannot have more than 2 repeating characters");
    }
    if (
      /(password|123456|qwerty|admin|letmein|welcome|monkey|dragon|abc123|111111|654321)/i.test(
        pwd
      )
    ) {
      errors.push("Password cannot contain common patterns");
    }

    return { isValid: errors.length === 0, errors };
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Enhanced validation
    if (!agreedToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy");
      return;
    }

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      return;
    }

    if (password !== password2) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.error === "email_exists") {
          setError(
            "An account with this email already exists. Please sign in instead."
          );
        } else if (data?.error === "invalid_email") {
          setError("Please enter a valid email address");
        } else if (data?.error === "weak_password") {
          setError("Password does not meet security requirements");
        } else {
          setError(data?.message || "Registration failed. Please try again.");
        }
      } else {
        if (data.status === "pending_verification") {
          setSuccess(true);
          setPendingVerify(true);
        } else {
          setSuccess(true);
        }
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full mb-4">
          <UserPlus className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">
          Create your account
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Join us and start shopping securely
        </p>
      </div>

      {/* Security Notice */}
      <div className="mb-6 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
        <div className="flex items-start space-x-2">
          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-green-800 dark:text-green-300">
            <p className="font-medium">Secure Account Creation</p>
            <p className="mt-1">
              Your account will be protected with enterprise-grade security
              features.
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
          <label
            htmlFor="name"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Full Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 px-3 py-2 text-sm bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your full name"
            disabled={loading}
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="password"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (e.target.value && !showRequirements) {
                  setShowRequirements(true);
                }
              }}
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 px-3 py-2 pr-10 text-sm bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Create a strong password"
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

        {/* Password Strength Indicator */}
        {password && (
          <PasswordStrengthIndicator
            password={password}
            showCriteria={false}
            className="mt-2"
          />
        )}

        <div className="space-y-1">
          <label
            htmlFor="password2"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="password2"
              type={showPassword2 ? "text" : "password"}
              required
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 px-3 py-2 pr-10 text-sm bg-white dark:bg-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm your password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword2(!showPassword2)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              disabled={loading}
            >
              {showPassword2 ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Password Match Indicator */}
          {password && password2 && (
            <div className="mt-1 flex items-center space-x-1">
              {password === password2 ? (
                <>
                  <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                  <span className="text-xs text-green-600 dark:text-green-400">
                    Passwords match
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
                  <span className="text-xs text-red-600 dark:text-red-400">
                    Passwords do not match
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Terms Agreement */}
        <div className="flex items-start space-x-2">
          <input
            id="terms"
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-neutral-300 rounded mt-0.5"
            disabled={loading}
          />
          <label
            htmlFor="terms"
            className="text-sm text-neutral-700 dark:text-neutral-300"
          >
            I agree to the{" "}
            <Link
              href="/terms"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Privacy Policy
            </Link>
          </label>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Success Messages */}
        {success && pendingVerify && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium">Account created successfully!</p>
                <p className="mt-1">
                  Check your email for a verification link to activate your
                  account.
                </p>
              </div>
            </div>
          </div>
        )}

        {success && !pendingVerify && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                Account created successfully!
              </p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !agreedToTerms}
          className="w-full rounded-md bg-neutral-900 dark:bg-neutral-700 text-white py-2.5 text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Creating account...
            </div>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* Password Requirements */}
      {showRequirements && password && (
        <div className="mt-6 border-t dark:border-neutral-700 pt-6">
          <PasswordRequirements
            password={password}
            variant="compact"
            showDescription={false}
          />
        </div>
      )}

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
