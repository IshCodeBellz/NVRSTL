"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export function ShopCategoryClient({
  categorySlug,
  fallbackContent,
}: {
  categorySlug: string;
  fallbackContent: {
    title: string;
    description: string;
    cards: Array<{
      title: string;
      description: string;
      href: string;
    }>;
  };
}) {
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPageData = async () => {
      try {
        console.log("Fetching page data for:", categorySlug);
        // Add cache-busting parameter to ensure fresh data
        const response = await fetch(
          `/api/content/shop/${categorySlug.replace(
            "shop/",
            ""
          )}?t=${Date.now()}`
        );

        if (response.ok) {
          const data = await response.json();
          console.log("API Response:", data);
          if (data.page) {
            console.log("Setting page data:", data.page);
            setPageData(data.page);
          } else {
            console.log("No page data in response, using fallback");
          }
        } else {
          console.error("API Error:", response.status, response.statusText);
        }
      } catch (error) {
        console.error("Error fetching shop category page data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPageData();
  }, [categorySlug]);

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

  // Use pageData if available, otherwise fallback to fallbackContent
  const content = pageData || fallbackContent;
  const cards =
    pageData?.sections?.filter((section: any) => section.type === "card") ||
    fallbackContent.cards;

  return (
    <div className="min-h-screen bg-black text-white">
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

      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cards.map((card: any, index: number) => (
            <div
              key={index}
              className="bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-full border border-gray-700 hover:border-gray-600 transition-all duration-300"
            >
              {/* Card Image */}
              {(card.imageUrl || card.image) && (
                <div className="relative h-48 w-full overflow-hidden">
                  <Image
                    src={card.imageUrl || card.image}
                    alt={card.title || "Category image"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              )}

              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-2xl font-bold mb-3 text-white font-carbon">
                  {card.title}
                </h3>
                <p className="text-gray-300 mb-6 flex-grow font-carbon">
                  {card.content || card.description}
                </p>
                <Link
                  href={card.buttonLink || card.href || card.url || "#"}
                  className="w-full bg-white text-black py-3 px-6 rounded hover:bg-gray-100 transition-colors text-center font-bold font-carbon uppercase tracking-wider"
                >
                  {card.buttonText || "Shop Now"}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
