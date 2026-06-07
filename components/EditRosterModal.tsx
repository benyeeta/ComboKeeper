"use client";

import { updateTeamRoster } from "@/app/actions";
import { useState, useEffect } from "react";

type RosterPlayer = { username: string; isAdmin: boolean; status?: string };

export default function EditRosterModal({ 
  isOpen, 
  onClose,
  teamId,
  teamName,
  initialPlayers,
  currentUsername
}: { 
  isOpen: boolean; 
  onClose: () => void;
  teamId: string;
  teamName: string;
  initialPlayers: { username: string; isAdmin: boolean; status: string }[];
  currentUsername?: string;
}) {
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPlayers(initialPlayers.length > 0 ? initialPlayers.map(p => ({ username: p.username, isAdmin: p.isAdmin, status: p.status })) : [{ username: "", isAdmin: true }]);
      setError("");
    }
  }, [isOpen, initialPlayers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddPlayer = () => setPlayers([...players, { username: "", isAdmin: false }]);
  const handleRemovePlayer = (index: number) => setPlayers(players.filter((_, i) => i !== index));
  const updatePlayer = (index: number, field: keyof RosterPlayer, value: string | boolean) => {
    const newPlayers = [...players];
    newPlayers[index] = { ...newPlayers[index], [field]: value } as any;
    setPlayers(newPlayers);
  };

  const handleToggleAllAdmins = () => {
    const allAdmins = players.every(p => p.isAdmin);
    setPlayers(players.map((p) => (!!currentUsername && p.username.toLowerCase() === currentUsername.toLowerCase()) ? p : { ...p, isAdmin: !allAdmins }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4 transition-opacity">
      <div className="w-full max-w-2xl rounded-lg border border-gray-700 bg-gray-900 p-6 text-white shadow-xl max-h-[90vh] flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Edit Roster: <span className="text-pink-400">{teamName}</span></h2>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        {error && (
          <div className="mb-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          setError("");
          setIsSubmitting(true);
          const result = await updateTeamRoster(formData);
          setIsSubmitting(false);
          if (result?.error) setError(result.error);
          else onClose();
        }} className="flex flex-col gap-4 overflow-y-auto pr-2">
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="players" value={JSON.stringify(players)} />

          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-medium text-gray-300">Team Players</label>
            <div className="flex items-center gap-2">
              {players.length > 1 && (
                <button type="button" onClick={handleToggleAllAdmins} className="text-xs font-bold text-gray-400 hover:text-gray-300 px-2 py-1 bg-gray-800 rounded transition-colors">{players.every(p => p.isAdmin) ? "Unselect All Admins" : "Select All Admins"}</button>
              )}
              <button type="button" onClick={handleAddPlayer} className="text-xs font-bold text-pink-400 hover:text-pink-300 px-2 py-1 bg-pink-900/30 rounded transition-colors">+ Add Player</button>
            </div>
          </div>
          
          <div className="space-y-2">
            {players.map((p, i) => {
              const isCurrentUser = !!currentUsername && p.username.toLowerCase() === currentUsername.toLowerCase();
              return (
                <div key={i} className="flex items-center gap-2 bg-gray-800 p-2 rounded border border-gray-700">
                  <input type="text" placeholder="osu! Username" value={p.username} disabled={isCurrentUser} onChange={e => updatePlayer(i, 'username', e.target.value)} className={`flex-1 rounded bg-gray-900 border border-gray-600 p-1.5 text-sm text-white focus:border-pink-500 focus:outline-none ${isCurrentUser ? 'opacity-50 cursor-not-allowed' : ''}`} required />
                  {p.status === "PENDING" && <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border border-yellow-700 bg-yellow-900/50 text-yellow-500">Pending</span>}
                  <label className={`flex items-center gap-1.5 text-xs text-gray-300 w-20 ${isCurrentUser ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input type="checkbox" checked={p.isAdmin} disabled={isCurrentUser} onChange={e => updatePlayer(i, 'isAdmin', e.target.checked)} className="rounded border-gray-600 bg-gray-900 text-pink-500 focus:ring-pink-500 focus:ring-offset-gray-900 disabled:opacity-50" />
                    Admin
                  </label>
                  {isCurrentUser ? (
                    <div className="w-7 h-7 flex-shrink-0"></div>
                  ) : (
                    <button type="button" onClick={() => handleRemovePlayer(i)} className="text-gray-500 hover:text-red-400 p-1 transition-colors flex-shrink-0" title="Remove">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </div>
              );
            })}
            {players.length === 0 && <p className="text-xs text-gray-500 italic">No players remaining.</p>}
          </div>

          <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/10 transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="rounded bg-pink-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-pink-700 disabled:opacity-50 flex items-center gap-2">
              {isSubmitting ? "Saving..." : "Save Roster"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}