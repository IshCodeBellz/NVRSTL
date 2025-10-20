"use client";

import { useState, useCallback } from "react";

interface CaptchaConfig {
  provider: "recaptcha" | "hcaptcha" | "turnstile" | "mock";
  siteKey: string;
  enabled: boolean;
  threshold?: number;
}

interface UseCaptchaOptions {
  endpoint?: string;
  required?: boolean;
  onVerify?: (token: string) => void;
  onError?: (error: string) => void;
}

interface CaptchaState {
  token: string | null;
  isVerified: boolean;
  isRequired: boolean;
  config: CaptchaConfig | null;
  error: string | null;
  isLoading: boolean;
}

export const useCaptcha = (options: UseCaptchaOptions = {}) => {
  const [state, setState] = useState<CaptchaState>({
    token: null,
    isVerified: false,
    isRequired: false,
    config: null,
    error: null,
    isLoading: false,
  });

  // Load CAPTCHA configuration from API
  const loadConfig = useCallback(
    async (endpoint: string = "default") => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(
          `/api/captcha/config?endpoint=${endpoint}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load CAPTCHA config");
        }

        setState((prev) => ({
          ...prev,
          config: data.config,
          isRequired: data.required || options.required || false,
          isLoading: false,
        }));

        return data.config;
      } catch (error) {
      console.error("Error:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to load CAPTCHA configuration";
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));
        options.onError?.(errorMessage);
        throw error;
      }
    },
    [options]
  );

  // Handle CAPTCHA verification
  const handleVerify = useCallback(
    async (token: string, endpoint?: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch("/api/captcha/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            endpoint: endpoint || options.endpoint || "default",
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "CAPTCHA verification failed");
        }

        setState((prev) => ({
          ...prev,
          token,
          isVerified: data.success,
          error: data.success ? null : "Verification failed",
          isLoading: false,
        }));

        if (data.success) {
          options.onVerify?.(token);
        } else {
          options.onError?.("CAPTCHA verification failed");
        }

        return data;
      } catch (error) {
      console.error("Error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Verification failed";
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
        }));
        options.onError?.(errorMessage);
        throw error;
      }
    },
    [options]
  );

  // Reset CAPTCHA state
  const reset = useCallback(() => {
    setState((prev) => ({
      ...prev,
      token: null,
      isVerified: false,
      error: null,
    }));
  }, []);

  // Check if CAPTCHA should be required based on risk assessment
  const checkRequirement = useCallback(
    async (context: {
      endpoint: string;
      riskScore?: number;
      failedAttempts?: number;
    }) => {
      try {
        const response = await fetch("/api/captcha/requirement", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(context),
        });

        const data = await response.json();

        setState((prev) => ({
          ...prev,
          isRequired: data.required,
        }));

        return data.required;
      } catch (error) {
      console.error("Error:", error);
        console.error("Failed to check CAPTCHA requirement:", error);
        return false;
      }
    },
    []
  );

  // Validate that CAPTCHA is completed when required
  const validate = useCallback(() => {
    if (state.isRequired && !state.isVerified) {
      const errorMessage = "Please complete the security verification";
      setState((prev) => ({ ...prev, error: errorMessage }));
      options.onError?.(errorMessage);
      return false;
    }
    return true;
  }, [state.isRequired, state.isVerified, options]);

  // Get CAPTCHA token for form submissions
  const getToken = useCallback(() => {
    if (!state.isRequired) {
      return null; // CAPTCHA not required
    }

    if (!state.isVerified || !state.token) {
      throw new Error("CAPTCHA verification required");
    }

    return state.token;
  }, [state.isRequired, state.isVerified, state.token]);

  return {
    // State
    token: state.token,
    isVerified: state.isVerified,
    isRequired: state.isRequired,
    config: state.config,
    error: state.error,
    isLoading: state.isLoading,

    // Actions
    loadConfig,
    handleVerify,
    reset,
    checkRequirement,
    validate,
    getToken,

    // Computed
    isReady: !state.isLoading && state.config !== null,
    canSubmit: !state.isRequired || state.isVerified,
  };
};
