"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/components/providers/ToastProvider";
import {
  Loader2,
  ShieldCheck,
  Copy,
  Download,
  AlertTriangle,
} from "lucide-react";

interface MfaSetupResult {
  qrCodeUrl: string;
  secret: string;
  backupCodes: string[];
  message: string;
}

interface MfaSetupWizardProps {
  onSetupComplete: () => void;
  onCancel: () => void;
}

export function MfaSetupWizard({
  onSetupComplete,
  onCancel,
}: MfaSetupWizardProps) {
  const [step, setStep] = useState<
    "intro" | "setup" | "verify" | "backup-codes"
  >("intro");
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<MfaSetupResult | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const { push } = useToast();

  const startSetup = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/mfa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to initialize MFA setup");
      }

      const result = await response.json();
      console.log("MFA Setup Result:", result); // Debug log
      setSetupData(result.data);
      setStep("setup");
    } catch (error) {
      
      push({ message: "Failed to start MFA setup", type: "error" });
      
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      push({ message: "Please enter a valid 6-digit code", type: "error" });
      return;
    }

    setVerifying(true);
    try {
      const response = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: verificationCode,
          action: "setup",
        }),
      });

      const result = await response.json();
      console.log("MFA verification result:", result);

      if (!result.success) {
        const errorMessage = result.error || "Invalid verification code";
        
        push({
          message: `Verification failed: ${errorMessage}`,
          type: "error",
        });
        return;
      }

      push({ message: "MFA setup completed successfully!", type: "success" });
      setStep("backup-codes");
      // Notify parent component that setup is complete
      onSetupComplete();
    } catch (error) {
      
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      
      push({
        message: `Verification failed: ${errorMessage}`,
        type: "error",
      });
    } finally {
      setVerifying(false);
    }
  };

  const copyBackupCodes = () => {
    if (setupData?.backupCodes) {
      navigator.clipboard.writeText(setupData.backupCodes.join("\n"));
      push({ message: "Backup codes copied to clipboard", type: "success" });
    }
  };

  const downloadBackupCodes = () => {
    if (setupData?.backupCodes) {
      const content = [
        "# MFA Backup Codes - DY Official",
        "# Store these codes securely. Each code can only be used once.",
        "# Generated: " + new Date().toISOString(),
        "",
        ...setupData.backupCodes,
      ].join("\n");

      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mfa-backup-codes-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      push({ message: "Backup codes downloaded", type: "success" });
    }
  };

  const finishSetup = () => {
    onSetupComplete();
  };

  return (
    <div className="max-w-lg mx-auto bg-white dark:bg-neutral-800 rounded-lg border dark:border-neutral-700 p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Setup Two-Factor Authentication
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 mt-2">
          Add an extra layer of security to your account
        </p>
      </div>

      {/* Step: Introduction */}
      {step === "intro" && (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              What you&apos;ll need:
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• A smartphone or tablet</li>
              <li>
                • An authenticator app (Google Authenticator, Authy, etc.)
              </li>
              <li>• About 2-3 minutes to complete setup</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-xs font-bold text-green-700 dark:text-green-300">
                  1
                </span>
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  Scan QR Code
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Use your authenticator app to scan the QR code we&apos;ll show
                  you
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-xs font-bold text-green-700 dark:text-green-300">
                  2
                </span>
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  Enter Verification Code
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Enter the 6-digit code from your app to verify setup
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mt-0.5">
                <span className="text-xs font-bold text-green-700 dark:text-green-300">
                  3
                </span>
              </div>
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">
                  Save Backup Codes
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Store backup codes safely for account recovery
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={startSetup}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Start Setup
            </button>
          </div>
        </div>
      )}

      {/* Step: QR Code Setup */}
      {step === "setup" && setupData && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="bg-white p-6 rounded-lg border-2 border-neutral-200 dark:border-neutral-600 inline-block shadow-sm">
              <QRCodeSVG
                value={setupData.qrCodeUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
                includeMargin={true}
              />
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-3">
              Scan this QR code with your authenticator app
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
              Apps: Google Authenticator, Authy, 1Password, etc.
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Can&apos;t scan the QR code?
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Manually enter this secret key in your authenticator app:
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <code className="text-xs bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded block font-mono flex-1">
                    {setupData.secret || "Unable to extract secret"}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(setupData.secret);
                      push({
                        message: "Secret copied to clipboard",
                        type: "success",
                      });
                    }}
                    className="p-1 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
                    title="Copy secret"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("intro")}
              className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep("verify")}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step: Verify Code */}
      {step === "verify" && (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Enter the 6-digit code from your authenticator app:
            </p>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) =>
                setVerificationCode(
                  e.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
              placeholder="000000"
              className="w-32 text-center text-2xl font-mono border border-neutral-300 dark:border-neutral-600 rounded-lg px-4 py-3 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={6}
              autoComplete="off"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("setup")}
              className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={verifyCode}
              disabled={verifying || verificationCode.length !== 6}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
              Verify & Enable
            </button>
          </div>
        </div>
      )}

      {/* Step: Backup Codes */}
      {step === "backup-codes" && setupData && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
              Setup Complete!
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Save these backup codes in a secure location
            </p>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-2 text-center font-mono text-sm">
              {setupData.backupCodes.map((code, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-neutral-800 border dark:border-neutral-600 rounded px-3 py-2 text-neutral-900 dark:text-white"
                >
                  {code}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">
              Important: Store these codes safely
            </h4>
            <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
              <li>• Each code can only be used once</li>
              <li>
                • You can use them if you lose access to your authenticator app
              </li>
              <li>• Store them in a password manager or print them out</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={copyBackupCodes}
              className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Codes
            </button>
            <button
              onClick={downloadBackupCodes}
              className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>

          <button
            onClick={finishSetup}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Finish Setup
          </button>
        </div>
      )}
    </div>
  );
}
