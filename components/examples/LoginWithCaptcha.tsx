"use client";

import { useState } from "react";
import { CaptchaWidget, useCaptcha } from "@/components/security";

export default function LoginWithCaptchaExample() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    token: captchaToken,
    error: captchaError,
    isVerified: captchaVerified,
    isLoading: captchaLoading,
    isRequired: captchaRequired,
    handleVerify: verifyToken,
    reset: resetCaptcha,
  } = useCaptcha({
    endpoint: "/api/captcha/verify",
    required: true,
    onError: (error) => setError(`CAPTCHA error: ${error}`),
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Check if CAPTCHA is required and verified
      if (captchaRequired && !captchaVerified) {
        setError("Please complete the CAPTCHA verification");
        setLoading(false);
        return;
      }

      // Proceed with login
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          captchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Handle successful login
      window.location.href = "/dashboard";
    } catch (error) {
      
      setError(error instanceof Error ? error.message : "Login failed");
      resetCaptcha(); // Reset CAPTCHA on error
    } finally {
      setLoading(false);
    }
  };

  const handleCaptchaChange = (token: string) => {
    verifyToken(token);
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold text-center mb-6 dark:text-white">
        Sign In with CAPTCHA
      </h2>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800 dark:text-white"
            disabled={loading}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800 dark:text-white"
            disabled={loading}
          />
        </div>

        {/* CAPTCHA Widget */}
        {captchaRequired && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Security Verification
            </label>
            <CaptchaWidget
              provider="recaptcha"
              siteKey="demo-site-key"
              onVerify={handleCaptchaChange}
              onError={(error) => setError(error)}
              className="w-full"
            />
            {captchaError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {captchaError}
              </p>
            )}
            {captchaVerified && (
              <p className="text-sm text-green-600 dark:text-green-400">
                ✓ CAPTCHA verified successfully
              </p>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={
            loading || captchaLoading || (captchaRequired && !captchaVerified)
          }
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-400 text-white font-medium rounded-md transition-colors disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Signing in...
            </div>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-semibold dark:text-white">
          CAPTCHA Status
        </h3>
        <div className="text-sm space-y-1 text-neutral-600 dark:text-neutral-400">
          <p>Required: {captchaRequired ? "Yes" : "No"}</p>
          <p>Verified: {captchaVerified ? "Yes" : "No"}</p>
          <p>Loading: {captchaLoading ? "Yes" : "No"}</p>
          {captchaToken && <p>Token: {captchaToken.substring(0, 20)}...</p>}
        </div>
      </div>
    </div>
  );
}
