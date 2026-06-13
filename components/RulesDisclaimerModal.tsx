"use client";

import { useCallback, useEffect, useState } from "react";

const DISCLAIMER_COOKIE = "show_rules_disclaimer";

function clearDisclaimerCookie() {
  document.cookie = `${DISCLAIMER_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export default function RulesDisclaimerModal({ initialOpen = false }: { initialOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const dismiss = useCallback(() => {
    setIsOpen(false);
    clearDisclaimerCookie();
  }, []);

  const openFeedback = useCallback(() => {
    dismiss();
    window.dispatchEvent(new CustomEvent("combokeeper:open-feedback", { detail: { type: "Bug" } }));
  }, [dismiss]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, dismiss]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 transition-opacity">
      <div
        className="w-full max-w-lg rounded-lg border border-amber-500/40 bg-gray-900 p-6 text-white shadow-xl"
        role="dialog"
        aria-labelledby="rules-disclaimer-title"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h2 id="rules-disclaimer-title" className="text-xl font-bold text-white">
              Heads up about tournament rules
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              ComboKeeper is currently optimized for{" "}
              <span className="font-semibold text-amber-300">osu!catch World Cup (CWC)</span> rules — especially
              Mixed Mod lineups and 3v3 formats. Other game modes and rulesets (OWC, TWC, custom tournaments) may
              produce less accurate Captain&apos;s Intel, lineup projections, and pick suggestions.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              If something looks wrong for your tournament, please report it so we can improve support for your
              ruleset.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={dismiss}
            className="rounded px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10"
          >
            Got it
          </button>
          <button
            type="button"
            onClick={openFeedback}
            className="rounded bg-pink-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-pink-700"
          >
            Report a mistake
          </button>
        </div>
      </div>
    </div>
  );
}
