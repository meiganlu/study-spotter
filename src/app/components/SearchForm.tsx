"use client";

import React from "react";
import Image from "next/image";

export default function SearchForm({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="relative">
        <input
          aria-label="Search location"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter location (e.g., San Francisco)"
          className="w-full pl-6 pr-14 py-3 rounded-full bg-white/90 backdrop-blur-md border border-black/60 text-[#494949] placeholder-[#292929]/50 focus:outline-none truncate"
        />
        <button
          type="submit"
          aria-label="Search"
          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-[#292929]/90 hover:bg-[#292929]/70 transition-all duration-300 border border-white/20"
        >
          <Image src="/search.png" alt="Search" className="invert" width={20} height={20} />
        </button>
      </div>
    </form>
  );
}
