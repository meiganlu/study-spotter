"use client";

import React from "react";
import Image from "next/image";

export default function SearchForm({
  location,
  intent,
  onLocationChange,
  onIntentChange,
  onSubmit,
}: {
  location: string;
  intent: string;
  onLocationChange: (v: string) => void;
  onIntentChange: (v: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="flex items-center bg-white/90 backdrop-blur-md border border-black/60 rounded-full overflow-hidden">
        <input
          aria-label="Search intent"
          type="text"
          value={intent}
          onChange={(e) => onIntentChange(e.target.value)}
          placeholder="Quiet cafe, outlets..."
          className="flex-1 pl-6 pr-3 py-3 bg-transparent text-[#494949] placeholder-[#292929]/50 focus:outline-none"
        />
        <div className="w-px h-6 bg-black/20" />
        <input
          aria-label="Search location"
          type="text"
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          placeholder="City or zip"
          className="flex-1 pl-4 pr-3 py-3 bg-transparent text-[#494949] placeholder-[#292929]/50 focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Search"
          className="mr-2 flex items-center justify-center w-10 h-10 rounded-full bg-[#292929]/90 hover:bg-[#292929]/70 transition-all duration-300 border border-white/20"
        >
          <Image src="/search.png" alt="Search" className="invert" width={20} height={20} />
        </button>
      </div>
    </form>
  );
}