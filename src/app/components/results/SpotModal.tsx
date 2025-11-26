"use client";

import { useEffect } from "react";
import type { StudySpot } from "../../types";
import Image from "next/image";

interface SpotModalProps {
  spot: StudySpot;
  onClose: () => void;
}

export default function SpotModal({ spot, onClose }: SpotModalProps) {
  // Close modal on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#fffdf9] rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="w-full h-48 bg-gradient-to-br from-[#f5f1e8] to-[#e8e4db] flex items-center justify-center relative overflow-hidden">
          {spot.photoUrl ? (
            <div className="relative w-full h-48">
              <Image
                src={spot.photoUrl}
                alt={spot.name}
                fill
                className="object-cover rounded-t-3xl"
                sizes="(max-width: 768px) 100vw, 600px"
              />
            </div>
          ) : (
            <span className="text-7xl">
              {getEmojiFromTypes(spot.types)}
            </span>
          )}

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-all hover:scale-110 shadow-sm"
            aria-label="Close"
          >
            <span className="text-xl text-[#292929]">×</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#2C4A3E] mb-3">
            {spot.name}
          </h2>

          {/* Google Maps Button */}
          <a
            href={`https://www.google.com/maps/place/?q=place_id:${spot.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mb-6 px-6 py-3 bg-[rgb(93,109,67)] hover:bg-[rgb(93,109,67)]/90 text-white rounded-full transition-colors font-medium text-sm"
          >
            View on Google Maps →
          </a>

          {/* Category */}
          {spot.types && spot.types.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-[rgb(93,109,67)]/80 mb-1">CATEGORY</p>
              <p className="text-base text-[#2C4A3E] font-semibold capitalize">
                {getCategoryFromTypes(spot.types, spot.name)}
              </p>
            </div>
          )}

          {/* Rating */}
          {spot.rating && (
            <div className="mb-4">
              <p className="text-xs font-medium text-[rgb(93,109,67)]/80 mb-1">RATING</p>
              <p className="text-lg text-[#2C4A3E]"> ★ {spot.rating}</p>
            </div>
          )}

          {/* Address */}
          <div className="mb-4">
            <p className="text-xs font-medium text-[rgb(93,109,67)]/80 mb-1">ADDRESS</p>
            <p className="text-base text-[#2C4A3E]">{spot.vicinity}</p>
          </div>

          {/* Top Features */}
          {spot.reviewMentions && spot.reviewMentions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-[rgb(93,109,67)]/80 mb-2">TOP FEATURES</p>
              <div className="flex flex-wrap gap-2">
                {spot.reviewMentions.map((keyword) => (
                  <span
                    key={keyword}
                    className="px-4 py-2 bg-[rgb(93,109,67)]/10 text-[rgb(93,109,67)] text-sm rounded-full capitalize"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getCategoryFromTypes(types?: string[], name?: string): string {
  if (!types && !name) return "Study Spot";

  const nameLower = name?.toLowerCase() || "";

  if (nameLower.includes("library")) return "Library";
  if (nameLower.includes("student") || nameLower.includes("university") || nameLower.includes("school")) return "Study Lounge";
  if (nameLower.includes("cafe") || nameLower.includes("coffee")) return "Café/Coffee Shop";

  if (types?.includes("library")) return "Library";
  if (types?.includes("cafe") || types?.includes("coffee_shop")) return "Café/Coffee Shop";
  if (types?.includes("community_center")) return "Community Center";
  if (types?.includes("park")) return "Outdoor Area";
  if (types?.includes("university") || types?.includes("school")) return "Student Lounge";

  return "Study Spot";
}

function getEmojiFromTypes(types?: string[]): string {
  if (!types) return "📍";

  if (types.includes("library")) return "📚";
  if (types.includes("cafe") || types.includes("coffee_shop")) return "☕";
  if (types.includes("community_center")) return "🏛️";
  if (types.includes("park")) return "🌳";
  if (types.includes("university") || types.includes("school")) return "🎓";

  return "📍";
}