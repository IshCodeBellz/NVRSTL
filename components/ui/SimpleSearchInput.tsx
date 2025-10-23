"use client";

import { useState, useRef, useEffect } from "react";

interface SimpleSearchInputProps {
  placeholder?: string;
  onFilterChange?: (query: string) => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  resetTrigger?: number;
}

export function SimpleSearchInput({
  placeholder = "Search...",
  onFilterChange,
  loading = false,
  disabled = false,
  className = "",
  resetTrigger,
}: SimpleSearchInputProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle reset trigger
  useEffect(() => {
    if (resetTrigger !== undefined) {
      setQuery("");
    }
  }, [resetTrigger]);

  // Debounced filter change
  useEffect(() => {
    if (!onFilterChange) return;

    const timeoutId = setTimeout(() => {
      onFilterChange(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, onFilterChange]);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || loading}
        className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
        </div>
      )}
    </div>
  );
}
