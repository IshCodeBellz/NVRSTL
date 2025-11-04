"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

// Clean and validate image URL - imported from shared utility
import { cleanImageUrl } from "../../lib/imageUtils";
// Check if a string is a valid image URL or just an emoji/icon
function isImageUrl(str: string | null | undefined): boolean {
  if (!str) return false;
  return cleanImageUrl(str) !== null;
}

interface ContentSection {
  id: string;
  type: string;
  title?: string;
  subtitle?: string;
  content?: string;
  imageUrl?: string;
  buttonText?: string;
  buttonLink?: string;
  order: number;
  isVisible: boolean;
}

interface ContentPage {
  id: string;
  slug: string;
  title: string;
  type: string;
  isActive: boolean;
  sections: ContentSection[];
  createdAt: string;
  updatedAt: string;
}

interface ShopPageClientProps {
  fallbackContent?: {
    title: string;
    description: string;
    categories: Array<{
      title: string;
      description: string;
      href: string;
      icon: string;
      gradient: string;
      imageUrl?: string | null;
    }>;
  };
}

export function ShopPageClient({ fallbackContent }: ShopPageClientProps) {
  const [pageData, setPageData] = useState<ContentPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        const response = await fetch("/api/content/shop");
        if (response.ok) {
          const data = await response.json();
          setPageData(data.page);
        }
      } catch (error) {
        console.error("Error fetching shop page data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, []);

  // Default content if no CMS data is available
  const defaultContent = fallbackContent || {
    title: "SHOP",
    description:
      "Explore our collections across different sports and categories. Find the perfect merchandise for your favorite teams and leagues.",
    categories: [
      {
        title: "Football",
        description:
          "Premier League, La Liga, Serie A and more. Official jerseys and merchandise from the world's top football leagues.",
        href: "/shop/football",
        icon: "⚽",
        gradient: "from-blue-500 to-blue-700",
      },
      {
        title: "International",
        description:
          "World Cup, Champions League, and national teams. Global football culture and international tournaments.",
        href: "/shop/international",
        icon: "🌍",
        gradient: "from-yellow-400 to-orange-500",
      },
      {
        title: "NBA",
        description:
          "Official NBA team jerseys, player gear, and accessories from your favorite basketball teams and stars.",
        href: "/shop/nba",
        icon: "🏀",
        gradient: "from-orange-500 to-red-600",
      },
      {
        title: "NFL",
        description:
          "Authentic NFL team jerseys, player merchandise, and Super Bowl gear from all 32 teams.",
        href: "/shop/nfl",
        icon: "🏈",
        gradient: "from-blue-600 to-blue-800",
      },
      {
        title: "Custom",
        description:
          "Design your own personalized jerseys, team uniforms, and custom merchandise with your own style.",
        href: "/shop/custom",
        icon: "👕",
        gradient: "from-pink-500 to-purple-600",
      },
    ],
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Use CMS data if available, otherwise use default content
  const content = pageData
    ? {
        title: pageData.title,
        description:
          pageData.sections.find((s) => s.type === "hero")?.content ||
          defaultContent.description,
        categories: pageData.sections
          .filter((s) => s.type === "category" && s.isVisible)
          .map((section) => ({
            title: section.title || "",
            description: section.content || "",
            href: section.buttonLink || "",
            imageUrl: section.imageUrl ? cleanImageUrl(section.imageUrl) : null,
            icon:
              section.imageUrl && !isImageUrl(section.imageUrl)
                ? section.imageUrl
                : "🏆",
            gradient: "from-gray-500 to-gray-700",
          })),
      }
    : defaultContent;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 to-black py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white font-carbon mb-6">
              {content.title}
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto font-carbon">
              {content.description}
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <div className="container mx-auto px-4 py-10">
        {/* Sports Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {content.categories.map((category, index) => (
            <div
              key={index}
              className="bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-full border border-gray-700 hover:border-gray-600 transition-all duration-300"
            >
              <div
                className={`h-64 bg-gradient-to-br ${category.gradient} flex items-center justify-center relative overflow-hidden`}
              >
                {category.imageUrl ? (
                  <Image
                    src={category.imageUrl}
                    alt={category.title || "Category image"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    unoptimized={category.imageUrl.includes(
                      "raw.githubusercontent.com"
                    )}
                  />
                ) : (
                  <span className="text-6xl relative z-10">
                    {category.icon}
                  </span>
                )}
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-2xl font-bold mb-3 text-white font-carbon">
                  {category.title}
                </h3>
                <p className="text-gray-300 mb-6 flex-grow font-carbon">
                  {category.description}
                </p>
                <Link
                  href={category.href}
                  className="w-full bg-white text-black py-3 px-6 rounded hover:bg-gray-100 transition-colors text-center font-bold font-carbon uppercase tracking-wider"
                >
                  Shop {category.title}
                </Link>
              </div>
            </div>
          ))}

          {/* Coming Soon Card */}
          <div className="bg-gray-700 rounded-lg shadow-lg overflow-hidden flex flex-col h-full border border-gray-600">
            <div className="h-64 bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
              <span className="text-6xl">🏆</span>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <h3 className="text-2xl font-bold mb-3 text-gray-300 font-carbon">
                More Sports
              </h3>
              <p className="text-gray-400 mb-6 flex-grow font-carbon">
                Additional sports categories coming soon. Stay tuned for more
                exciting merchandise options.
              </p>
              <div className="w-full bg-gray-600 text-gray-300 py-3 px-6 rounded text-center font-bold font-carbon uppercase tracking-wider cursor-not-allowed">
                Coming Soon
              </div>
            </div>
          </div>
        </div>

        {/* Featured Collections */}
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-center mb-6 text-white font-carbon">
            Featured Collections
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                ⚽
              </div>
              <h3 className="text-lg font-bold mb-2 text-white font-carbon">
                Premier League
              </h3>
              <p className="text-gray-300 text-sm font-carbon">
                England&apos;s top football league
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                🏀
              </div>
              <h3 className="text-lg font-bold mb-2 text-white font-carbon">
                NBA Finals
              </h3>
              <p className="text-gray-300 text-sm font-carbon">
                Championship merchandise
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                🏈
              </div>
              <h3 className="text-lg font-bold mb-2 text-white font-carbon">
                Super Bowl
              </h3>
              <p className="text-gray-300 text-sm font-carbon">
                NFL championship gear
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
