"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface IsolatedSearchInputProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
  resetTrigger?: number;
}

export function IsolatedSearchInput({
  placeholder = "Search...",
  onSearch,
  className = "",
  resetTrigger,
}: IsolatedSearchInputProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle reset trigger
  useEffect(() => {
    if (resetTrigger !== undefined) {
      setQuery("");
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [resetTrigger]);

  // Debounced search callback
  const debouncedSearch = useCallback(
    (searchQuery: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (onSearch) {
          onSearch(searchQuery);
        }
      }, 500); // Increased debounce time
    },
    [onSearch]
  );

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
        autoComplete="off"
        spellCheck="false"
      />
    </div>
  );
}
