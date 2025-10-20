"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  LogOut,
  RefreshCw,
  Lock,
  Monitor,
} from "lucide-react";

interface SessionSecuritySettings {
  sessionTimeout: number; // in minutes
  requireMfaForSensitive: boolean;
  allowConcurrentSessions: boolean;
  maxConcurrentSessions: number;
  logoutOnSuspiciousActivity: boolean;
  rememberDevices: boolean;
  deviceTrustDuration: number; // in days
  geoLocationRestrictions: boolean;
  allowedCountries: string[];
}

interface SessionSecurityProps {
  className?: string;
}

export const SessionSecurity: React.FC<SessionSecurityProps> = ({
  className = "",
}) => {
  const [settings, setSettings] = useState<SessionSecuritySettings>({
    sessionTimeout: 30,
    requireMfaForSensitive: true,
    allowConcurrentSessions: true,
    maxConcurrentSessions: 5,
    logoutOnSuspiciousActivity: true,
    rememberDevices: true,
    deviceTrustDuration: 30,
    geoLocationRestrictions: false,
    allowedCountries: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/account/session-security");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load session security settings"
        );
      }

      setSettings(data.settings || settings);
    } catch (error) {
      
      
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (
    newSettings: Partial<SessionSecuritySettings>
  ) => {
    setSaving(true);
    setError(null);

    try {
      const updatedSettings = { ...settings, ...newSettings };

      const response = await fetch("/api/account/session-security", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: updatedSettings }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save settings");
      }

      setSettings(updatedSettings);
      setLastSaved(new Date());
    } catch (error) {
      
      
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (
    key: keyof SessionSecuritySettings,
    value: SessionSecuritySettings[keyof SessionSecuritySettings]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // Auto-save after a brief delay
    setTimeout(() => {
      saveSettings({ [key]: value });
    }, 500);
  };

  const terminateAllSessions = async () => {
    if (
      !confirm(
        "This will log you out of all devices and you'll need to sign in again. Continue?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/account/sessions/terminate-all", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to terminate sessions");
      }

      // Redirect to login
      window.location.href = "/login";
    } catch (error) {
      
      
      setError("Failed to terminate all sessions");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-neutral-400 mr-2" />
        <span className="text-neutral-600 dark:text-neutral-400">
          Loading session security settings...
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Session Security
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Configure advanced session security settings
          </p>
        </div>
      </div>

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
                  loadSettings();
                }}
                className="mt-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Last Saved Indicator */}
      {lastSaved && (
        <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>Settings saved at {lastSaved.toLocaleTimeString()}</span>
        </div>
      )}

      {/* Session Timeout */}
      <div className="bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h4 className="text-sm font-medium text-neutral-900 dark:text-white">
                Session Timeout
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Automatically log out after period of inactivity
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-4">
            <label className="text-sm text-neutral-700 dark:text-neutral-300">
              Timeout after:
            </label>
            <select
              value={settings.sessionTimeout}
              onChange={(e) =>
                handleSettingChange("sessionTimeout", parseInt(e.target.value))
              }
              className="px-3 py-1 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm bg-white dark:bg-neutral-700 dark:text-white"
              disabled={saving}
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={240}>4 hours</option>
              <option value={480}>8 hours</option>
              <option value={1440}>24 hours</option>
            </select>
          </div>
        </div>
      </div>

      {/* MFA Requirements */}
      <div className="bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <h4 className="text-sm font-medium text-neutral-900 dark:text-white">
                Multi-Factor Authentication
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Require additional verification for sensitive actions
              </p>
            </div>
          </div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.requireMfaForSensitive}
              onChange={(e) =>
                handleSettingChange("requireMfaForSensitive", e.target.checked)
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-neutral-300 rounded"
              disabled={saving}
            />
          </label>
        </div>

        {settings.requireMfaForSensitive && (
          <div className="pl-8 text-xs text-neutral-600 dark:text-neutral-400">
            <p>MFA will be required for:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Changing password or security settings</li>
              <li>Adding or removing payment methods</li>
              <li>Large transactions or withdrawals</li>
              <li>Accessing sensitive account information</li>
            </ul>
          </div>
        )}
      </div>

      {/* Concurrent Sessions */}
      <div className="bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Monitor className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <div>
              <h4 className="text-sm font-medium text-neutral-900 dark:text-white">
                Concurrent Sessions
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Allow signing in from multiple devices simultaneously
              </p>
            </div>
          </div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.allowConcurrentSessions}
              onChange={(e) =>
                handleSettingChange("allowConcurrentSessions", e.target.checked)
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-neutral-300 rounded"
              disabled={saving}
            />
          </label>
        </div>

        {settings.allowConcurrentSessions && (
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <label className="text-sm text-neutral-700 dark:text-neutral-300">
                Maximum concurrent sessions:
              </label>
              <select
                value={settings.maxConcurrentSessions}
                onChange={(e) =>
                  handleSettingChange(
                    "maxConcurrentSessions",
                    parseInt(e.target.value)
                  )
                }
                className="px-3 py-1 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm bg-white dark:bg-neutral-700 dark:text-white"
                disabled={saving}
              >
                <option value={1}>1 device</option>
                <option value={3}>3 devices</option>
                <option value={5}>5 devices</option>
                <option value={10}>10 devices</option>
                <option value={-1}>Unlimited</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Security Automation */}
      <div className="bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <div>
            <h4 className="text-sm font-medium text-neutral-900 dark:text-white">
              Security Automation
            </h4>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Automatically respond to security threats
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-900 dark:text-white">
                Auto-logout on suspicious activity
              </p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Automatically sign out when unusual activity is detected
              </p>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.logoutOnSuspiciousActivity}
                onChange={(e) =>
                  handleSettingChange(
                    "logoutOnSuspiciousActivity",
                    e.target.checked
                  )
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-neutral-300 rounded"
                disabled={saving}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Device Trust */}
      <div className="bg-white dark:bg-neutral-800 border dark:border-neutral-700 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <h4 className="text-sm font-medium text-neutral-900 dark:text-white">
                Device Trust
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Remember trusted devices to reduce security prompts
              </p>
            </div>
          </div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.rememberDevices}
              onChange={(e) =>
                handleSettingChange("rememberDevices", e.target.checked)
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-neutral-300 rounded"
              disabled={saving}
            />
          </label>
        </div>

        {settings.rememberDevices && (
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <label className="text-sm text-neutral-700 dark:text-neutral-300">
                Trust devices for:
              </label>
              <select
                value={settings.deviceTrustDuration}
                onChange={(e) =>
                  handleSettingChange(
                    "deviceTrustDuration",
                    parseInt(e.target.value)
                  )
                }
                className="px-3 py-1 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm bg-white dark:bg-neutral-700 dark:text-white"
                disabled={saving}
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Emergency Actions */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
          <div>
            <h4 className="text-sm font-medium text-red-900 dark:text-red-300">
              Emergency Actions
            </h4>
            <p className="text-xs text-red-700 dark:text-red-400">
              Use these if you suspect your account has been compromised
            </p>
          </div>
        </div>

        <button
          onClick={terminateAllSessions}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          Terminate All Sessions
        </button>
        <p className="text-xs text-red-700 dark:text-red-400 mt-2">
          This will log you out of all devices and require you to sign in again.
        </p>
      </div>

      {/* Save Indicator */}
      {saving && (
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600 mr-2" />
          <span className="text-sm text-blue-600 dark:text-blue-400">
            Saving settings...
          </span>
        </div>
      )}
    </div>
  );
};
