"use client";

import { MappoolMap, Player } from "@/lib/types";
import { deleteScore } from "@/app/actions";
import { useState } from "react";

interface PlayerScoreHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerData: Player | null;
  map: MappoolMap | null;
}

const PlayerScoreHistoryModal = ({ isOpen, onClose, playerData, map }: PlayerScoreHistoryModalProps) => {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  if (!isOpen || !playerData || !map) {
    return null;
  }

  const handleDelete = async (scoreId: string) => {
    if (!scoreId) {
      alert("Cannot delete: Score ID is missing. Please refresh the page to sync with the database.");
      return;
    }

    if (confirm("Are you sure you want to delete this score?")) {
      setIsDeleting(scoreId);
      await deleteScore(scoreId);
      setIsDeleting(null);
      onClose();
    }
  };

  const sortedHistory = [...playerData.history].sort((a, b) => b.score - a.score);

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
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-700 hover:text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto pr-2">
          <ul className="space-y-2">
            {sortedHistory.map((play) => (
              <li key={(play as any).id || play.timestamp} className="flex justify-between items-center rounded-md bg-gray-800 p-3">
                <div>
                  <div className="flex items-center">
                    <span className="font-mono text-lg">{play.score.toLocaleString('en-US').replace(/,/g, ' ')}</span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ml-3 ${(play as any).scoreType ? getTypeColor((play as any).scoreType) : getTypeColor("PRACTICE")}`}>
                      {(play as any).scoreType ? getTypeLabel((play as any).scoreType) : "Practice"}
                    </span>
                    {(play as any).playedMod && (play as any).playedMod !== "NM" && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ml-2 bg-yellow-900/50 text-yellow-300 border-yellow-800">
                        +{(play as any).playedMod}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-400">{play.accuracy.toFixed(2)}%</span>
                </div>
                <button 
                  onClick={() => handleDelete((play as any).id)}
                  disabled={isDeleting === (play as any).id}
                  className="text-gray-500 hover:text-red-400 p-1 transition-colors disabled:opacity-50" 
                  title="Delete Score"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
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