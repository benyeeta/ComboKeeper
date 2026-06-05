"use client";

import { MappoolMap } from "@/lib/types";
import { useState, useEffect } from "react";
import { addManualScores } from "@/app/actions";

// Helper to format number string with spaces for readability
const formatScore = (value: string): string => {
  if (!value) return "";
  // Remove non-digit characters, then format with spaces
  const numberValue = parseInt(value.replace(/\s/g, ""), 10);
  if (isNaN(numberValue)) return "";
  return numberValue.toLocaleString('en-US').replace(/,/g, ' ');
};

interface ManualScoreEntryProps {
  isOpen: boolean;
  onClose: () => void;
  map: MappoolMap | null;
  stage: string;
  teamPlayers: { osuId: string; username: string; isAdmin: boolean }[];
}

const ManualScoreEntry = ({ isOpen, onClose, map, stage, teamPlayers }: ManualScoreEntryProps) => {
  const [scoreEntries, setScoreEntries] = useState<{ score: string; playedMod: string }[]>([{ score: "", playedMod: "NM" }]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | undefined>(undefined);
  const [scoreType, setScoreType] = useState<string>("PRACTICE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Reset scores when modal is opened for a new map
  useEffect(() => {
    if (isOpen) {
      setScoreEntries([{ score: "", playedMod: "NM" }]);
      setSelectedPlayerId(teamPlayers[0]?.osuId);
      setScoreType("PRACTICE");
      setFeedback(null);
      setIsSubmitting(false);
    }
  }, [isOpen, teamPlayers]);

  if (!isOpen || !map) {
    return null;
  }

  const isMixedOrFree = map.mod === "FM" || map.mod === "MM";

  const handleScoreChange = (index: number, value: string) => {
    const newEntries = [...scoreEntries];
    // Allow only digits and spaces during input
    const sanitizedValue = value.replace(/[^0-9\s]/g, "");
    newEntries[index].score = formatScore(sanitizedValue);
    setScoreEntries(newEntries);
  };

  const handleModChange = (index: number, value: string) => {
    const newEntries = [...scoreEntries];
    newEntries[index].playedMod = value;
    setScoreEntries(newEntries);
  };

  const addScoreRow = () => {
    setScoreEntries([...scoreEntries, { score: "", playedMod: "NM" }]);
  };

  const removeScoreRow = (index: number) => {
    const newEntries = [...scoreEntries];
    newEntries.splice(index, 1);
    // If all rows are removed, add one back to avoid an empty state
    if (newEntries.length === 0) {
        setScoreEntries([{ score: "", playedMod: "NM" }]);
    } else {
        setScoreEntries(newEntries);
    }
  };

  const handleSave = async () => {
    const validEntries = scoreEntries
      .map(e => ({ score: parseInt(e.score.replace(/\s/g, ""), 10), playedMod: isMixedOrFree ? e.playedMod : undefined }))
      .filter(e => !isNaN(e.score) && e.score > 0);
    
    if (validEntries.length > 0 && selectedPlayerId && map) {
      setIsSubmitting(true);
      setFeedback(null);
      try {
        const res = await addManualScores((map as any).dbId, parseInt(selectedPlayerId, 10), validEntries, scoreType);
        
        if (res?.error) {
          setFeedback({ type: "error", text: res.error });
        } else {
          setFeedback({ type: "success", text: "Score(s) successfully added!" });
          setTimeout(() => onClose(), 1500);
        }
      } catch (error) {
        console.error("Failed to save scores:", error);
        setFeedback({ type: "error", text: "An unexpected error occurred." });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setFeedback({ type: "error", text: "Please enter at least one valid score." });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 transition-opacity">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 text-white shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            Add Score for <span className="text-blue-400">{map.id}</span>
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-700 hover:text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        {feedback && (
          <div className={`mb-4 px-3 py-2 rounded text-sm font-medium ${feedback.type === "error" ? "bg-red-900/50 text-red-300 border border-red-800" : "bg-green-900/50 text-green-300 border border-green-800"}`}>
            {feedback.text}
          </div>
        )}

        <div className="space-y-4">
           <p className="text-sm text-gray-400 -mt-2">{`${map.artist} - ${map.songName}`}</p>
           
           <div className="grid grid-cols-2 gap-3">
             <div>
                <label htmlFor="player-select" className="block text-sm font-medium text-gray-300 mb-1">Player</label>
                <select 
                  id="player-select"
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="w-full rounded-md border-gray-600 bg-gray-800 p-2 text-white focus:border-blue-500 focus:ring-blue-500"
                  disabled={teamPlayers.length === 0}
                >
                  {teamPlayers.map(player => (
                      <option key={player.osuId} value={player.osuId}>{player.username}</option>
                  ))}
                </select>
             </div>
             <div>
                <label htmlFor="score-type-select" className="block text-sm font-medium text-gray-300 mb-1">Score Type</label>
                <select 
                  id="score-type-select"
                  value={scoreType}
                  onChange={(e) => setScoreType(e.target.value)}
                  className="w-full rounded-md border-gray-600 bg-gray-800 p-2 text-white focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="PRACTICE">Practice</option>
                  <option value="QUALIFIER_1">Qualifier (Run 1)</option>
                  <option value="QUALIFIER_2">Qualifier (Run 2)</option>
                  <option value="MATCH">In-Match</option>
                </select>
             </div>
           </div>

           <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">New Scores</label>
              {scoreEntries.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  {isMixedOrFree && (
                    <select
                      value={entry.playedMod}
                      onChange={(e) => handleModChange(index, e.target.value)}
                      className="w-24 rounded-md border-gray-600 bg-gray-800 p-2 text-white focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="NM">NM</option>
                      <option value="HD">HD</option>
                      <option value="HR">HR</option>
                      <option value="EZ">EZ</option>
                      <option value="FL">FL</option>
                    </select>
                  )}
                  <input
                    type="text" // Use text to allow for formatted spaces
                    value={entry.score}
                    onChange={(e) => handleScoreChange(index, e.target.value)}
                    placeholder="e.g., 987 654"
                    className="w-full rounded-md border-gray-600 bg-gray-800 p-2 text-white focus:border-blue-500 focus:ring-blue-500"
                  />
                  <button onClick={() => removeScoreRow(index)} className="p-1 text-gray-500 hover:text-red-400 rounded-full hover:bg-gray-700">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addScoreRow}
              className="w-full rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-gray-700"
            >
              + Add another score
            </button>
            <button 
              onClick={handleSave} 
              disabled={isSubmitting}
              className="w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : `Save ${scoreEntries.filter(s => s.score).length || ''} Score(s)`}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ManualScoreEntry;