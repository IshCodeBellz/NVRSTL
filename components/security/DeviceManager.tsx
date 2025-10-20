"use client";

import { useState } from "react";
import {
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

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

interface DeviceManagerProps {
  devices: Device[];
  onRevokeDevice: (deviceId: string) => void;
  onTrustDevice: (deviceId: string, trust: boolean) => void;
  onRevokeAllOthers: () => void;
  loading?: boolean;
}

export function DeviceManager({
  devices,
  onRevokeDevice,
  onTrustDevice,
  onRevokeAllOthers,
}: DeviceManagerProps) {
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [deviceToRevoke, setDeviceToRevoke] = useState<string | null>(null);
  const { push } = useToast();

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "mobile":
        return <Smartphone className="w-5 h-5" />;
      case "tablet":
        return <Tablet className="w-5 h-5" />;
      case "desktop":
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const getRiskColor = (score?: number) => {
    if (!score) return "text-neutral-500 dark:text-neutral-400";
    if (score < 30) return "text-green-600 dark:text-green-400";
    if (score < 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getRiskLabel = (score?: number) => {
    if (!score) return "Unknown";
    if (score < 30) return "Low Risk";
    if (score < 70) return "Medium Risk";
    return "High Risk";
  };

  const handleRevokeClick = (deviceId: string) => {
    setDeviceToRevoke(deviceId);
    setShowRevokeConfirm(true);
  };

  const confirmRevoke = () => {
    if (deviceToRevoke) {
      onRevokeDevice(deviceToRevoke);
      setDeviceToRevoke(null);
      setShowRevokeConfirm(false);
      push({ message: "Device access revoked", type: "success" });
    }
  };

  const formatLastUsed = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const currentDevice = devices.find((d) => d.isCurrent);
  const otherDevices = devices.filter((d) => !d.isCurrent);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Trusted Devices
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Manage devices that have access to your account
          </p>
        </div>
        {otherDevices.length > 0 && (
          <button
            onClick={onRevokeAllOthers}
            className="px-3 py-2 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Revoke All Others
          </button>
        )}
      </div>

      {/* Current Device */}
      {currentDevice && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-green-600 dark:text-green-400 mt-1">
              {getDeviceIcon(currentDevice.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-green-900 dark:text-green-100">
                  {currentDevice.name}
                </h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Current Device
                </span>
              </div>
              <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                <div>
                  {currentDevice.browser} on {currentDevice.os}
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {currentDevice.location || currentDevice.ipAddress}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Active now
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other Devices */}
      {otherDevices.length > 0 ? (
        <div className="space-y-3">
          <h4 className="font-medium text-neutral-900 dark:text-white">
            Other Devices ({otherDevices.length})
          </h4>
          <div className="space-y-3">
            {otherDevices.map((device) => (
              <div
                key={device.id}
                className="bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="text-neutral-600 dark:text-neutral-400 mt-1">
                    {getDeviceIcon(device.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h5 className="font-medium text-neutral-900 dark:text-white">
                        {device.name}
                      </h5>
                      {device.isTrusted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                          <Shield className="w-3 h-3" />
                          Trusted
                        </span>
                      )}
                      {device.riskScore && device.riskScore > 70 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          High Risk
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                      <div>
                        {device.browser} on {device.os}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {device.location || device.ipAddress}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatLastUsed(device.lastUsed)}
                        </span>
                        {device.riskScore && (
                          <span
                            className={`flex items-center gap-1 ${getRiskColor(
                              device.riskScore
                            )}`}
                          >
                            <Shield className="w-3 h-3" />
                            {getRiskLabel(device.riskScore)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onTrustDevice(device.id, !device.isTrusted)
                      }
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        device.isTrusted
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800"
                          : "bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                      }`}
                    >
                      {device.isTrusted ? "Trusted" : "Trust"}
                    </button>

                    <button
                      onClick={() => handleRevokeClick(device.id)}
                      className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Monitor className="w-12 h-12 text-neutral-400 dark:text-neutral-500 mx-auto mb-3" />
          <h4 className="font-medium text-neutral-900 dark:text-white mb-2">
            No Other Devices
          </h4>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            You&apos;re only signed in on this device. Other devices will appear
            here when you sign in.
          </p>
        </div>
      )}

      {/* Security Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Device Security Tips:
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Only trust devices you regularly use and control</li>
          <li>• Revoke access for devices you no longer use</li>
          <li>• Be cautious of high-risk devices (public computers, etc.)</li>
          <li>• Review this list regularly for unauthorized access</li>
        </ul>
      </div>

      {/* Revoke Confirmation Modal */}
      {showRevokeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              Revoke Device Access
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              Are you sure you want to revoke access for this device? The user
              will need to sign in again.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRevokeConfirm(false)}
                className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRevoke}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Revoke Access
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
