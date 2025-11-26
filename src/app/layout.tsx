import type { Metadata } from "next";
import { Sorts_Mill_Goudy } from "next/font/google";
import "./globals.css";

const eb = Sorts_Mill_Goudy({
  subsets: ["latin"],
  weight: ['400']
});

export const metadata: Metadata = {
  title: "StudySpotter",
  description: "Find the perfect study spot near you",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={eb.className}>
        <div className="min-h-screen flex flex-col">
          {children}
          <footer className="py-6 bg-[rgb(93,109,67)]/95">
            <div className="max-w-6xl mx-auto">
              <p className="text-center text-sm text-[#000000]">
                © 2025 Meigan Lu. All Rights Reserved.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}