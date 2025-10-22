"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import Image from "next/image";

interface Brand {
  id: string;
  name: string;
  productCount: number;
  logoUrl?: string;
  backgroundImage?: string;
  description?: string;
  isFeatured: boolean;
  displayOrder: number;
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchBrands() {
      try {
        const response = await fetch("/api/brands");
        if (response.ok) {
          const data = await response.json();
          setBrands(data.brands || []);
        }
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    }

    fetchBrands();
  }, []);

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Shop by Brand</h1>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
          Discover your favorite brands and explore their latest collections.
          From established names to emerging designers.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto">
        <div className="relative">
          <input
            type="text"
            placeholder="Search brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100"
          />
          <div className="absolute right-3 top-3 text-neutral-400">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="text-center">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {filteredBrands.length} brand{filteredBrands.length !== 1 ? "s" : ""}{" "}
          found
        </p>
      </div>

      {/* Brands Grid */}
      {filteredBrands.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
            <svg
              width="24"
              height="24"
              fill="currentColor"
              viewBox="0 0 20 20"
              className="text-neutral-400"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">No brands found</h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            {searchQuery
              ? "Try a different search term"
              : "No brands available yet"}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {filteredBrands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.name.toLowerCase().replace(/\s+/g, "-")}`}
              className="group"
            >
              <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-6 text-center hover:shadow-lg dark:hover:shadow-neutral-900/20 transition-all duration-200 group-hover:border-neutral-900 dark:group-hover:border-neutral-100">
                {/* Brand Logo */}
                <div className="w-16 h-16 mx-auto mb-4 rounded-lg flex items-center justify-center overflow-hidden">
                  {brand.logoUrl ? (
                    <Image
                      src={brand.logoUrl}
                      alt={`${brand.name} logo`}
                      width={64}
                      height={64}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-100 dark:bg-neutral-700 rounded-lg flex items-center justify-center group-hover:bg-neutral-900 dark:group-hover:bg-neutral-100 transition-colors">
                      <span className="text-xl font-bold text-neutral-600 dark:text-neutral-300 group-hover:text-white dark:group-hover:text-neutral-900">
                        {brand.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Brand Name */}
                <h3 className="font-semibold text-sm mb-1 group-hover:text-neutral-900 dark:group-hover:text-neutral-100">
                  {brand.name}
                </h3>

                {/* Product Count */}
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {brand.productCount} product
                  {brand.productCount !== 1 ? "s" : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Featured Brands Section */}
      {!searchQuery && filteredBrands.length > 0 && (
        <div className="mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-700">
          <h2 className="text-2xl font-bold text-center mb-8">
            Featured Brands
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBrands
              .filter((brand) => brand.isFeatured)
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .slice(0, 6)
              .map((brand) => (
                <Link
                  key={`featured-${brand.id}`}
                  href={`/brands/${brand.name
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`}
                  className="group"
                >
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden hover:shadow-lg dark:hover:shadow-neutral-900/20 transition-all duration-200">
                    {/* Featured Image */}
                    <div className="aspect-[16/9] relative overflow-hidden">
                      {brand.backgroundImage ? (
                        <div
                          className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-300"
                          style={{
                            backgroundImage: `url(${brand.backgroundImage})`,
                          }}
                        >
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            {brand.logoUrl ? (
                              <Image
                                src={brand.logoUrl}
                                alt={`${brand.name} logo`}
                                width={96}
                                height={48}
                                className="max-w-24 max-h-12 object-contain filter drop-shadow-lg"
                              />
                            ) : (
                              <span className="text-2xl font-bold text-white drop-shadow-lg">
                                {brand.name}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-700 dark:to-neutral-800 flex items-center justify-center">
                          {brand.logoUrl ? (
                            <Image
                              src={brand.logoUrl}
                              alt={`${brand.name} logo`}
                              width={96}
                              height={48}
                              className="max-w-24 max-h-12 object-contain"
                            />
                          ) : (
                            <span className="text-2xl font-bold text-neutral-400 dark:text-neutral-500">
                              {brand.name}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold mb-1 group-hover:text-neutral-900 dark:group-hover:text-neutral-100">
                        {brand.name}
                      </h3>
                      {brand.description && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2 line-clamp-2">
                          {brand.description}
                        </p>
                      )}
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {brand.productCount} products available
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
