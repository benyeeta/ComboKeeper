"use client";

import Image from "next/image";
import { useState } from "react";
import { MappoolMap, Mod, ScoreData } from "@/lib/types";
import { addMapsToStage, deleteMaps } from "@/app/actions";
import AnalyticsPanel from "./AnalyticsPanel";

const MOD_COLORS: Record<string, string> = {
    NM: "border-gray-500",
    HD: "border-yellow-500",
    HR: "border-red-500",
    DT: "border-blue-500",
    FM: "border-orange-500",
    MM: "border-purple-500",
    TB: "border-green-500",
};

type MappoolFeedProps = {
  stage: string;
  onMapSelect: (map: MappoolMap | null) => void;
  selectedMap: MappoolMap | null;
  onAddScore: (map: MappoolMap) => void;
  mappool: Record<string, MappoolMap[]>;
  allScores: ScoreData[];
  isEditMode?: boolean;
  stageId?: string;
  tournamentId?: string;
  onViewPlayerScores: (player: any) => void;
};

export default function MappoolFeed({ 
  stage, 
  onMapSelect, 
  selectedMap, 
  onAddScore, 
  mappool, 
  allScores,
  isEditMode,
  stageId,
  tournamentId,
  onViewPlayerScores
}: MappoolFeedProps) {
  const currentMappool = mappool[stage] || [];
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMaps, setNewMaps] = useState([{ mod: 'NM', mapId: '', beatmapId: '' }]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);
  const [selectedMapIds, setSelectedMapIds] = useState<Set<string>>(new Set());

  const getNextMapId = (mod: string, skipIndex: number, currentNewMaps: typeof newMaps) => {
    const existingMapIds = currentMappool
      .filter(m => (m.mod || '').toUpperCase() === mod.toUpperCase())
      .map(m => m.id);
    const newMapIds = currentNewMaps
      .filter((m, i) => m.mod.toUpperCase() === mod.toUpperCase() && i !== skipIndex)
      .map(m => m.mapId);
    const allIds = [...existingMapIds, ...newMapIds];
    
    const numbers = allIds.map(id => {
      const match = id.match(/\d+$/);
      return match ? parseInt(match[0], 10) : 0;
    });
    
    let nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    let result = mod.toUpperCase() === 'TB' && nextNum === 1 ? 'TB' : `${mod.toUpperCase()}${nextNum}`;
    
    // Fallback safety: guarantee we never return a duplicate ID
    while (allIds.includes(result)) {
      nextNum++;
      result = `${mod.toUpperCase()}${nextNum}`;
    }
    
    return result;
  };

  const handleAddMapRow = () => {
    const nextMod = newMaps.length > 0 ? newMaps[newMaps.length - 1].mod : 'NM';
    const nextMapId = getNextMapId(nextMod, -1, newMaps);
    setNewMaps([...newMaps, { mod: nextMod, mapId: nextMapId, beatmapId: '' }]);
  };
  
  const handleRemoveMapRow = (index: number) => {
    const updated = [...newMaps];
    updated.splice(index, 1);
    if (updated.length === 0) setNewMaps([{ mod: 'NM', mapId: '', beatmapId: '' }]);
    else setNewMaps(updated);
  };

  const handleUpdateMap = (index: number, field: string, value: string) => {
    const updated = [...newMaps];
    
    let processedValue = value;
    if (field === 'beatmapId') {
      // Extract the Beatmap ID automatically if the user pastes an osu! link
      const match = value.match(/(?:beatmaps\/|#(?:osu|taiko|fruits|mania)\/|b\/)(\d+)/);
      if (match && match[1]) {
        processedValue = match[1];
      }
    }

    updated[index] = { ...updated[index], [field]: processedValue };

    if (field === 'mod') {
      updated[index].mapId = getNextMapId(processedValue, index, updated);
    }

    setNewMaps(updated);
  };

  const toggleSelection = (dbId: string) => {
    const newSet = new Set(selectedMapIds);
    if (newSet.has(dbId)) newSet.delete(dbId);
    else newSet.add(dbId);
    setSelectedMapIds(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedMapIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedMapIds.size} map(s)?`)) {
      setIsDeleting(true);
      const res = await deleteMaps(Array.from(selectedMapIds));
      setIsDeleting(false);
      if (res?.error) alert(res.error);
      else {
        setIsBulkDeleteMode(false);
        setSelectedMapIds(new Set());
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg p-4 flex flex-col gap-3 transition-colors duration-200">
      <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{stage ? `${stage} Mappool` : "Mappool"}</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-2">Click to view analytics, or use the + button to add a score.</p>
      
      {isEditMode && currentMappool.length > 0 && (
        <div className="mb-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3">
          <button
            onClick={() => {
              setIsBulkDeleteMode(!isBulkDeleteMode);
              setSelectedMapIds(new Set());
            }}
            className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${isBulkDeleteMode ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200' : 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-900/50'}`}
          >
            {isBulkDeleteMode ? "Cancel Deletion" : "Select & Delete Maps"}
          </button>
          {isBulkDeleteMode && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (selectedMapIds.size === currentMappool.length) setSelectedMapIds(new Set());
                  else setSelectedMapIds(new Set(currentMappool.map(m => (m as any).dbId)));
                }}
                className="text-xs px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium transition-colors"
              >
                {selectedMapIds.size === currentMappool.length ? "Deselect All" : "Select All"}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={selectedMapIds.size === 0 || isDeleting}
                className="text-xs px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 transition-colors"
              >
                {isDeleting ? "Deleting..." : `Delete Selected (${selectedMapIds.size})`}
              </button>
            </div>
          )}
        </div>
      )}

      {currentMappool.map((map, index) => {
        const isExpanded = selectedMap?.id === map.id;
        return (
        <div key={(map as any).dbId || `${map.id}-${index}`} className="flex flex-col bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden transition-colors duration-200">
          <div
            onClick={() => onMapSelect(isExpanded ? null : map)}
            className={`flex items-center justify-between p-3 cursor-pointer transition-colors
              ${MOD_COLORS[map.mod] || "border-gray-500"} border-l-4
              ${isExpanded ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
          >
          <div className="flex items-center gap-4 flex-grow overflow-hidden">
            {isEditMode && isBulkDeleteMode && (
              <input
                type="checkbox"
                checked={selectedMapIds.has((map as any).dbId)}
                onChange={() => toggleSelection((map as any).dbId)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 dark:bg-gray-900 dark:border-gray-600 rounded focus:ring-red-500 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 ml-1 cursor-pointer"
              />
            )}
            <span className="font-bold text-lg w-12 flex-shrink-0">{map.id}</span>
            <div className="flex flex-col overflow-hidden">
              <span className="text-gray-900 dark:text-gray-200 font-medium truncate">{map.artist}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{map.songName}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TopLineup mapId={map.id} stage={stage} allScores={allScores} />
            <div className="flex items-center gap-1 flex-shrink-0 justify-end">
              {!isEditMode && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddScore(map);
                  }}
                  className="text-gray-500 hover:text-pink-400 transition-colors p-1"
                  title="Add Score"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                </button>
              )}
              
              <div className="w-6 flex justify-end">
                {isExpanded ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-400 transform rotate-180 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
          </div>
          </div>
          {isExpanded && (
            <div className={`bg-white dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 p-4 border-l-4 ${MOD_COLORS[map.mod] || "border-gray-500"}`}>
              <AnalyticsPanel selectedMap={map} selectedStage={stage} onViewPlayerScores={onViewPlayerScores} allScores={allScores} />
            </div>
          )}
        </div>
      )})}
      {currentMappool.length === 0 && !isEditMode && (
        <p className="text-gray-500 dark:text-gray-400">No mappool data for this stage.</p>
      )}

      {isEditMode && tournamentId && stage && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold mb-3 text-gray-800 dark:text-gray-300">Add New Map</h3>
          {error && (
            <div className="mb-3 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-500 text-red-600 dark:text-red-200 px-3 py-1.5 rounded text-xs">
              {error}
            </div>
          )}
          <form 
            action={async () => {
              setError("");
              setIsSubmitting(true);
              
              const validMaps = newMaps.filter(m => m.mapId && m.beatmapId);
              if (validMaps.length === 0) {
                setIsSubmitting(false);
                return;
              }
              
              const fd = new FormData();
              fd.append("stageId", stageId || "");
              fd.append("stageName", stage);
              fd.append("tournamentId", tournamentId);
              fd.append("maps", JSON.stringify(validMaps));
              
              const result = await addMapsToStage(fd);
              setIsSubmitting(false);
              
              if (result?.error) {
                setError(result.error);
              } else {
                setNewMaps([{ mod: 'NM', mapId: '', beatmapId: '' }]);
              }
            }}
            className="flex flex-col gap-3"
          >
            <datalist id="mod-options">
              {['NM', 'HD', 'HR', 'DT', 'FM', 'MM', 'TB'].map(m => <option key={m} value={m} />)}
            </datalist>

            {newMaps.map((map, index) => (
              <div key={index} className="flex gap-2 items-center">
                <input 
                  list="mod-options"
                  value={map.mod} 
                  onChange={e => handleUpdateMap(index, 'mod', e.target.value.toUpperCase())} 
                  className="w-20 rounded bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-2 text-sm text-gray-900 dark:text-white focus:border-pink-500 focus:outline-none uppercase" 
                  placeholder="Mod"
                  required
                />
                <input 
                  type="text" 
                  placeholder="Slot (NM1)" 
                  value={map.mapId} 
                  onChange={e => handleUpdateMap(index, 'mapId', e.target.value)} 
                  className="w-24 rounded bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-2 text-sm text-gray-900 dark:text-white focus:border-pink-500 focus:outline-none" 
                  required 
                />
                <input 
                  type="text" 
                  placeholder="Beatmap ID or Link" 
                  value={map.beatmapId} 
                  onChange={e => handleUpdateMap(index, 'beatmapId', e.target.value)} 
                  className="flex-grow rounded bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-2 text-sm text-gray-900 dark:text-white focus:border-pink-500 focus:outline-none" 
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => handleRemoveMapRow(index)} 
                  className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0"
                  title="Remove Map"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            
            <button
              type="button"
              onClick={handleAddMapRow}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              + Add another map
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || newMaps.filter(m => m.mapId && m.beatmapId).length === 0}
              className="w-full rounded-md bg-pink-600 px-4 py-2 font-semibold text-white hover:bg-pink-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "Adding Maps..." : `Save ${newMaps.filter(m => m.mapId && m.beatmapId).length || ''} Map(s)`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function TopLineup({ mapId, stage, allScores }: { mapId: string; stage: string; allScores: ScoreData[] }) {
  const mapScoreData = allScores.find(
    (data) => data.mapId === mapId && data.stage === stage
  );

  if (!mapScoreData || mapScoreData.players.length === 0) {
    return (
      <div className="hidden sm:flex items-center gap-2">
        <p className="text-xs text-gray-500">No Lineup Data</p>
      </div>
    );
  }

  const topPlayers = [...mapScoreData.players]
    .sort((a, b) => {
      const topScoreA = Math.max(...a.history.map((h) => h.score), 0);
      const topScoreB = Math.max(...b.history.map((h) => h.score), 0);
      return topScoreB - topScoreA;
    })
    .slice(0, 3);

  return (
    <div className="hidden sm:flex items-center gap-3">
      <div className="flex -space-x-3">
        {topPlayers.map((player) => (
          <Image
            key={player.id}
            src={player.avatarUrl || `https://a.ppy.sh/${player.id}`}
            alt={player.username}
            width={28}
            height={28}
            className="w-7 h-7 rounded-full border-2 border-gray-800"
          />
        ))}
      </div>
      <p className="text-xs text-gray-400 leading-tight max-w-[120px] truncate">
        {topPlayers.map((p) => p.username).join(", ")}
      </p>
    </div>
  );
}