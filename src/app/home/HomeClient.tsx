"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import SearchForm from "../components/SearchForm";
import FeatureCard from "../components/FeatureCard";
import MapView from "../components/results/MapView";
import ListView from "../components/results/ListView";
import Pagination from "../components/Pagination";
import { geocodeAddress, textSearchMultiple, SpotFilters, filterStudySpots } from "../hooks/usePlacesSearch";
import type { StudySpot } from "../types";

const spotsPerPage = 6;

export default function HomeClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [officialLocation, setOfficialLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [spots, setSpots] = useState<StudySpot[]>([]);
  const [filters, setFilters] = useState<SpotFilters>({
    minRating: undefined,
    categories: [],
  });
  const [showResults, setShowResults] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showRatingDropdown, setShowRatingDropdown] = useState(false);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setShowResults(true);
    setIsLoading(true);
    setSpots([]);
    setCurrentPage(1);

    try {
      const geocodeResults = await geocodeAddress(searchQuery);
      if (geocodeResults?.[0]) {
        const loc = geocodeResults[0];

        // Set the location name
        const addressComponents = loc.address_components || [];
        let city = "";
        let state = "";
        addressComponents.forEach(c => {
          if (c.types.includes("locality")) city = c.long_name;
          if (c.types.includes("administrative_area_level_1")) state = c.short_name;
        });
        setOfficialLocation(city || state ? `${city}${city && state ? ", " : ""}${state}` : searchQuery);

        // Run several queries to cover different spot types
        const queries = [
          `${searchQuery} "public library" "school library"`,
          `${searchQuery} "cafe" "study" "study spot" "co-working space"`,
          `${searchQuery} "student center" "student union"`,
        ];
        const studySpots = await textSearchMultiple(queries);
        setSpots(studySpots);
      } else {
        // Set location to search query and empty spots if all else fails
        setOfficialLocation(searchQuery);
        setSpots([]);
      }
    } catch (err) {
      console.error("Search error:", err);
      setSpots([]);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredSpots = useMemo(() => filterStudySpots(spots, filters), [spots, filters]);

  // For pagination
  const totalPages = Math.max(1, Math.ceil(filteredSpots.length / spotsPerPage));
  const indexOfLast = currentPage * spotsPerPage;
  const indexOfFirst = indexOfLast - spotsPerPage;
  const currentSpots = filteredSpots.slice(indexOfFirst, indexOfLast);

  const mapCenter = useMemo(() => {
    if (spots.length && spots[0]?.geometry?.location) {
      return spots[0].geometry.location;
    }
    return undefined;
  }, [spots]);

  // Let the Map and List view both exist in DOM
  // Toggling visibility is cleaner than unmounting/remounting
  return (
    <div className="h-full min-h-screen">
      <nav className="sticky top-0 z-50 py-6 bg-transparent">
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex items-center gap-8">
            <button
              onClick={() => {
                setShowResults(false);
                setSpots([]);
                setSearchQuery("");
              }}
              aria-label="Home"
            >
              <Image src="/logo.png" alt="StudySpotter" width={120} height={120} />
            </button>

            <div className="flex-1">
              <SearchForm value={searchQuery} onChange={setSearchQuery} onSubmit={handleSearch} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </nav>

      {!showResults && (
        <>
          <main className="flex-1">
            <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
              <div className="w-full max-w-6xl mx-auto">
                <div className="flex flex-col items-center">
                  <div className="text-center max-w-5xl mb-24">
                    <h1 className="text-3xl md:text-6xl text-[#292929]/90 mt-6 mb-6">
                      Find your perfect study spot <i>faster</i>.
                    </h1>
                    <p className="text-xl md:text-xl text-[#292929]/80 max-w-2xl mx-auto font-light">
                      Instantly discover local cafés, libraries,<br></br>and other hidden gems tailored to your preferences.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </main>

          <section className="flex-1 bg-[rgb(93,109,67)]/95 rounded-t-[10%_5%] md:rounded-t-[20%_15%]">
            <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4">
              <div className="w-full max-w-6xl mx-auto">
                <div className="flex flex-col items-center">
                  <div className="text-center max-w-5xl mb-24">
                    <div className="w-full px-4 md:px-8">
                      <h1 className="text-xl md:text-3xl text-[#fffdf9] mt-12 mb-16 md:mb-24 md:mt-10">
                        Choose the best workspaces in your area
                      </h1>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                        <FeatureCard title="Local libraries" icon="/icons/book.png" />
                        <FeatureCard title="Coffee shops & cafés" icon="/icons/coffee-cup.png" />
                        <FeatureCard title="Co-working spaces" icon="/icons/people.png" />
                        <FeatureCard title="Public student lounges" icon="/icons/notebook.png" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {showResults && (
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl text-[#292929] font-light">
              Study Spots in <span className="text-[rgb(90,114,53)]/95">{officialLocation}</span>
              <span className="text-sm text-[#515D5A] ml-2"> ({filteredSpots.length} results)</span>
            </h2>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("list")}
                aria-pressed={viewMode === "list"}
                className={`px-6 py-2 rounded-full transition-all duration-300 ${viewMode === "list"
                  ? "bg-[#292929]/90 backdrop-blur-md text-white"
                  : "bg-[#292929]/60 text-white/70 hover:bg-[#292929]/40"
                  }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode("map")}
                aria-pressed={viewMode === "map"}
                className={`px-6 py-2 rounded-full transition-all duration-300 ${viewMode === "map"
                  ? "bg-[#292929]/90 backdrop-blur-md text-white"
                  : "bg-[#292929]/60 text-white/70 hover:bg-[#292929]/40"
                  }`}
              >
                Map View
              </button>
            </div>
          </div>


          <div className="flex flex-wrap items-center gap-2 mb-4">
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
                  {["Library", "Café/Coffee Shop", "Student Lounge"].map(cat => (
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






          {/* Keep map mounted in either Map or List view */}
          <section className="relative h-[calc(100vh-12rem)] rounded-2xl overflow-hidden">
            <div
              aria-hidden={viewMode !== "map"}
              className={`absolute inset-0 transition-opacity duration-300 ${viewMode === "map" ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}
            >
              <MapView spots={filteredSpots} center={mapCenter} />
            </div>

            <div
              aria-hidden={viewMode !== "list"}
              className={`absolute inset-0 transition-opacity duration-300 ${viewMode === "list" ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}
            >
              <div className="h-full overflow-auto pr-2 p-4">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <p className="text-[#515D5A]">Loading study spots...</p>
                  </div>
                ) : spots.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-[#515D5A]">No study spots found. Try adjusting your search.</p>
                  </div>
                ) : (
                  <>
                    <ListView spots={filteredSpots} currentSpots={currentSpots} />
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 py-4">
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
