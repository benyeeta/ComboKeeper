"use client";

import { finishTournament, reopenTournament, deleteTournament } from "@/app/actions";
import { useState } from "react";

export default function ManageTournamentModal({ 
  isOpen, 
  onClose,
  tournamentId,
  tournamentName,
  isCompleted,
  placement
}: { 
  isOpen: boolean; 
  onClose: () => void;
  tournamentId: string;
  tournamentName: string;
  isCompleted?: boolean;
  placement?: string | null;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (confirm(`Are you absolutely sure you want to delete ${tournamentName}? This will delete all stages, maps, and scores associated with it.`)) {
      setIsSubmitting(true);
      await deleteTournament(tournamentId);
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4 transition-opacity">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 text-white shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Manage <span className="text-pink-400">{tournamentName}</span></h2>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-700 hover:text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="mb-6 pb-6 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Tournament Status</h3>
          {isCompleted ? (
            <form action={async (formData) => {
              setIsSubmitting(true);
              await reopenTournament(formData);
              setIsSubmitting(false);
              onClose();
            }} className="flex flex-col gap-3">
              <p className="text-sm text-gray-400">This tournament is marked as finished (Placement: <span className="font-semibold text-white">{placement || "None"}</span>).</p>
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <button type="submit" disabled={isSubmitting} className="w-full rounded border border-yellow-700 bg-yellow-900/30 px-4 py-2 text-sm font-bold text-yellow-500 transition-colors hover:bg-yellow-900/50 disabled:opacity-50">
                Reopen Tournament
              </button>
            </form>
          ) : (
            <form action={async (formData) => {
              setIsSubmitting(true);
              await finishTournament(formData);
              setIsSubmitting(false);
              onClose();
            }} className="flex gap-2">
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <input type="text" name="placement" placeholder="Placement (e.g. 1st, Top 8)" className="flex-1 rounded-md border border-gray-700 bg-gray-800 p-2 text-sm text-white focus:border-pink-500 focus:outline-none" />
              <button type="submit" disabled={isSubmitting} className="rounded bg-green-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-50">
                Finish
              </button>
            </form>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-red-400 mb-2">Danger Zone</h3>
          <p className="text-xs text-gray-400 mb-3">Accidentally created this tournament? Delete it entirely.</p>
          <button onClick={handleDelete} disabled={isSubmitting} className="w-full rounded border border-red-900 bg-red-900/30 px-4 py-2 text-sm font-bold text-red-400 transition-colors hover:bg-red-900/50 disabled:opacity-50">Delete Tournament</button>
        </div>
      </div>
    </div>
  );
}