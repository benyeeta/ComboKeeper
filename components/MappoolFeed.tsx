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
            <TopLineup mapId={map.id} stage={stage} allScores={allScores} mapMod={map.mod} />
            <div className="flex items-center gap-1 flex-shrink-0 justify-end">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onAddScore(map);
                }}
                className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 hover:bg-pink-600 dark:hover:bg-pink-600 text-gray-700 dark:text-gray-200 hover:text-white px-2 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm"
                title="Add Score"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                <span className="hidden sm:inline">Add</span>
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

function TopLineup({ mapId, stage, allScores, mapMod }: { mapId: string; stage: string; allScores: ScoreData[], mapMod: string }) {
  const mapScoreData = allScores.find(
    (data) => data.mapId === mapId && data.stage === stage
  );

  if (!mapScoreData || mapScoreData.players.length === 0) {
    return (
      <div className="hidden md:flex items-center gap-2">
        <p className="text-xs text-gray-500">No Lineup Data</p>
      </div>
    );
  }

  let topPlayers: { id: number; username: string; avatarUrl: string; assignedMod?: string; history: any[] }[] = [];

  if (mapMod === "FM" || mapMod === "MM") {
    // Evaluate the optimal permutation of players for the standard HD, HR, and NM meta
    const requiredMods = ['HD', 'HR', 'NM'];
    const numToAssign = Math.min(requiredMods.length, mapScoreData.players.length);
    const modsToUse = requiredMods.slice(0, numToAssign);

    let bestLineup: any[] = [];
    let maxTotal = -1;

    const getBestScore = (player: any, reqMod: string) => {
      const plays = player.history.filter((h: any) => {
        if (reqMod === 'NM') return !h.playedMod || h.playedMod === 'NM';
        return h.playedMod && h.playedMod.includes(reqMod); // Handles exact 'HD' or combined like 'HDHR'
      });
      return plays.length > 0 ? Math.max(...plays.map((h: any) => h.score)) : 0;
    };

    // Pre-calculate best scores to ensure the recursive search remains instantly fast
    const playerBestScores = new Map();
    for (const p of mapScoreData.players) {
      playerBestScores.set(p.id, {
        HD: getBestScore(p, 'HD'),
        HR: getBestScore(p, 'HR'),
        NM: getBestScore(p, 'NM'),
      });
    }

    const findBestAssignment = (modIndex: number, currentAssignment: any[], currentScore: number, usedPlayers: Set<number>) => {
      if (modIndex === modsToUse.length) {
        if (currentScore > maxTotal) {
          maxTotal = currentScore;
          bestLineup = [...currentAssignment];
        }
        return;
      }
      const reqMod = modsToUse[modIndex];
      for (const p of mapScoreData.players) {
        if (!usedPlayers.has(p.id)) {
          const score = playerBestScores.get(p.id)[reqMod];
          usedPlayers.add(p.id);
          currentAssignment.push({ ...p, assignedMod: reqMod, _score: score });
          findBestAssignment(modIndex + 1, currentAssignment, currentScore + score, usedPlayers);
          currentAssignment.pop();
          usedPlayers.delete(p.id);
        }
      }
    };

    findBestAssignment(0, [], 0, new Set());

    if (maxTotal > 0) {
      topPlayers = bestLineup.sort((a, b) => b._score - a._score);
    }
  }

  // Fallback sorting if the map isn't Mixed/Free mod or no one has logged mod-specific scores yet
  if (topPlayers.length === 0) {
    topPlayers = [...mapScoreData.players]
      .sort((a, b) => {
        const topScoreA = Math.max(...a.history.map((h: any) => h.score), 0);
        const topScoreB = Math.max(...b.history.map((h: any) => h.score), 0);
        return topScoreB - topScoreA;
      })
      .slice(0, 3);
  }

  return (
    <div className="hidden md:flex items-center gap-2">
      {topPlayers.map((player) => (
        <div key={player.id} className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-1.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
          <Image
            src={player.avatarUrl || `https://a.ppy.sh/${player.id}`}
            alt={player.username}
            width={20}
            height={20}
            className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 object-cover"
          />
          <span className="text-xs text-gray-700 dark:text-gray-300 font-medium pr-1 max-w-[80px] truncate">{player.username}</span>
          {player.assignedMod && player.assignedMod !== 'NM' && (
            <span className={`text-[9px] font-bold px-1 rounded border ${player.assignedMod === 'HD' ? 'bg-yellow-900/50 text-yellow-300 border-yellow-800' : 'bg-red-900/50 text-red-300 border-red-800'}`}>
              +{player.assignedMod}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}