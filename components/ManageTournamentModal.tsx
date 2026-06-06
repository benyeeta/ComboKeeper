"use client";

import { toggleTournamentStatus, deleteTournament } from "@/app/actions";
import { useState } from "react";

export default function ManageTournamentModal({ 
  isOpen, 
  onClose,
  tournamentId,
  tournamentName,
  isCompleted,
}: { 
  isOpen: boolean; 
  onClose: () => void;
  tournamentId: string;
  tournamentName: string;
  isCompleted?: boolean;
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

  const handleToggleCompleted = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSubmitting(true);
    await toggleTournamentStatus(tournamentId, e.target.checked);
    setIsSubmitting(false);
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
          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isCompleted} 
              onChange={handleToggleCompleted}
              disabled={isSubmitting}
              className="w-5 h-5 rounded border-gray-600 text-pink-500 focus:ring-pink-500 focus:ring-offset-gray-900 bg-gray-700 disabled:opacity-50 cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-200">
              Mark Tournament as Finished
            </span>
          </label>
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