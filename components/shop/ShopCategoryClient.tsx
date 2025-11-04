"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

// Clean and validate image URL - convert GitHub blob URLs to raw URLs
function cleanImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;

  // Trim whitespace and normalize
  const normalizedUrl = url.trim().replace(/\s+/g, "");
  if (normalizedUrl === "") return null;

  // Check for partial/malformed URLs (like "hub.com/..." which is missing the protocol)
  // Check various patterns that indicate broken GitHub URLs
  const invalidPatterns = ["hub.com", "ob/main", "Hero/Foot"];

  // If it contains invalid patterns but doesn't start with http/https, it's invalid
  const hasInvalidPattern = invalidPatterns.some((pattern) =>
    normalizedUrl.includes(pattern)
  );
  const hasValidProtocol =
    normalizedUrl.startsWith("http://") || normalizedUrl.startsWith("https://");

  if (hasInvalidPattern && !hasValidProtocol) {
    return null;
  }

  // Must start with http:// or https:// to be valid
  if (!hasValidProtocol) {
    return null;
  }

  // Validate URL format first
  let urlObj: URL;
  try {
    urlObj = new URL(normalizedUrl);
  } catch {
    return null;
  }

  // Only allow HTTPS
  if (urlObj.protocol !== "https:") {
    return null;
  }

  // Convert GitHub blob URLs to raw URLs using proper hostname validation
  const hostname = urlObj.hostname.toLowerCase();
  if (hostname === "github.com" && urlObj.pathname.includes("/blob/")) {
    urlObj.hostname = "raw.githubusercontent.com";
    urlObj.pathname = urlObj.pathname.replace("/blob/", "/");
    return urlObj.toString();
  }

  // Filter out invalid GitHub URLs that aren't raw (check hostname, not substring)
  if (hostname === "github.com") {
    return null; // Only allow raw.githubusercontent.com for GitHub URLs
  }

  // Only allow known safe image hosting domains
  const allowedHosts = [
    "raw.githubusercontent.com",
    "picsum.photos",
    "images.unsplash.com",
    "cdn.jsdelivr.net",
    "imgur.com",
    "i.imgur.com",
  ];

  // Check if hostname matches an allowed host (exact match or subdomain)
  const isAllowedHost = allowedHosts.some((allowedHost) => {
    return hostname === allowedHost || hostname.endsWith(`.${allowedHost}`);
  });

  if (!isAllowedHost) {
    return null;
  }

  return urlObj.toString();
}

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
              {/* Card Image - Always show, either image or fallback */}
              <div className="relative h-48 w-full bg-gray-700 overflow-hidden">
                {(() => {
                  const rawUrl = card.imageUrl || card.image;
                  const imageUrl = cleanImageUrl(rawUrl);

                  // If URL is invalid or cleaned to null, show fallback
                  if (!imageUrl) {
                    return (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl">🏆</span>
                      </div>
                    );
                  }

                  // Valid URL - render image
                  // Check hostname for unoptimized flag (security: use URL object, not substring)
                  let needsUnoptimized = false;
                  try {
                    const imgUrl = new URL(imageUrl);
                    needsUnoptimized =
                      imgUrl.hostname === "raw.githubusercontent.com";
                  } catch {
                    // If URL parsing fails, default to optimized
                  }

                  return (
                    <Image
                      src={imageUrl}
                      alt={card.title || "Category image"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      unoptimized={needsUnoptimized}
                    />
                  );
                })()}
              </div>

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
