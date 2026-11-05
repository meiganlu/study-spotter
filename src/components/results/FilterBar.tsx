"use client";

import React, { useEffect, useRef, useState } from "react";
import { CATEGORY_OPTIONS } from "@/lib/categories";
import type { SpotFilters } from "@/lib/filters";

// Rating and category filters, plus Clear All, above the results
export default function FilterBar({
  filters,
  setFilters,
}: {
  filters: SpotFilters;
  setFilters: React.Dispatch<React.SetStateAction<SpotFilters>>;
}) {
  const [showRatingDropdown, setShowRatingDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // Close the dropdowns when clicking outside them or pressing Escape
  useEffect(() => {
    const closeAll = () => {
      setShowRatingDropdown(false);
      setShowCategoryDropdown(false);
    };
    const handleClick = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) closeAll();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div ref={barRef} className="flex flex-wrap items-center gap-2 mb-4">
      {/* Rating filter */}
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setShowRatingDropdown(prev => !prev)}
          className="rounded-full inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[rgb(93,109,67)]/70 hover:bg-[rgb(93,109,67)]/60"
        >
          Rating
          <svg className="w-2.5 h-2.5 ms-2.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4" />
          </svg>
        </button>

        {showRatingDropdown && (
          <div className="absolute z-10 mt-2 w-56 bg-white rounded-lg shadow-lg p-3">
            {[5, 4, 3, 2, 1].map(r => (
              <label key={r} className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded">
                <input
                  type="checkbox"
                  value={r}
                  checked={filters.minRating === r}
                  onChange={e => {
                    const checked = e.target.checked;
                    setFilters(f => ({
                      ...f,
                      minRating: checked ? r : undefined,
                    }));
                  }}
                  className="w-4 h-4 accent-[rgb(93,109,67)] rounded focus:ring-[rgb(93,109,67)]"
                />
                <span className="text-sm text-gray-700">{r}★ & up</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Category filter */}
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setShowCategoryDropdown(prev => !prev)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[rgb(93,109,67)]/70 rounded-full hover:bg-[rgb(93,109,67)]/60"
        >
          Categories
          <svg className="w-2.5 h-2.5 ms-2.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4" />
          </svg>
        </button>

        {showCategoryDropdown && (
          <div className="absolute z-10 mt-2 w-56 bg-white rounded-lg shadow-lg p-3">
            {CATEGORY_OPTIONS.map(cat => (
              <label key={cat} className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded">
                <input
                  type="checkbox"
                  value={cat}
                  checked={filters.categories?.includes(cat) ?? false}
                  onChange={e => {
                    const checked = e.target.checked;
                    setFilters(f => ({
                      ...f,
                      categories: checked
                        ? [...(f.categories ?? []), cat]
                        : (f.categories ?? []).filter(c => c !== cat),
                    }));
                  }}
                  className="w-4 h-4 accent-[rgb(93,109,67)] rounded focus:ring-[rgb(93,109,67)]"
                />
                <span className="text-sm text-gray-700">{cat}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() =>
          setFilters({
            minRating: undefined,
            categories: [],
          })
        }
        className="ml-2 px-4 py-2 rounded-full bg-[rgb(93,109,67)] text-white text-sm font-medium hover:bg-[rgb(93,109,67)]/80 transition"
      >
        Clear All
      </button>
    </div>
  );
}
