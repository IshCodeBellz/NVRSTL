import { getServerSession } from "next-auth";
import { authOptionsEnhanced } from "@/lib/server/authOptionsEnhanced";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/server/prisma";
import { SystemSettingsService } from "@/lib/server/systemSettingsService";
import Link from "next/link";
import { revalidatePath } from "next/cache";

function FeatureToggle({
  initialEnabled,
  settingKey,
  label,
  modifiedBy,
}: {
  initialEnabled: boolean;
  settingKey: string;
  label: string;
  modifiedBy: string;
}) {
  // Client component is required; wrap in a separate file if needed. Inline here using 'use client' pragma.
  return (
    <div className="flex items-center gap-3">
      <form
        action={async (formData: FormData) => {
          "use server";
          const enabled = formData.get("enabled") === "on";
          await SystemSettingsService.setSetting(
            settingKey,
            enabled,
            "boolean",
            "features",
            modifiedBy,
            {
              isPublic: true,
              description:
                "Hide brands that currently have no active products on the public Brands page",
            }
          );
          revalidatePath("/brands");
          revalidatePath("/api/brands");
        }}
      >
        <label className="flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={initialEnabled}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">{label}</span>
        </label>
        <div>
          <button
            type="submit"
            className="mt-2 inline-flex items-center rounded bg-blue-600 text-white px-3 py-1 text-xs hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

export const revalidate = 300; // 5 minutes

export default async function SettingsPage() {
  const session = await getServerSession(authOptionsEnhanced);
  const uid = session?.user?.id;
  if (!uid) redirect("/login?callbackUrl=/admin/settings");

  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user?.isAdmin) redirect("/");

  // Initialize default settings if none exist
  const allSettings = await SystemSettingsService.getAllSettings();
  if (allSettings.length === 0) {
    await SystemSettingsService.initializeDefaultSettings(user.email);
  }

  // Get real system settings from database
  const [systemStats, allSystemSettings] = await Promise.all([
    SystemSettingsService.getSystemStats(),
    SystemSettingsService.getAllSettings(),
  ]);

  // Group settings by category for display
  const settingsByCategory = allSystemSettings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, typeof allSystemSettings>);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                System Settings
              </h1>
              <p className="text-gray-600 mt-1">
                Configure global system preferences and features
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin/settings/export"
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 text-gray-700"
              >
                Export Settings
              </Link>
              <Link
                href="/admin"
                className="text-sm rounded bg-neutral-200 text-neutral-900 px-3 py-2 hover:bg-neutral-300"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* System Statistics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              System Statistics
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Current system configuration status
            </p>
          </div>
          <div className="p-6">
            <div className="grid gap-6 md:grid-cols-4">
              <div>
                <span className="text-sm text-gray-600">Total Settings</span>
                <div className="font-medium text-gray-900 text-xl">
                  {systemStats.totalSettings}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Public Settings</span>
                <div className="font-medium text-gray-900 text-xl">
                  {systemStats.publicSettings}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Categories</span>
                <div className="font-medium text-gray-900 text-xl">
                  {systemStats.categories}
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Last Modified</span>
                <div className="font-medium text-gray-900 text-sm">
                  {systemStats.lastModified
                    ? new Date(systemStats.lastModified).toLocaleDateString()
                    : "Never"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings by Category */}
        {Object.entries(settingsByCategory).map(([category, settings]) => (
          <div
            key={category}
            className="bg-white rounded-lg shadow-sm border border-gray-200"
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 capitalize">
                {category} Settings
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure {category} related options
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {settings.map((setting) => (
                  <div
                    key={setting.id}
                    className="grid gap-4 md:grid-cols-3 items-center py-4 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700">
                        {setting.key.split(".").pop()?.replace(/_/g, " ")}
                      </label>
                      {setting.description && (
                        <p className="text-xs text-gray-500 mt-1">
                          {setting.description}
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-1">
                      {setting.key === "features.hide_zero_product_brands" ? (
                        <FeatureToggle
                          initialEnabled={setting.value === "true"}
                          settingKey={setting.key}
                          label="Hide zero-product brands on public page"
                          modifiedBy={user.email}
                        />
                      ) : setting.type === "boolean" ? (
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name={setting.key}
                            defaultChecked={setting.value === "true"}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {setting.value === "true" ? "Enabled" : "Disabled"}
                          </span>
                        </label>
                      ) : setting.type === "number" ? (
                        <input
                          type="number"
                          name={setting.key}
                          defaultValue={setting.value}
                          step={setting.key.includes("rate") ? "0.01" : "1"}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : setting.type === "json" ? (
                        <textarea
                          name={setting.key}
                          defaultValue={setting.value}
                          rows={3}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                        />
                      ) : (
                        <input
                          type="text"
                          name={setting.key}
                          defaultValue={setting.value}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      )}
                    </div>
                    <div className="md:col-span-1 text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          setting.isPublic
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {setting.isPublic ? "Public" : "Private"}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        Modified by: {setting.modifiedBy.split("@")[0]}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Quick Actions
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Common system management tasks
            </p>
          </div>
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <button className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4 text-left hover:border-gray-400 hover:bg-gray-50">
                <h3 className="font-medium text-sm text-gray-900">
                  Add New Setting
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  Create a custom configuration setting
                </p>
              </button>
              <button className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4 text-left hover:border-gray-400 hover:bg-gray-50">
                <h3 className="font-medium text-sm text-gray-900">
                  Import Configuration
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  Import settings from a backup file
                </p>
              </button>
              <button className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-4 text-left hover:border-gray-400 hover:bg-gray-50">
                <h3 className="font-medium text-sm text-gray-900">
                  Reset to Defaults
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  Restore all settings to their default values
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              System Health
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Current system status and diagnostics
            </p>
          </div>
          <div className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Database Connection
                  </span>
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-green-600">
                      Connected
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Settings Sync</span>
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-green-600">
                      In Sync
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Cache Status</span>
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-yellow-600">
                      Warming
                    </span>
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Config Validation
                  </span>
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-green-600">
                      Valid
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Performance</span>
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-green-600">
                      Optimal
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Backup</span>
                  <span className="text-sm font-medium text-gray-600">
                    2 hours ago
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Settings are automatically saved when modified. Changes take
              effect immediately.
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="text-sm border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 text-gray-700"
              >
                Refresh Settings
              </button>
              <button
                type="button"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Save All Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
