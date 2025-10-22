"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CategorySection {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
  cards: CategoryCard[];
}

interface CategoryCard {
  id: string;
  sectionId: string;
  title: string;
  slug: string;
  imageUrl?: string | null;
  description?: string | null;
  displayOrder: number;
  isActive: boolean;
}

interface DynamicCategoriesProps {
  sections: CategorySection[];
  categoryImages: Record<string, string>;
}

export function DynamicCategories({
  sections,
  categoryImages,
}: DynamicCategoriesProps) {
  const [activeSection, setActiveSection] = useState<CategorySection | null>(
    sections.length > 0 ? sections[0] : null
  );

  // Update active section when sections change
  React.useEffect(() => {
    if (sections.length > 0 && !activeSection) {
      setActiveSection(sections[0]);
    }
  }, [sections, activeSection]);

  // Map cards to display format
  const currentCategories =
    activeSection?.cards.map((card) => ({
      label: card.title,
      slug: card.slug,
      img:
        card.imageUrl ||
        categoryImages?.[card.slug] ||
        "https://picsum.photos/seed/placeholder/800/1000",
    })) || [];

  const handlePrevious = () => {
    if (!activeSection) return;
    const currentIndex = sections.findIndex((s) => s.id === activeSection.id);
    const previousIndex =
      currentIndex === 0 ? sections.length - 1 : currentIndex - 1;
    setActiveSection(sections[previousIndex]);
  };

  const handleNext = () => {
    if (!activeSection) return;
    const currentIndex = sections.findIndex((s) => s.id === activeSection.id);
    const nextIndex =
      currentIndex === sections.length - 1 ? 0 : currentIndex + 1;
    setActiveSection(sections[nextIndex]);
  };

  return (
    <div className="w-full">
      {/* Pills Navigation */}
      <div className="flex justify-center mb-12">
        <div className="flex items-center space-x-4">
          {/* Previous Arrow */}
          <button
            onClick={handlePrevious}
            className="w-12 h-12 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center hover:bg-gray-700 transition-colors"
            aria-label="Previous section"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>

          {/* Pills */}
          <div className="flex space-x-3">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section)}
                className={`px-6 py-3 rounded-full border-2 transition-all font-carbon uppercase tracking-wider ${
                  activeSection?.id === section.id
                    ? "bg-white text-black border-white"
                    : "bg-transparent text-white border-gray-600 hover:border-gray-400"
                }`}
              >
                <span className="flex items-center space-x-2">
                  <span className="text-lg">◆</span>
                  <span className="font-bold">{section.title}</span>
                </span>
              </button>
            ))}
          </div>

          {/* Next Arrow */}
          <button
            onClick={handleNext}
            className="w-12 h-12 rounded-full bg-white border border-white flex items-center justify-center hover:bg-gray-100 transition-colors"
            aria-label="Next section"
          >
            <ChevronRight className="w-6 h-6 text-black" />
          </button>
        </div>
      </div>

      {/* Dynamic Title and Description */}
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white font-carbon mb-6">
          {activeSection?.title || "Categories"}
        </h2>
        <p className="text-lg text-gray-300 max-w-2xl mx-auto font-carbon">
          {activeSection?.description ||
            "Discover our curated collection of products and services."}
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {currentCategories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/${cat.slug}`}
            className="group relative bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-2xl"
            aria-label={`Shop ${cat.label}`}
          >
            <div className="aspect-[4/5] relative overflow-hidden bg-gray-700">
              <Image
                src={cat.img}
                alt={cat.label}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-white font-carbon uppercase tracking-wide">
                  {cat.label}
                </h3>
                <span className="text-sm text-gray-400 font-carbon">
                  {new Date().getFullYear()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300 font-carbon">
                  ◆ Global Brands
                </span>
                <span className="text-sm text-gray-300 font-carbon">
                  Style - Fashion
                </span>
              </div>
            </div>
          </Link>
        ))}

        {/* Drops banner spanning all columns */}
        <Link
          href="/new-in"
          className="relative col-span-1 md:col-span-2 lg:col-span-3 h-[200px] md:h-[240px] overflow-hidden rounded-lg group flex items-center justify-center bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-2xl"
          aria-label="Shop Drops arrivals"
        >
          <div
            className="absolute inset-0 opacity-30 mix-blend-overlay bg-cover bg-center"
            style={{ backgroundImage: `url('${categoryImages.Drops}')` }}
          />
          <div className="relative z-10 text-center px-8">
            <span className="block text-sm tracking-[0.3em] font-bold mb-2 font-carbon uppercase text-gray-300">
              JUST DROPPED
            </span>
            <span className="block text-3xl md:text-4xl font-black tracking-tight font-carbon uppercase text-white mb-4">
              Drops
            </span>
            <span className="inline-flex items-center gap-2 text-sm font-semibold bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20 group-hover:bg-white/20 transition-all font-carbon">
              <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              Fresh Styles Added
            </span>
          </div>
          <span className="absolute top-4 right-4 bg-white text-black text-xs px-3 py-1 rounded-full font-bold tracking-wide shadow font-carbon">
            NEW
          </span>
        </Link>
      </div>
    </div>
  );
}
