"use client";

import { useState } from "react";

type MappoolDownloadButtonProps = {
  tournamentId: string;
  stageId: string;
  stageName: string;
  hasBeatmapIds: boolean;
};

export default function MappoolDownloadButton({
  tournamentId,
  stageId,
  stageName,
  hasBeatmapIds,
}: MappoolDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasBeatmapIds) return null;

  const handleDownload = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/stages/${stageId}/mappool/download`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Download failed.");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `${stageName}_mappool.zip`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDownload}
        disabled={isLoading}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-sm hover:border-pink-400 dark:hover:border-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
          />
        </svg>
        {isLoading ? "Building zip…" : "Download .osz zip"}
      </button>
      {error && <p className="text-xs text-red-500 dark:text-red-400 max-w-xs text-right">{error}</p>}
    </div>
  );
}
