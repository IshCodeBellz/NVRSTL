"use client";

import { useState, useEffect, useCallback } from "react";
import { Smartphone, RefreshCw, Copy, AlertCircle } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface TotpGeneratorProps {
  secret?: string;
  onCodeGenerated?: (code: string) => void;
  showInstructions?: boolean;
}

export function TotpGenerator({
  secret,
  onCodeGenerated,
  showInstructions = true,
}: TotpGeneratorProps) {
  const [currentCode, setCurrentCode] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const { push } = useToast();

  // Simulate TOTP code generation (in real implementation, this would use the speakeasy library)
  const generateTotpCode = useCallback(() => {
    if (!secret) return "";

    // This is a mock implementation for display purposes
    // In a real app, you'd need to implement TOTP on the backend
    const timestamp = Math.floor(Date.now() / 1000 / 30);
    const mockCode = String(timestamp).slice(-6).padStart(6, "0");
    return mockCode;
  }, [secret]);

  useEffect(() => {
    if (!secret) return;

    const updateCode = () => {
      const code = generateTotpCode();
      setCurrentCode(code);
      onCodeGenerated?.(code);
    };

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = 30 - (now % 30);
      setTimeRemaining(remaining);
    };

    // Initial update
    updateCode();
    updateTimer();

    // Update every second
    const interval = setInterval(() => {
      updateTimer();

      // Generate new code every 30 seconds
      if (timeRemaining === 30) {
        updateCode();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [secret, timeRemaining, onCodeGenerated, generateTotpCode]);

  const copyCode = () => {
    if (currentCode) {
      navigator.clipboard.writeText(currentCode);
      push({ message: "Code copied to clipboard", type: "success" });
    }
  };

  const refreshCode = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const code = generateTotpCode();
      setCurrentCode(code);
      onCodeGenerated?.(code);
      setIsGenerating(false);
      push({ message: "New code generated", type: "success" });
    }, 500);
  };

  if (!secret) {
    return (
      <div className="bg-neutral-50 dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg p-6 text-center">
        <Smartphone className="w-12 h-12 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
        <h3 className="font-medium text-neutral-900 dark:text-white mb-2">
          No Authenticator Configured
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Set up two-factor authentication to see generated codes here
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-neutral-900 dark:text-white">
          Authenticator Code
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshCode}
            disabled={isGenerating}
            className="p-1 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
            title="Generate new code"
          >
            <RefreshCw
              className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Code Display */}
      <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="font-mono text-2xl font-bold text-neutral-900 dark:text-white tracking-wider">
            {currentCode || "------"}
          </div>
          <div className="flex items-center gap-3">
            {/* Timer Ring */}
            <div className="relative w-8 h-8">
              <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-neutral-200 dark:text-neutral-600"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 14}`}
                  strokeDashoffset={`${
                    2 * Math.PI * 14 * (1 - timeRemaining / 30)
                  }`}
                  className={`transition-all duration-1000 ${
                    timeRemaining <= 5
                      ? "text-red-500 dark:text-red-400"
                      : "text-blue-500 dark:text-blue-400"
                  }`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={`text-xs font-medium ${
                    timeRemaining <= 5
                      ? "text-red-600 dark:text-red-400"
                      : "text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {timeRemaining}s
                </span>
              </div>
            </div>

            <button
              onClick={copyCode}
              className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-600 rounded transition-colors"
              title="Copy code"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showInstructions && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">
                How to use this code:
              </p>
              <ul className="text-blue-700 dark:text-blue-300 space-y-0.5">
                <li>• Enter this 6-digit code when prompted during login</li>
                <li>• Codes change every 30 seconds</li>
                <li>• Use your backup codes if this app is unavailable</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Status Indicators */}
      <div className="flex items-center justify-between mt-4 text-xs text-neutral-500 dark:text-neutral-400">
        <span>Last updated: {new Date().toLocaleTimeString()}</span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          Active
        </span>
      </div>
    </div>
  );
}
