"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save,
  RotateCcw,
  Type,
  Image as ImageIcon,
  Combine,
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import Image from "next/image";

interface LogoSettings {
  logoText?: string;
  logoImageUrl?: string;
  logoType: "text" | "image" | "combined";
  logoTextPrefix?: string;
  logoTextSuffix?: string;
  logoAccentColor?: string;
}

export function LogoManager() {
  const [settings, setSettings] = useState<LogoSettings>({
    logoText: "NVRSTL",
    logoImageUrl: "",
    logoType: "text",
    logoTextPrefix: "DY",
    logoTextSuffix: "OFFICIALETTE",
    logoAccentColor: "#DC2626",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { push } = useToast();

  const fetchLogoSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/cms/logo");
      if (!response.ok) throw new Error("Failed to fetch logo settings");

      const data = await response.json();
      setSettings(data.logoSettings);
    } catch (error) {
      
      push({ message: "Failed to load logo settings", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    fetchLogoSettings();
  }, [fetchLogoSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const response = await fetch("/api/admin/cms/logo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update logo settings");
      }

      push({ message: "Logo settings updated successfully", type: "success" });
    } catch (error) {
      
      push({
        message:
          error instanceof Error
            ? error.message
            : "Failed to save logo settings",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm("Are you sure you want to reset the logo to default settings?")
    ) {
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/admin/cms/logo", {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to reset logo settings");

      const data = await response.json();
      setSettings(data.logoSettings);
      push({ message: "Logo reset to default settings", type: "success" });
    } catch (error) {
      
      push({ message: "Failed to reset logo settings", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof LogoSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const renderPreview = () => {
    const prefixStyle = { color: "#000000" };
    const suffixStyle = { color: settings.logoAccentColor };

    return (
      <div className="bg-white dark:bg-neutral-800 border rounded-lg p-6 flex items-center justify-center min-h-[80px]">
        <div className="font-bold text-xl tracking-tight">
          {settings.logoType === "image" && settings.logoImageUrl ? (
            <Image
              src={settings.logoImageUrl}
              alt="Logo Preview"
              width={120}
              height={40}
              className="h-10 w-auto object-contain"
            />
          ) : settings.logoType === "combined" ? (
            <div className="flex items-center gap-2">
              {settings.logoImageUrl && (
                <Image
                  src={settings.logoImageUrl}
                  alt="Logo"
                  width={32}
                  height={32}
                  className="h-8 w-auto object-contain"
                />
              )}
              <div>
                <span style={prefixStyle}>{settings.logoTextPrefix}</span>
                <span style={suffixStyle}>{settings.logoTextSuffix}</span>
              </div>
            </div>
          ) : (
            <div>
              <span style={prefixStyle}>{settings.logoTextPrefix}</span>
              <span style={suffixStyle}>{settings.logoTextSuffix}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-800 border rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
            <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 border rounded-lg">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Logo Settings
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Customize your site logo and branding
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Logo Type Selection */}
        <div>
          <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-3">
            Logo Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                value: "text",
                icon: Type,
                label: "Text Only",
                description: "Use text-based logo",
              },
              {
                value: "image",
                icon: ImageIcon,
                label: "Image Only",
                description: "Use image logo",
              },
              {
                value: "combined",
                icon: Combine,
                label: "Combined",
                description: "Image + Text",
              },
            ].map(({ value, icon: Icon, label, description }) => (
              <button
                key={value}
                onClick={() =>
                  handleInputChange(
                    "logoType",
                    value as "text" | "image" | "combined"
                  )
                }
                className={`p-3 border rounded-lg text-left transition-colors ${
                  settings.logoType === value
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{label}</span>
                </div>
                <span className="text-xs text-neutral-600 dark:text-neutral-400">
                  {description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Image URL (if image or combined) */}
        {(settings.logoType === "image" ||
          settings.logoType === "combined") && (
          <div>
            <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
              Logo Image URL
            </label>
            <input
              type="url"
              value={settings.logoImageUrl || ""}
              onChange={(e) =>
                handleInputChange("logoImageUrl", e.target.value)
              }
              placeholder="https://example.com/logo.png"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-700 dark:text-white"
            />
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              Use a high-quality PNG or SVG image. Recommended size: 120x40px
            </p>
          </div>
        )}

        {/* Text Settings (if text or combined) */}
        {(settings.logoType === "text" || settings.logoType === "combined") && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  Text Prefix
                </label>
                <input
                  type="text"
                  value={settings.logoTextPrefix || ""}
                  onChange={(e) =>
                    handleInputChange("logoTextPrefix", e.target.value)
                  }
                  placeholder="DY"
                  maxLength={20}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  Text Suffix
                </label>
                <input
                  type="text"
                  value={settings.logoTextSuffix || ""}
                  onChange={(e) =>
                    handleInputChange("logoTextSuffix", e.target.value)
                  }
                  placeholder="OFFICIALETTE"
                  maxLength={30}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.logoAccentColor || "#DC2626"}
                  onChange={(e) =>
                    handleInputChange("logoAccentColor", e.target.value)
                  }
                  className="w-12 h-10 border border-neutral-300 dark:border-neutral-600 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={settings.logoAccentColor || "#DC2626"}
                  onChange={(e) =>
                    handleInputChange("logoAccentColor", e.target.value)
                  }
                  placeholder="#DC2626"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-700 dark:text-white"
                />
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                Color for the logo suffix text
              </p>
            </div>
          </>
        )}

        {/* Preview */}
        <div>
          <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-3">
            Logo Preview
          </label>
          {renderPreview()}
        </div>

        {/* Usage Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Logo Usage Tips
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>
              • Use high-resolution images for crisp display on all devices
            </li>
            <li>• SVG format is recommended for scalable logos</li>
            <li>• Keep text concise and readable at small sizes</li>
            <li>• Ensure good contrast between text and background</li>
            <li>• Test your logo on both light and dark themes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
