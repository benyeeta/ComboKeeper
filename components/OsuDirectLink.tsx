"use client";

import { osuDirectUrl } from "@/lib/beatmapUrls";

type OsuDirectLinkProps = {
  beatmapsetId?: number | null;
  className?: string;
  label?: string;
};

export default function OsuDirectLink({
  beatmapsetId,
  className = "",
  label = "Download in osu!",
}: OsuDirectLinkProps) {
  const url = osuDirectUrl(beatmapsetId);
  if (!url) return null;

  return (
    <a
      href={url}
      className={`inline-flex items-center gap-1 text-xs font-medium text-sky-500 hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300 transition-colors ${className}`}
      title={label}
      onClick={(e) => e.stopPropagation()}
    >
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </a>
  );
}
