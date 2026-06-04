"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type User = {
  id: number;
  username: string;
  avatar_url: string;
};

export default function UserDropdown({ user }: { user: User }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking anywhere outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 p-1 pr-2 rounded-md transition-colors"
      >
        <img
          src={user.avatar_url}
          alt={`${user.username}'s Avatar`}
          width={32}
          height={32}
          className="w-8 h-8 rounded-full"
        />
        <span className="hidden sm:inline text-gray-900 dark:text-white font-medium">{user.username}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl py-1 z-50">
          <Link 
            href="/profile" 
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Profile
          </Link>
          <Link 
            href="/settings" 
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Settings
          </Link>
        </div>
      )}
    </div>
  );
}