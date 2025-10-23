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
      <div className="flex justify-center mb-12 px-4">
        <div className="flex items-center space-x-2 md:space-x-4 max-w-full">
          {/* Previous Arrow */}
          <button
            onClick={handlePrevious}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center hover:bg-gray-700 transition-colors flex-shrink-0"
            aria-label="Previous section"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </button>

          {/* Pills - Mobile scrollable */}
          <div className="flex space-x-2 md:space-x-3 overflow-x-auto scrollbar-hide max-w-full">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section)}
                className={`px-3 py-2 md:px-6 md:py-3 rounded-full border-2 transition-all font-carbon uppercase tracking-wider whitespace-nowrap flex-shrink-0 ${
                  activeSection?.id === section.id
                    ? "bg-white text-black border-white"
                    : "bg-transparent text-white border-gray-600 hover:border-gray-400"
                }`}
              >
                <span className="flex items-center space-x-1 md:space-x-2">
                  <span className="text-sm md:text-lg">◆</span>
                  <span className="font-bold text-sm md:text-base">
                    {section.title}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {/* Next Arrow */}
          <button
            onClick={handleNext}
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white border border-white flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Next section"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-black" />
          </button>
        </div>
      </div>

      {/* Dynamic Title and Description */}
      <div className="text-center mb-12 md:mb-16 px-4">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white font-carbon mb-4 md:mb-6">
          {activeSection?.title || "Categories"}
        </h2>
        <p className="text-sm sm:text-base md:text-lg text-gray-300 max-w-2xl mx-auto font-carbon leading-relaxed">
          {activeSection?.description ||
            "Discover our curated collection of products and services."}
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 px-4 md:px-0">
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
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 16vw"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <div className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <h3 className="text-lg md:text-xl font-bold text-white font-carbon uppercase tracking-wide">
                  {cat.label}
                </h3>
                <span className="text-xs md:text-sm text-gray-400 font-carbon">
                  {new Date().getFullYear()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-gray-300 font-carbon">
                  ◆ Global Brands
                </span>
                <span className="text-xs md:text-sm text-gray-300 font-carbon">
                  Style - Fashion
                </span>
              </div>
            </div>
          </Link>
        ))}

        {/* Drops banner spanning all columns */}
        <Link
          href="/drops"
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
