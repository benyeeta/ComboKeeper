"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import { MappoolMap, Mod, ScoreData } from "@/lib/types";
import { scoreMatchesModSlot } from "@/lib/parseMods";
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
  activeTournament?: any;
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
  onViewPlayerScores,
  activeTournament
}: MappoolFeedProps) {
  const currentMappool = (mappool && mappool[stage]) || [];

  const [hiddenPlayerIds, setHiddenPlayerIds] = useState<Set<number>>(new Set());

  const uniquePlayers = useMemo(() => {
    const playersMap = new Map<number, any>();
    (allScores || []).filter(s => s.stage === stage).forEach(mapData => {
      mapData.players.forEach(p => {
        if (!playersMap.has(p.id)) playersMap.set(p.id, p);
      });
    });
    return Array.from(playersMap.values());
  }, [allScores, stage]);

  const filteredScores = useMemo(() => {
    if (hiddenPlayerIds.size === 0) return allScores || [];
    return (allScores || []).map(mapData => ({
      ...mapData,
      players: mapData.players.filter(p => !hiddenPlayerIds.has(p.id))
    }));
  }, [allScores, hiddenPlayerIds]);

  const togglePlayer = (id: number) => {
    setHiddenPlayerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg p-4 flex flex-col gap-3 transition-colors duration-200">
      <div className="flex flex-col gap-1 mb-1">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{stage ? `${stage} Mappool` : "Mappool"}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Click to view analytics, or use the + button to add a score.</p>
      </div>

      {uniquePlayers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mr-1">Roster:</span>
          {uniquePlayers.map(p => {
            const isHidden = hiddenPlayerIds.has(p.id);
            const isCaptain = activeTournament?.players?.some((ap: any) => ap.osuId === p.id.toString() && ap.isAdmin);
            return (
              <button
                key={p.id}
                onClick={() => togglePlayer(p.id)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                  isHidden 
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-100' 
                    : 'bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 shadow-sm hover:border-pink-400 dark:hover:border-pink-500'
                }`}
                title={isHidden ? `Click to include ${p.username}` : `Click to hide ${p.username}`}
              >
                <Image 
                  src={p.avatarUrl || `https://a.ppy.sh/${p.id}`} 
                  alt={p.username}
                  width={16}
                  height={16}
                  className={`w-4 h-4 rounded-full object-cover transition-all ${isHidden ? 'grayscale opacity-50' : ''}`} 
                />
                <span className={`${isHidden ? 'line-through' : ''} ${isCaptain ? 'font-bold' : ''}`}>
                  {p.username}
                </span>
              </button>
            );
          })}
          <div className="flex items-center gap-2 ml-1 border-l pl-3 border-gray-300 dark:border-gray-700">
            <button onClick={() => setHiddenPlayerIds(new Set())} className="text-[10px] uppercase tracking-wider font-bold text-pink-500 hover:text-pink-600 dark:text-pink-400 dark:hover:text-pink-300 transition-colors">Show All</button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button onClick={() => setHiddenPlayerIds(new Set(uniquePlayers.map(p => p.id)))} className="text-[10px] uppercase tracking-wider font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">Hide All</button>
          </div>
        </div>
      )}

      {currentMappool.map((map, index) => {
        const isExpanded = selectedMap?.id === map.id;
        return (
        <div key={(map as any).dbId || `${map.id}-${index}`} className="flex flex-col bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden transition-colors duration-200">
          <div
            className={`flex items-stretch ${MOD_COLORS[map.mod] || "border-gray-500"} border-l-4 transition-colors ${
              isExpanded
                ? "bg-gray-200 dark:bg-white/10"
                : "hover:bg-gray-100 dark:hover:bg-white/5 has-[button:hover]:hover:bg-transparent dark:has-[button:hover]:hover:bg-transparent"
            }`}
          >
            <div
              onClick={() => onMapSelect(isExpanded ? null : map)}
              className="flex flex-1 items-center min-w-0 cursor-pointer p-3"
            >
              <div className="flex items-center gap-4 flex-grow overflow-hidden min-w-0">
                <span className="font-bold text-lg w-12 flex-shrink-0">{map.id}</span>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-gray-900 dark:text-gray-200 font-medium truncate">{map.artist}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{map.songName}</span>
                </div>
              </div>
              <TopLineup mapId={map.id} stage={stage} allScores={filteredScores || []} mapMod={map.mod} activeTournament={activeTournament} />
              <div className="w-6 flex justify-end flex-shrink-0 ml-3">
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
            <div className="flex items-center p-3 pl-0 flex-shrink-0">
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
            </div>
          </div>
          {isExpanded && (
            <div className={`bg-white dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 p-4 border-l-4 ${MOD_COLORS[map.mod] || "border-gray-500"}`}>
              <AnalyticsPanel selectedMap={map} selectedStage={stage} onViewPlayerScores={onViewPlayerScores} allScores={filteredScores || []} activeTournament={activeTournament} />
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

function TopLineup({ mapId, stage, allScores, mapMod, activeTournament }: { mapId: string; stage: string; allScores: ScoreData[], mapMod: string, activeTournament?: any }) {
  const mapScoreData = (allScores || []).find(
    (data) => data.mapId === mapId && data.stage === stage
  );

  if (!mapScoreData || mapScoreData.players.length === 0) {
    return (
      <div className="hidden md:flex items-center justify-end w-[280px] lg:w-[360px] xl:w-[420px]">
        <p className="text-sm text-gray-500 italic pr-2">No Lineup Data</p>
      </div>
    );
  }

  let topPlayers: { id: number; username: string; avatarUrl: string; assignedMod?: string; history: any[]; _score?: number }[] = [];

  if (mapMod === "MM") {
    // Evaluate the optimal permutation of players for the standard HD, HR, and NM meta
    const requiredMods = ['HD', 'HR', 'NM'];

    let bestLineup: any[] = [];
    let maxTotal = -1;

    const getBestScore = (player: any, reqMod: 'NM' | 'HD' | 'HR') => {
      const plays = player.history.filter((h: any) => scoreMatchesModSlot(h.playedMod, reqMod));
      return plays.length > 0 ? Math.max(...plays.map((h: any) => h.score)) : 0;
    };

    const playersToEvaluate = [...mapScoreData.players];

    const playerBestScores = new Map();
    for (const p of playersToEvaluate) {
      playerBestScores.set(p.id, {
        HD: getBestScore(p, 'HD'),
        HR: getBestScore(p, 'HR'),
        NM: getBestScore(p, 'NM'),
      });
    }

    const findBestAssignment = (modIndex: number, currentAssignment: any[], currentScore: number, usedPlayers: Set<number>) => {
      if (modIndex === requiredMods.length) {
        if (currentAssignment.length > 0 && currentScore > maxTotal) {
          maxTotal = currentScore;
          bestLineup = [...currentAssignment];
        }
        return;
      }
      const reqMod = requiredMods[modIndex];
      let anyAssigned = false;
      for (const p of playersToEvaluate) {
        if (!usedPlayers.has(p.id)) {
          const score = playerBestScores.get(p.id)[reqMod];
          if (score === 0) continue;
          anyAssigned = true;
          usedPlayers.add(p.id);
          currentAssignment.push({ ...p, assignedMod: reqMod, _score: score });
          findBestAssignment(modIndex + 1, currentAssignment, currentScore + score, usedPlayers);
          currentAssignment.pop();
          usedPlayers.delete(p.id);
        }
      }
      if (!anyAssigned) {
        findBestAssignment(modIndex + 1, currentAssignment, currentScore, usedPlayers);
      }
    };

    findBestAssignment(0, [], 0, new Set());

    if (maxTotal > 0) {
      topPlayers = bestLineup.sort((a, b) => b._score - a._score);
    }
  } else if (mapMod === "FM") {
    // Because FM rules vary wildly, we just show each player's absolute best non-NM score 
    // to give the captain a quick overview of who plays what mod the best.
    const playerBestModScores = mapScoreData.players.map((p) => {
      const modPlays = p.history.filter((h: any) => h.playedMod && h.playedMod !== 'NM');
      const bestModPlay = modPlays.length > 0 ? modPlays.reduce((a, b) => (a.score > b.score ? a : b)) : null;
      
      const fallbackPlay = p.history.length > 0 ? p.history.reduce((a, b) => (a.score > b.score ? a : b)) : null;

      return {
        ...p,
        _score: bestModPlay ? bestModPlay.score : (fallbackPlay?.score || 0),
        assignedMod: (bestModPlay ? bestModPlay.playedMod : fallbackPlay?.playedMod) || 'NM'
      };
    });

    if (playerBestModScores.some(p => p._score && p._score > 0)) {
      topPlayers = playerBestModScores.sort((a, b) => (b._score || 0) - (a._score || 0)).slice(0, 3);
    }
  }

  // Fallback for non-MM maps when mod-specific lineup data isn't available
  if (topPlayers.length === 0 && mapMod !== "MM") {
    topPlayers = [...mapScoreData.players]
      .map((p) => {
        const bestPlay = p.history.length > 0 ? p.history.reduce((a: any, b: any) => a.score > b.score ? a : b) : { score: 0, playedMod: 'NM' };
        return { ...p, _score: bestPlay.score, assignedMod: bestPlay.playedMod || 'NM' };
      })
      .sort((a, b) => (b._score || 0) - (a._score || 0))
      .slice(0, 3);
  }

  if (topPlayers.length === 0) {
    return (
      <div className="hidden md:flex items-center justify-end w-[280px] lg:w-[360px] xl:w-[420px]">
        <p className="text-sm text-gray-500 italic pr-2">No Lineup Data</p>
      </div>
    );
  }

  return (
    <div className={`hidden md:grid gap-2 w-[280px] lg:w-[360px] xl:w-[420px] ${topPlayers.length === 3 ? 'grid-cols-3' : topPlayers.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {topPlayers.map((player) => {
        const isCaptain = activeTournament?.players?.some((ap: any) => ap.osuId === player.id.toString() && ap.isAdmin);
        return (
          <div key={player.id} className="flex items-center gap-2">
            <Image
              src={player.avatarUrl || `https://a.ppy.sh/${player.id}`}
              alt={player.username}
              width={24}
              height={24}
              className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 object-cover flex-shrink-0"
            />
            <span className={`text-sm text-gray-800 dark:text-gray-200 truncate ${isCaptain ? 'font-bold' : 'font-semibold'}`}>
              {player.username}
            </span>
          {player.assignedMod && (mapMod === 'MM' || mapMod === 'FM') && (
            <span className={`text-[10px] font-bold px-1 rounded border flex-shrink-0 ${
              player.assignedMod.includes('HD') ? 'bg-yellow-900/50 text-yellow-300 border-yellow-800' : 
              player.assignedMod.includes('EZ') || player.assignedMod.includes('FL') ? 'bg-purple-900/50 text-purple-300 border-purple-800' :
              player.assignedMod.includes('DT') || player.assignedMod.includes('NC') ? 'bg-blue-900/50 text-blue-300 border-blue-800' :
              player.assignedMod === 'NM' ? 'bg-gray-600 text-gray-100 border-gray-500' :
              'bg-red-900/50 text-red-300 border-red-800'
            }`}>
              {player.assignedMod === 'NM' ? 'NM' : `+${player.assignedMod}`}
            </span>
          )}
        </div>
        );
      })}
    </div>
  );
}