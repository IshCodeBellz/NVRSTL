"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Save,
  Settings,
  FileText,
  Layout,
  Star,
  Palette,
} from "lucide-react";
import { LogoManager } from "@/components/admin/cms/LogoManager";
import Image from "next/image";

interface ContentSection {
  id?: string;
  type: string;
  title?: string;
  subtitle?: string;
  content?: unknown;
  imageUrl?: string;
  buttonText?: string;
  buttonLink?: string;
  order: number;
  isVisible?: boolean;
}

interface ContentPage {
  id?: string;
  slug: string;
  title: string;
  type: string;
  isActive?: boolean;
  sections: ContentSection[];
  createdAt?: string;
  updatedAt?: string;
}

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  heroVideoUrl?: string;
  contactEmail: string;
  socialInstagram?: string;
  socialTiktok?: string;
  freeShippingThreshold: number;
}

export default function CMSManagement() {
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({
    siteName: "",
    siteDescription: "",
    primaryColor: "#000000",
    secondaryColor: "#ffffff",
    logoUrl: "",
    contactEmail: "",
    freeShippingThreshold: 50,
  });
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<ContentPage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "pages" | "settings" | "images" | "logo"
  >("pages");
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [homeImages, setHomeImages] = useState<{
    heroImages: { left: string; right: string };
    categoryImages: Record<string, string>;
  } | null>(null);

  const showMessage = useCallback((text: string, type: "success" | "error") => {
    setMessage({ text, type });
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [pagesRes, settingsRes, imagesRes] = await Promise.all([
        fetch("/api/admin/cms/pages"),
        fetch("/api/admin/cms/settings"),
        fetch("/api/admin/cms/images"),
      ]);

      if (pagesRes.ok) {
        const pagesData = await pagesRes.json();
        setPages(pagesData.pages || []);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData.settings || {});
      }

      if (imagesRes.ok) {
        const imagesData = await imagesRes.json();
        setHomeImages(imagesData.images || null);
      }
    } catch {
      showMessage("Failed to load CMS data", "error");
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const savePage = async (page: ContentPage) => {
    try {
      const response = await fetch("/api/admin/cms/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(page),
      });

      if (response.ok) {
        const data = await response.json();
        setPages((prev) => {
          const index = prev.findIndex((p) => p.id === page.id);
          if (index >= 0) {
            return prev.map((p, i) => (i === index ? data.page : p));
          }
          return [...prev, data.page];
        });

        showMessage("Page saved successfully", "success");
        setIsDialogOpen(false);
        setEditingPage(null);
      } else {
        throw new Error("Failed to save page");
      }
    } catch {
      showMessage("Failed to save page", "error");
    }
  };

  const deletePage = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/cms/pages?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPages((prev) => prev.filter((p) => p.id !== id));
        showMessage("Page deleted successfully", "success");
      } else {
        throw new Error("Failed to delete page");
      }
    } catch {
      showMessage("Failed to delete page", "error");
    }
  };

  const saveSettings = async () => {
    try {
      const response = await fetch("/api/admin/cms/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        showMessage("Settings saved successfully", "success");
      } else {
        throw new Error("Failed to save settings");
      }
    } catch {
      showMessage("Failed to save settings", "error");
    }
  };

  const saveImages = async () => {
    try {
      const response = await fetch("/api/admin/cms/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(homeImages),
      });

      if (response.ok) {
        const data = await response.json();
        setHomeImages(data.images);
        showMessage("Images saved successfully", "success");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save images");
      }
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Failed to save images",
        "error"
      );
    }
  };

  const addSection = (type: string) => {
    if (!editingPage) return;

    const newSection: ContentSection = {
      type,
      title: "",
      subtitle: "",
      content: {},
      order: editingPage.sections.length,
      isVisible: true,
    };

    setEditingPage({
      ...editingPage,
      sections: [...editingPage.sections, newSection],
    });
  };

  const updateSection = (index: number, updates: Partial<ContentSection>) => {
    if (!editingPage) return;

    const updatedSections = editingPage.sections.map((section, i) =>
      i === index ? { ...section, ...updates } : section
    );

    setEditingPage({
      ...editingPage,
      sections: updatedSections,
    });
  };

  const removeSection = (index: number) => {
    if (!editingPage) return;

    setEditingPage({
      ...editingPage,
      sections: editingPage.sections.filter((_, i) => i !== index),
    });
  };

  const sectionTypes = [
    { value: "hero", label: "Hero Section", icon: Layout },
    { value: "features", label: "Features", icon: Star },
    { value: "reviews", label: "Reviews", icon: Star },
    { value: "cta", label: "Call to Action", icon: FileText },
    { value: "custom", label: "Custom Content", icon: FileText },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading CMS...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Content Management
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your website content and settings
              </p>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div
            className={`rounded-lg p-4 ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab("pages")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "pages"
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Pages
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "settings"
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Settings className="h-4 w-4 inline mr-2" />
                Site Settings
              </button>
              <button
                onClick={() => setActiveTab("images")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "images"
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Layout className="h-4 w-4 inline mr-2" />
                Homepage Images
              </button>
              <button
                onClick={() => setActiveTab("logo")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "logo"
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Palette className="h-4 w-4 inline mr-2" />
                Logo & Branding
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === "pages" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Content Pages
                  </h2>
                  <button
                    onClick={() => {
                      setEditingPage({
                        slug: "",
                        title: "",
                        type: "custom",
                        isActive: true,
                        sections: [],
                      });
                      setIsDialogOpen(true);
                    }}
                    className="bg-neutral-900 text-white px-4 py-2 rounded text-sm hover:bg-neutral-800 flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    New Page
                  </button>
                </div>

                <div className="space-y-4">
                  {pages.map((page) => (
                    <div
                      key={page.id}
                      className="bg-gray-50 rounded-lg border border-gray-200 p-6"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {page.title}
                          </h3>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {page.type}
                            </span>
                            <span className="text-sm text-gray-600">
                              /{page.slug}
                            </span>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                page.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {page.isActive ? "Active" : "Inactive"}
                            </span>
                            <span className="text-sm text-gray-500">
                              {page.sections?.length || 0} sections
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              window.open(`/api/content/${page.slug}`, "_blank")
                            }
                            className="p-2 text-gray-400 hover:text-gray-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingPage(page);
                              setIsDialogOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => page.id && deletePage(page.id)}
                            className="p-2 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {pages.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No pages
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by creating a new page.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Site Settings
                </h2>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Site Name
                    </label>
                    <Input
                      value={settings.siteName}
                      onChange={(e) =>
                        setSettings({ ...settings, siteName: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Email
                    </label>
                    <Input
                      value={settings.contactEmail}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          contactEmail: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Site Description
                  </label>
                  <Textarea
                    value={settings.siteDescription}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        siteDescription: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Color
                    </label>
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          primaryColor: e.target.value,
                        })
                      }
                      className="h-10 w-full rounded border border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary Color
                    </label>
                    <input
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          secondaryColor: e.target.value,
                        })
                      }
                      className="h-10 w-full rounded border border-gray-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo URL
                    </label>
                    <Input
                      value={settings.logoUrl}
                      onChange={(e) =>
                        setSettings({ ...settings, logoUrl: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Free Shipping Threshold (£)
                    </label>
                    <Input
                      type="number"
                      value={settings.freeShippingThreshold}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          freeShippingThreshold:
                            parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instagram URL
                    </label>
                    <Input
                      value={settings.socialInstagram || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          socialInstagram: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      TikTok URL
                    </label>
                    <Input
                      value={settings.socialTiktok || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          socialTiktok: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={saveSettings}
                    className="bg-neutral-900 text-white px-4 py-2 rounded text-sm hover:bg-neutral-800 flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save Settings
                  </button>
                </div>
              </div>
            )}

            {activeTab === "images" && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Homepage Images
                </h2>
                <p className="text-gray-600">
                  Manage the hero images and category background images
                  displayed on your homepage.
                </p>

                {homeImages && (
                  <>
                    {/* Hero Images Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Hero Images
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Left Hero Image URL
                          </label>
                          <Input
                            value={homeImages.heroImages.left}
                            onChange={(e) =>
                              setHomeImages({
                                ...homeImages,
                                heroImages: {
                                  ...homeImages.heroImages,
                                  left: e.target.value,
                                },
                              })
                            }
                            placeholder="https://example.com/image.jpg"
                          />
                          {homeImages.heroImages.left && (
                            <div className="mt-2">
                              <Image
                                src={homeImages.heroImages.left}
                                alt="Left hero preview"
                                width={300}
                                height={96}
                                className="w-full h-24 object-cover rounded border"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Right Hero Image URL
                          </label>
                          <Input
                            value={homeImages.heroImages.right}
                            onChange={(e) =>
                              setHomeImages({
                                ...homeImages,
                                heroImages: {
                                  ...homeImages.heroImages,
                                  right: e.target.value,
                                },
                              })
                            }
                            placeholder="https://example.com/image.jpg"
                          />
                          {homeImages.heroImages.right && (
                            <div className="mt-2">
                              <Image
                                src={homeImages.heroImages.right}
                                alt="Right hero preview"
                                width={300}
                                height={96}
                                className="w-full h-24 object-cover rounded border"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Category Images Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Category Images
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries({
                          denim: "Denim",
                          shoes: "Shoes",
                          accessories: "Accessories",
                          sportswear: "Sportswear",
                          dresses: "Dresses",
                          brands: "Brands",
                          newIn: "New In Banner",
                        }).map(([key, label]) => (
                          <div key={key}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {label} Image URL
                            </label>
                            <Input
                              value={homeImages.categoryImages[key] || ""}
                              onChange={(e) =>
                                setHomeImages({
                                  ...homeImages,
                                  categoryImages: {
                                    ...homeImages.categoryImages,
                                    [key]: e.target.value,
                                  },
                                })
                              }
                              placeholder="https://example.com/image.jpg"
                            />
                            {homeImages.categoryImages[key] && (
                              <div className="mt-2">
                                <Image
                                  src={homeImages.categoryImages[key]}
                                  alt={`${label} preview`}
                                  width={300}
                                  height={80}
                                  className="w-full h-20 object-cover rounded border"
                                  onError={(e) => {
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between">
                      <button
                        onClick={async () => {
                          if (
                            confirm(
                              "Are you sure you want to reset all images to defaults? This action cannot be undone."
                            )
                          ) {
                            try {
                              const response = await fetch(
                                "/api/admin/cms/images/reset",
                                {
                                  method: "POST",
                                }
                              );

                              if (response.ok) {
                                loadData(); // Reload all data including images
                                showMessage(
                                  "Images reset to defaults successfully",
                                  "success"
                                );
                              } else {
                                throw new Error("Failed to reset images");
                              }
                            } catch {
                              showMessage("Failed to reset images", "error");
                            }
                          }
                        }}
                        className="bg-gray-500 text-white px-4 py-2 rounded text-sm hover:bg-gray-600 flex items-center gap-2"
                      >
                        <Layout className="h-4 w-4" />
                        Reset to Defaults
                      </button>
                      <button
                        onClick={saveImages}
                        className="bg-neutral-900 text-white px-4 py-2 rounded text-sm hover:bg-neutral-800 flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save Images
                      </button>
                    </div>
                  </>
                )}

                {!homeImages && (
                  <div className="text-center py-12">
                    <Layout className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      Loading images...
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Please wait while we load the image settings.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "logo" && <LogoManager />}
          </div>
        </div>

        {/* Edit Page Modal */}
        {isDialogOpen && editingPage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingPage?.id ? "Edit Page" : "Create New Page"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Configure your page content and sections
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Page Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Page Title
                    </label>
                    <Input
                      value={editingPage.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditingPage({
                          ...editingPage,
                          title: e.target.value,
                        })
                      }
                      placeholder="Enter page title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Page Slug
                    </label>
                    <Input
                      value={editingPage.slug}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditingPage({
                          ...editingPage,
                          slug: e.target.value,
                        })
                      }
                      placeholder="Enter page slug"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Type
                  </label>
                  <select
                    value={editingPage.type}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setEditingPage({ ...editingPage, type: e.target.value })
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500"
                  >
                    <option value="landing">Landing Page</option>
                    <option value="about">About Page</option>
                    <option value="custom">Custom Page</option>
                  </select>
                </div>

                {/* Sections */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">
                      Page Sections
                    </h4>
                    <div className="flex gap-2">
                      {sectionTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.value}
                            onClick={() => addSection(type.value)}
                            className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 flex items-center gap-1"
                          >
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {editingPage.sections.map((section, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 rounded-lg border border-gray-200 p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {section.type}
                            </span>
                            <span className="text-sm text-gray-600">
                              Order: {section.order + 1}
                            </span>
                          </div>
                          <button
                            onClick={() => removeSection(index)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <Input
                              placeholder="Section title"
                              value={section.title || ""}
                              onChange={(e) =>
                                updateSection(index, {
                                  title: e.target.value,
                                })
                              }
                            />
                            <Input
                              placeholder="Section subtitle"
                              value={section.subtitle || ""}
                              onChange={(e) =>
                                updateSection(index, {
                                  subtitle: e.target.value,
                                })
                              }
                            />
                          </div>
                          <Textarea
                            placeholder="Content (JSON format for complex data)"
                            value={
                              typeof section.content === "object" &&
                              section.content !== null
                                ? JSON.stringify(section.content, null, 2)
                                : String(section.content || "")
                            }
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                updateSection(index, { content: parsed });
                              } catch {
                                updateSection(index, {
                                  content: e.target.value,
                                });
                              }
                            }}
                            rows={4}
                          />
                          <div className="grid grid-cols-3 gap-4">
                            <Input
                              placeholder="Image URL"
                              value={section.imageUrl || ""}
                              onChange={(e) =>
                                updateSection(index, {
                                  imageUrl: e.target.value,
                                })
                              }
                            />
                            <Input
                              placeholder="Button text"
                              value={section.buttonText || ""}
                              onChange={(e) =>
                                updateSection(index, {
                                  buttonText: e.target.value,
                                })
                              }
                            />
                            <Input
                              placeholder="Button link"
                              value={section.buttonLink || ""}
                              onChange={(e) =>
                                updateSection(index, {
                                  buttonLink: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingPage(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded text-sm hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => savePage(editingPage)}
                  className="bg-neutral-900 text-white px-4 py-2 rounded text-sm hover:bg-neutral-800 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Page
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
