"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import Image from "next/image";
import SearchForm from "./search/SearchForm";
import FeatureCard from "./home/FeatureCard";
import FilterBar from "./results/FilterBar";
import MapView from "./results/MapView";
import ListView from "./results/ListView";
import Pagination from "./results/Pagination";
import { filterStudySpots, type SpotFilters } from "@/lib/filters";
import { searchStudySpots } from "@/lib/search";
import type { StudySpot } from "@/types";

const spotsPerPage = 6;

export default function HomePage() {
  const [location, setLocation] = useState("");
  const [intent, setIntent] = useState("");
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
  const [scrollY, setScrollY] = useState(0);
  const [hasError, setHasError] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);

  // Track scroll so the nav bar gets a background once the page scrolls
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Runs a search and shows the ranked results
  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!location.trim()) return;

    // Reset results from the last search
    setShowResults(true);
    setIsLoading(true);
    setSpots([]);
    setCurrentPage(1);
    setHasError(false);

    try {
      const result = await searchStudySpots(location, intent);
      setOfficialLocation(result.locationLabel);
      setSpots(result.spots);
    } catch (err) {
      console.error("Search error:", err);
      setSpots([]);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  // Changing a filter goes back to page 1, so you never land on an empty page
  const updateFilters: React.Dispatch<React.SetStateAction<SpotFilters>> = update => {
    setFilters(update);
    setCurrentPage(1);
  };

  // Changing pages scrolls back to the top of the results, so you start reading from the first spot
  const goToPage = (page: number) => {
    setCurrentPage(page);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Apply the rating and category filters
  const filteredSpots = useMemo(() => filterStudySpots(spots, filters), [spots, filters]);

  // For pagination
  const totalPages = Math.max(1, Math.ceil(filteredSpots.length / spotsPerPage));
  const indexOfLast = currentPage * spotsPerPage;
  const indexOfFirst = indexOfLast - spotsPerPage;
  const currentSpots = filteredSpots.slice(indexOfFirst, indexOfLast);

  // Center the map on the top-ranked spot
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
      <nav className={`sticky top-0 z-50 py-6 transition-colors duration-300 ${scrollY > 10 ? "bg-white/90 backdrop-blur-sm" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-8">
          <div className="flex items-center gap-4 md:gap-8">
            {/* Logo goes back to the home page and clears the search */}
            <button
              onClick={() => {
                setShowResults(false);
                setSpots([]);
                setLocation("");
                setIntent("");
                setFilters({ minRating: undefined, categories: [] });
                setCurrentPage(1);
              }}
              aria-label="Home"
            >
              <Image src="/logo.png" alt="StudySpotter" width={120} height={120} />
            </button>

            <div className="flex-1 min-w-0">
              <SearchForm
                location={location}
                intent={intent}
                onLocationChange={setLocation}
                onIntentChange={setIntent}
                onSubmit={handleSearch}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Home page, shown before a search */}
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

      {/* Results page */}
      {showResults && (
        <div className="max-w-6xl mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl text-[#292929] font-light">
              Study Spots in <span className="text-[rgb(90,114,53)]/95">{officialLocation}</span>
              <span className="text-sm text-[#515D5A] ml-2"> {isLoading ? "Loading..." : `(${filteredSpots.length} results)`}</span>
            </h2>

            {/* List and Map view toggle */}
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


          <FilterBar filters={filters} setFilters={updateFilters} />

          {/* Map keeps a fixed height; the list grows with the page, so there's no scroll box inside a scroll box */}
          {/* The map stays mounted in both views, so it doesn't reload when switching back */}
          <section
            ref={resultsRef}
            className={`relative rounded-2xl scroll-mt-32 ${viewMode === "map" ? "h-[calc(100vh-12rem)] overflow-hidden" : ""}`}
          >
            <div
              aria-hidden={viewMode !== "map"}
              className={`absolute inset-0 transition-opacity duration-300 ${viewMode === "map" ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"}`}
            >
              <MapView spots={filteredSpots} center={mapCenter} />
            </div>

            <div aria-hidden={viewMode !== "list"} className={viewMode === "list" ? "relative p-4" : "hidden"}>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <p className="text-[#515D5A]">Loading study spots...</p>
                </div>
              ) : hasError ? (
                <div className="text-center py-4">
                  <p className="text-[#515D5A]">Something went wrong with the search. Please try again.</p>
                </div>
              ) : spots.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-[#515D5A]">No study spots found. Try adjusting your search.</p>
                </div>
              ) : (
                <>
                  {/* Shows one page of spots at a time */}
                  <ListView spots={filteredSpots} currentSpots={currentSpots} />
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 py-4">
                      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={goToPage} />
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
