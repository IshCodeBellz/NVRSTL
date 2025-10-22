"use client";

import { useState, useEffect } from "react";
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  MapPin,
  Clock,
  Shield,
  AlertTriangle,
  RefreshCw,
  LogOut,
} from "lucide-react";

interface SessionDevice {
  id: string;
  name: string;
  type: "desktop" | "mobile" | "tablet" | "unknown";
  browser: string;
  os: string;
  ipAddress: string;
  location?: string;
  lastActive: Date | null;
  isCurrent: boolean;
  isActive: boolean;
  riskScore: number;
  firstSeen: Date;
}

interface SessionApiResponse {
  id: string;
  name: string;
  type: "desktop" | "mobile" | "tablet" | "unknown";
  browser: string;
  os: string;
  ipAddress: string;
  location?: string;
  lastActive: string | null;
  isCurrent: boolean;
  isActive: boolean;
  riskScore: number;
  firstSeen: string;
}

interface SessionManagerProps {
  className?: string;
  showRiskScores?: boolean;
  allowTermination?: boolean;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  className = "",
  showRiskScores = true,
  allowTermination = true,
}) => {
  const [sessions, setSessions] = useState<SessionDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminating, setTerminating] = useState<Set<string>>(new Set());
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/account/sessions");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load sessions");
      }

      // Parse dates from API response
      const parsedSessions = (data.sessions || []).map(
        (session: SessionApiResponse): SessionDevice => ({
          ...session,
          lastActive: session.lastActive ? new Date(session.lastActive) : null,
          firstSeen: session.firstSeen
            ? new Date(session.firstSeen)
            : new Date(),
        })
      );

      setSessions(parsedSessions);
    } catch {
      setError("Failed to load session information");

      // Mock data for development
      setSessions([
        {
          id: "session-1",
          name: "MacBook Pro (Chrome)",
          type: "desktop",
          browser: "Chrome 118",
          os: "macOS 14",
          ipAddress: "192.168.1.100",
          location: "San Francisco, CA",
          lastActive: new Date(),
          isCurrent: true,
          isActive: true,
          riskScore: 15,
          firstSeen: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        },
        {
          id: "session-2",
          name: "iPhone (Safari)",
          type: "mobile",
          browser: "Safari 17",
          os: "iOS 17",
          ipAddress: "192.168.1.101",
          location: "San Francisco, CA",
          lastActive: new Date(Date.now() - 1000 * 60 * 30),
          isCurrent: false,
          isActive: true,
          riskScore: 25,
          firstSeen: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        },
        {
          id: "session-3",
          name: "Unknown Device (Firefox)",
          type: "desktop",
          browser: "Firefox 119",
          os: "Windows 11",
          ipAddress: "203.0.113.1",
          location: "Unknown Location",
          lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
          isCurrent: false,
          isActive: false,
          riskScore: 75,
          firstSeen: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    if (!allowTermination) return;

    setTerminating((prev) => new Set(prev).add(sessionId));

    try {
      const response = await fetch(`/api/account/sessions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to terminate session");
      }

      // Remove session from list
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    } catch {
      setError("Failed to terminate session");
    } finally {
      setTerminating((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  };

  const terminateAllOtherSessions = async () => {
    if (!allowTermination) return;

    const otherSessions = sessions.filter((session) => !session.isCurrent);

    if (otherSessions.length === 0) return;

    setTerminating((prev) => {
      const next = new Set(prev);
      otherSessions.forEach((session) => next.add(session.id));
      return next;
    });

    try {
      const response = await fetch("/api/account/sessions/terminate-all", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to terminate sessions");
      }

      // Remove other sessions from list
      setSessions((prev) => prev.filter((session) => session.isCurrent));
    } catch {
      setError("Failed to terminate other sessions");
    } finally {
      setTerminating(new Set());
    }
  };

  const getDeviceIcon = (type: SessionDevice["type"]) => {
    switch (type) {
      case "desktop":
        return <Monitor className="w-5 h-5" />;
      case "mobile":
        return <Smartphone className="w-5 h-5" />;
      case "tablet":
        return <Tablet className="w-5 h-5" />;
      default:
        return <Globe className="w-5 h-5" />;
    }
  };

  const getRiskBadge = (riskScore: number) => {
    if (riskScore < 30)
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    if (riskScore < 70)
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  };

  const formatLastActive = (date: Date | null | undefined) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return "Unknown";
    }

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const activeSessions = sessions.filter((session) => session.isActive);
  const inactiveSessions = sessions.filter((session) => !session.isActive);
  const displaySessions = showInactive ? sessions : activeSessions;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-neutral-400 mr-2" />
        <span className="text-neutral-600 dark:text-neutral-400">
          Loading sessions...
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Active Sessions
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Manage devices connected to your account
          </p>
        </div>

        {allowTermination &&
          activeSessions.filter((s) => !s.isCurrent).length > 0 && (
            <button
              onClick={terminateAllOtherSessions}
              disabled={Array.from(terminating).some((id) =>
                activeSessions.some((s) => s.id === id && !s.isCurrent)
              )}
              className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-600 dark:border-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Terminate All Others
            </button>
          )}
      </div>

      {/* Session Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                Active
              </p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {activeSessions.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Monitor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                Desktop
              </p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {sessions.filter((s) => s.type === "desktop").length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                Mobile
              </p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {sessions.filter((s) => s.type === "mobile").length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                High Risk
              </p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                {sessions.filter((s) => s.riskScore >= 70).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toggle */}
      {inactiveSessions.length > 0 && (
        <div className="flex items-center space-x-2">
          <input
            id="show-inactive"
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-neutral-300 rounded"
          />
          <label
            htmlFor="show-inactive"
            className="text-sm text-neutral-700 dark:text-neutral-300"
          >
            Show inactive sessions ({inactiveSessions.length})
          </label>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  loadSessions();
                }}
                className="mt-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-3">
        {displaySessions.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No sessions found.</p>
          </div>
        ) : (
          displaySessions.map((session) => (
            <div
              key={session.id}
              className={`border dark:border-neutral-700 rounded-lg p-4 ${
                session.isCurrent
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  : session.isActive
                  ? "bg-white dark:bg-neutral-800"
                  : "bg-neutral-50 dark:bg-neutral-900 opacity-75"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div
                    className={`p-2 rounded-lg ${
                      session.isCurrent
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        : "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    {getDeviceIcon(session.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                        {session.name}
                      </p>
                      {session.isCurrent && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          Current
                        </span>
                      )}
                      {!session.isActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300">
                          Inactive
                        </span>
                      )}
                      {showRiskScores && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRiskBadge(
                            session.riskScore
                          )}`}
                        >
                          Risk: {session.riskScore}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Globe className="w-3 h-3" />
                          <span>
                            {session.browser} • {session.os}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{session.location || "Unknown location"}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            Last active: {formatLastActive(session.lastActive)}
                          </span>
                        </div>
                        <span>IP: {session.ipAddress}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {allowTermination && !session.isCurrent && (
                  <button
                    onClick={() => terminateSession(session.id)}
                    disabled={terminating.has(session.id)}
                    className="p-2 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Terminate session"
                  >
                    {terminating.has(session.id) ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={loadSessions}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Refresh Sessions
            </>
          )}
        </button>
      </div>
    </div>
  );
};
