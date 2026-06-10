"use client";

import { MappoolMap, PlayerData } from "@/lib/types";
import BeatmapLink from "@/components/BeatmapLink";
import { deleteScores, updateScoreType } from "@/app/actions";
import { useState, useEffect } from "react";

interface PlayerScoreHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerData: PlayerData | null;
  map: MappoolMap | null;
  currentUserId?: string;
  currentUserRole?: string;
  activeTournament?: any;
}

const PlayerScoreHistoryModal = ({ isOpen, onClose, playerData, map, currentUserId, currentUserRole, activeTournament }: PlayerScoreHistoryModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
  const [selectedScoreIds, setSelectedScoreIds] = useState<Set<string>>(new Set());

  const handleClose = () => {
    setIsBulkDeleteMode(false);
    setSelectedScoreIds(new Set());
    onClose();
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedScoreIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedScoreIds(newSet);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !playerData || !map) {
    return null;
  }

  const handleBulkDelete = async () => {
    if (selectedScoreIds.size === 0) return;
    setIsDeleting(true);
    const res = await deleteScores(Array.from(selectedScoreIds));
    setIsDeleting(false);
    if (res?.error) alert(res.error);
    else {
      setIsBulkDeleteMode(false);
      setSelectedScoreIds(new Set());
    }
  };

  // Sort chronologically (newest first) to accurately show improvement over time
  const sortedHistory = [...playerData.history].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

  const validScoreIds = sortedHistory.map((p) => p.id).filter(Boolean) as string[];
  const isAllSelected = selectedScoreIds.size === validScoreIds.length && validScoreIds.length > 0;

  const isAdmin = currentUserRole === "CAPTAIN" || currentUserRole === "EDITOR";
  const isOwnScore = currentUserId && playerData.id.toString() === currentUserId;
  const canEdit = isAdmin || isOwnScore;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "MATCH": return "bg-pink-900/50 text-pink-300 border-pink-800";
      case "QUALIFIER_1": return "bg-blue-900/50 text-blue-300 border-blue-800";
      case "QUALIFIER_2": return "bg-indigo-900/50 text-indigo-300 border-indigo-800";
      case "LOBBY": return "bg-teal-900/50 text-teal-300 border-teal-800";
      default: return "bg-gray-800 text-gray-400 border-gray-600";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "MATCH": return "Match";
      case "QUALIFIER_1": return "Qual 1";
      case "QUALIFIER_2": return "Qual 2";
      case "LOBBY": return "Lobby";
      default: return "Practice";
    }
  };

  const isCaptain = activeTournament?.players?.some((ap: any) => ap.osuId === playerData?.id.toString() && ap.isCaptain);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 transition-opacity">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 text-white shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src={playerData.avatarUrl || `https://a.ppy.sh/${playerData.id}`}
              alt={`${playerData.username}'s Avatar`}
              className="h-10 w-10 rounded-full border-2 border-gray-800"
            />
            <div>
              <h2 className="text-xl font-bold flex items-center">
                {playerData.username}'s Scores
                {isCaptain && <span className="ml-2 text-sm text-pink-400" title="Captain">♔</span>}
              </h2>
              <p className="text-sm text-gray-400 flex items-center gap-1.5">
                on <span className="font-semibold text-blue-400">{map.id}</span>: {map.songName}
                <BeatmapLink beatmapId={map.beatmapId} />
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        {canEdit && (
          <div className="mb-3 flex justify-between items-center border-b border-gray-700 pb-3">
            <button
              onClick={() => {
                setIsBulkDeleteMode(!isBulkDeleteMode);
                setSelectedScoreIds(new Set());
              }}
              className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${isBulkDeleteMode ? 'bg-gray-700 text-gray-200' : 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-900/50'}`}
            >
              {isBulkDeleteMode ? "Cancel Deletion" : "Select & Delete Scores"}
            </button>
            {isBulkDeleteMode && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (isAllSelected) setSelectedScoreIds(new Set());
                  else setSelectedScoreIds(new Set(validScoreIds));
                }}
                className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
              >
                {isAllSelected ? "Deselect All" : "Select All"}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={selectedScoreIds.size === 0 || isDeleting}
                className="text-xs px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 transition-colors"
              >
                {isDeleting ? "Deleting..." : `Delete Selected (${selectedScoreIds.size})`}
              </button>
            </div>
            )}
          </div>
        )}

        <div className="max-h-[65vh] overflow-y-auto pr-2">
          <ul className="space-y-1">
            {sortedHistory.map((play) => (
              <li key={play.id || play.timestamp} className="flex justify-between items-center rounded-md bg-gray-800 px-3 py-1.5">
                <div className="flex items-center gap-3">
                  {isBulkDeleteMode && canEdit && (
                    <input
                      type="checkbox"
                      checked={play.id ? selectedScoreIds.has(play.id) : false}
                      onChange={() => play.id && toggleSelection(play.id)}
                      className="w-4 h-4 text-red-600 bg-gray-900 border-gray-600 rounded focus:ring-red-500 focus:ring-offset-gray-800"
                    />
                  )}
                  <div>
                  <div className="flex items-center">
                    <span className="font-mono text-base">{play.score.toLocaleString('en-US').replace(/,/g, ' ')}</span>
                    {canEdit ? (
                      <select
                        title="Change score type"
                        defaultValue={play.scoreType || "PRACTICE"}
                        onChange={async (e) => {
                          if (!play.id) return;
                          const res = await updateScoreType(play.id, e.target.value);
                          if (res?.error) alert(res.error);
                        }}
                        className={`text-[10px] uppercase font-bold tracking-wider pl-1.5 pr-1 py-0.5 rounded border ml-3 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${play.scoreType ? getTypeColor(play.scoreType) : getTypeColor("PRACTICE")}`}
                      >
                        <option value="MATCH" className="bg-gray-800 text-white font-sans text-xs">Match</option>
                        <option value="QUALIFIER_1" className="bg-gray-800 text-white font-sans text-xs">Qual 1</option>
                        <option value="QUALIFIER_2" className="bg-gray-800 text-white font-sans text-xs">Qual 2</option>
                        <option value="PRACTICE" className="bg-gray-800 text-white font-sans text-xs">Practice</option>
                        <option value="LOBBY" className="bg-gray-800 text-white font-sans text-xs">Lobby</option>
                      </select>
                    ) : (
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ml-3 ${play.scoreType ? getTypeColor(play.scoreType) : getTypeColor("PRACTICE")}`}>
                        {play.scoreType ? getTypeLabel(play.scoreType) : "Practice"}
                      </span>
                    )}
                    {play.playedMod && play.playedMod !== "NM" && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ml-2 bg-yellow-900/50 text-yellow-300 border-yellow-800">
                        +{play.playedMod}
                      </span>
                    )}
                    {(play as any).matchId && (
                      <a href={`https://osu.ppy.sh/community/matches/${(play as any).matchId}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-gray-500 hover:text-pink-400 transition-colors" title="View osu! MP Link">
                        <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    )}
                  </div>
                  <span className="text-sm text-gray-400">{play.accuracy.toFixed(2)}%</span>
                  </div>
                </div>
              </li>
            ))}
            {sortedHistory.length === 0 && <p className="text-center text-gray-500 py-4">No scores recorded for this player on this map.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PlayerScoreHistoryModal;