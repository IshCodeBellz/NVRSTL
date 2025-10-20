"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  Smartphone,
  History,
  Settings,
  CheckCircle,
  AlertTriangle,
  Clock,
  MapPin,
  RefreshCw,
  Monitor,
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { MfaSetupWizard } from "./MfaSetupWizard";
import { BackupCodesDisplay } from "./BackupCodesDisplay";
import { DeviceManager } from "./DeviceManager";
import { TotpGenerator } from "./TotpGenerator";
import { SessionManager } from "./SessionManager";
import { SessionSecurity } from "./SessionSecurity";

interface SecurityEvent {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  ipAddress: string;
  location?: string;
  riskScore?: number;
}

interface MfaStatus {
  enabled: boolean;
  status: string;
  lastUsed?: Date;
  failedAttempts: number;
  backupCodesRemaining: number;
  suspended: boolean;
}

interface Device {
  id: string;
  name: string;
  type: "desktop" | "mobile" | "tablet" | "unknown";
  browser: string;
  os: string;
  ipAddress: string;
  location?: string;
  lastUsed: Date;
  isCurrent: boolean;
  isTrusted: boolean;
  riskScore?: number;
}

interface SecuritySettingsProps {
  initialMfaStatus?: {
    enabled: boolean;
    hasBackupCodes: boolean;
    trustedDevices: number;
  };
  onMfaStatusChange?: (enabled: boolean) => void;
}

export function SecuritySettings({
  initialMfaStatus,
  onMfaStatusChange,
}: SecuritySettingsProps = {}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "mfa" | "devices" | "sessions" | "activity"
  >("overview");
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [_usedBackupCodes] = useState<string[]>([]);
  const { push } = useToast();

  useEffect(() => {
    if (initialMfaStatus) {
      // Use initial MFA status if provided
      setMfaStatus({
        enabled: initialMfaStatus.enabled,
        status: initialMfaStatus.enabled ? "active" : "disabled",
        failedAttempts: 0,
        backupCodesRemaining: initialMfaStatus.hasBackupCodes ? 8 : 0,
        suspended: false,
      });
    }
    loadSecurityData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMfaStatus]);

  const loadSecurityData = useCallback(async () => {
    setLoading(true);
    try {
      // Load MFA status
      const mfaResponse = await fetch("/api/auth/mfa/setup");
      if (mfaResponse.ok) {
        const mfaData = await mfaResponse.json();
        console.log("MFA response data:", mfaData);
        setMfaStatus(mfaData.data); // Changed from mfaData.status to mfaData.data
      }

      // Load real active sessions as devices
      const sessionsRes = await fetch("/api/account/sessions");
      if (sessionsRes.ok) {
        const { sessions } = await sessionsRes.json();
        /* eslint-disable-next-line */
        const mappedDevices: Device[] = (sessions || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          type: s.type || "desktop",
          browser: s.browser,
          os: s.os,
          ipAddress: s.ipAddress,
          location: s.location,
          lastUsed: new Date(s.lastActive || s.updatedAt || Date.now()),
          isCurrent: !!s.isCurrent,
          // Use server-provided trusted flag derived from TrustedDevice records
          isTrusted: !!s.isTrusted,
          riskScore: typeof s.riskScore === "number" ? s.riskScore : undefined,
        }));
        setDevices(mappedDevices);
      }

      // Load recent security events for Activity tab
      const eventsRes = await fetch("/api/account/security-events?limit=20");
      if (eventsRes.ok) {
        const { events } = await eventsRes.json();
        /* eslint-disable-next-line */
        const mappedEvents: SecurityEvent[] = (events || []).map((e: any) => ({
          id: e.id,
          type: e.type || e.eventType,
          description: e.displayName || e.details?.description || e.type,
          timestamp: new Date(e.timestamp),
          ipAddress: e.ipAddress || "Unknown",
          location: e.location,
          riskScore: typeof e.riskScore === "number" ? e.riskScore : undefined,
        }));
        setSecurityEvents(mappedEvents);
      }
    } catch (error) {
      push({ message: "Failed to load security settings", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [push]);

  const handleMfaSetupComplete = () => {
    setShowMfaSetup(false);
    setActiveTab("mfa"); // Switch to MFA tab to show the setup result
    loadSecurityData();
    onMfaStatusChange?.(true); // Notify parent component
    push({
      message: "Two-factor authentication has been enabled!",
      type: "success",
    });
  };

  const handleDisableMfa = async () => {
    if (
      !confirm(
        "Are you sure you want to disable two-factor authentication? This will make your account less secure."
      )
    ) {
      return;
    }

    try {
      const code = prompt("Enter your current authenticator code to confirm:");
      if (!code) return;

      const response = await fetch("/api/auth/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmationToken: code,
          reason: "User requested disable",
        }),
      });

      if (response.ok) {
        onMfaStatusChange?.(false); // Notify parent component
        push({
          message: "Two-factor authentication disabled",
          type: "success",
        });
        loadSecurityData();
      } else {
        const error = await response.json();
        push({
          message: error.error || "Failed to disable MFA",
          type: "error",
        });
      }
    } catch (error) {
      push({
        message: "Failed to disable two-factor authentication",
        type: "error",
      });
    }
  };

  const handleRegenerateBackupCodes = async () => {
    try {
      const code = prompt(
        "Enter your current authenticator code to generate new backup codes:"
      );
      if (!code) return;

      const response = await fetch("/api/auth/mfa/backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationToken: code }),
      });

      if (response.ok) {
        const result = await response.json();
        const codes = result?.data?.backupCodes || result?.backupCodes || [];
        setBackupCodes(codes);
        push({ message: "New backup codes generated", type: "success" });
      } else {
        const error = await response.json();
        push({
          message: error.error || "Failed to generate backup codes",
          type: "error",
        });
      }
    } catch (error) {
      push({ message: "Failed to generate backup codes", type: "error" });
    }
  };

  const getOverviewStats = () => {
    const stats = {
      securityScore: 85,
      mfaEnabled: mfaStatus?.enabled || false,
      trustedDevices: devices.filter((d) => d.isTrusted).length,
      recentEvents: securityEvents.length,
      riskLevel: "Low",
    };

    return stats;
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: Shield },
    { id: "mfa", label: "Two-Factor Auth", icon: Smartphone },
    { id: "devices", label: "Devices", icon: Settings },
    { id: "sessions", label: "Sessions", icon: Monitor },
    { id: "activity", label: "Activity", icon: History },
  ];

  const stats = getOverviewStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-neutral-400 dark:text-neutral-500" />
        <span className="ml-2 text-neutral-600 dark:text-neutral-400">
          Loading security settings...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b dark:border-neutral-700 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div></div>
          <Link
            href="/account"
            className="text-sm rounded bg-neutral-200 text-neutral-900 px-3 py-2 hover:bg-neutral-300"
          >
            Back to Account
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Security Settings
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
          Manage your account security and privacy settings
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b dark:border-neutral-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() =>
                  setActiveTab(
                    tab.id as
                      | "overview"
                      | "mfa"
                      | "devices"
                      | "sessions"
                      | "activity"
                  )
                }
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-6">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Security Score
                    </p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                      {stats.securityScore}%
                    </p>
                  </div>
                  <Shield className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Two-Factor Auth
                    </p>
                    <p className="text-lg font-semibold text-neutral-900 dark:text-white">
                      {stats.mfaEnabled ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                  {stats.mfaEnabled ? (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Trusted Devices
                    </p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                      {stats.trustedDevices}
                    </p>
                  </div>
                  <Settings className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Risk Level
                    </p>
                    <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                      {stats.riskLevel}
                    </p>
                  </div>
                  <Shield className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-neutral-800 rounded-lg border dark:border-neutral-700 p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!stats.mfaEnabled && (
                  <button
                    onClick={() => setShowMfaSetup(true)}
                    className="flex items-center gap-3 p-4 border dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-left"
                  >
                    <Smartphone className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-white">
                        Enable Two-Factor Auth
                      </div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        Add extra security to your account
                      </div>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab("devices")}
                  className="flex items-center gap-3 p-4 border dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-left"
                >
                  <Settings className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="font-medium text-neutral-900 dark:text-white">
                      Manage Devices
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                      Review trusted devices
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MFA Tab */}
        {activeTab === "mfa" && (
          <div className="space-y-6">
            {mfaStatus?.enabled ? (
              <div className="space-y-6">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-green-900 dark:text-green-100">
                        Two-Factor Authentication Enabled
                      </h3>
                      <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                        Your account is protected with two-factor
                        authentication.
                        {mfaStatus.lastUsed &&
                          ` Last used: ${new Date(
                            mfaStatus.lastUsed
                          ).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                </div>

                <TotpGenerator />

                {backupCodes.length > 0 && (
                  <BackupCodesDisplay
                    codes={backupCodes}
                    usedCodes={_usedBackupCodes}
                    onRegenerateRequest={handleRegenerateBackupCodes}
                  />
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleRegenerateBackupCodes}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Backup Codes
                  </button>
                  <button
                    onClick={handleDisableMfa}
                    className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Disable 2FA
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Smartphone className="w-16 h-16 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                  Two-Factor Authentication Disabled
                </h3>
                <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                  Add an extra layer of security to your account with two-factor
                  authentication.
                </p>
                <button
                  onClick={() => setShowMfaSetup(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Enable Two-Factor Authentication
                </button>
              </div>
            )}
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === "devices" && (
          <DeviceManager
            devices={devices}
            onRevokeDevice={async (deviceId) => {
              // Only send sessionId; server will derive fingerprint
              await fetch("/api/account/trusted-devices", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: deviceId }),
              }).catch(() => undefined);
              setDevices((prev) => prev.filter((d) => d.id !== deviceId));
            }}
            onTrustDevice={async (deviceId, trust) => {
              const res = await fetch("/api/account/trusted-devices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: deviceId, trust }),
              }).catch(() => undefined);
              if (res && res.ok) {
                setDevices((prev) =>
                  prev.map((d) =>
                    d.id === deviceId ? { ...d, isTrusted: trust } : d
                  )
                );
              }
            }}
            onRevokeAllOthers={async () => {
              const current = devices.find((d) => d.isCurrent);
              const others = devices.filter((d) => !d.isCurrent);
              // Attempt to untrust others in parallel
              await Promise.all(
                others.map((d) =>
                  fetch("/api/account/trusted-devices", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId: d.id }),
                  }).catch(() => undefined)
                )
              );
              setDevices(current ? [current] : []);
            }}
          />
        )}

        {/* Sessions Tab */}
        {activeTab === "sessions" && (
          <div className="space-y-6">
            <SessionManager />
            <SessionSecurity />
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-neutral-800 rounded-lg border dark:border-neutral-700">
              <div className="p-4 border-b dark:border-neutral-700">
                <h3 className="font-semibold text-neutral-900 dark:text-white">
                  Recent Activity
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Security events for your account
                </p>
              </div>
              <div className="divide-y dark:divide-neutral-700">
                {securityEvents.map((event) => (
                  <div key={event.id} className="p-4 flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mt-1">
                      <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-neutral-900 dark:text-white">
                          {event.description}
                        </h4>
                        {event.riskScore && event.riskScore > 70 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            High Risk
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {event.timestamp.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.location || event.ipAddress}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MFA Setup Modal - Available from any tab */}
      {showMfaSetup && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowMfaSetup(false);
            }
          }}
        >
          <div className="bg-white dark:bg-neutral-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <MfaSetupWizard
              onSetupComplete={handleMfaSetupComplete}
              onCancel={() => setShowMfaSetup(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
