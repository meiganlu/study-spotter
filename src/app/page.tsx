"use client";
import dynamic from "next/dynamic";

const HomeClient = dynamic(() => import("./home/HomeClient"), { ssr: false });

export default function Page() {
  return <HomeClient />;
}