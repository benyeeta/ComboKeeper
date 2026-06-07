"use client";

import { useState, useRef, useEffect } from 'react';
import type { SessionData } from '@/lib/session';
import Link from 'next/link';

export default function UserDropdown({ user }: { user: SessionData }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the dropdown if the user clicks outside of it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 focus:outline-none p-1 rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
      >
        <img
          src={user.avatar_url || `https://a.ppy.sh/${user.id}`}
          alt={`${user.username}'s avatar`}
          className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 object-cover"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 mb-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.username}</p>
          </div>
          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            Profile
          </Link>
          <Link
            href="/settings"
            onClick={() => setIsOpen(false)}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            Settings
          </Link>
          <a
            href="/api/auth/logout"
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            Sign Out
          </a>
        </div>
      )}
    </div>
  );
}