"use client";

import { useState, useEffect } from "react";
import {
  Monitor,
  Smartphone,
  MapPin,
  Clock,
  Shield,
  AlertTriangle,
} from "lucide-react";

interface DeviceSession {
  id: string;
  name: string;
  type: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  location: string;
  ipAddress: string;
  lastActive: Date;
  isCurrent: boolean;
  isActive: boolean;
  riskScore: number;
  firstSeen: Date;
}

export function DeviceManagement() {
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDevices() {
      try {
        setLoading(true);
        const response = await fetch("/api/account/sessions");

        if (!response.ok) {
          throw new Error(`Failed to fetch devices: ${response.status}`);
        }

        const data = await response.json();
        setDevices(
          data.sessions.map(
            (session: {
              id: string;
              lastActive: string;
              firstSeen: string;
              deviceName: string;
              ipAddress: string;
              location: string;
              isCurrentSession: boolean;
            }) => ({
              ...session,
              lastActive: new Date(session.lastActive),
              firstSeen: new Date(session.firstSeen),
            })
          )
        );
      } catch (err) {
        
        setError(err instanceof Error ? err.message : "Failed to load devices");
      } finally {
        setLoading(false);
      }
    }

    fetchDevices();
  }, []);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "mobile":
        return <Smartphone className="w-5 h-5" />;
      case "tablet":
        return <Smartphone className="w-5 h-5" />; // Using phone icon for tablet
      case "desktop":
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return "text-green-600";
    if (score < 70) return "text-yellow-600";
    return "text-red-600";
  };

  const formatLastActive = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Active Devices</h2>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse p-4 border rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-neutral-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral-200 rounded w-1/3"></div>
                  <div className="h-3 bg-neutral-100 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Active Devices</h2>
        <div className="text-center py-8">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600 mb-2">Failed to load devices</p>
          <p className="text-xs text-neutral-500">{error}</p>
        </div>
      </section>
    );
  }

  const currentDevice = devices.find((d) => d.isCurrent);
  const otherDevices = devices.filter((d) => !d.isCurrent);

  return (
    <section className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Active Devices</h2>
        <span className="text-sm text-neutral-600">
          {devices.length} device{devices.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Current Device */}
      {currentDevice && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="text-green-600 mt-1">
              {getDeviceIcon(currentDevice.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-green-900">
                  {currentDevice.name}
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                  Current Device
                </span>
              </div>
              <div className="text-sm text-green-800 space-y-1">
                <div>
                  {currentDevice.browser} on {currentDevice.os}
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {currentDevice.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Active now
                  </span>
                  <span
                    className={`flex items-center gap-1 ${getRiskColor(
                      currentDevice.riskScore
                    )}`}
                  >
                    <Shield className="w-3 h-3" />
                    Risk: {currentDevice.riskScore}
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
          <h4 className="font-medium text-neutral-900">Other Devices</h4>
          {otherDevices.map((device) => (
            <div key={device.id} className="border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-neutral-600 mt-1">
                  {getDeviceIcon(device.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-neutral-900 mb-1">
                    {device.name}
                  </h4>
                  <div className="text-sm text-neutral-600 space-y-1">
                    <div>
                      {device.browser} on {device.os}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {device.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatLastActive(device.lastActive)}
                      </span>
                      <span
                        className={`flex items-center gap-1 ${getRiskColor(
                          device.riskScore
                        )}`}
                      >
                        <Shield className="w-3 h-3" />
                        Risk: {device.riskScore}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-neutral-500">
          <Monitor className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Only signed in on this device</p>
        </div>
      )}

      {/* Security Tips */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          Device Security
        </h4>
        <div className="text-xs text-blue-800 space-y-1">
          <p>• Sign out from devices you don&apos;t recognize</p>
          <p>• Use strong, unique passwords on all devices</p>
          <p>• Keep your devices updated with latest security patches</p>
        </div>
      </div>
    </section>
  );
}
