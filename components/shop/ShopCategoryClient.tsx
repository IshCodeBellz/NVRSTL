"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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

interface ShopCategoryClientProps {
  categorySlug: string;
  fallbackContent?: {
    title: string;
    description: string;
    cards: Array<{
      title: string;
      description: string;
      href: string;
      imageUrl?: string;
    }>;
  };
}

export function ShopCategoryClient({
  categorySlug,
  fallbackContent,
}: ShopCategoryClientProps) {
  const [pageData, setPageData] = useState<ContentPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        const response = await fetch(`/api/content/shop/${categorySlug}`);
        if (response.ok) {
          const data = await response.json();
          setPageData(data.page);
        }
      } catch (error) {
        console.error("Error fetching shop category page data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, [categorySlug]);

  // Default content if no CMS data is available
  const defaultContent = fallbackContent || {
    title: categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1),
    description: `Explore our ${categorySlug} collection with official merchandise and gear.`,
    cards: [],
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
        cards: pageData.sections
          .filter((s) => s.type === "card" && s.isVisible)
          .map((section) => ({
            title: section.title || "",
            description: section.content || "",
            href: section.buttonLink || "",
            imageUrl: section.imageUrl,
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
        {/* Category Cards Grid */}
        {content.cards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {content.cards.map((card, index) => (
              <div
                key={index}
                className="bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-full border border-gray-700 hover:border-gray-600 transition-all duration-300"
              >
                {card.imageUrl && (
                  <div className="h-64 bg-gray-700 flex items-center justify-center">
                    <img
                      src={card.imageUrl}
                      alt={card.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="text-2xl font-bold mb-3 text-white font-carbon">
                    {card.title}
                  </h3>
                  <p className="text-gray-300 mb-6 flex-grow font-carbon">
                    {card.description}
                  </p>
                  {card.href && (
                    <Link
                      href={card.href}
                      className="w-full bg-white text-black py-3 px-6 rounded hover:bg-gray-100 transition-colors text-center font-bold font-carbon uppercase tracking-wider"
                    >
                      Shop Now
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center">
              <span className="text-4xl">🏆</span>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white font-carbon">
              Coming Soon
            </h2>
            <p className="text-gray-300 font-carbon">
              This category is being prepared. Check back soon for exciting
              merchandise!
            </p>
          </div>
        )}

        {/* Back to Shop */}
        <div className="text-center">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            ← Back to Shop
          </Link>
        </div>
      </div>
    </div>
  );
}
