"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import { MappoolMap, Mod, ScoreData } from "@/lib/types";
import { calculateMapLineupDisplay } from "@/lib/mapLineup";
import { parseLineupSize } from "@/lib/tournamentFormat";
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
        <div key={(map as any).dbId || `${map.id}-${index}`} className="flex flex-col bg-surface border border-border-main rounded-md overflow-hidden transition-colors duration-200">
          <div className={`flex items-center transition-colors ${isExpanded ? 'bg-hover-overlay/15' : ''}`}>
            <div
              onClick={() => onMapSelect(isExpanded ? null : map)}
              className={`flex items-center gap-4 flex-grow overflow-hidden p-3 cursor-pointer transition-colors
                ${MOD_COLORS[map.mod] || "border-gray-500"} border-l-4
                ${!isExpanded ? 'hover:bg-hover-overlay/10' : ''}`}
            >
              <span className="font-bold text-lg w-12 flex-shrink-0">{map.id}</span>
              <div className="flex flex-col overflow-hidden">
                <span className="text-content font-medium truncate">{map.artist}</span>
                <span className="text-sm text-muted truncate">{map.songName}</span>
              </div>
            </div>
            <div
              onClick={() => onMapSelect(isExpanded ? null : map)}
              className="flex items-center gap-3 p-3 pl-0 cursor-pointer flex-shrink-0"
            >
              <TopLineup mapId={map.id} stage={stage} allScores={filteredScores || []} mapMod={map.mod} activeTournament={activeTournament} />
              <div className="flex items-center gap-1 flex-shrink-0 justify-end">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddScore(map);
                  }}
                  className="flex items-center gap-1 border border-border-main bg-hover-overlay/15 text-content hover:bg-accent hover:border-accent hover:text-white px-2 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm"
                  title="Add Score"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                  <span className="hidden sm:inline">Add</span>
                </button>

                <div className="w-6 flex justify-end">
                  {isExpanded ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent transform rotate-180 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-muted transition-transform" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
          {isExpanded && (
            <div className={`bg-inset border-t border-border-main p-4 border-l-4 ${MOD_COLORS[map.mod] || "border-gray-500"}`}>
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

  const lineupSize = mapMod === "MM" ? 3 : parseLineupSize(activeTournament?.format);
  const columnCount = mapMod === "MM" ? 3 : lineupSize;
  const panelWidth = columnCount <= 2 ? 200 : columnCount === 3 ? 280 : columnCount === 4 ? 360 : 420;

  if (!mapScoreData || mapScoreData.players.length === 0) {
    return (
      <div className="hidden md:flex items-center justify-end" style={{ width: panelWidth }}>
        <p className="text-sm text-gray-500 italic pr-2">No Lineup Data</p>
      </div>
    );
  }

  const topPlayers = calculateMapLineupDisplay(mapScoreData.players, mapMod, lineupSize);

  if (topPlayers.length === 0) {
    return (
      <div className="hidden md:flex items-center justify-end" style={{ width: panelWidth }}>
        <p className="text-sm text-gray-500 italic pr-2">No Lineup Data</p>
      </div>
    );
  }

  return (
    <div
      className="hidden md:grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`, width: panelWidth }}
    >
      {topPlayers.map((player) => {
        const isCaptain = activeTournament?.players?.some((ap: any) => ap.osuId === player.id.toString() && ap.isAdmin);
        return (
          <div key={player.id} className="flex items-center gap-2">
            <Image
              src={player.avatarUrl || `https://a.ppy.sh/${player.id}`}
              alt={player.username || "Player"}
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