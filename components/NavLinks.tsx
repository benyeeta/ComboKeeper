"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { Suspense } from "react";

function NavLinksContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const t = searchParams.get("t");
  
  const suffix = t ? `?t=${t}` : "";

  const navItems = [
    { name: 'Dashboard', href: '/' },
    { name: 'Team', href: '/team' },
  ];

  return (
    <nav className="hidden md:flex items-center gap-4">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={`${item.href}${suffix}`}
            className={`${isActive ? "text-pink-500 font-semibold" : "text-gray-600 dark:text-gray-300"} hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-white rounded-md px-3 py-2 text-sm font-medium transition-colors`}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

export default function NavLinks() {
  return (
    <Suspense fallback={<nav className="hidden md:flex items-center gap-4"></nav>}>
      <NavLinksContent />
    </Suspense>
  );
}