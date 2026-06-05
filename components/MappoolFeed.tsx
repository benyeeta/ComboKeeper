"use client";

import Image from "next/image";
import { MappoolMap, Mod, ScoreData } from "@/lib/types";
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
  stageId,
  tournamentId,
  onViewPlayerScores
}: MappoolFeedProps) {
  const currentMappool = mappool[stage] || [];

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
      {currentMappool.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">No mappool data for this stage.</p>
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