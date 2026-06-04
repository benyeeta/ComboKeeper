"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { MappoolMap, Mod, ScoreData } from "@/lib/types";
import { addMapToStage, deleteMap } from "@/app/actions";
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
  onMapSelect: (map: MappoolMap) => void;
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
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg p-4 flex flex-col gap-3 transition-colors duration-200">
      <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{stage ? `${stage} Mappool` : "Mappool"}</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 mb-2">Click to view analytics, or use the + button to add a score.</p>
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
            <span className="font-bold text-lg w-12 flex-shrink-0">{map.id}</span>
            <div className="flex flex-col overflow-hidden">
              <span className="text-gray-900 dark:text-gray-200 font-medium truncate">{map.artist}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{map.songName}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TopLineup mapId={map.id} stage={stage} allScores={allScores} />
            <div className="flex items-center gap-1 flex-shrink-0 justify-end">
              {isEditMode ? (
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete ${map.id}?`)) {
                      await deleteMap((map as any).dbId);
                    }
                  }}
                  className="text-gray-500 hover:text-red-400 transition-colors p-1"
                  title="Delete Map"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              ) : (
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
            ref={formRef}
            action={async (formData) => {
              setError("");
              setIsSubmitting(true);
              const result = await addMapToStage(formData);
              setIsSubmitting(false);
              if (result?.error) setError(result.error);
              else formRef.current?.reset();
            }}
            className="flex flex-col gap-3"
          >
            <input type="hidden" name="stageId" value={stageId || ""} />
            <input type="hidden" name="stageName" value={stage} />
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <div className="flex gap-2">
              <select name="mod" className="w-20 rounded bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-2 text-sm text-gray-900 dark:text-white focus:border-pink-500 focus:outline-none" required>
                  {['NM', 'HD', 'HR', 'DT', 'FM', 'MM', 'TB'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input type="text" name="mapId" placeholder="Slot (NM1)" className="w-24 rounded bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-2 text-sm text-gray-900 dark:text-white focus:border-pink-500 focus:outline-none" required />
              <input type="number" name="beatmapId" placeholder="osu! Beatmap ID" className="flex-grow rounded bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-2 text-sm text-gray-900 dark:text-white focus:border-pink-500 focus:outline-none" required />
            </div>
            <div className="flex gap-2">
              <input type="text" name="skill" placeholder="Skill Category (e.g. Stream)" className="flex-grow rounded bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-2 text-sm text-gray-900 dark:text-white focus:border-pink-500 focus:outline-none" />
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                Add
              </button>
            </div>
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