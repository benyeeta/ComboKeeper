"use client";

import { updateTeamPlacement } from "@/app/actions";
import { useState, useEffect } from "react";

export default function ManageTeamModal({ 
  isOpen, 
  onClose,
  tournamentId,
  teamId,
  teamName,
  placement
}: { 
  isOpen: boolean; 
  onClose: () => void;
  tournamentId: string;
  teamId: string;
  teamName: string;
  placement?: string | null;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4 transition-opacity">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 text-white shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Manage <span className="text-blue-400">{teamName}</span></h2>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-700 hover:text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Team Placement</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            setIsSubmitting(true);
            await updateTeamPlacement(formData);
            setIsSubmitting(false);
            onClose();
          }} className="flex flex-col gap-3">
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <input type="hidden" name="teamId" value={teamId} />
            <input type="text" name="placement" defaultValue={placement || ""} placeholder="Placement (e.g. 1st, Top 8)" className="w-full rounded-md border border-gray-700 bg-gray-800 p-2 text-sm text-white focus:border-blue-500 focus:outline-none" />
            <button type="submit" disabled={isSubmitting} className="rounded bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
              Save Placement
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}