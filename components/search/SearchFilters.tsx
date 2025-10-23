"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCurrency } from "@/components/providers/CurrencyProvider";

interface FilterOption {
  id: string;
  label: string;
  count: number;
}

interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
}
type Facets = {
  categories?: Array<{ id: string; slug: string; name: string; count: number }>;
  brands?: Array<{ id: string; name: string; count: number }>;
  priceRange?: { min: number; max: number };
};

export default function SearchFilters({ facets }: { facets?: Facets }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatPrice, convertPrice } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<
    Record<string, string[]>
  >({});

  // Mock filter data
  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        id: "category",
        label: "Category",
        options: facets?.categories?.map((c) => ({
          id: c.slug,
          label: c.name,
          count: c.count,
        })) || [
          { id: "clothing", label: "Clothing", count: 1250 },
          { id: "shoes", label: "Shoes", count: 340 },
          { id: "accessories", label: "Accessories", count: 890 },
          { id: "bags", label: "Bags", count: 245 },
        ],
      },
      {
        id: "brand",
        label: "Brand",
        options: facets?.brands?.map((b) => ({
          id: b.id,
          label: b.name,
          count: b.count,
        })) || [
          { id: "nike", label: "Nike", count: 156 },
          { id: "adidas", label: "Adidas", count: 134 },
          { id: "zara", label: "Zara", count: 203 },
          { id: "h&m", label: "H&M", count: 187 },
        ],
      },
      {
        id: "price",
        label: "Price Range",
        options: [
          {
            id: "0-25",
            label: `Under ${formatPrice(convertPrice(2500))}`,
            count: 456,
          },
          {
            id: "25-50",
            label: `${formatPrice(convertPrice(2500))} - ${formatPrice(
              convertPrice(5000)
            )}`,
            count: 789,
          },
          {
            id: "50-100",
            label: `${formatPrice(convertPrice(5000))} - ${formatPrice(
              convertPrice(10000)
            )}`,
            count: 623,
          },
          {
            id: "100+",
            label: `Over ${formatPrice(convertPrice(10000))}`,
            count: 234,
          },
        ],
      },
      {
        id: "size",
        label: "Size",
        options: [
          { id: "xs", label: "XS", count: 234 },
          { id: "s", label: "S", count: 567 },
          { id: "m", label: "M", count: 891 },
          { id: "l", label: "L", count: 723 },
          { id: "xl", label: "XL", count: 456 },
        ],
      },
      {
        id: "color",
        label: "Color",
        options: [
          { id: "black", label: "Black", count: 567 },
          { id: "white", label: "White", count: 432 },
          { id: "blue", label: "Blue", count: 345 },
          { id: "red", label: "Red", count: 234 },
          { id: "green", label: "Green", count: 198 },
        ],
      },
    ],
    [formatPrice, convertPrice, facets?.brands, facets?.categories]
  );

  useEffect(() => {
    // Parse current filters from URL
    const filters: Record<string, string[]> = {};
    filterGroups.forEach((group) => {
      const value = searchParams?.get(group.id);
      if (value) {
        filters[group.id] = value.split(",");
      }
    });
    setAppliedFilters(filters);
  }, [searchParams, filterGroups]);

  function updateFilters(groupId: string, optionId: string, checked: boolean) {
    const newFilters = { ...appliedFilters };

    if (!newFilters[groupId]) {
      newFilters[groupId] = [];
    }

    if (checked) {
      if (!newFilters[groupId].includes(optionId)) {
        newFilters[groupId].push(optionId);
      }
    } else {
      newFilters[groupId] = newFilters[groupId].filter((id) => id !== optionId);
      if (newFilters[groupId].length === 0) {
        delete newFilters[groupId];
      }
    }

    setAppliedFilters(newFilters);

    // Update URL
    const params = new URLSearchParams(searchParams || undefined);

    Object.keys(newFilters).forEach((key) => {
      if (newFilters[key].length > 0) {
        params.set(key, newFilters[key].join(","));
      } else {
        params.delete(key);
      }
    });

    router.push(`?${params.toString()}`);
  }

  function clearAllFilters() {
    setAppliedFilters({});
    const params = new URLSearchParams(searchParams || undefined);
    filterGroups.forEach((group) => {
      params.delete(group.id);
    });
    router.push(`?${params.toString()}`);
  }

  const hasActiveFilters = Object.keys(appliedFilters).length > 0;
  const activeFilterCount = Object.values(appliedFilters).reduce(
    (acc, filters) => acc + filters.length,
    0
  );

  return (
    <>
      {/* Mobile Filter Button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span className="font-carbon">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-white text-black text-xs px-2 py-1 rounded-full font-carbon font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Desktop Filters */}
      <div className="hidden lg:block sticky top-24">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white font-carbon">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-gray-300 hover:text-white transition-colors font-carbon"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-6">
            {filterGroups.map((group) => (
              <FilterGroup
                key={group.id}
                group={group}
                selectedOptions={appliedFilters[group.id] || []}
                onOptionChange={(optionId, checked) =>
                  updateFilters(group.id, optionId, checked)
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="font-bold text-white font-carbon">Filters</h3>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-gray-300 hover:text-white transition-colors font-carbon"
                >
                  Clear all
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-2 text-white hover:text-gray-300 transition-colors">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-4 space-y-6 overflow-y-auto">
            {filterGroups.map((group) => (
              <FilterGroup
                key={group.id}
                group={group}
                selectedOptions={appliedFilters[group.id] || []}
                onOptionChange={(optionId, checked) =>
                  updateFilters(group.id, optionId, checked)
                }
              />
            ))}
          </div>

          <div className="p-4 border-t border-gray-700">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full bg-white text-black py-3 rounded-lg font-bold font-carbon hover:bg-gray-100 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function FilterGroup({
  group,
  selectedOptions,
  onOptionChange,
}: {
  group: FilterGroup;
  selectedOptions: string[];
  onOptionChange: (optionId: string, checked: boolean) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left py-2 text-white hover:text-gray-300 transition-colors"
      >
        <span className="font-bold font-carbon">{group.label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="space-y-2 ml-2">
          {group.options.map((option) => (
            <label
              key={option.id}
              className="flex items-center gap-2 cursor-pointer hover:text-gray-300 transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedOptions.includes(option.id)}
                onChange={(e) => onOptionChange(option.id, e.target.checked)}
                className="rounded border-gray-600 bg-gray-700 text-white focus:ring-gray-500 focus:ring-2"
              />
              <span className="text-sm text-gray-300 font-carbon">{option.label}</span>
              <span className="text-xs text-gray-400 font-carbon">({option.count})</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
