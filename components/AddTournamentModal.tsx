"use client";

import { createTournament, registerTeam, getPopularTournaments } from "@/app/actions";
import { useState, useEffect } from "react";

export default function AddTournamentModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [players, setPlayers] = useState([{ username: "", isAdmin: true }]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'choice' | 'clone' | 'new'>('choice');
  const [popularList, setPopularList] = useState<any[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      getPopularTournaments().then(res => setPopularList(res || []));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddPlayer = () => setPlayers([...players, { username: "", isAdmin: false }]);
  
  const handleRemovePlayer = (index: number) => setPlayers(players.filter((_, i) => i !== index));
  
  const updatePlayer = (index: number, field: keyof typeof players[0], value: string | boolean) => {
    const newPlayers = [...players];
    newPlayers[index] = { ...newPlayers[index], [field]: value };
    setPlayers(newPlayers);
  };

  const handleClose = () => {
    setError("");
    setPlayers([{ username: "", isAdmin: true }]);
    setMode('choice');
    setSelectedSourceId("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4 transition-opacity">
      <div className="w-full max-w-2xl rounded-lg border border-gray-700 bg-gray-900 p-6 text-white shadow-xl max-h-[90vh] flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Create New Tournament</h2>
          <button onClick={handleClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-700 hover:text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        {error && (
          <div className="mb-4 bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        <form action={async (formData) => {
          setError("");
          setIsSubmitting(true);
          
          const result = mode === 'new' ? await createTournament(formData) : await registerTeam(formData);
          setIsSubmitting(false);
          if (result?.error) setError(result.error);
          else handleClose();
        }} className="flex flex-col gap-4 overflow-y-auto pr-2">
          
            {mode === 'choice' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <button type="button" onClick={() => setMode('clone')} className="flex flex-col items-center justify-center p-6 border-2 border-gray-700 rounded-lg hover:border-pink-500 hover:bg-gray-800 transition-colors text-left group">
                  <span className="font-bold text-lg mb-2 text-white group-hover:text-pink-400">Register Team</span>
                  <span className="text-sm text-gray-400 text-center">Sign up a team for an existing tournament.</span>
                </button>
                <button type="button" onClick={() => setMode('new')} className="flex flex-col items-center justify-center p-6 border-2 border-gray-700 rounded-lg hover:border-blue-500 hover:bg-gray-800 transition-colors text-left group">
                  <span className="font-bold text-lg mb-2 text-white group-hover:text-blue-400">Tournament Keeper</span>
                  <span className="text-sm text-gray-400 text-center">Create a brand new tournament to manage maps and stages.</span>
                </button>
              </div>
            ) : (
              <>
                {mode === 'clone' && (
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Select Tournament</label>
                    <select
                      className="w-full rounded-md border border-gray-700 bg-gray-800 p-2 text-white focus:border-pink-500 focus:outline-none"
                      value={selectedSourceId}
                      onChange={(e) => setSelectedSourceId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose a tournament --</option>
                      {popularList.map(t => (
                        <option key={t.id} value={t.id}>{t.name} {t.acronym ? `[${t.acronym}]` : ''} ({t.mapCount} maps)</option>
                      ))}
                    </select>
                  </div>
                )}

                {mode === 'clone' && popularList.find(t => t.id === selectedSourceId) && (() => {
                  const selectedSource = popularList.find(t => t.id === selectedSourceId);
                  return (
                    <div className="bg-gray-800 p-4 rounded border border-gray-700 mb-2">
                      <input type="hidden" name="tournamentId" value={selectedSource.id} />
                      <p className="text-sm text-gray-400">You are joining:</p>
                      <p className="text-lg font-bold text-white">{selectedSource.name} {selectedSource.acronym ? `[${selectedSource.acronym}]` : ''}</p>
                      <p className="text-sm text-gray-400">{selectedSource.format} format • Max {selectedSource.rosterSize} players • {selectedSource.mapCount} Maps in pool</p>
                    </div>
                  );
                })()}

                {mode === 'new' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 flex gap-4">
                      <div className="flex-1">
                        <label className="mb-1 block text-sm font-medium text-gray-400">Tournament Name</label>
                        <input type="text" name="name" placeholder="e.g. Catch World Cup 2026" className="w-full rounded-md border border-gray-700 bg-gray-800 p-2 text-white focus:border-pink-500 focus:outline-none" required />
                      </div>
                      <div className="w-1/3">
                        <label className="mb-1 block text-sm font-medium text-gray-400">Acronym</label>
                        <input type="text" name="acronym" placeholder="e.g. CWC26" className="w-full rounded-md border border-gray-700 bg-gray-800 p-2 text-white focus:border-pink-500 focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-400">Format</label>
                      <select name="format" className="w-full rounded-md border border-gray-700 bg-gray-800 p-2 text-white focus:border-pink-500 focus:outline-none" required>
                        <option value="1v1">1v1</option>
                        <option value="2v2">2v2</option>
                        <option value="3v3">3v3</option>
                        <option value="4v4">4v4</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-400">Max Roster Size</label>
                      <select name="rosterSize" defaultValue="8" className="w-full rounded-md border border-gray-700 bg-gray-800 p-2 text-white focus:border-pink-500 focus:outline-none" required>
                        {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(n => <option key={n} value={n}>{n} Players</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {(mode === 'clone' && selectedSourceId) && (
                  <>
                    <div className="mt-2">
                      <label className="mb-1 block text-sm font-medium text-gray-400">Team Name</label>
                      <input type="text" name="teamName" placeholder="e.g. ComboKeeper All-Stars" className="w-full rounded-md border border-gray-700 bg-gray-800 p-2 text-white focus:border-pink-500 focus:outline-none" required />
                    </div>

                    <div className="mt-2 border-t border-gray-700 pt-4">
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-medium text-gray-300">Team Roster</label>
                        <button type="button" onClick={handleAddPlayer} className="text-xs font-bold text-pink-400 hover:text-pink-300 px-2 py-1 bg-pink-900/30 rounded transition-colors">+ Add Player</button>
                      </div>
                      <div className="space-y-2">
                        {players.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 bg-gray-800 p-2 rounded border border-gray-700">
                            <input type="text" placeholder="osu! Username" value={p.username} onChange={e => updatePlayer(i, 'username', e.target.value)} className="flex-1 rounded bg-gray-900 border border-gray-600 p-1.5 text-sm text-white focus:border-pink-500 focus:outline-none" required />
                            <label className={`flex items-center gap-1.5 text-xs text-gray-300 w-20 ${i === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                              <input 
                                type="checkbox" 
                                checked={p.isAdmin} 
                                disabled={i === 0}
                                onChange={e => updatePlayer(i, 'isAdmin', e.target.checked)} 
                                className="rounded border-gray-600 bg-gray-900 text-pink-500 focus:ring-pink-500 focus:ring-offset-gray-900 disabled:opacity-50" 
                              />
                              Admin
                            </label>
                            {i === 0 ? (
                              <div className="w-7 h-7 flex-shrink-0"></div>
                            ) : (
                              <button type="button" onClick={() => handleRemovePlayer(i)} className="text-gray-500 hover:text-red-400 p-1 transition-colors flex-shrink-0" title="Remove">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        ))}
                        {players.length === 0 && <p className="text-xs text-gray-500 italic">No players added. You can add them later.</p>}
                      </div>
                    </div>

                    <input type="hidden" name="players" value={JSON.stringify(players)} />
                  </>
                )}

                <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-gray-700">
                  <button type="button" onClick={() => setMode('choice')} className="rounded px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors mr-auto">
                    &larr; Back
                  </button>
                  <button type="button" onClick={handleClose} className="rounded px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting || (mode === 'clone' && !selectedSourceId)} className="rounded bg-pink-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-pink-700 disabled:opacity-50 flex items-center gap-2">
                    {isSubmitting ? "Processing..." : (mode === 'clone' ? "Register Team" : "Create Tournament")}
                  </button>
                </div>
              </>
            )}
        </form>
      </div>
    </div>
  );
}