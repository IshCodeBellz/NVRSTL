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
  Grid,
} from "lucide-react";
import { LogoManager } from "@/components/admin/cms/LogoManager";
import { CategorySectionData, CategoryCardData } from "@/lib/server/cmsService";
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

export function CMSManagement() {
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
    | "pages"
    | "settings"
    | "images"
    | "logo"
    | "sections"
    | "shop"
    | "shop-categories"
  >("pages");
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [homeImages, setHomeImages] = useState<{
    heroImages: { left: string; right: string };
    heroLayout: "two-image" | "single-image";
    leagueTitle?: string;
  } | null>(null);
  const [categorySections, setCategorySections] = useState<
    CategorySectionData[]
  >([]);
  const [shopPages, setShopPages] = useState<ContentPage[]>([]);
  const [editingSection, setEditingSection] =
    useState<Partial<CategorySectionData> | null>(null);
  const [editingCard, setEditingCard] =
    useState<Partial<CategoryCardData> | null>(null);
  const [shopCategories, setShopCategories] = useState<any[]>([]);
  const [editingShopCategory, setEditingShopCategory] = useState<any | null>(
    null
  );
  const [editingSubcategory, setEditingSubcategory] = useState<any | null>(
    null
  );
  const [editingTeam, setEditingTeam] = useState<any | null>(null);

  const showMessage = useCallback((text: string, type: "success" | "error") => {
    setMessage({ text, type });
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [
        pagesRes,
        settingsRes,
        imagesRes,
        sectionsRes,
        shopPagesRes,
        shopCategoriesRes,
      ] = await Promise.all([
        fetch("/api/admin/cms/pages", { credentials: "include" }),
        fetch("/api/admin/cms/settings", { credentials: "include" }),
        fetch("/api/admin/cms/images", { credentials: "include" }),
        fetch("/api/admin/cms/sections", { credentials: "include" }),
        fetch("/api/admin/cms/shop-pages", { credentials: "include" }),
        fetch("/api/admin/cms/shop-categories", { credentials: "include" }),
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
        // Transform the API response to frontend format
        if (imagesData.images) {
          setHomeImages({
            heroImages: {
              left: imagesData.images.heroImages.left,
              right: imagesData.images.heroImages.right,
            },
            heroLayout: imagesData.images.heroLayout,
            leagueTitle: imagesData.images.leagueTitle,
          });
        }
      }

      if (sectionsRes.ok) {
        const sectionsData = await sectionsRes.json();
        setCategorySections(sectionsData.sections || []);
      }

      if (shopPagesRes.ok) {
        const shopPagesData = await shopPagesRes.json();
        setShopPages(shopPagesData.pages || []);
      }

      if (shopCategoriesRes.ok) {
        const shopCategoriesData = await shopCategoriesRes.json();
        setShopCategories(shopCategoriesData.categories || []);
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
      const method = page.id ? "PUT" : "POST";
      const url = page.id
        ? `/api/test-shop-pages/${page.id}`
        : "/api/test-shop-pages";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(page),
      });

      if (response.ok) {
        const data = await response.json();
        setShopPages((prev) => {
          const index = prev.findIndex((p) => p.id === page.id);
          if (index >= 0) {
            return prev.map((p, i) => (i === index ? data.page : p));
          }
          return [...prev, data.page];
        });

        showMessage("Page saved successfully", "success");
        setIsDialogOpen(false);
        setEditingPage(null);

        // Refresh the shop page if it's currently open
        if (typeof window !== "undefined" && (window as any).refreshShopPage) {
          (window as any).refreshShopPage();
        }
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
        credentials: "include",
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
        credentials: "include",
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
      // Transform the data to match API expectations
      const apiData = {
        heroImageLeft: homeImages?.heroImages?.left,
        heroImageRight: homeImages?.heroImages?.right,
        heroLayout: homeImages?.heroLayout,
        leagueTitle: homeImages?.leagueTitle,
      };

      const response = await fetch("/api/admin/cms/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Include cookies for authentication
        body: JSON.stringify(apiData),
      });

      if (response.ok) {
        const data = await response.json();
        // Transform the API response back to frontend format
        setHomeImages({
          heroImages: {
            left: data.images.heroImages.left,
            right: data.images.heroImages.right,
          },
          heroLayout: data.images.heroLayout,
          leagueTitle: data.images.leagueTitle,
        });
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
    { value: "card", label: "Card", icon: Grid },
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
            <nav className="flex flex-wrap gap-2 sm:gap-8 px-2 sm:px-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab("pages")}
                className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === "pages"
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                Pages
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === "settings"
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                Site Settings
              </button>
              <button
                onClick={() => setActiveTab("images")}
                className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === "images"
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Layout className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                Homepage Images
              </button>
              <button
                onClick={() => setActiveTab("logo")}
                className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === "logo"
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Palette className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                Logo & Branding
              </button>
              <button
                onClick={() => setActiveTab("sections")}
                className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === "sections"
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Grid className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                Category Sections
              </button>
              <button
                onClick={() => setActiveTab("shop")}
                className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === "shop"
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                Shop Pages
              </button>
              <button
                onClick={() => setActiveTab("shop-categories")}
                className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === "shop-categories"
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Grid className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                Shop Categories
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

                      {/* Hero Layout Toggle */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Hero Layout
                        </label>
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="heroLayout"
                              value="two-image"
                              checked={homeImages.heroLayout === "two-image"}
                              onChange={(e) =>
                                setHomeImages({
                                  ...homeImages,
                                  heroLayout: e.target.value as
                                    | "two-image"
                                    | "single-image",
                                })
                              }
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">
                              Two Images (Left & Right)
                            </span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="heroLayout"
                              value="single-image"
                              checked={homeImages.heroLayout === "single-image"}
                              onChange={(e) =>
                                setHomeImages({
                                  ...homeImages,
                                  heroLayout: e.target.value as
                                    | "two-image"
                                    | "single-image",
                                })
                              }
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700">
                              Single Image (Full Width)
                            </span>
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">
                          Choose how the hero images are displayed on the
                          homepage
                        </p>
                      </div>

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
                        {homeImages.heroLayout === "two-image" && (
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
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* League Title Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        League Section Title
                      </h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          League Title
                        </label>
                        <Input
                          value={homeImages.leagueTitle || "League"}
                          onChange={(e) =>
                            setHomeImages({
                              ...homeImages,
                              leagueTitle: e.target.value,
                            })
                          }
                          placeholder="Enter league title"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          This title will appear above the category grid on the
                          homepage
                        </p>
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

            {activeTab === "shop" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900">
                      Shop Pages Management
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Manage the main shop page and individual shop category
                      pages
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Main Shop Page */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Settings className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Main Shop</h4>
                        <p className="text-sm text-gray-500">/shop</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Edit the main shop page content and layout
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const existingPage = shopPages.find(
                            (p) => p.slug === "shop"
                          );
                          setEditingPage(
                            existingPage || {
                              slug: "shop",
                              title: "Shop",
                              type: "shop",
                              isActive: true,
                              sections: [],
                            }
                          );
                          setIsDialogOpen(true);
                        }}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        {shopPages.find((p) => p.slug === "shop")
                          ? "Edit"
                          : "Create"}{" "}
                        Shop Page
                      </button>
                      {shopPages.find((p) => p.slug === "shop") && (
                        <button
                          onClick={() => window.open("/shop", "_blank")}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="View page"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Football Page */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg">⚽</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Football</h4>
                        <p className="text-sm text-gray-500">/shop/football</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Edit football category page content
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const existingPage = shopPages.find(
                            (p) => p.slug === "shop/football"
                          );
                          setEditingPage(
                            existingPage || {
                              slug: "shop/football",
                              title: "Football",
                              type: "shop-category",
                              isActive: true,
                              sections: [],
                            }
                          );
                          setIsDialogOpen(true);
                        }}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        {shopPages.find((p) => p.slug === "shop/football")
                          ? "Edit"
                          : "Create"}{" "}
                        Football Page
                      </button>
                      {shopPages.find((p) => p.slug === "shop/football") && (
                        <button
                          onClick={() =>
                            window.open("/shop/football", "_blank")
                          }
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="View page"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* International Page */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg">🌍</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          International
                        </h4>
                        <p className="text-sm text-gray-500">
                          /shop/international
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Edit international category page content
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const existingPage = shopPages.find(
                            (p) => p.slug === "shop/international"
                          );
                          setEditingPage(
                            existingPage || {
                              slug: "shop/international",
                              title: "International",
                              type: "shop-category",
                              isActive: true,
                              sections: [],
                            }
                          );
                          setIsDialogOpen(true);
                        }}
                        className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                      >
                        {shopPages.find((p) => p.slug === "shop/international")
                          ? "Edit"
                          : "Create"}{" "}
                        International Page
                      </button>
                      {shopPages.find(
                        (p) => p.slug === "shop/international"
                      ) && (
                        <button
                          onClick={() =>
                            window.open("/shop/international", "_blank")
                          }
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="View page"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* NBA Page */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg">🏀</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">NBA</h4>
                        <p className="text-sm text-gray-500">/shop/nba</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Edit NBA category page content
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const existingPage = shopPages.find(
                            (p) => p.slug === "shop/nba"
                          );
                          setEditingPage(
                            existingPage || {
                              slug: "shop/nba",
                              title: "NBA",
                              type: "shop-category",
                              isActive: true,
                              sections: [],
                            }
                          );
                          setIsDialogOpen(true);
                        }}
                        className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                      >
                        {shopPages.find((p) => p.slug === "shop/nba")
                          ? "Edit"
                          : "Create"}{" "}
                        NBA Page
                      </button>
                      {shopPages.find((p) => p.slug === "shop/nba") && (
                        <button
                          onClick={() => window.open("/shop/nba", "_blank")}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="View page"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* NFL Page */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg">🏈</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">NFL</h4>
                        <p className="text-sm text-gray-500">/shop/nfl</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Edit NFL category page content
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const existingPage = shopPages.find(
                            (p) => p.slug === "shop/nfl"
                          );
                          setEditingPage(
                            existingPage || {
                              slug: "shop/nfl",
                              title: "NFL",
                              type: "shop-category",
                              isActive: true,
                              sections: [],
                            }
                          );
                          setIsDialogOpen(true);
                        }}
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        {shopPages.find((p) => p.slug === "shop/nfl")
                          ? "Edit"
                          : "Create"}{" "}
                        NFL Page
                      </button>
                      {shopPages.find((p) => p.slug === "shop/nfl") && (
                        <button
                          onClick={() => window.open("/shop/nfl", "_blank")}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="View page"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Custom Page */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg">👕</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Custom</h4>
                        <p className="text-sm text-gray-500">/shop/custom</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Edit custom category page content
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const existingPage = shopPages.find(
                            (p) => p.slug === "shop/custom"
                          );
                          setEditingPage(
                            existingPage || {
                              slug: "shop/custom",
                              title: "Custom",
                              type: "shop-category",
                              isActive: true,
                              sections: [],
                            }
                          );
                          setIsDialogOpen(true);
                        }}
                        className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                      >
                        {shopPages.find((p) => p.slug === "shop/custom")
                          ? "Edit"
                          : "Create"}{" "}
                        Custom Page
                      </button>
                      {shopPages.find((p) => p.slug === "shop/custom") && (
                        <button
                          onClick={() => window.open("/shop/custom", "_blank")}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="View page"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "shop-categories" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900">
                      Shop Categories Management
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Manage shop categories, leagues, and teams for the shop
                      pages
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingShopCategory({
                        slug: "",
                        name: "",
                        description: "",
                        imageUrl: "",
                        displayOrder: 0,
                        isActive: true,
                      });
                      setIsDialogOpen(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Category
                  </button>
                </div>

                <div className="space-y-4">
                  {shopCategories.map((category) => (
                    <div
                      key={category.id}
                      className="bg-white rounded-lg border border-gray-200 p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {category.imageUrl && (
                            <Image
                              src={category.imageUrl}
                              alt={category.name}
                              width={48}
                              height={48}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {category.name}
                            </h4>
                            <p className="text-sm text-gray-500">
                              /{category.slug}
                            </p>
                            {category.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {category.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingShopCategory(category);
                              setIsDialogOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600"
                            title="Edit category"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Are you sure you want to delete "${category.name}"?`
                                )
                              ) {
                                // TODO: Implement delete functionality
                                showMessage(
                                  "Delete functionality not implemented yet",
                                  "error"
                                );
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-red-600"
                            title="Delete category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Subcategories */}
                      <div className="ml-4 border-l-2 border-gray-200 pl-4">
                        {category.subcategories &&
                        category.subcategories.length > 0 ? (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="text-sm font-medium text-gray-700">
                                Leagues:
                              </h5>
                              <button
                                onClick={() => {
                                  setEditingSubcategory({
                                    categoryId: category.id,
                                    slug: "",
                                    name: "",
                                    description: "",
                                    imageUrl: "",
                                    displayOrder:
                                      category.subcategories?.length || 0,
                                    isActive: true,
                                  });
                                  setIsDialogOpen(true);
                                }}
                                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                                title="Add new league"
                              >
                                <Plus className="w-3 h-3" />
                                Add League
                              </button>
                            </div>
                            <div className="space-y-2">
                              {category.subcategories.map(
                                (subcategory: any) => (
                                  <div
                                    key={subcategory.id}
                                    className="bg-gray-50 rounded p-3"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div>
                                        <span className="text-sm font-medium text-gray-900">
                                          {subcategory.name}
                                        </span>
                                        <span className="text-xs text-gray-500 ml-2">
                                          /{subcategory.slug}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => {
                                            setEditingTeam({
                                              subcategoryId: subcategory.id,
                                              slug: "",
                                              name: "",
                                              description: "",
                                              logoUrl: "",
                                              displayOrder:
                                                subcategory.teams?.length || 0,
                                              isActive: true,
                                            });
                                            setIsDialogOpen(true);
                                          }}
                                          className="p-1 text-gray-400 hover:text-green-600"
                                          title="Add team"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingSubcategory(subcategory);
                                            setIsDialogOpen(true);
                                          }}
                                          className="p-1 text-gray-400 hover:text-blue-600"
                                          title="Edit league"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            // TODO: Implement delete subcategory
                                            showMessage(
                                              "Delete subcategory functionality not implemented yet",
                                              "error"
                                            );
                                          }}
                                          className="p-1 text-gray-400 hover:text-red-600"
                                          title="Delete league"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Teams */}
                                    {subcategory.teams &&
                                      subcategory.teams.length > 0 && (
                                        <div className="ml-4 border-l-2 border-gray-300 pl-3">
                                          <div className="flex items-center justify-between mb-1">
                                            <h6 className="text-xs font-medium text-gray-600">
                                              Teams ({subcategory.teams.length}
                                              ):
                                            </h6>
                                          </div>
                                          <div className="space-y-1">
                                            {subcategory.teams.map(
                                              (team: any) => (
                                                <div
                                                  key={team.id}
                                                  className="flex items-center justify-between bg-white rounded p-2"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    {team.logoUrl && (
                                                      <Image
                                                        src={team.logoUrl}
                                                        alt={team.name}
                                                        width={16}
                                                        height={16}
                                                        className="w-4 h-4 rounded object-cover"
                                                      />
                                                    )}
                                                    <span className="text-xs font-medium text-gray-800">
                                                      {team.name}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                      /{team.slug}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <button
                                                      onClick={() => {
                                                        setEditingTeam(team);
                                                        setIsDialogOpen(true);
                                                      }}
                                                      className="p-1 text-gray-400 hover:text-blue-600"
                                                      title="Edit team"
                                                    >
                                                      <Edit className="w-2 h-2" />
                                                    </button>
                                                    <button
                                                      onClick={() => {
                                                        // TODO: Implement delete team
                                                        showMessage(
                                                          "Delete team functionality not implemented yet",
                                                          "error"
                                                        );
                                                      }}
                                                      className="p-1 text-gray-400 hover:text-red-600"
                                                      title="Delete team"
                                                    >
                                                      <Trash2 className="w-2 h-2" />
                                                    </button>
                                                  </div>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                )
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-500 mb-3">
                              No leagues added yet
                            </p>
                            <button
                              onClick={() => {
                                setEditingSubcategory({
                                  categoryId: category.id,
                                  slug: "",
                                  name: "",
                                  description: "",
                                  imageUrl: "",
                                  displayOrder: 0,
                                  isActive: true,
                                });
                                setIsDialogOpen(true);
                              }}
                              className="text-xs bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors flex items-center gap-1 mx-auto"
                              title="Add first league"
                            >
                              <Plus className="w-3 h-3" />
                              Add First League
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {shopCategories.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Grid className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No shop categories yet
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Create your first shop category to get started
                      </p>
                      <button
                        onClick={() => {
                          setEditingShopCategory({
                            slug: "",
                            name: "",
                            description: "",
                            imageUrl: "",
                            displayOrder: 0,
                            isActive: true,
                          });
                          setIsDialogOpen(true);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Add First Category
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "sections" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900">
                      Category Sections Management
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Manage the category sections displayed on the homepage
                      with their cards
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingSection({
                        title: "",
                        slug: "",
                        description: "",
                        displayOrder: categorySections.length,
                      });
                      setIsDialogOpen(true);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-neutral-900 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500 w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Section
                  </button>
                </div>

                <div className="space-y-4">
                  {categorySections.map((section) => (
                    <div
                      key={section.id}
                      className="border border-gray-200 rounded-lg p-6 bg-white"
                    >
                      <div className="mb-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-medium text-gray-900">
                              {section.title}
                            </h4>
                            <p className="text-sm text-gray-500">
                              Slug: {section.slug} | Order:{" "}
                              {section.displayOrder}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                            <button
                              onClick={() => {
                                setEditingSection(section);
                                setIsDialogOpen(true);
                              }}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-500"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={async () => {
                                if (
                                  confirm(
                                    `Are you sure you want to delete the section "${section.title}"? This will also delete all its cards.`
                                  )
                                ) {
                                  try {
                                    const response = await fetch(
                                      `/api/admin/cms/sections/${section.id}`,
                                      { method: "DELETE" }
                                    );
                                    if (response.ok) {
                                      showMessage(
                                        "Section deleted successfully",
                                        "success"
                                      );
                                      loadData();
                                    } else {
                                      showMessage(
                                        "Failed to delete section",
                                        "error"
                                      );
                                    }
                                  } catch {
                                    showMessage(
                                      "Failed to delete section",
                                      "error"
                                    );
                                  }
                                }
                              }}
                              className="inline-flex items-center px-3 py-1 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </button>
                          </div>
                        </div>
                        {section.description && (
                          <div className="w-full">
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {section.description}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <h5 className="text-md font-medium text-gray-700">
                            Category Cards ({section.cards?.length || 0})
                          </h5>
                          <button
                            onClick={() => {
                              setEditingCard({
                                sectionId: section.id,
                                title: "",
                                slug: "",
                                imageUrl: "",
                                description: "",
                                displayOrder: section.cards?.length || 0,
                              });
                              setIsDialogOpen(true);
                            }}
                            className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 w-full sm:w-auto justify-center"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Card
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {section.cards?.map((card: CategoryCardData) => (
                            <div
                              key={card.id}
                              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <h6 className="text-sm font-medium text-gray-900">
                                    {card.title}
                                  </h6>
                                  <p className="text-xs text-gray-500">
                                    {card.slug}
                                  </p>
                                </div>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => {
                                      setEditingCard(card);
                                      setIsDialogOpen(true);
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (
                                        confirm(
                                          `Are you sure you want to delete the card "${card.title}"?`
                                        )
                                      ) {
                                        try {
                                          const response = await fetch(
                                            `/api/admin/cms/cards/${card.id}`,
                                            { method: "DELETE" }
                                          );
                                          if (response.ok) {
                                            showMessage(
                                              "Card deleted successfully",
                                              "success"
                                            );
                                            loadData();
                                          } else {
                                            showMessage(
                                              "Failed to delete card",
                                              "error"
                                            );
                                          }
                                        } catch {
                                          showMessage(
                                            "Failed to delete card",
                                            "error"
                                          );
                                        }
                                      }
                                    }}
                                    className="text-red-400 hover:text-red-600"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              {card.imageUrl && (
                                <div className="mt-2">
                                  <Image
                                    src={card.imageUrl}
                                    alt={card.title}
                                    width={100}
                                    height={60}
                                    className="w-full h-12 object-cover rounded"
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
                    </div>
                  ))}
                </div>
              </div>
            )}
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

        {/* Edit Section/Card Modal */}
        {isDialogOpen && (editingSection || editingCard) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingSection
                    ? editingSection.id
                      ? "Edit Section"
                      : "Create New Section"
                    : editingCard?.id
                    ? "Edit Card"
                    : "Create New Card"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {editingSection
                    ? "Configure the section details"
                    : "Configure the card details"}
                </p>
              </div>

              <div className="p-6 space-y-6">
                {editingSection ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Section Title
                        </label>
                        <Input
                          value={editingSection.title}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditingSection({
                              ...editingSection,
                              title: e.target.value,
                            })
                          }
                          placeholder="e.g., Football Leagues"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Section Slug
                        </label>
                        <Input
                          value={editingSection.slug}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditingSection({
                              ...editingSection,
                              slug: e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9-_]/g, ""),
                            })
                          }
                          placeholder="e.g., football-leagues"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <Textarea
                        value={editingSection.description || ""}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setEditingSection({
                            ...editingSection,
                            description: e.target.value,
                          })
                        }
                        placeholder="Enter section description"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Order
                      </label>
                      <Input
                        type="number"
                        value={editingSection.displayOrder}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEditingSection({
                            ...editingSection,
                            displayOrder: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Card Title
                        </label>
                        <Input
                          value={editingCard?.title || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditingCard({
                              ...editingCard,
                              title: e.target.value,
                            })
                          }
                          placeholder="e.g., Premier League"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Card Slug
                        </label>
                        <Input
                          value={editingCard?.slug || ""}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditingCard({
                              ...editingCard,
                              slug: e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9-_\/]/g, ""),
                            })
                          }
                          placeholder="e.g., premier-league or shop/football/premier-league"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Image URL
                      </label>
                      <Input
                        value={editingCard?.imageUrl || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEditingCard({
                            ...editingCard,
                            imageUrl: e.target.value,
                          })
                        }
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <Textarea
                        value={editingCard?.description || ""}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setEditingCard({
                            ...editingCard,
                            description: e.target.value,
                          })
                        }
                        placeholder="Enter card description"
                        rows={2}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Order
                      </label>
                      <Input
                        type="number"
                        value={editingCard?.displayOrder || 0}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEditingCard({
                            ...editingCard,
                            displayOrder: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingSection(null);
                    setEditingCard(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded text-sm hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (editingSection) {
                        const url = editingSection.id
                          ? `/api/admin/cms/content-sections/${editingSection.id}`
                          : "/api/admin/cms/content-sections";
                        const method = editingSection.id ? "PUT" : "POST";

                        const response = await fetch(url, {
                          method,
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(editingSection),
                        });

                        if (response.ok) {
                          showMessage(
                            editingSection.id
                              ? "Section updated successfully"
                              : "Section created successfully",
                            "success"
                          );
                          loadData();
                          setIsDialogOpen(false);
                          setEditingSection(null);
                        } else {
                          showMessage("Failed to save section", "error");
                        }
                      } else if (editingCard) {
                        const url = editingCard.id
                          ? `/api/admin/cms/cards/${editingCard.id}`
                          : "/api/admin/cms/cards";
                        const method = editingCard.id ? "PUT" : "POST";

                        const response = await fetch(url, {
                          method,
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(editingCard),
                        });

                        if (response.ok) {
                          showMessage(
                            editingCard.id
                              ? "Card updated successfully"
                              : "Card created successfully",
                            "success"
                          );
                          loadData();
                          setIsDialogOpen(false);
                          setEditingCard(null);
                        } else {
                          showMessage("Failed to save card", "error");
                        }
                      }
                    } catch {
                      showMessage("Failed to save", "error");
                    }
                  }}
                  className="bg-neutral-900 text-white px-4 py-2 rounded text-sm hover:bg-neutral-800 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {editingSection
                    ? editingSection.id
                      ? "Update Section"
                      : "Create Section"
                    : editingCard?.id
                    ? "Update Card"
                    : "Create Card"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Shop Category Modal */}
        {isDialogOpen && editingShopCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingShopCategory?.id
                    ? "Edit Shop Category"
                    : "Create New Shop Category"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Configure your shop category details
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <Input
                    value={editingShopCategory?.name || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingShopCategory({
                        ...editingShopCategory,
                        name: e.target.value,
                      })
                    }
                    placeholder="e.g., Football"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slug *
                  </label>
                  <Input
                    value={editingShopCategory?.slug || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingShopCategory({
                        ...editingShopCategory,
                        slug: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-_]/g, ""),
                      })
                    }
                    placeholder="e.g., football"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <Textarea
                    value={editingShopCategory?.description || ""}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditingShopCategory({
                        ...editingShopCategory,
                        description: e.target.value,
                      })
                    }
                    placeholder="Enter category description"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL
                  </label>
                  <Input
                    value={editingShopCategory?.imageUrl || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingShopCategory({
                        ...editingShopCategory,
                        imageUrl: e.target.value,
                      })
                    }
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Order
                  </label>
                  <Input
                    type="number"
                    value={editingShopCategory?.displayOrder || 0}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingShopCategory({
                        ...editingShopCategory,
                        displayOrder: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editingShopCategory?.isActive !== false}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingShopCategory({
                        ...editingShopCategory,
                        isActive: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="isActive"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Active (visible on website)
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingShopCategory(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (
                        !editingShopCategory?.name ||
                        !editingShopCategory?.slug
                      ) {
                        showMessage("Name and slug are required", "error");
                        return;
                      }

                      const url = editingShopCategory.id
                        ? `/api/admin/cms/shop-categories/${editingShopCategory.id}`
                        : "/api/admin/cms/shop-categories";
                      const method = editingShopCategory.id ? "PUT" : "POST";

                      const response = await fetch(url, {
                        method,
                        headers: {
                          "Content-Type": "application/json",
                        },
                        credentials: "include",
                        body: JSON.stringify(editingShopCategory),
                      });

                      if (response.ok) {
                        showMessage(
                          editingShopCategory.id
                            ? "Category updated successfully"
                            : "Category created successfully",
                          "success"
                        );
                        loadData();
                        setIsDialogOpen(false);
                        setEditingShopCategory(null);
                      } else {
                        showMessage("Failed to save category", "error");
                      }
                    } catch {
                      showMessage("Failed to save", "error");
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {editingShopCategory?.id
                    ? "Update Category"
                    : "Create Category"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Team Modal */}
        {isDialogOpen && editingTeam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingTeam?.id ? "Edit Team" : "Create New Team"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Configure your team details
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Name *
                  </label>
                  <Input
                    value={editingTeam?.name || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingTeam({
                        ...editingTeam,
                        name: e.target.value,
                      })
                    }
                    placeholder="e.g., Arsenal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slug *
                  </label>
                  <Input
                    value={editingTeam?.slug || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingTeam({
                        ...editingTeam,
                        slug: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-_]/g, ""),
                      })
                    }
                    placeholder="e.g., arsenal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <Textarea
                    value={editingTeam?.description || ""}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditingTeam({
                        ...editingTeam,
                        description: e.target.value,
                      })
                    }
                    placeholder="Enter team description"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo URL
                  </label>
                  <Input
                    value={editingTeam?.logoUrl || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingTeam({
                        ...editingTeam,
                        logoUrl: e.target.value,
                      })
                    }
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter a valid URL starting with http:// or https://, or
                    leave empty
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Order
                  </label>
                  <Input
                    type="number"
                    value={editingTeam?.displayOrder || 0}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingTeam({
                        ...editingTeam,
                        displayOrder: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="teamIsActive"
                    checked={editingTeam?.isActive !== false}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingTeam({
                        ...editingTeam,
                        isActive: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="teamIsActive"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Active (visible on website)
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingTeam(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (!editingTeam?.name || !editingTeam?.slug) {
                        showMessage("Name and slug are required", "error");
                        return;
                      }

                      const url = editingTeam.id
                        ? `/api/admin/cms/shop-teams/${editingTeam.id}`
                        : "/api/admin/cms/shop-teams";
                      const method = editingTeam.id ? "PUT" : "POST";

                      const response = await fetch(url, {
                        method,
                        headers: {
                          "Content-Type": "application/json",
                        },
                        credentials: "include",
                        body: JSON.stringify(editingTeam),
                      });

                      if (response.ok) {
                        showMessage(
                          editingTeam.id
                            ? "Team updated successfully"
                            : "Team created successfully",
                          "success"
                        );
                        loadData();
                        setIsDialogOpen(false);
                        setEditingTeam(null);
                      } else {
                        showMessage("Failed to save team", "error");
                      }
                    } catch {
                      showMessage("Failed to save", "error");
                    }
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {editingTeam?.id ? "Update Team" : "Create Team"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Subcategory Modal */}
        {isDialogOpen && editingSubcategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingSubcategory?.id
                    ? "Edit Subcategory"
                    : "Create New Subcategory"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Configure your subcategory details
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <Input
                    value={editingSubcategory?.name || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingSubcategory({
                        ...editingSubcategory,
                        name: e.target.value,
                      })
                    }
                    placeholder="e.g., Premier League"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slug *
                  </label>
                  <Input
                    value={editingSubcategory?.slug || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingSubcategory({
                        ...editingSubcategory,
                        slug: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-_]/g, ""),
                      })
                    }
                    placeholder="e.g., premier-league"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <Textarea
                    value={editingSubcategory?.description || ""}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditingSubcategory({
                        ...editingSubcategory,
                        description: e.target.value,
                      })
                    }
                    placeholder="Enter subcategory description"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL
                  </label>
                  <Input
                    value={editingSubcategory?.imageUrl || ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingSubcategory({
                        ...editingSubcategory,
                        imageUrl: e.target.value,
                      })
                    }
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Order
                  </label>
                  <Input
                    type="number"
                    value={editingSubcategory?.displayOrder || 0}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingSubcategory({
                        ...editingSubcategory,
                        displayOrder: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="subcategoryIsActive"
                    checked={editingSubcategory?.isActive !== false}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditingSubcategory({
                        ...editingSubcategory,
                        isActive: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="subcategoryIsActive"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Active (visible on website)
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingSubcategory(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (
                        !editingSubcategory?.name ||
                        !editingSubcategory?.slug
                      ) {
                        showMessage("Name and slug are required", "error");
                        return;
                      }

                      const url = editingSubcategory.id
                        ? `/api/admin/cms/shop-subcategories/${editingSubcategory.id}`
                        : "/api/admin/cms/shop-subcategories";
                      const method = editingSubcategory.id ? "PUT" : "POST";

                      const response = await fetch(url, {
                        method,
                        headers: {
                          "Content-Type": "application/json",
                        },
                        credentials: "include",
                        body: JSON.stringify(editingSubcategory),
                      });

                      if (response.ok) {
                        showMessage(
                          editingSubcategory.id
                            ? "Subcategory updated successfully"
                            : "Subcategory created successfully",
                          "success"
                        );
                        loadData();
                        setIsDialogOpen(false);
                        setEditingSubcategory(null);
                      } else {
                        showMessage("Failed to save subcategory", "error");
                      }
                    } catch {
                      showMessage("Failed to save", "error");
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {editingSubcategory?.id
                    ? "Update Subcategory"
                    : "Create Subcategory"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
