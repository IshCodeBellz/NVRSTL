"use client";

import { useState } from "react";
import {
  Shield,
  Copy,
  Download,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface BackupCodesDisplayProps {
  codes: string[];
  usedCodes?: string[];
  onRegenerateRequest: () => void;
  isRegenerating?: boolean;
  showTitle?: boolean;
}

export function BackupCodesDisplay({
  codes,
  usedCodes = [],
  onRegenerateRequest,
  isRegenerating = false,
  showTitle = true,
}: BackupCodesDisplayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const { push } = useToast();

  const copyAllCodes = () => {
    const codeList = codes.join("\n");
    navigator.clipboard.writeText(codeList);
    setCopied(true);
    push({ message: "All backup codes copied to clipboard", type: "success" });
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCodes = () => {
    const content = [
      "# MFA Backup Codes - DY Official",
      "# Store these codes securely. Each code can only be used once.",
      "# Generated: " + new Date().toISOString(),
      "",
      ...codes.map((code, index) => {
        const isUsed = usedCodes.includes(code);
        return `${index + 1}. ${code}${isUsed ? " (USED)" : ""}`;
      }),
      "",
      "# Important:",
      "# - Each code can only be used once",
      "# - Use these codes if you lose access to your authenticator app",
      "# - Generate new codes if you suspect they've been compromised",
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mfa-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    push({ message: "Backup codes downloaded", type: "success" });
  };

  const availableCodes = codes.filter((code) => !usedCodes.includes(code));

  return (
    <div className="bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg p-6">
      {showTitle && (
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">
              Backup Recovery Codes
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Use these codes if you lose access to your authenticator app
            </p>
          </div>
        </div>
      )}

      {/* Status Summary */}
      <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {availableCodes.length}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              Available
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-neutral-400 dark:text-neutral-500">
              {usedCodes.length}
            </div>
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              Used
            </div>
          </div>
        </div>
      </div>

      {/* Warning for low codes */}
      {availableCodes.length <= 2 && availableCodes.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Running low on backup codes
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                You only have {availableCodes.length} backup codes remaining.
                Consider generating new codes soon.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No codes warning */}
      {availableCodes.length === 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">
                No backup codes available
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                You&apos;ve used all your backup codes. Generate new ones
                immediately to maintain account security.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Visibility Toggle */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          {isVisible ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          {isVisible ? "Hide codes" : "Show codes"}
        </button>

        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          {codes.length} total codes
        </div>
      </div>

      {/* Codes Grid */}
      {isVisible && (
        <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            {codes.map((code, index) => {
              const isUsed = usedCodes.includes(code);
              return (
                <div
                  key={index}
                  className={`font-mono text-sm p-3 rounded border text-center transition-colors ${
                    isUsed
                      ? "bg-neutral-200 dark:bg-neutral-600 text-neutral-500 dark:text-neutral-400 line-through border-neutral-300 dark:border-neutral-500"
                      : "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border-neutral-300 dark:border-neutral-600"
                  }`}
                >
                  {code}
                  {isUsed && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      USED
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={copyAllCodes}
          disabled={!isVisible}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Copy className="w-4 h-4" />
          {copied ? "Copied!" : "Copy All"}
        </button>

        <button
          onClick={downloadCodes}
          className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download
        </button>

        <button
          onClick={onRegenerateRequest}
          disabled={isRegenerating}
          className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`}
          />
          {isRegenerating ? "Generating..." : "Generate New"}
        </button>
      </div>

      {/* Security Notice */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Security Guidelines:
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Each backup code can only be used once</li>
          <li>
            • Store these codes in a secure location (password manager, safe,
            etc.)
          </li>
          <li>• Don&apos;t store them in plain text on your computer</li>
          <li>
            • Generate new codes if you suspect they&apos;ve been compromised
          </li>
          <li>
            • These codes are as sensitive as your password - treat them
            carefully
          </li>
        </ul>
      </div>
    </div>
  );
}
