"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, X, Loader2, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

// Simple debounce function
function debounce<TArgs extends unknown[], TReturn>(
  func: (...args: TArgs) => TReturn,
  wait: number
): (...args: TArgs) => void {
  let timeout: NodeJS.Timeout;
  return (...args: TArgs) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface SearchSuggestion {
  id: string;
  text: string;
  type: "product" | "brand" | "category";
  image?: string;
  price?: number;
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

interface TrendingSearch {
  query: string;
  count: number;
}

export interface SearchInputProps {
  // Size variants
  size?: "sm" | "md" | "lg";

  // Behavior variants
  variant?: "header" | "page" | "filter";

  // Styling
  className?: string;
  placeholder?: string;

  // Functionality
  showSuggestions?: boolean;
  showRecentSearches?: boolean;
  showTrendingSearches?: boolean;

  // Callbacks
  onSearch?: (query: string) => void;
  onFilterChange?: (query: string) => void;

  // Current value (for controlled components)
  value?: string;
  onChange?: (value: string) => void;

  // Loading state
  loading?: boolean;

  // Disabled state
  disabled?: boolean;
}

export function SearchInput({
  size = "md",
  variant = "header",
  className,
  placeholder,
  showSuggestions = true,
  showRecentSearches = true,
  showTrendingSearches = true,
  onSearch,
  onFilterChange,
  value: controlledValue,
  onChange: controlledOnChange,
  loading: controlledLoading,
  disabled = false,
}: SearchInputProps) {
  const router = useRouter();
  const [query, setQuery] = useState(controlledValue || "");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<TrendingSearch[]>(
    []
  );
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showHistory, setShowHistory] = useState(true);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use controlled value if provided
  const currentQuery = controlledValue !== undefined ? controlledValue : query;
  const currentLoading =
    controlledLoading !== undefined ? controlledLoading : loading;

  // Size classes
  const sizeClasses = {
    sm: {
      input: "pl-8 pr-3 py-2 text-sm",
      icon: "h-4 w-4",
      button: "h-7 w-7",
      dropdown: "top-10",
    },
    md: {
      input: "pl-10 pr-4 py-2.5 text-sm",
      icon: "h-4 w-4",
      button: "h-8 w-8",
      dropdown: "top-10",
    },
    lg: {
      input: "pl-12 pr-4 py-4 text-base",
      icon: "h-5 w-5",
      button: "h-9 w-9",
      dropdown: "top-12",
    },
  };

  // Variant classes
  const variantClasses = {
    header:
      "rounded-lg border-gray-500 bg-gray-800 text-white placeholder:text-gray-400",
    page: "rounded-lg border-gray-600 bg-gray-800 text-white placeholder:text-gray-400",
    filter:
      "rounded-md border-gray-600 bg-gray-800 text-white placeholder:text-gray-400",
  };

  // Default placeholders
  const defaultPlaceholders = {
    header: "Search for items, brands, and more...",
    page: "Search products...",
    filter: "Filter products...",
  };

  const currentPlaceholder = placeholder || defaultPlaceholders[variant];

  // Load recent searches and trending on mount
  useEffect(() => {
    if (showRecentSearches || showTrendingSearches) {
      loadRecentSearches();
      loadTrendingSearches();
    }
  }, [showRecentSearches, showTrendingSearches]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update internal state when controlled value changes
  useEffect(() => {
    if (controlledValue !== undefined) {
      setQuery(controlledValue);
    }
  }, [controlledValue]);

  // Load recent searches from localStorage
  const loadRecentSearches = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("recent-searches");
      if (stored) {
        const recent = JSON.parse(stored);
        setRecentSearches(recent.slice(0, 5));
      }
    } catch {
      // Handle error silently
    }
  }, []);

  // Load trending searches
  const loadTrendingSearches = useCallback(async () => {
    try {
      const res = await fetch("/api/search/trending");
      if (res.ok) {
        const data = await res.json();
        setTrendingSearches(data.trending?.slice(0, 5) || []);
      }
    } catch {
      // Handle error silently
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("recent-searches");
      const recent: RecentSearch[] = stored ? JSON.parse(stored) : [];

      // Remove if already exists
      const filtered = recent.filter((r) => r.query !== searchQuery);

      // Add to beginning
      const updated = [
        { query: searchQuery, timestamp: Date.now() },
        ...filtered,
      ].slice(0, 10);

      localStorage.setItem("recent-searches", JSON.stringify(updated));
      setRecentSearches(updated.slice(0, 5));
    } catch {
      // Handle error silently
    }
  }, []);

  // Search suggestions function
  const getSuggestions = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setSuggestions([]);
        setShowHistory(true);
        return;
      }

      setLoading(true);
      setShowHistory(false);

      try {
        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
        }
      } catch {
        // Handle error silently
      } finally {
        setLoading(false);
      }
    },
    [setSuggestions, setShowHistory, setLoading]
  );

  // Debounced search suggestions
  const debouncedGetSuggestions = useMemo(
    () => debounce(getSuggestions, 250),
    [getSuggestions]
  );

  // Debounced filter change for filter variant
  const debouncedFilterChange = useMemo(
    () =>
      debounce((value: string) => {
        if (onFilterChange) {
          onFilterChange(value);
        }
      }, 300),
    [onFilterChange]
  );

  // Debounced controlled onChange for filter variant
  const debouncedControlledOnChange = useMemo(
    () =>
      debounce((value: string) => {
        if (controlledOnChange) {
          controlledOnChange(value);
        }
      }, 300),
    [controlledOnChange]
  );

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

      // For filter variant, use debounced controlled onChange to prevent focus loss
      if (variant === "filter") {
        if (controlledOnChange) {
          debouncedControlledOnChange(newValue);
        } else {
          setQuery(newValue);
        }
        
        if (onFilterChange) {
          debouncedFilterChange(newValue);
        }
      } else {
        // For non-filter variants, update immediately
        if (controlledOnChange) {
          controlledOnChange(newValue);
        } else {
          setQuery(newValue);
        }
        
        if (onFilterChange) {
          onFilterChange(newValue);
        }
      }

      // Get suggestions for header variant
      if (variant === "header" && showSuggestions) {
        debouncedGetSuggestions(newValue);
      }
    },
    [
      controlledOnChange,
      onFilterChange,
      variant,
      showSuggestions,
      debouncedGetSuggestions,
      debouncedFilterChange,
      debouncedControlledOnChange,
    ]
  );

  // Handle search execution
  const handleSearch = useCallback(
    (searchQuery: string) => {
      const trimmedQuery = searchQuery.trim();
      if (!trimmedQuery) return;

      // Save to recent searches
      if (showRecentSearches) {
        saveRecentSearch(trimmedQuery);
      }

      // Call custom search handler
      if (onSearch) {
        onSearch(trimmedQuery);
        return;
      }

      // Default behavior: navigate to search page
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    },
    [onSearch, router, showRecentSearches, saveRecentSearch]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) return;

      const totalItems = showHistory
        ? recentSearches.length + trendingSearches.length
        : suggestions.length;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0) {
            if (showHistory) {
              const recentCount = recentSearches.length;
              if (selectedIndex < recentCount) {
                handleSearch(recentSearches[selectedIndex].query);
              } else {
                handleSearch(
                  trendingSearches[selectedIndex - recentCount].query
                );
              }
            } else {
              handleSuggestionClick(suggestions[selectedIndex]);
            }
          } else {
            handleSearch(currentQuery);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
      }
    },
    [
      isOpen,
      selectedIndex,
      showHistory,
      recentSearches,
      trendingSearches,
      suggestions,
      handleSearch,
      currentQuery,
    ]
  );

  // Handle suggestion click
  const handleSuggestionClick = useCallback(
    (suggestion: SearchSuggestion) => {
      if (suggestion.type === "product") {
        router.push(`/product/${suggestion.id}`);
      } else {
        handleSearch(suggestion.text);
      }
      setIsOpen(false);
    },
    [router, handleSearch]
  );

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsOpen(true);
    if (showSuggestions && !currentQuery.trim()) {
      setShowHistory(true);
    }
  }, [showSuggestions, currentQuery]);

  // Handle blur
  const handleBlur = useCallback(() => {
    setTimeout(() => setIsOpen(false), 150);
  }, []);

  return (
    <div ref={searchRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={currentPlaceholder}
          value={currentQuery}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            "w-full border focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-200",
            sizeClasses[size].input,
            variantClasses[variant],
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />

        {/* Search Icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          {currentLoading ? (
            <Loader2 className={cn("animate-spin", sizeClasses[size].icon)} />
          ) : (
            <Search className={sizeClasses[size].icon} />
          )}
        </div>

        {/* Clear Button */}
        {currentQuery && (
          <button
            onClick={() => {
              if (controlledOnChange) {
                controlledOnChange("");
              } else {
                setQuery("");
              }
              if (onFilterChange) {
                onFilterChange("");
              }
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors hover:bg-gray-700 rounded-full p-1"
          >
            <X className={sizeClasses[size].icon} />
          </button>
        )}
      </div>

      {/* Search Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute left-0 right-0 z-50 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto",
            sizeClasses[size].dropdown
          )}
        >
          {showHistory && !currentQuery.trim() ? (
            <div className="p-4">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    <Clock className="h-3 w-3" />
                    Recent Searches
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((search, index) => (
                      <button
                        key={search.timestamp}
                        onClick={() => handleSearch(search.query)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded hover:bg-gray-800 transition-colors text-sm text-gray-300",
                          selectedIndex === index && "bg-gray-800"
                        )}
                      >
                        {search.query}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Searches */}
              {trendingSearches.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    <TrendingUp className="h-3 w-3" />
                    Trending
                  </div>
                  <div className="space-y-1">
                    {trendingSearches.map((search, index) => (
                      <button
                        key={search.query}
                        onClick={() => handleSearch(search.query)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded hover:bg-gray-800 transition-colors text-sm text-gray-300",
                          selectedIndex === recentSearches.length + index &&
                            "bg-gray-800"
                        )}
                      >
                        {search.query}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Search Suggestions */
            suggestions.length > 0 && (
              <div className="p-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.type}-${suggestion.id}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-800 transition-colors text-sm",
                      selectedIndex === index && "bg-gray-800"
                    )}
                  >
                    {suggestion.image && (
                      <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={suggestion.image}
                          alt={suggestion.text}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <div className="font-medium text-white">
                        {suggestion.text}
                      </div>
                      {suggestion.price && (
                        <div className="text-xs text-gray-400">
                          £{(suggestion.price / 100).toFixed(2)}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {suggestion.type}
                    </div>
                  </button>
                ))}
              </div>
            )
          )}

          {/* No Results */}
          {!showHistory &&
            currentQuery.trim() &&
            suggestions.length === 0 &&
            !currentLoading && (
              <div className="p-4 text-center text-gray-400 text-sm">
                No results found for "{currentQuery}"
              </div>
            )}
        </div>
      )}
    </div>
  );
}
