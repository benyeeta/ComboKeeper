"use client";

import { ScoreData, MappoolMap } from "@/lib/types";
import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { fetchOsuMatch } from "@/app/actions";

type TeamIntelProps = {
  allScores: ScoreData[];
  selectedStage: string;
  activeTournament?: any;
  mappool?: Record<string, MappoolMap[]>;
};

export default function TeamIntel({ allScores, selectedStage, activeTournament, mappool }: TeamIntelProps) {
  const [hiddenPlayerIds, setHiddenPlayerIds] = useState<Set<number>>(new Set());
  const [mpLinkInput, setMpLinkInput] = useState("");
  const [savedMatchIds, setSavedMatchIds] = useState<string[]>([]);
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);

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
    
    let closestMap = { id: "", spread: Infinity };
    
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

    stageScores.forEach(mapData => {
      let playerAveragesTotal = 0;
      let playersWithScoresCount = 0;
      let topScores: number[] = [];
      let allMapScores: number[] = [];
      let totalPlaysForMap = 0;

      let mapMatchScore = 0;
      let mapMatchPlays = 0;
      let mapPracticeScore = 0;
      let mapPracticePlays = 0;

      const isMM = mapData.mapId.toUpperCase().startsWith('MM');
      const isFM = mapData.mapId.toUpperCase().startsWith('FM');

      mapData.players.forEach(p => {
        let maxForPlayer = 0;
        let bestFMScore = 0;
        let pTotal = 0;
        let pCount = 0;

        const isCaptain = activeTournament?.players?.some((ap: any) => ap.osuId === p.id.toString() && ap.isAdmin);

        p.history.forEach(h => {
          pTotal += h.score;
          pCount += 1;
          totalPlays += 1;
          totalPlaysForMap += 1;
          allMapScores.push(h.score);

          if (h.scoreType === 'MATCH') {
            mapMatchScore += h.score;
            mapMatchPlays += 1;
          } else if (!h.scoreType || h.scoreType === 'PRACTICE') {
            mapPracticeScore += h.score;
            mapPracticePlays += 1;
          }

          if (h.score > maxForPlayer) maxForPlayer = h.score;
          if (h.playedMod && h.playedMod !== 'NM' && h.score > bestFMScore) bestFMScore = h.score;

          if (h.timestamp) {
            const hour = new Date(h.timestamp).getHours();
            if (hour >= 0 && hour < 5) nightOwlPlays++;
          }
        });
        
        if (!isMM) {
          const scoreToPush = isFM ? (bestFMScore > 0 ? bestFMScore : maxForPlayer) : maxForPlayer;
          if (scoreToPush > 0) topScores.push(scoreToPush);
        }

        if (pCount > 0) {
          playerAveragesTotal += (pTotal / pCount);
          playersWithScoresCount += 1;

          if (isCaptain) {
            captainTotalScore += (pTotal / pCount);
            captainMapsCount += 1;
          } else {
            crewTotalScore += (pTotal / pCount);
            crewMapsCount += 1;
          }
        }
      });

      if (isMM) {
        const requiredMods = ['HD', 'HR', 'NM'];
        let maxTotal = -1;
        let bestScores: number[] = [];

        const getBestScore = (player: any, reqMod: string) => {
          const plays = player.history.filter((h: any) => {
            if (reqMod === 'NM') return !h.playedMod || h.playedMod === 'NM';
            return h.playedMod && h.playedMod.includes(reqMod);
          });
          return plays.length > 0 ? Math.max(...plays.map((h: any) => h.score)) : 0;
        };

        const playersToEvaluate = [...mapData.players];
        let dummyIdCounter = -1;
        while (playersToEvaluate.length < 3) {
          playersToEvaluate.push({ id: dummyIdCounter--, username: "Dummy", avatarUrl: "", history: [] } as any);
        }

        const playerBestScores = new Map();
        for (const p of playersToEvaluate) {
          playerBestScores.set(p.id, { HD: getBestScore(p, 'HD'), HR: getBestScore(p, 'HR'), NM: getBestScore(p, 'NM') });
        }

        const findBestAssignment = (modIndex: number, currentScores: number[], currentTotal: number, usedPlayers: Set<number>) => {
          if (modIndex === requiredMods.length) {
            if (currentTotal > maxTotal) { maxTotal = currentTotal; bestScores = [...currentScores]; }
            return;
          }
          const reqMod = requiredMods[modIndex];
          for (const p of playersToEvaluate) {
            if (!usedPlayers.has(p.id)) {
              let score = playerBestScores.get(p.id)[reqMod];
              usedPlayers.add(p.id);
              if (score === 0) {
                const fallbackPlay = p.history.length > 0 ? p.history.reduce((a: any, b: any) => a.score > b.score ? a : b) : null;
                score = fallbackPlay?.score || 0;
              }
              currentScores.push(score);
              findBestAssignment(modIndex + 1, currentScores, currentTotal + score, usedPlayers);
              currentScores.pop();
              usedPlayers.delete(p.id);
            }
          }
        };
        findBestAssignment(0, [], 0, new Set());
        topScores = bestScores.filter(s => s > 0);
      }

      if (mapMatchPlays > 0 && mapPracticePlays > 0) {
        const mAvg = mapMatchScore / mapMatchPlays;
        const pAvg = mapPracticeScore / mapPracticePlays;
        sumBuffs += (mAvg - pAvg);
        mapsWithBoth++;
      }

      const avg = playersWithScoresCount > 0 ? playerAveragesTotal / playersWithScoresCount : 0;
      if (avg > bestMap.avg) bestMap = { id: mapData.mapId, avg };
      if (avg < worstMap.avg && avg > 0) worstMap = { id: mapData.mapId, avg };

      topScores.sort((a, b) => b - a);
      if (topScores.length >= 3) {
        const spread = topScores[0] - topScores[2];
        if (spread < closestMap.spread) {
          closestMap = { id: mapData.mapId, spread };
        }
        
        const mapMin = Math.min(...topScores);
        if (mapMin > highestMinMap.min) highestMinMap = { id: mapData.mapId, min: mapMin };
      }

        let currentStdDev = 0;
      if (allMapScores.length >= 3) {
        const mean = allMapScores.reduce((a, b) => a + b, 0) / allMapScores.length;
        const variance = allMapScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allMapScores.length;
        totalStdDev += Math.sqrt(variance);
        currentStdDev = Math.sqrt(variance);
        stdDevCount++;
        
        const stdDev = Math.sqrt(variance);
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

      const mapsToPractice = mapStats
      .filter(m => m.id !== bestMap.id && m.id !== worstMap.id && m.id !== safePick.id && m.id !== coinflipPick.id && !m.id.toUpperCase().includes('TB'))
      .sort((a, b) => a.avg - b.avg)
        .slice(0, 3);

    const pickOrder = mapStats
      .filter(m => m.avg > 0 && !m.id.toUpperCase().includes('TB'))
      .sort((a, b) => b.avg - a.avg);

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
    };
  }, [allScores, selectedStage]);

  // Load saved match IDs from local storage when stage/tournament changes
  useEffect(() => {
    if (activeTournament?.id && selectedStage) {
      const key = `mp_links_${activeTournament.id}_${selectedStage}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try { setSavedMatchIds(JSON.parse(saved)); } catch (e) { setSavedMatchIds([]); }
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
      for (const matchId of savedMatchIds) {
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

    if (matchId && !savedMatchIds.includes(matchId)) {
      setSavedMatchIds([...savedMatchIds, matchId]);
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

  const isQualifier = selectedStage.toLowerCase().includes('qual');
  const hasIntel = intel && (intel.fortress || intel.achilles || intel.nightOwls > 0 || intel.hiveMind || intel.playstyle || intel.safePick || intel.coinflipPick || intel.mapsToPractice || intel.matchPerformance || intel.pickOrder || intel.mutiny);

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
            const isCaptain = activeTournament?.players?.some((ap: any) => ap.osuId === p.id.toString() && ap.isAdmin);
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
      {hasIntel ? (
        <div className={`grid grid-cols-1 md:grid-cols-2 ${isQualifier ? 'lg:grid-cols-2' : 'xl:grid-cols-4 lg:grid-cols-3'} gap-6`}>
          {/* Picks & Bans */}
          {!isQualifier && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">What to Pick & Avoid</h3>
            
            {intel.fortress && (
              <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded border border-green-200 dark:border-green-800/50 flex flex-col shadow-sm">
                <span className="text-green-600 dark:text-green-400 font-bold mb-1">The Comfort Pick (The Fortress)</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  A guaranteed point. The lowest team score on <span className="font-semibold">{intel.fortress.id}</span> is still {Math.round(intel.fortress.min).toLocaleString()}.
                </span>
              </div>
            )}
            
            {intel.safePick && (
              <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded border border-emerald-200 dark:border-emerald-800/50 flex flex-col shadow-sm">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold mb-1">The Safe Pick</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">{intel.safePick.id}</span> has the lowest variance. Scores only fluctuate by ±{Math.round(intel.safePick.dev).toLocaleString()}.
                </span>
              </div>
            )}

            {intel.coinflipPick && intel.coinflipPick.dev > 50000 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded border border-yellow-200 dark:border-yellow-800/50 flex flex-col shadow-sm">
                <span className="text-yellow-600 dark:text-yellow-400 font-bold mb-1">The Coinflip Pick (Risky)</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">{intel.coinflipPick.id}</span> is highly volatile. Scores fluctuate wildly by ±{Math.round(intel.coinflipPick.dev).toLocaleString()}.
                </span>
              </div>
            )}

            {intel.achilles && (
              <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded border border-red-200 dark:border-red-800/50 flex flex-col shadow-sm">
                <span className="text-red-600 dark:text-red-400 font-bold mb-1">The Veto Target (Achilles' Heel)</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Statistically the worst map. Average score: {Math.round(intel.achilles.avg).toLocaleString()}. Ban immediately.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Recommended Pick Order */}
        {!isQualifier && (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Pick Priority</h3>
            
            {intel.pickOrder ? (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col h-full">
                {intel.pickOrder.slice(0, 6).map((map, i) => (
                  <div key={map.id} className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      <span className={`${i === 0 ? 'text-pink-500' : i < 3 ? 'text-pink-400/80' : 'text-gray-400'} mr-2`}>#{i + 1}</span>
                      {map.id}
                    </span>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{Math.round(map.avg).toLocaleString()}</span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Avg Score</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col shadow-sm items-center justify-center text-center h-full min-h-[100px]">
                <span className="text-sm text-gray-500 dark:text-gray-400">Not enough data to rank picks.</span>
              </div>
            )}
          </div>
        )}

        {/* Maps to Practice */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Maps to Practice</h3>
          
          {intel.mapsToPractice ? intel.mapsToPractice.map((map, i) => (
            <div key={map.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col shadow-sm">
              <span className="text-gray-800 dark:text-gray-200 font-bold mb-1">Priority #{i + 1}: {map.id}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {map.plays === 0 ? "No plays recorded yet. Needs immediate attention!" : `Team is struggling here. Averaging ${Math.round(map.avg).toLocaleString()} across ${map.plays} plays.`}
              </span>
            </div>
          )) : (
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col shadow-sm items-center justify-center text-center h-full min-h-[100px]">
              <span className="text-sm text-gray-500 dark:text-gray-400">Not enough map data to determine priorities.</span>
            </div>
          )}
        </div>

        {/* Tips & Trends */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Tips & Trends</h3>
          
          {intel.hiveMind && (
            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded border border-purple-200 dark:border-purple-800/50 flex flex-col shadow-sm">
              <span className="text-purple-600 dark:text-purple-400 font-bold mb-1">The Hive Mind</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Terrifyingly synchronized. Top 3 players are within {Math.round(intel.hiveMind.spread).toLocaleString()} points of each other on <span className="font-semibold">{intel.hiveMind.id}</span>.
              </span>
            </div>
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
              placeholder="Paste MP Link or Match ID"
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
            <p className="text-gray-500 dark:text-gray-400">Link an osu! multiplayer match to see actual team results for this stage.</p>
          </div>
        ) : isLoadingMatch && matchResults.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-8 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-gray-500 dark:text-gray-400 animate-pulse">Loading match data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {matchResults.map(match => {
              const stageMaps = mappool?.[selectedStage] || [];
              const teamPlayers = new Set(activeTournament?.players?.map((p: any) => parseInt(p.osuId)));
              
              const matchGames = match.events
                .filter((e: any) => e.game && e.game.beatmap_id)
                .map((e: any) => e.game);

              const mapResults = matchGames.map((game: any) => {
                const poolMap = stageMaps.find(m => (m as any).beatmapId === game.beatmap_id);
                if (!poolMap) return null;

                let ourScore = 0;
                let theirScore = 0;
                
                game.scores.forEach((s: any) => {
                  if (s.score === 0) return;
                  if (teamPlayers.has(s.user_id)) {
                    ourScore += s.score;
                  } else {
                    theirScore += s.score;
                  }
                });

                return {
                  mapId: poolMap.id,
                  beatmapId: (poolMap as any).beatmapId,
                  ourScore,
                  theirScore,
                  won: ourScore > theirScore
                };
              }).filter(Boolean);

              if (mapResults.length === 0) return null;

              const ourWins = mapResults.filter((r: any) => r.won).length;
              const theirWins = mapResults.length - ourWins;

              return (
                <div key={match.match.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden flex flex-col transition-colors duration-200">
                  <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <h3 className="font-bold text-gray-900 dark:text-white truncate max-w-xs sm:max-w-sm md:max-w-md" title={match.match.name}>{match.match.name}</h3>
                      <a href={`https://osu.ppy.sh/community/matches/${match.match.id}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-gray-400 hover:text-pink-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-bold text-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-md shadow-sm">
                        <span className={ourWins >= theirWins ? "text-green-500 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}>{ourWins}</span>
                        <span className="text-gray-300 dark:text-gray-600 mx-1.5">-</span>
                        <span className={theirWins > ourWins ? "text-red-500 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}>{theirWins}</span>
                      </span>
                      <button onClick={() => handleRemoveMatch(match.match.id.toString())} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Remove Link">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {mapResults.map((r: any, idx: number) => (
                      <div key={idx} className={`px-4 py-2.5 flex items-center justify-between transition-colors ${r.won ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-red-50/50 dark:bg-red-900/10'}`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-10 text-center font-bold text-sm ${r.won ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{r.mapId}</span>
                        </div>
                        <div className="flex items-center gap-6 font-mono text-sm">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-sans font-bold">Team</span>
                            <span className={`font-semibold ${r.won ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{r.ourScore.toLocaleString()}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-sans font-bold">Opponent</span>
                            <span className={`font-semibold ${!r.won ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{r.theirScore.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}