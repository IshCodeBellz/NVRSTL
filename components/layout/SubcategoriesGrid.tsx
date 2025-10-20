"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Image from "next/image";

interface SubcategoryCard {
  name: string;
  slug: string;
  href: string;
  image: string;
  description: string;
  productCount?: number;
}

interface SubcategoriesGridProps {
  title: string;
  subcategories: SubcategoryCard[];
}

export function SubcategoriesGrid({
  title,
  subcategories,
}: SubcategoriesGridProps) {
  const [loading, setLoading] = useState(true);
  const hasAny = Array.isArray(subcategories) && subcategories.length > 0;

  useEffect(() => {
    // Simulate loading for smooth UX
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="container mx-auto px-4 py-10 space-y-10">
      {/* Header */}
      <header className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
          Discover our curated collection of {title.toLowerCase()}{" "}
          {hasAny ? "categories" : ""}
        </p>
      </header>

      {/* Subcategories Grid - render only if we have any */}
      {hasAny && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading
            ? // Loading skeleton (only when there are subcategories)
              Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="group relative bg-neutral-100 dark:bg-neutral-800 aspect-[4/5] overflow-hidden rounded-lg animate-pulse"
                >
                  <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-700" />
                  <div className="absolute inset-x-0 bottom-0 p-4 space-y-2">
                    <div className="h-4 bg-neutral-300 dark:bg-neutral-600 rounded w-3/4" />
                    <div className="h-3 bg-neutral-300 dark:bg-neutral-600 rounded w-1/2" />
                  </div>
                </div>
              ))
            : // Subcategory cards
              subcategories.map((subcategory) => (
                <Link
                  key={subcategory.slug}
                  href={subcategory.href}
                  className="group relative bg-neutral-100 dark:bg-neutral-800 aspect-[4/5] overflow-hidden rounded-lg hover:shadow-xl transition-all duration-300"
                >
                  {/* Background Image */}
                  <Image
                    src={subcategory.image}
                    alt={subcategory.name}
                    width={400}
                    height={500}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Content */}
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <h3 className="text-lg font-semibold mb-1 group-hover:text-brand-accent transition-colors">
                      {subcategory.name}
                    </h3>
                    <p className="text-sm text-neutral-200 mb-2 line-clamp-2">
                      {subcategory.description}
                    </p>
                    {subcategory.productCount && (
                      <p className="text-xs text-neutral-300">
                        {subcategory.productCount} item
                        {subcategory.productCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  {/* Hover Arrow */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-8 h-8 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
        </div>
      )}
    </div>
  );
}
