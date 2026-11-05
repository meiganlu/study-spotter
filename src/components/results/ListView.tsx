"use client";

import { useState } from "react";
import type { StudySpot } from "@/types";
import { getCategory } from "@/lib/categories";
import SpotModal from "./SpotModal";

export default function ListView({ spots, currentSpots }: { spots: StudySpot[]; currentSpots: StudySpot[] }) {
  const [selectedSpot, setSelectedSpot] = useState<StudySpot | null>(null);

  if (!spots.length) {
    return <div className="text-center py-4">No study spots found.</div>;
  }

  return (
    <>
      <div className="px-2 sm:px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {currentSpots.map(spot => (
            <button
              key={spot.id}
              onClick={() => setSelectedSpot(spot)}
              className="block w-full hover:scale-[1.01] transition-transform duration-300 text-left"
            >
              <div className="bg-[rgba(172,188,148,1)] hover:bg-[rgba(172,188,148,0.9)] rounded-2xl p-5 shadow-md hover:shadow-lg transition-all duration-300 flex gap-4 items-center h-60">
                {/* Text description */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#2C4A3E] mb-1 line-clamp-2">
                    {spot.name}
                  </h3>

                  {/* Category */}
                  {spot.types && spot.types.length > 0 && (
                    <p className="text-sm text-[rgb(93,109,67)] font-medium mb-2 capitalize">
                      {getCategory(spot)}
                    </p>
                  )}

                  {/* Rating */}
                  {spot.rating && (
                    <p className="text-sm text-[#515D5A] mb-2">
                      ★ {spot.rating}
                    </p>
                  )}

                  {/* Address */}
                  <p className="text-sm text-[#515D5A] line-clamp-2">
                    {spot.vicinity}
                  </p>

                  {/* Tags */}
                  {spot.reviewMentions && spot.reviewMentions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {spot.reviewMentions.slice(0, 3).map((keyword) => (
                        <span
                          key={keyword}
                          className="px-3 py-1 bg-[rgba(194,210,168,1)] text-[rgb(93,109,67)] text-xs rounded-full capitalize"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Google attribution, required when Places data is shown without a Google map */}
        <p className="text-xs text-[#515D5A] text-right mb-4">Google Maps</p>
      </div>

      {/* Modal */}
      {selectedSpot && (
        <SpotModal spot={selectedSpot} onClose={() => setSelectedSpot(null)} />
      )}
    </>
  );
}
