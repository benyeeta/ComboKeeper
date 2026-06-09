"use client";

import { toggleTournamentStatus, deleteTournament, updateTournamentDetails, getTournamentKeepers, addTournamentKeeper, removeTournamentKeeper } from "@/app/actions";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ManageTournamentModal({ 
  isOpen, 
  onClose,
  tournamentId,
  tournamentName,
  tournamentAcronym,
  tournamentFormat,
  isCompleted,
}: { 
  isOpen: boolean; 
  onClose: () => void;
  tournamentId: string;
  tournamentName: string;
  tournamentAcronym?: string | null;
  tournamentFormat?: string;
  isCompleted?: boolean;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keepers, setKeepers] = useState<{id: number, username: string, avatarUrl: string|null}[]>([]);
  const [isKeepersLoading, setIsKeepersLoading] = useState(true);
  const [newKeeperUsername, setNewKeeperUsername] = useState("");
  const [format, setFormat] = useState(tournamentFormat || "1v1");

  useEffect(() => {
    if (isOpen) {
      setIsKeepersLoading(true);
      getTournamentKeepers(tournamentId)
        .then(res => {
          if (res?.keepers) setKeepers(res.keepers);
          setIsKeepersLoading(false);
        })
        .catch(err => {
          console.error(err);
          setIsKeepersLoading(false);
        });
      setFormat(tournamentFormat || "1v1");
    }
  }, [isOpen, tournamentId, tournamentFormat]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (confirm(`Are you absolutely sure you want to delete ${tournamentName}? This will delete all stages, maps, scores, and teams associated with it.`)) {
      setIsSubmitting(true);
      const result = await deleteTournament(tournamentId);
      setIsSubmitting(false);
      if (result?.error) {
        alert(result.error);
        return;
      }
      onClose();
      router.push("/");
      router.refresh();
    }
  };

  const handleToggleCompleted = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (checked) {
      if (!confirm("Are you sure you want to mark this tournament as finished? You can always uncheck this later if needed.")) {
        return;
      }
    }
    setIsSubmitting(true);
    await toggleTournamentStatus(tournamentId, checked);
    setIsSubmitting(false);
  };

  const handleAddKeeper = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newKeeperUsername.trim()) return;
    setIsSubmitting(true);
    const fd = new FormData();
    fd.append("tournamentId", tournamentId);
    fd.append("username", newKeeperUsername.trim());
    const res = await addTournamentKeeper(fd);
    if (res.error) {
      alert(res.error);
    } else {
      setNewKeeperUsername("");
      const updated = await getTournamentKeepers(tournamentId);
      if (updated.keepers) setKeepers(updated.keepers);
    }
    setIsSubmitting(false);
  };

  const handleRemoveKeeper = async (playerId: number) => {
    if (confirm("Remove this user as a keeper? They will lose the ability to manage this tournament.")) {
      setIsSubmitting(true);
      const res = await removeTournamentKeeper(tournamentId, playerId);
      if (res.error) {
        alert(res.error);
      } else {
        const updated = await getTournamentKeepers(tournamentId);
        if (updated.error) {
          // Automatically close modal if the user just removed themselves
          onClose();
        } else if (updated.keepers) {
          setKeepers(updated.keepers);
        }
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4 transition-opacity">
      <div className="w-full max-w-md rounded-lg border border-border-main bg-background p-6 text-content shadow-xl flex flex-col max-h-[90vh]">
        <div className="mb-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold">Manage <span className="text-accent">{tournamentName}</span></h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-hover-overlay/10 hover:text-content transition-colors">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto pr-2 flex-grow">
          <div className="mb-6 pb-6 border-b border-border-main">
            <h3 className="text-sm font-semibold text-content mb-3">Tournament Status</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isCompleted} 
                onChange={handleToggleCompleted}
                disabled={isSubmitting}
                className="w-5 h-5 rounded border-border-main text-accent focus:ring-accent focus:ring-offset-background bg-surface disabled:opacity-50 cursor-pointer"
              />
              <span className="text-sm font-medium text-content">
                Mark Tournament as Finished
              </span>
            </label>
          </div>
  
          <div className="mb-6 pb-6 border-b border-border-main">
            <h3 className="text-sm font-semibold text-content mb-3">Edit Details</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              setIsSubmitting(true);
              const res = await updateTournamentDetails(formData);
              setIsSubmitting(false);
              if (res?.error) alert(res.error);
              else onClose();
            }} className="flex flex-col gap-3">
              <input type="hidden" name="tournamentId" value={tournamentId} />
              <div>
                <label className="text-xs text-muted block mb-1">Tournament Name</label>
                <input type="text" name="name" defaultValue={tournamentName} className="w-full rounded bg-surface border border-border-main p-2 text-sm text-content focus:border-accent focus:outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted block mb-1">Acronym</label>
                  <input type="text" name="acronym" defaultValue={tournamentAcronym || ""} className="w-full rounded bg-surface border border-border-main p-2 text-sm text-content focus:border-accent focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Format</label>
                  <select name="format" value={format} onChange={(e) => setFormat(e.target.value)} className="w-full rounded bg-surface border border-border-main p-2 text-sm text-content focus:border-accent focus:outline-none" required>
                    <option value="1v1">1v1</option>
                    <option value="2v2">2v2</option>
                    <option value="3v3">3v3</option>
                    <option value="4v4">4v4</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full rounded bg-accent px-4 py-2 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50">Save Changes</button>
            </form>
          </div>

          <div className="mb-6 pb-6 border-b border-border-main">
            <h3 className="text-sm font-semibold text-content mb-3">Tournament Keepers</h3>
            {isKeepersLoading ? (
              <p className="text-sm text-muted">Loading keepers...</p>
            ) : (
              <div className="space-y-2 mb-3">
                {keepers.map(k => (
                  <div key={k.id} className="flex items-center justify-between bg-surface p-2 rounded border border-border-main">
                    <div className="flex items-center gap-2">
                      <img src={k.avatarUrl || `https://a.ppy.sh/${k.id}`} alt="" className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-sm font-medium text-content">{k.username}</span>
                    </div>
                    <button type="button" onClick={() => handleRemoveKeeper(k.id)} disabled={isSubmitting || keepers.length <= 1} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleAddKeeper} className="flex gap-2">
              <input type="text" placeholder="osu! Username" value={newKeeperUsername} onChange={e => setNewKeeperUsername(e.target.value)} className="flex-1 rounded bg-surface border border-border-main p-2 text-sm text-content focus:border-accent focus:outline-none" />
              <button type="submit" disabled={isSubmitting || !newKeeperUsername.trim()} className="rounded bg-accent px-3 py-2 text-sm font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50">Add</button>
            </form>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-red-400 mb-2">Danger Zone</h3>
            <p className="text-xs text-muted mb-3">Deletes the tournament and all registered teams tied to it.</p>
            <button onClick={handleDelete} disabled={isSubmitting} className="w-full rounded border border-red-900 bg-red-900/30 px-4 py-2 text-sm font-bold text-red-400 transition-colors hover:bg-red-900/50 disabled:opacity-50">Delete Tournament</button>
          </div>
        </div>
      </div>
    </div>
  );
}