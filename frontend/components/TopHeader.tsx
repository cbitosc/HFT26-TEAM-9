import React from "react";
import { Search, Bell } from "lucide-react";

interface TopHeaderProps {
  title: string;
  showSearch?: boolean;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
}

export default function TopHeader({
  title,
  showSearch = true,
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Start searching here...",
}: TopHeaderProps) {
  return (
    <header 
      style={{ position: "fixed", top: 0, left: "260px", right: 0, height: "72px", margin: 0 }}
      className="fixed top-0 left-[260px] right-0 h-[72px] m-0 z-20 bg-white border-b border-[#F0F0F0] px-6 sm:px-8 flex items-center justify-between"
    >
      {/* Title / Section Name */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#111111] font-sans">
          {title}
        </h1>
      </div>

      {/* Right Search Bar & Utility Icons */}
      <div className="flex items-center gap-3">
        {showSearch && onSearchChange && (
          <div className="relative w-72 sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-[#8A8A8A]" />
            </div>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[#F5F8FF] border border-[#E0E7FF] rounded-full text-xs text-[#111111] placeholder-[#8A8A8A] focus:outline-none focus:border-[#2A4BFF] transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-[#8A8A8A] hover:text-[#111111]"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Action icons */}
        <div className="w-9 h-9 rounded-full bg-[#F5F5F3] flex items-center justify-center text-[#111111] hover:bg-[#EAEAEA] cursor-pointer transition">
          <Bell className="w-4 h-4 text-[#8A8A8A]" />
        </div>

        {/* User Avatar circle */}
        <div 
          title="Investigator Profile"
          className="w-9 h-9 rounded-full bg-[#121212] text-white flex items-center justify-center text-xs font-bold select-none cursor-pointer"
        >
          JD
        </div>
      </div>
    </header>
  );
}
