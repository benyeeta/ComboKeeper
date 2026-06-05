"use client";

import { MappoolMap, PlayerData } from "@/lib/types";
import { deleteScores, updateScoreType } from "@/app/actions";
import { useState } from "react";

interface PlayerScoreHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerData: PlayerData | null;
  map: MappoolMap | null;
  currentUserId?: string;
  currentUserRole?: string;
}

const PlayerScoreHistoryModal = ({ isOpen, onClose, playerData, map, currentUserId, currentUserRole }: PlayerScoreHistoryModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
  const [selectedScoreIds, setSelectedScoreIds] = useState<Set<string>>(new Set());

  if (!isOpen || !playerData || !map) {
    return null;
  }

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

  const handleBulkDelete = async () => {
    if (selectedScoreIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedScoreIds.size} score(s)?`)) {
      setIsDeleting(true);
      const res = await deleteScores(Array.from(selectedScoreIds));
      setIsDeleting(false);
      if (res?.error) alert(res.error);
      else {
        setIsBulkDeleteMode(false);
        setSelectedScoreIds(new Set());
      }
    }
  };

  // Sort chronologically (newest first) to accurately show improvement over time
  const sortedHistory = [...playerData.history].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

  const isAdmin = currentUserRole === "CAPTAIN" || currentUserRole === "EDITOR";
  const isOwnScore = currentUserId && playerData.id.toString() === currentUserId;
  const canEdit = isAdmin || isOwnScore;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "MATCH": return "bg-pink-900/50 text-pink-300 border-pink-800";
      case "QUALIFIER_1": return "bg-blue-900/50 text-blue-300 border-blue-800";
      case "QUALIFIER_2": return "bg-indigo-900/50 text-indigo-300 border-indigo-800";
      default: return "bg-gray-800 text-gray-400 border-gray-600";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "MATCH": return "Match";
      case "QUALIFIER_1": return "Qual 1";
      case "QUALIFIER_2": return "Qual 2";
      default: return "Practice";
    }
  };

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
              <h2 className="text-xl font-bold">{playerData.username}'s Scores</h2>
              <p className="text-sm text-gray-400">on <span className="font-semibold text-blue-400">{map.id}</span>: {map.songName}</p>
            </div>
          </div>
          <button onClick={handleClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-700 hover:text-white">
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
              <button
                onClick={handleBulkDelete}
                disabled={selectedScoreIds.size === 0 || isDeleting}
                className="text-xs px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 transition-colors"
              >
                {isDeleting ? "Deleting..." : `Delete Selected (${selectedScoreIds.size})`}
              </button>
            )}
          </div>
        )}

        <div className="max-h-80 overflow-y-auto pr-2">
          <ul className="space-y-2">
            {sortedHistory.map((play) => (
              <li key={play.id || play.timestamp} className="flex justify-between items-center rounded-md bg-gray-800 p-3">
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
                    <span className="font-mono text-lg">{play.score.toLocaleString('en-US').replace(/,/g, ' ')}</span>
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