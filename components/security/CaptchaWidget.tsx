"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, RefreshCw, Shield } from "lucide-react";

interface CaptchaProps {
  provider?: "recaptcha" | "hcaptcha" | "turnstile" | "mock";
  siteKey: string;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "invisible";
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  onExpire?: () => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

// Third-party captcha APIs - keeping as any for external library compatibility
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    grecaptcha: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hcaptcha: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    turnstile: any;
  }
}

export const CaptchaWidget: React.FC<CaptchaProps> = ({
  provider = "recaptcha",
  siteKey,
  theme = "auto",
  size = "normal",
  onVerify,
  onError,
  onExpire,
  className = "",
  disabled = false,
  required = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Determine theme based on system preference if auto
  const resolvedTheme =
    theme === "auto"
      ? typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  useEffect(() => {
    if (!siteKey) {
      setError("Site key is required");
      setIsLoading(false);
      return;
    }

    loadCaptchaScript();

    return () => {
      // Cleanup on unmount
      if (widgetIdRef.current !== null) {
        try {
          switch (provider) {
            case "recaptcha":
              if (window.grecaptcha && window.grecaptcha.reset) {
                window.grecaptcha.reset(widgetIdRef.current);
              }
              break;
            case "hcaptcha":
              if (window.hcaptcha && window.hcaptcha.remove) {
                window.hcaptcha.remove(widgetIdRef.current);
              }
              break;
            case "turnstile":
              if (window.turnstile && window.turnstile.remove) {
                window.turnstile.remove(widgetIdRef.current);
              }
              break;
          }
        } catch (error) {
          
          console.warn("Error cleaning up CAPTCHA widget:", error);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, provider]);

  const loadCaptchaScript = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (provider === "mock") {
        // Mock implementation for development
        setIsLoading(false);
        setIsReady(true);
        return;
      }

      // Check if script is already loaded
      const isAlreadyLoaded = checkIfScriptLoaded();

      if (!isAlreadyLoaded) {
        await loadScript();
      }

      // Wait for the library to be ready
      await waitForLibrary();

      // Render the widget
      renderWidget();

      setIsLoading(false);
      setIsReady(true);
    } catch (error) {
      
      
      setError("Failed to load CAPTCHA. Please refresh the page.");
      setIsLoading(false);
    }
  };

  const checkIfScriptLoaded = (): boolean => {
    switch (provider) {
      case "recaptcha":
        return !!window.grecaptcha;
      case "hcaptcha":
        return !!window.hcaptcha;
      case "turnstile":
        return !!window.turnstile;
      default:
        return false;
    }
  };

  const loadScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.async = true;
      script.defer = true;

      switch (provider) {
        case "recaptcha":
          script.src = `https://www.google.com/recaptcha/api.js?render=explicit`;
          break;
        case "hcaptcha":
          script.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
          break;
        case "turnstile":
          script.src =
            "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
          break;
        default:
          reject(new Error(`Unsupported provider: ${provider}`));
          return;
      }

      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error(`Failed to load ${provider} script`));

      document.head.appendChild(script);
    });
  };

  const waitForLibrary = (): Promise<void> => {
    return new Promise((resolve) => {
      const checkLibrary = () => {
        switch (provider) {
          case "recaptcha":
            if (window.grecaptcha && window.grecaptcha.render) {
              resolve();
            } else {
              setTimeout(checkLibrary, 100);
            }
            break;
          case "hcaptcha":
            if (window.hcaptcha && window.hcaptcha.render) {
              resolve();
            } else {
              setTimeout(checkLibrary, 100);
            }
            break;
          case "turnstile":
            if (window.turnstile && window.turnstile.render) {
              resolve();
            } else {
              setTimeout(checkLibrary, 100);
            }
            break;
          default:
            resolve();
        }
      };
      checkLibrary();
    });
  };

  const renderWidget = () => {
    if (!containerRef.current) return;

    const config = {
      sitekey: siteKey,
      theme: resolvedTheme,
      size,
      callback: (token: string) => {
        onVerify(token);
      },
      "error-callback": () => {
        const errorMsg = "CAPTCHA verification failed";
        setError(errorMsg);
        onError?.(errorMsg);
      },
      "expired-callback": () => {
        onExpire?.();
      },
    };

    try {
      switch (provider) {
        case "recaptcha":
          widgetIdRef.current = window.grecaptcha.render(
            containerRef.current,
            config
          );
          break;
        case "hcaptcha":
          widgetIdRef.current = window.hcaptcha.render(
            containerRef.current,
            config
          );
          break;
        case "turnstile":
          widgetIdRef.current = window.turnstile.render(
            containerRef.current,
            config
          );
          break;
      }
    } catch (error) {
      
      
      setError("Failed to render CAPTCHA widget");
    }
  };

  const handleReset = () => {
    if (widgetIdRef.current === null) return;

    try {
      switch (provider) {
        case "recaptcha":
          window.grecaptcha.reset(widgetIdRef.current);
          break;
        case "hcaptcha":
          window.hcaptcha.reset(widgetIdRef.current);
          break;
        case "turnstile":
          window.turnstile.reset(widgetIdRef.current);
          break;
        case "mock":
          // For mock, simulate reset
          setError(null);
          break;
      }
      setError(null);
    } catch (error) {
      
      
    }
  };

  const handleMockVerify = () => {
    if (provider === "mock") {
      const mockToken = `mock_token_${Date.now()}`;
      onVerify(mockToken);
    }
  };

  if (provider === "mock") {
    return (
      <div className={`space-y-3 ${className}`}>
        {required && (
          <div className="flex items-center space-x-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Shield className="w-4 h-4" />
            <span>Security verification required</span>
          </div>
        )}
        <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-4 text-center">
          <div className="space-y-2">
            <Shield className="w-8 h-8 mx-auto text-neutral-400" />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Mock CAPTCHA (Development Mode)
            </p>
            <button
              onClick={handleMockVerify}
              disabled={disabled}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Verify
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {required && (
        <div className="flex items-center space-x-2 text-sm text-neutral-600 dark:text-neutral-400">
          <Shield className="w-4 h-4" />
          <span>Security verification required</span>
        </div>
      )}

      <div className="captcha-container">
        {isLoading && (
          <div className="flex items-center justify-center p-6 border border-neutral-300 dark:border-neutral-600 rounded-lg">
            <RefreshCw className="w-5 h-5 animate-spin text-neutral-400 mr-2" />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Loading security verification...
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-300">
                  {error}
                </p>
                <button
                  onClick={() => {
                    setError(null);
                    loadCaptchaScript();
                  }}
                  className="mt-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className={`${isLoading || error ? "hidden" : "block"} ${
            disabled ? "opacity-50 pointer-events-none" : ""
          }`}
        />

        {isReady && !error && (
          <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
            <span>Protected by {provider}</span>
            <button
              onClick={handleReset}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
