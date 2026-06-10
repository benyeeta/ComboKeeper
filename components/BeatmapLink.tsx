"use client";

import { beatmapUrl } from "@/lib/beatmapUrls";

type BeatmapLinkProps = {
  beatmapId?: number | string | null;
  className?: string;
  label?: string;
};

export default function BeatmapLink({ beatmapId, className = "", label = "Open on osu!" }: BeatmapLinkProps) {
  const url = beatmapUrl(beatmapId);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-xs font-medium text-pink-500 hover:text-pink-600 dark:text-pink-400 dark:hover:text-pink-300 transition-colors ${className}`}
      title={label}
      onClick={(e) => e.stopPropagation()}
    >
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </a>
  );
}
