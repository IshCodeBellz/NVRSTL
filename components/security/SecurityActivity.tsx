"use client";

import { useState, useEffect } from "react";
// Helper functions for date formatting
const formatDistanceToNow = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

const formatDateTime = (date: Date) => {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Clock,
  Monitor,
  Info,
  XCircle,
  Lock,
  Unlock,
} from "lucide-react";

interface SecurityEvent {
  id: string;
  type: string;
  displayName: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  userAgent?: string;
  location: string;
  timestamp: Date;
  severity: "low" | "medium" | "high" | "critical";
  blocked: boolean;
  resolved: boolean;
}

interface SecurityActivityProps {
  limit?: number;
}

export function SecurityActivity({ limit = 10 }: SecurityActivityProps) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSecurityEvents() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/account/security-events?limit=${limit}`
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch security events: ${response.status}`
          );
        }

        const data = await response.json();
        setEvents(
          data.events.map(
            (event: {
              id: string;
              type: string;
              displayName: string;
              details?: Record<string, unknown>;
              ipAddress: string;
              userAgent?: string;
              location: string;
              timestamp: string;
              severity: "low" | "medium" | "high" | "critical";
              blocked: boolean;
              resolved: boolean;
            }) => ({
              ...event,
              timestamp: new Date(event.timestamp),
            })
          )
        );
      } catch (err) {
        
        setError(
          err instanceof Error ? err.message : "Failed to load security events"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchSecurityEvents();
  }, [limit]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "high":
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case "medium":
        return <Shield className="w-4 h-4 text-yellow-600" />;
      case "low":
      default:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-900 bg-red-50 border-red-200";
      case "high":
        return "text-orange-900 bg-orange-50 border-orange-200";
      case "medium":
        return "text-yellow-900 bg-yellow-50 border-yellow-200";
      case "low":
      default:
        return "text-green-900 bg-green-50 border-green-200";
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes("MFA") || eventType.includes("2FA")) {
      return <Shield className="w-4 h-4" />;
    }
    if (eventType.includes("PASSWORD")) {
      return <Lock className="w-4 h-4" />;
    }
    if (eventType.includes("LOGIN")) {
      return <Unlock className="w-4 h-4" />;
    }
    if (eventType.includes("DEVICE")) {
      return <Monitor className="w-4 h-4" />;
    }
    return <Info className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Security Activity</h2>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start gap-3 p-3">
                <div className="w-4 h-4 bg-neutral-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                  <div className="h-3 bg-neutral-100 rounded w-1/2"></div>
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
        <h2 className="text-lg font-semibold mb-4">Security Activity</h2>
        <div className="text-center py-8">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600 mb-2">
            Failed to load security activity
          </p>
          <p className="text-xs text-neutral-500">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-lg border p-6">
      <h2 className="text-lg font-semibold mb-4">Recent Security Activity</h2>

      {events.length === 0 ? (
        <div className="text-center py-8 text-neutral-400">
          <Shield className="w-12 h-12 mx-auto mb-3" />
          <h3 className="font-medium text-neutral-900 mb-2">
            No Recent Activity
          </h3>
          <p className="text-sm text-neutral-600">
            Security events will appear here when you perform actions like
            enabling 2FA, changing passwords, or logging in from new devices.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {events.map((event) => (
            <div
              key={event.id}
              className={`rounded-lg border p-4 ${getSeverityColor(
                event.severity
              )}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getSeverityIcon(event.severity)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        {getEventIcon(event.type)}
                        {event.displayName}
                        {event.blocked && (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                            Blocked
                          </span>
                        )}
                      </h3>

                      <div className="mt-1 text-xs space-y-1">
                        <div className="flex items-center gap-4 text-neutral-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(event.timestamp)}
                          </span>

                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </span>
                        </div>

                        {event.ipAddress && event.ipAddress !== "Unknown" && (
                          <div className="text-neutral-500">
                            IP: {event.ipAddress}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-neutral-500 text-right">
                      {formatDateTime(event.timestamp)}
                    </div>
                  </div>

                  {event.details && Object.keys(event.details).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-neutral-600 cursor-pointer hover:text-neutral-800">
                        View details
                      </summary>
                      <div className="mt-1 text-xs bg-white/50 rounded p-2 font-mono text-neutral-700">
                        {JSON.stringify(event.details, null, 2)}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Security Tips */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          Security Monitoring
        </h4>
        <div className="text-xs text-blue-800 space-y-1">
          <p>• Review this activity regularly for any unauthorized access</p>
          <p>• Contact support immediately if you notice suspicious activity</p>
          <p>• Enable two-factor authentication for enhanced security</p>
        </div>
      </div>
    </section>
  );
}
