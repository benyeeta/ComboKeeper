"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { exportFeedbackMarkdown, updateFeedbackStatus } from "@/app/actions/feedback";

type FeedbackItem = {
  id: string;
  type: string;
  message: string;
  username: string | null;
  hasImage: boolean;
  status: string;
  createdAt: Date;
};

const TYPE_STYLES: Record<string, string> = {
  Bug: "bg-red-900/40 text-red-300 border-red-800",
  Suggestion: "bg-green-900/40 text-green-300 border-green-800",
  Other: "bg-gray-800 text-gray-300 border-gray-700",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-900/40 text-yellow-300 border-yellow-800",
  DONE: "bg-green-900/40 text-green-300 border-green-800",
  DISMISSED: "bg-gray-800 text-gray-400 border-gray-700",
};

export default function FeedbackAdmin({
  initialItems,
  initialMarkdown,
}: {
  initialItems: FeedbackItem[];
  initialMarkdown: string;
}) {
  const router = useRouter();
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [includeResolved, setIncludeResolved] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  const handleRefreshExport = async () => {
    const res = await exportFeedbackMarkdown(includeResolved ? "ALL" : "PENDING");
    if (res.markdown) setMarkdown(res.markdown);
  };

  const handleStatusChange = async (id: string, status: "PENDING" | "DONE" | "DISMISSED") => {
    await updateFeedbackStatus(id, status);
    router.refresh();
    const res = await exportFeedbackMarkdown(includeResolved ? "ALL" : "PENDING");
    if (res.markdown) setMarkdown(res.markdown);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Cursor Export</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Copy this markdown into a Cursor chat or Agent prompt.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={includeResolved}
                onChange={(e) => setIncludeResolved(e.target.checked)}
                className="rounded border-gray-600"
              />
              Include resolved
            </label>
            <button
              type="button"
              onClick={handleRefreshExport}
              className="rounded px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded bg-pink-600 px-4 py-2 text-sm font-bold text-white hover:bg-pink-700 transition-colors"
            >
              {copyState === "copied" ? "Copied!" : copyState === "error" ? "Copy failed" : "Copy for Cursor"}
            </button>
          </div>
        </div>
        <pre className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">
          {markdown}
        </pre>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">All Feedback ({initialItems.length})</h2>
        {initialItems.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No feedback submitted yet.</p>
        ) : (
          <div className="space-y-4">
            {initialItems.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${TYPE_STYLES[item.type] ?? TYPE_STYLES.Other}`}>
                    {item.type}
                  </span>
                  <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[item.status] ?? STATUS_STYLES.PENDING}`}>
                    {item.status}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {item.username ?? "Anonymous"} · {new Date(item.createdAt).toLocaleString()}
                    {item.hasImage ? " · screenshot on Discord" : ""}
                  </span>
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{item.message}</p>
                <div className="flex flex-wrap gap-2">
                  {(["PENDING", "DONE", "DISMISSED"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={item.status === status}
                      onClick={() => handleStatusChange(item.id, status)}
                      className="rounded px-3 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-40 transition-colors"
                    >
                      Mark {status.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
