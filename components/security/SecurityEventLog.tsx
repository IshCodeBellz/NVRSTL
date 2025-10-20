"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  RefreshCw,
  Eye,
  Download,
} from "lucide-react";

interface SecurityEvent {
  id: string;
  type:
    | "LOGIN_SUCCESS"
    | "LOGIN_FAILED"
    | "PASSWORD_CHANGED"
    | "MFA_ENABLED"
    | "MFA_DISABLED"
    | "ACCOUNT_LOCKED"
    | "SUSPICIOUS_ACTIVITY"
    | "DEVICE_ADDED"
    | "DEVICE_REMOVED"
    | "PASSWORD_RESET";
  title: string;
  description: string;
  timestamp: Date;
  ipAddress: string;
  location?: string;
  userAgent?: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  riskScore: number; // 0-100
  status: "resolved" | "investigating" | "dismissed" | "active";
  metadata?: Record<string, unknown>;
}

interface SecurityEventLogProps {
  className?: string;
  maxEvents?: number;
  showFilters?: boolean;
  showExport?: boolean;
}

export const SecurityEventLog: React.FC<SecurityEventLogProps> = ({
  className = "",
  maxEvents = 50,
  showFilters = true,
  showExport = true,
}) => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(maxEvents);
  const [filters, setFilters] = useState({
    type: "all",
    riskLevel: "all",
    timeRange: "30d",
    status: "all",
  });
  const [sortBy, setSortBy] = useState<"timestamp" | "riskScore">("timestamp");
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  useEffect(() => {
    loadSecurityEvents();
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, filters, sortBy]);

  const loadSecurityEvents = async () => {
    setLoading(true);
    try {
      // TODO: Replace with real API call
      const mockEvents: SecurityEvent[] = [
        {
          id: "1",
          type: "LOGIN_SUCCESS",
          title: "Successful Login",
          description: "You signed in successfully",
          timestamp: new Date(),
          ipAddress: "192.168.1.100",
          location: "San Francisco, CA",
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          deviceType: "desktop",
          riskScore: 15,
          status: "resolved",
        },
        {
          id: "2",
          type: "PASSWORD_CHANGED",
          title: "Password Changed",
          description: "Your account password was successfully changed",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          ipAddress: "192.168.1.100",
          location: "San Francisco, CA",
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          deviceType: "desktop",
          riskScore: 25,
          status: "resolved",
        },
        {
          id: "3",
          type: "LOGIN_FAILED",
          title: "Failed Login Attempt",
          description:
            "Someone tried to access your account with incorrect credentials",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
          ipAddress: "203.0.113.1",
          location: "Unknown Location",
          userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
          deviceType: "desktop",
          riskScore: 75,
          status: "investigating",
        },
        {
          id: "4",
          type: "MFA_ENABLED",
          title: "Two-Factor Authentication Enabled",
          description:
            "Multi-factor authentication was enabled for your account",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
          ipAddress: "192.168.1.100",
          location: "San Francisco, CA",
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
          deviceType: "mobile",
          riskScore: 0,
          status: "resolved",
        },
        {
          id: "5",
          type: "SUSPICIOUS_ACTIVITY",
          title: "Suspicious Activity Detected",
          description: "Multiple failed login attempts from unusual location",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
          ipAddress: "198.51.100.1",
          location: "Unknown Location",
          userAgent: "curl/7.68.0",
          deviceType: "unknown",
          riskScore: 95,
          status: "dismissed",
          metadata: {
            attemptCount: 5,
            blockedAt: new Date(
              Date.now() - 1000 * 60 * 60 * 24 * 3 + 1000 * 60 * 10
            ),
          },
        },
      ];

      setEvents(mockEvents);
    } catch (error) {
      
      
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    let filtered = [...events];

    // Filter by type
    if (filters.type !== "all") {
      filtered = filtered.filter((event) => event.type === filters.type);
    }

    // Filter by risk level
    if (filters.riskLevel !== "all") {
      if (filters.riskLevel === "low") {
        filtered = filtered.filter((event) => event.riskScore < 30);
      } else if (filters.riskLevel === "medium") {
        filtered = filtered.filter(
          (event) => event.riskScore >= 30 && event.riskScore < 70
        );
      } else if (filters.riskLevel === "high") {
        filtered = filtered.filter((event) => event.riskScore >= 70);
      }
    }

    // Filter by time range
    const now = new Date();
    if (filters.timeRange !== "all") {
      const days = parseInt(filters.timeRange.replace("d", ""));
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((event) => event.timestamp >= cutoff);
    }

    // Filter by status
    if (filters.status !== "all") {
      filtered = filtered.filter((event) => event.status === filters.status);
    }

    // Sort
    if (sortBy === "timestamp") {
      filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } else {
      filtered.sort((a, b) => b.riskScore - a.riskScore);
    }

    // Limit results
    filtered = filtered.slice(0, displayLimit);

    setFilteredEvents(filtered);
  }, [events, filters, sortBy, displayLimit]);

  const getEventIcon = (event: SecurityEvent) => {
    switch (event.type) {
      case "LOGIN_SUCCESS":
        return (
          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
        );
      case "LOGIN_FAILED":
        return (
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
        );
      case "PASSWORD_CHANGED":
        return <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case "MFA_ENABLED":
      case "MFA_DISABLED":
        return (
          <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        );
      case "SUSPICIOUS_ACTIVITY":
        return (
          <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        );
      default:
        return (
          <Clock className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
        );
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "desktop":
        return <Monitor className="w-3 h-3" />;
      case "mobile":
        return <Smartphone className="w-3 h-3" />;
      case "tablet":
        return <Tablet className="w-3 h-3" />;
      default:
        return <Globe className="w-3 h-3" />;
    }
  };

  const getRiskBadge = (riskScore: number) => {
    if (riskScore < 30)
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    if (riskScore < 70)
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const exportLogs = () => {
    const csvContent = [
      [
        "Timestamp",
        "Type",
        "Title",
        "IP Address",
        "Location",
        "Risk Score",
        "Status",
      ].join(","),
      ...filteredEvents.map((event) =>
        [
          event.timestamp.toISOString(),
          event.type,
          `"${event.title}"`,
          event.ipAddress,
          event.location || "Unknown",
          event.riskScore,
          event.status,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-neutral-400 dark:text-neutral-500" />
        <span className="ml-2 text-neutral-600 dark:text-neutral-400">
          Loading security events...
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Security Event Log
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Monitor your account activity and security events
          </p>
        </div>
        {showExport && (
          <button
            onClick={exportLogs}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600 rounded-md transition-colors"
          >
            <Download className="w-3 h-3 mr-1" />
            Export
          </button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Event Type
            </label>
            <select
              value={filters.type}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, type: e.target.value }))
              }
              className="w-full text-xs border border-neutral-300 dark:border-neutral-600 rounded-md px-2 py-1 bg-white dark:bg-neutral-700 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="LOGIN_SUCCESS">Login Success</option>
              <option value="LOGIN_FAILED">Login Failed</option>
              <option value="PASSWORD_CHANGED">Password Changed</option>
              <option value="MFA_ENABLED">MFA Events</option>
              <option value="SUSPICIOUS_ACTIVITY">Suspicious Activity</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Risk Level
            </label>
            <select
              value={filters.riskLevel}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, riskLevel: e.target.value }))
              }
              className="w-full text-xs border border-neutral-300 dark:border-neutral-600 rounded-md px-2 py-1 bg-white dark:bg-neutral-700 dark:text-white"
            >
              <option value="all">All Levels</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Time Range
            </label>
            <select
              value={filters.timeRange}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, timeRange: e.target.value }))
              }
              className="w-full text-xs border border-neutral-300 dark:border-neutral-600 rounded-md px-2 py-1 bg-white dark:bg-neutral-700 dark:text-white"
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "timestamp" | "riskScore")
              }
              className="w-full text-xs border border-neutral-300 dark:border-neutral-600 rounded-md px-2 py-1 bg-white dark:bg-neutral-700 dark:text-white"
            >
              <option value="timestamp">Most Recent</option>
              <option value="riskScore">Highest Risk</option>
            </select>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-2">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No security events found matching your filters.</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className="border dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getEventIcon(event)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        {event.title}
                      </p>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRiskBadge(
                          event.riskScore
                        )}`}
                      >
                        Risk: {event.riskScore}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                      {event.description}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-neutral-500 dark:text-neutral-400">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(event.timestamp)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{event.location || "Unknown"}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {getDeviceIcon(event.deviceType)}
                        <span>{event.ipAddress}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setExpandedEvent(
                      expandedEvent === event.id ? null : event.id
                    )
                  }
                  className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>

              {/* Expanded Details */}
              {expandedEvent === event.id && (
                <div className="mt-4 pt-4 border-t dark:border-neutral-700 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">
                        User Agent:
                      </span>
                      <p className="text-neutral-600 dark:text-neutral-400 mt-1 break-all">
                        {event.userAgent || "Unknown"}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">
                        Status:
                      </span>
                      <p className="text-neutral-600 dark:text-neutral-400 mt-1 capitalize">
                        {event.status}
                      </p>
                    </div>
                  </div>
                  {event.metadata && (
                    <div>
                      <span className="font-medium text-neutral-700 dark:text-neutral-300 text-xs">
                        Additional Info:
                      </span>
                      <pre className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 bg-neutral-100 dark:bg-neutral-700 p-2 rounded overflow-x-auto">
                        {JSON.stringify(event.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {filteredEvents.length === displayLimit && (
        <div className="text-center pt-4">
          <button
            onClick={() => setDisplayLimit((prev: number) => prev + 25)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            Load More Events
          </button>
        </div>
      )}
    </div>
  );
};
