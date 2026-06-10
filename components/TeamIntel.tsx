"use client";

import { ScoreData, MappoolMap } from "@/lib/types";
import { calculateMapIntelStats, getMapModFromPool } from "@/lib/mapLineup";
import { parseLineupSize } from "@/lib/tournamentFormat";
import { useMemo, useState, useEffect, type ReactNode } from "react";
import Image from "next/image";
import { fetchOsuMatch } from "@/app/actions";
import {
  buildMatchHighlightSummary,
  modBadgeClass,
  modBadgeLabel,
  type MatchMapResult,
} from "@/lib/matchStats";
import {
  calculatePracticeCoverageProgress,
  calculateTeamPracticeCoverage,
  getRequiredPracticeMapIds,
  REQUIRED_RUNS_PER_MAP,
} from "@/lib/teamPracticeCoverage";
import BeatmapLink from "@/components/BeatmapLink";
import { getBeatmapIdFromPool } from "@/lib/beatmapUrls";
import { buildMapsToPracticeInputFromIntel, calculateMapsToPractice } from "@/lib/mapsToPractice";

type TeamIntelProps = {
  allScores: ScoreData[];
  selectedStage: string;
  activeTournament?: any;
  mappool?: Record<string, MappoolMap[]>;
};

function IntelMapCard({
  label,
  mapId,
  beatmapId,
  labelClassName,
  className,
  children,
}: {
  label: string;
  mapId: string;
  beatmapId?: number | null;
  labelClassName: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className={`text-sm font-bold ${labelClassName}`}>{label}</span>
        <span className="flex items-center gap-1.5 rounded-md bg-black/5 dark:bg-white/10 px-2.5 py-1 text-base font-black tracking-wide text-gray-900 dark:text-white shrink-0">
          {mapId}
          <BeatmapLink beatmapId={beatmapId} />
        </span>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300">{children}</p>
    </div>
  );
}

function MatchMvpChip({
  mvp,
  suffix,
}: {
  mvp: { username: string; avatarUrl: string; score: number; mod: string; isFc: boolean };
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Image
        src={mvp.avatarUrl}
        alt={mvp.username}
        width={24}
        height={24}
        className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 object-cover flex-shrink-0"
      />
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
          {mvp.username}
          {suffix ? <span className="text-gray-500 dark:text-gray-400 font-normal">{suffix}</span> : null}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-semibold text-gray-600 dark:text-gray-300">
            {mvp.score.toLocaleString()}
          </span>
          <span className={`text-[9px] font-bold px-1 rounded border ${modBadgeClass(mvp.mod)}`}>
            {modBadgeLabel(mvp.mod)}
          </span>
          {mvp.isFc && (
            <span className="text-[9px] font-bold text-pink-500 dark:text-pink-400">FC</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchMapRow({ result, isQualifier }: { result: MatchMapResult; isQualifier: boolean }) {
  return (
    <div
      className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
        isQualifier
          ? "bg-gray-50/50 dark:bg-gray-900/20"
          : result.won
            ? "bg-green-50/50 dark:bg-green-900/10"
            : "bg-red-50/50 dark:bg-red-900/10"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {!isQualifier && (
          <span
            className={`w-6 text-center text-xs font-black uppercase ${
              result.won ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            {result.won ? "W" : "L"}
          </span>
        )}
        <span className="font-bold text-sm text-gray-900 dark:text-white">{result.mapId}</span>
        <span className={`text-[9px] font-bold px-1 rounded border ${modBadgeClass(result.mapMod)}`}>
          {result.mapMod}
        </span>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 min-w-0">
        <div className="text-right flex-shrink-0">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block">
            {isQualifier ? "Team Total" : "Score"}
          </span>
          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
            {result.ourScore.toLocaleString()}
            {!isQualifier && (
              <span className="text-gray-400 dark:text-gray-500 font-normal">
                {" "}
                vs {result.theirScore.toLocaleString()}
              </span>
            )}
          </span>
        </div>
        {result.mvp ? (
          <div className="min-w-0">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block text-right sm:text-left mb-0.5">
              Map MVP
            </span>
            <MatchMvpChip mvp={result.mvp} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function TeamIntel({ allScores, selectedStage, activeTournament, mappool }: TeamIntelProps) {
  const [hiddenPlayerIds, setHiddenPlayerIds] = useState<Set<number>>(new Set());
  const [mpLinkInput, setMpLinkInput] = useState("");
  const [savedMatchIds, setSavedMatchIds] = useState<string[]>([]);
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);

  const isQualifier = selectedStage.toLowerCase().includes("qual");

  const matchSummary = useMemo(() => {
    if (!matchResults?.length) return null;

    const matchData = matchResults[matchResults.length - 1];
    const stageMaps = mappool?.[selectedStage] || [];
    const teamPlayerIds = new Set<number>(
      (activeTournament?.players ?? []).map((p: any) => parseInt(p.osuId, 10))
    );

    return buildMatchHighlightSummary(
      matchData,
      stageMaps,
      teamPlayerIds,
      (userId) => {
        const roster = activeTournament?.players?.find(
          (p: any) => parseInt(p.osuId, 10) === userId
        );
        if (roster) {
          return {
            username: roster.username,
            avatarUrl: `https://a.ppy.sh/${userId}`,
          };
        }
        const apiUser = matchData.users?.find((u: any) => u.id === userId);
        if (apiUser) {
          return {
            username: apiUser.username,
            avatarUrl: apiUser.avatar_url || `https://a.ppy.sh/${userId}`,
          };
        }
        return {
          username: `Player ${userId}`,
          avatarUrl: `https://a.ppy.sh/${userId}`,
        };
      },
      isQualifier
    );
  }, [matchResults, mappool, selectedStage, activeTournament, isQualifier]);

  const uniquePlayers = useMemo(() => {
    const playersMap = new Map<number, any>();
    (allScores || []).filter(s => s.stage === selectedStage).forEach(mapData => {
      mapData.players.forEach(p => {
        if (!playersMap.has(p.id)) playersMap.set(p.id, p);
      });
    });
    return Array.from(playersMap.values());
  }, [allScores, selectedStage]);

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

  const intel = useMemo(() => {
    if (!filteredScores || filteredScores.length === 0) return null;

    const stageScores = filteredScores.filter(s => s.stage === selectedStage);
    if (stageScores.length === 0) return null;

    let bestMap = { id: "", avg: 0 };
    let worstMap = { id: "", avg: Infinity };
    let highestMinMap = { id: "", min: 0 };
    let nightOwlPlays = 0;
    let totalPlays = 0;
    
    let closestMap = { id: "", spread: Infinity, lineupSize: 3 };
    
    let totalStdDev = 0;
    let stdDevCount = 0;

    let safePick = { id: "", dev: Infinity };
    let coinflipPick = { id: "", dev: 0 };

    let mapStats: { id: string, avg: number, plays: number, dev: number }[] = [];
    
    let sumBuffs = 0;
    let mapsWithBoth = 0;

    let captainTotalScore = 0;
    let captainMapsCount = 0;
    let crewTotalScore = 0;
    let crewMapsCount = 0;

    const lineupSize = parseLineupSize(activeTournament?.format);

    stageScores.forEach(mapData => {
      let totalPlaysForMap = 0;

      let mapMatchScore = 0;
      let mapMatchPlays = 0;
      let mapPracticeScore = 0;
      let mapPracticePlays = 0;

      const mapMod = getMapModFromPool(mappool, selectedStage, mapData.mapId);

      mapData.players.forEach(p => {
        let pTotal = 0;
        let pCount = 0;

        const isCaptain = activeTournament?.players?.some((ap: any) => ap.osuId === p.id.toString() && ap.isCaptain);

        p.history.forEach(h => {
          pTotal += h.score;
          pCount += 1;
          totalPlays += 1;
          totalPlaysForMap += 1;

          if (h.scoreType === 'MATCH') {
            mapMatchScore += h.score;
            mapMatchPlays += 1;
          } else if (!h.scoreType || h.scoreType === 'PRACTICE' || h.scoreType === 'LOBBY') {
            mapPracticeScore += h.score;
            mapPracticePlays += 1;
          }

          if (h.timestamp) {
            const hour = new Date(h.timestamp).getHours();
            if (hour >= 0 && hour < 5) nightOwlPlays++;
          }
        });

        if (pCount > 0) {
          if (isCaptain) {
            captainTotalScore += pTotal / pCount;
            captainMapsCount += 1;
          } else {
            crewTotalScore += pTotal / pCount;
            crewMapsCount += 1;
          }
        }
      });

      const { avg, lineupScores, playStdDev, effectiveLineupSize } = calculateMapIntelStats(
        mapData.players,
        mapMod,
        lineupSize
      );

      if (mapMatchPlays > 0 && mapPracticePlays > 0) {
        const mAvg = mapMatchScore / mapMatchPlays;
        const pAvg = mapPracticeScore / mapPracticePlays;
        sumBuffs += (mAvg - pAvg);
        mapsWithBoth++;
      }

      if (avg > bestMap.avg) bestMap = { id: mapData.mapId, avg };
      if (avg < worstMap.avg && avg > 0) worstMap = { id: mapData.mapId, avg };

      if (lineupScores.length >= effectiveLineupSize) {
        const spread = lineupScores[0] - lineupScores[effectiveLineupSize - 1];
        if (spread < closestMap.spread) {
          closestMap = { id: mapData.mapId, spread, lineupSize: effectiveLineupSize };
        }

        const mapMin = Math.min(...lineupScores.slice(0, effectiveLineupSize));
        if (mapMin > highestMinMap.min) highestMinMap = { id: mapData.mapId, min: mapMin };
      }

      let currentStdDev = 0;
      if (playStdDev > 0) {
        totalStdDev += playStdDev;
        currentStdDev = playStdDev;
        stdDevCount++;

        if (currentStdDev < safePick.dev) safePick = { id: mapData.mapId, dev: currentStdDev };
        if (currentStdDev > coinflipPick.dev) coinflipPick = { id: mapData.mapId, dev: currentStdDev };
      }
      mapStats.push({ id: mapData.mapId, avg, plays: totalPlaysForMap, dev: currentStdDev });
    });

    let matchPerformance = null;
    if (mapsWithBoth > 0) {
      matchPerformance = { buff: sumBuffs / mapsWithBoth };
    }

    let mutiny = false;
    if (captainMapsCount >= 3 && crewMapsCount >= 3) {
      const captainAvg = captainTotalScore / captainMapsCount;
      const crewAvg = crewTotalScore / crewMapsCount;
      if (crewAvg > captainAvg) {
        mutiny = true;
      }
    }

    const avgStdDev = stdDevCount > 0 ? totalStdDev / stdDevCount : null;
    let playstyle = null;
    if (avgStdDev !== null) {
      if (avgStdDev < 40000) playstyle = { type: 'CONSISTENT', dev: avgStdDev };
      else if (avgStdDev > 75000) playstyle = { type: 'COINFLIP', dev: avgStdDev };
    }

    const excludeFromPractice = [
      bestMap.id,
      worstMap.id,
      safePick.id,
      coinflipPick.id,
    ].filter(Boolean);

    const mapsToPractice = calculateMapsToPractice(
      buildMapsToPracticeInputFromIntel(
        mappool,
        selectedStage,
        stageScores,
        activeTournament,
        hiddenPlayerIds,
        excludeFromPractice
      )
    );

    const pickOrder = mapStats
      .filter(m => m.avg > 0 && !m.id.toUpperCase().includes('TB'))
      .sort((a, b) => b.avg - a.avg);

    const requiredMapIds = getRequiredPracticeMapIds(mappool, selectedStage, stageScores);
    const rosterPlayers = (activeTournament?.players ?? [])
      .filter((p: any) => p.status === "ACCEPTED")
      .map((p: any) => ({
        id: parseInt(p.osuId, 10),
        username: p.username,
        avatarUrl: `https://a.ppy.sh/${p.osuId}`,
      }))
      .filter((p: { id: number }) => !hiddenPlayerIds.has(p.id));

    const practiceCoverage = calculateTeamPracticeCoverage(
      stageScores,
      requiredMapIds,
      rosterPlayers,
      REQUIRED_RUNS_PER_MAP
    );

    const practiceCoverageProgress = practiceCoverage
      ? calculatePracticeCoverageProgress(stageScores, requiredMapIds, rosterPlayers, REQUIRED_RUNS_PER_MAP)
      : null;

    return {
      fortress: highestMinMap.min > 0 ? highestMinMap : null,
      achilles: worstMap.avg < Infinity ? worstMap : null,
      nightOwls: totalPlays > 0 ? (nightOwlPlays / totalPlays) * 100 : 0,
      hiveMind: closestMap.spread <= 20000 ? closestMap : null,
      playstyle,
      safePick: safePick.dev < Infinity ? safePick : null,
      coinflipPick: coinflipPick.dev > 0 ? coinflipPick : null,
      mapsToPractice: mapsToPractice.length > 0 ? mapsToPractice : null,
      matchPerformance,
      pickOrder: pickOrder.length > 0 ? pickOrder : null,
      mutiny,
      practiceCoverage,
      practiceCoverageProgress,
    };
  }, [filteredScores, selectedStage, mappool, activeTournament, hiddenPlayerIds]);

  // Load saved match IDs from local storage when stage/tournament changes
  useEffect(() => {
    if (activeTournament?.id && selectedStage) {
      const key = `mp_links_${activeTournament.id}_${selectedStage}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const ids = JSON.parse(saved);
          const list = Array.isArray(ids) ? ids : [];
          setSavedMatchIds(list.length > 0 ? [list[list.length - 1]] : []);
        } catch (e) {
          setSavedMatchIds([]);
        }
      } else {
        setSavedMatchIds([]);
      }
    }
  }, [activeTournament?.id, selectedStage]);

  // Save match IDs to local storage when it changes
  useEffect(() => {
    if (activeTournament?.id && selectedStage && savedMatchIds.length > 0) {
      const key = `mp_links_${activeTournament.id}_${selectedStage}`;
      localStorage.setItem(key, JSON.stringify(savedMatchIds));
    }
  }, [savedMatchIds, activeTournament?.id, selectedStage]);

  // Fetch match data
  useEffect(() => {
    const loadMatches = async () => {
      if (savedMatchIds.length === 0) {
        setMatchResults([]);
        return;
      }
      setIsLoadingMatch(true);
      const results = [];
      for (const matchId of savedMatchIds.slice(0, 1)) {
        const data = await fetchOsuMatch(matchId);
        if (data && !data.error && data.events) {
          results.push(data);
        }
      }
      setMatchResults(results);
      setIsLoadingMatch(false);
    };
    loadMatches();
  }, [savedMatchIds]);

  const handleAddMpLink = () => {
    let matchId = "";
    const matchRegex = /matches\/(\d+)/;
    if (matchRegex.test(mpLinkInput)) {
      matchId = mpLinkInput.match(matchRegex)![1];
    } else if (/^\d+$/.test(mpLinkInput.trim())) {
      matchId = mpLinkInput.trim();
    }

    if (matchId) {
      setSavedMatchIds([matchId]);
    }
    setMpLinkInput("");
  };

  const handleRemoveMatch = (matchId: string) => {
    const newSaved = savedMatchIds.filter(id => id !== matchId);
    setSavedMatchIds(newSaved);
    if (newSaved.length === 0 && activeTournament?.id && selectedStage) {
      localStorage.removeItem(`mp_links_${activeTournament.id}_${selectedStage}`);
    }
  };

  const hasIntel = intel && (intel.fortress || intel.achilles || intel.nightOwls > 0 || intel.hiveMind || intel.playstyle || intel.safePick || intel.coinflipPick || intel.mapsToPractice || intel.matchPerformance || intel.pickOrder || intel.mutiny || intel.practiceCoverage);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg p-4 transition-colors duration-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Captain's Intel
        </h2>

        {uniquePlayers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mr-1">Roster:</span>
            {uniquePlayers.map(p => {
              const isHidden = hiddenPlayerIds.has(p.id);
            const isCaptain = activeTournament?.players?.some((ap: any) => ap.osuId === p.id.toString() && ap.isCaptain);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePlayer(p.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                    isHidden 
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-100' 
                      : 'bg-white dark:bg-white/10 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 shadow-sm hover:border-pink-400 dark:hover:border-pink-500'
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
                  {isCaptain && <span className="ml-1 text-[10px] text-pink-400" title="Captain">♔</span>}
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
      </div>

      {intel?.practiceCoverage && intel.practiceCoverageProgress && (
        <div className="mb-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Practice Coverage
            </h3>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {intel.practiceCoverageProgress.completedRuns} / {intel.practiceCoverageProgress.totalRequiredRuns} runs
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                ({intel.practiceCoverageProgress.percent}%)
              </span>
            </span>
          </div>
          <div className="h-2.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full rounded-full transition-all ${
                intel.practiceCoverage.fullCompletion ? "bg-lime-500" : "bg-pink-500"
              }`}
              style={{ width: `${intel.practiceCoverageProgress.percent}%` }}
            />
          </div>

          {intel.practiceCoverage.fullCompletion ? (
            <div className="bg-lime-50 dark:bg-lime-900/30 p-3 rounded border border-lime-200 dark:border-lime-800/50">
              <span className="text-lime-700 dark:text-lime-400 font-bold text-sm">Pat on the Back</span>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                Everyone logged at least {REQUIRED_RUNS_PER_MAP} runs on all{" "}
                {intel.practiceCoverage.requiredMapIds.length} maps. The crew is locked in.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-amber-700 dark:text-amber-400 font-bold text-sm block">Team Slack</span>
              {intel.practiceCoverage.slackers.map((slacker) => (
                <details
                  key={slacker.id}
                  className="bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-md group"
                >
                  <summary className="px-3 py-2 cursor-pointer list-none flex items-center justify-between text-sm font-semibold text-gray-900 dark:text-white">
                    <span>{slacker.username}</span>
                    <span className="text-xs font-normal text-amber-700 dark:text-amber-400">
                      {slacker.missingMaps.length} map{slacker.missingMaps.length !== 1 ? "s" : ""} incomplete
                    </span>
                  </summary>
                  <div className="px-3 pb-3 pt-0 flex flex-wrap gap-1.5">
                    {slacker.missingMaps.map((gap) => (
                      <span
                        key={gap.mapId}
                        className="text-xs bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded font-mono"
                      >
                        {gap.mapId}: {gap.playCount}/{REQUIRED_RUNS_PER_MAP}
                      </span>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      )}

      {hasIntel ? (
        <div className={`grid grid-cols-1 md:grid-cols-2 ${isQualifier ? 'lg:grid-cols-2' : 'xl:grid-cols-4 lg:grid-cols-3'} gap-6`}>
          {/* Picks & Bans */}
          {!isQualifier && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">What to Pick & Avoid</h3>
            
            {intel.fortress && (
              <IntelMapCard
                label="The Comfort Pick"
                mapId={intel.fortress.id}
                beatmapId={getBeatmapIdFromPool(mappool, selectedStage, intel.fortress.id)}
                labelClassName="text-green-600 dark:text-green-400"
                className="bg-green-50 dark:bg-green-900/30 p-4 rounded border border-green-200 dark:border-green-800/50 shadow-sm"
              >
                A guaranteed point. The lowest lineup score is still {Math.round(intel.fortress.min).toLocaleString()}.
              </IntelMapCard>
            )}
            
            {intel.safePick && (
              <IntelMapCard
                label="The Safe Pick"
                mapId={intel.safePick.id}
                beatmapId={getBeatmapIdFromPool(mappool, selectedStage, intel.safePick.id)}
                labelClassName="text-emerald-600 dark:text-emerald-400"
                className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded border border-emerald-200 dark:border-emerald-800/50 shadow-sm"
              >
                Lowest score variance on the team. Plays only fluctuate by ±{Math.round(intel.safePick.dev).toLocaleString()}.
              </IntelMapCard>
            )}

            {intel.coinflipPick && intel.coinflipPick.dev > 50000 && (
              <IntelMapCard
                label="The Coinflip Pick"
                mapId={intel.coinflipPick.id}
                beatmapId={getBeatmapIdFromPool(mappool, selectedStage, intel.coinflipPick.id)}
                labelClassName="text-yellow-600 dark:text-yellow-400"
                className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded border border-yellow-200 dark:border-yellow-800/50 shadow-sm"
              >
                Highly volatile — scores swing by ±{Math.round(intel.coinflipPick.dev).toLocaleString()}. High risk, high reward.
              </IntelMapCard>
            )}

            {intel.achilles && (
              <IntelMapCard
                label="The Ban Target"
                mapId={intel.achilles.id}
                beatmapId={getBeatmapIdFromPool(mappool, selectedStage, intel.achilles.id)}
                labelClassName="text-red-600 dark:text-red-400"
                className="bg-red-50 dark:bg-red-900/30 p-4 rounded border border-red-200 dark:border-red-800/50 shadow-sm"
              >
                Weakest map statistically. Team averages {Math.round(intel.achilles.avg).toLocaleString()}. Ban immediately.
              </IntelMapCard>
            )}
          </div>
        )}

        {/* Recommended Pick Order */}
        {!isQualifier && (
          <div className="flex flex-col gap-3 self-start">
            <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Pick Priority</h3>
            
            {intel.pickOrder ? (
              <div className="bg-surface rounded border border-border-main shadow-sm w-full">
                {intel.pickOrder.slice(0, 6).map((map, i) => (
                  <div key={map.id} className="flex justify-between items-center p-3 border-b border-border-main last:border-0">
                    <span className="font-bold text-content">
                      <span className={`${i === 0 ? 'text-accent' : i < 3 ? 'text-accent/80' : 'text-muted'} mr-2`}>#{i + 1}</span>
                      {map.id}
                    </span>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-content">{Math.round(map.avg).toLocaleString()}</span>
                      <span className="text-[10px] text-muted uppercase tracking-wider mt-0.5">Avg Score</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface p-4 rounded border border-border-main shadow-sm flex flex-col items-center justify-center text-center min-h-[100px] w-full">
                <span className="text-sm text-muted">Not enough data to rank picks.</span>
              </div>
            )}
          </div>
        )}

        {/* Maps to Practice */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Maps to Practice</h3>
          
          {intel.mapsToPractice ? intel.mapsToPractice.map((map, i) => (
            <div key={map.id} className="bg-surface p-4 rounded border border-border-main flex flex-col shadow-sm">
              <span className="text-content font-bold mb-1 flex items-center gap-1.5">
                Priority #{i + 1}: {map.id}
                <BeatmapLink beatmapId={getBeatmapIdFromPool(mappool, selectedStage, map.id)} />
              </span>
              <span className="text-sm text-muted">
                {map.plays === 0
                  ? "No plays recorded yet. Needs immediate attention!"
                  : `Team is struggling here. Practice avg ${Math.round(map.avg).toLocaleString()} across ${map.plays} solo/lobby plays.`}
              </span>
              {map.underPracticedPlayers.length > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
                  Under target:{" "}
                  {map.underPracticedPlayers
                    .map((p) => `${p.username} (${p.playCount}/${REQUIRED_RUNS_PER_MAP})`)
                    .join(", ")}
                </p>
              )}
            </div>
          )) : (
            <div className="bg-surface p-4 rounded border border-border-main flex flex-col shadow-sm items-center justify-center text-center h-full min-h-[100px]">
              <span className="text-sm text-muted">Not enough map data to determine priorities.</span>
            </div>
          )}
        </div>

        {/* Tips & Trends */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Tips & Trends</h3>
          
          {intel.hiveMind && (
            <IntelMapCard
              label="The Hive Mind"
              mapId={intel.hiveMind.id}
              beatmapId={getBeatmapIdFromPool(mappool, selectedStage, intel.hiveMind.id)}
              labelClassName="text-purple-600 dark:text-purple-400"
              className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded border border-purple-200 dark:border-purple-800/50 shadow-sm"
            >
              Terrifyingly synchronized. The top {intel.hiveMind.lineupSize} lineup scores are within {Math.round(intel.hiveMind.spread).toLocaleString()} points of each other.
            </IntelMapCard>
          )}

          {intel.playstyle && intel.playstyle.type === 'CONSISTENT' && (
            <div className="bg-teal-50 dark:bg-teal-900/30 p-4 rounded border border-teal-200 dark:border-teal-800/50 flex flex-col shadow-sm">
              <span className="text-teal-600 dark:text-teal-400 font-bold mb-1">Consistent Performers</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Statistically unshakable. Team-wide score variance is minimal (±{Math.round(intel.playstyle.dev).toLocaleString()}).
              </span>
            </div>
          )}

          {intel.playstyle && intel.playstyle.type === 'COINFLIP' && (
            <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded border border-orange-200 dark:border-orange-800/50 flex flex-col shadow-sm">
              <span className="text-orange-600 dark:text-orange-400 font-bold mb-1">High Risk, High Reward (The Coinflip Team)</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Pure chaos. Either FCing the map or failing out entirely (±{Math.round(intel.playstyle.dev).toLocaleString()}).
              </span>
            </div>
          )}

          {intel.nightOwls > 10 && (
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded border border-blue-200 dark:border-blue-800/50 flex flex-col shadow-sm">
              <span className="text-blue-600 dark:text-blue-400 font-bold mb-1">The Night Owls</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {intel.nightOwls.toFixed(1)}% of the team's scores are set between 12 AM and 5 AM. Remember to rest before matches!
              </span>
            </div>
          )}

          {intel.matchPerformance && (
            <div className={`p-4 rounded border flex flex-col shadow-sm ${intel.matchPerformance.buff > 0 ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800/50' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50'}`}>
              <span className={`font-bold mb-1 ${intel.matchPerformance.buff > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {intel.matchPerformance.buff > 0 ? 'Tournament Buff' : 'Tournament Nerves'}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                The team averages <span className="font-semibold">{intel.matchPerformance.buff > 0 ? '+' : ''}{Math.round(intel.matchPerformance.buff).toLocaleString()}</span> points {intel.matchPerformance.buff > 0 ? 'higher' : 'lower'} in official matches compared to practice.
              </span>
            </div>
          )}

          {intel.mutiny && (
            <div className="bg-rose-50 dark:bg-rose-900/30 p-4 rounded border border-rose-200 dark:border-rose-800/50 flex flex-col shadow-sm">
              <span className="text-rose-600 dark:text-rose-400 font-bold mb-1">The Mutiny</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                The crew is outperforming the captain this week. A full-scale mutiny is brewing on the leaderboard.
              </span>
            </div>
          )}

        </div>
      </div>
        ) : (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">Not enough data</h3>
            <p className="text-sm text-gray-500 mt-2">Play more maps and matches as a team in <span className="font-semibold text-pink-400">{selectedStage}</span> to generate intelligent insights here.</p>
          </div>
        )}
    </div>

      {/* Match Results Panel */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg p-4 transition-colors duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Stage Match Results
          </h2>
          <div className="flex gap-2 w-full md:w-auto">
            <input
              type="text"
              value={mpLinkInput}
              onChange={(e) => setMpLinkInput(e.target.value)}
              placeholder="Paste MP link for this stage"
              className="w-full md:w-64 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-pink-500 focus:outline-none"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddMpLink(); }}
            />
            <button
              onClick={handleAddMpLink}
              disabled={!mpLinkInput}
              className="bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-sm font-semibold py-1.5 px-4 rounded-md transition-colors whitespace-nowrap shadow-sm"
            >
              Link Match
            </button>
          </div>
        </div>

        {savedMatchIds.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400">Link this stage&apos;s multiplayer match to see map MVPs and highlights.</p>
          </div>
        ) : isLoadingMatch && matchResults.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 animate-pulse">Loading match data...</p>
          </div>
        ) : !matchSummary ? (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400">Match loaded, but no games matched maps in this stage&apos;s mappool.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white truncate" title={matchSummary.name}>
                  {matchSummary.name}
                </h3>
                <a
                  href={`https://osu.ppy.sh/community/matches/${matchSummary.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-gray-400 hover:text-pink-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                {isQualifier ? (
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {matchSummary.mapResults.length} maps logged
                  </span>
                ) : (
                  <span className="font-bold text-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-0.5 rounded-md shadow-sm">
                    <span className={matchSummary.ourWins >= matchSummary.theirWins ? "text-green-500 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}>
                      {matchSummary.ourWins}
                    </span>
                    <span className="text-gray-300 dark:text-gray-600 mx-1.5">-</span>
                    <span className={matchSummary.theirWins > matchSummary.ourWins ? "text-red-500 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}>
                      {matchSummary.theirWins}
                    </span>
                  </span>
                )}

                {matchSummary.matchMvp && (
                  <div className="flex items-center gap-2 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800/50 rounded-md px-2.5 py-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">
                      Match MVP
                    </span>
                    <MatchMvpChip
                      mvp={matchSummary.matchMvp}
                      suffix={` · ${matchSummary.matchMvp.topMapCount} map${matchSummary.matchMvp.topMapCount === 1 ? "" : "s"}`}
                    />
                  </div>
                )}

                {matchSummary.peakPlay &&
                  matchSummary.peakPlay.userId !== matchSummary.matchMvp?.userId && (
                  <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-md px-2.5 py-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Peak {matchSummary.peakPlay.mapId}
                    </span>
                    <MatchMvpChip mvp={matchSummary.peakPlay} />
                  </div>
                )}

                <button
                  onClick={() => handleRemoveMatch(matchSummary.id.toString())}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Remove Link"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {matchSummary.mapResults.map((result) => (
                <MatchMapRow key={result.mapId} result={result} isQualifier={isQualifier} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}