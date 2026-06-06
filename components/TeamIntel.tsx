"use client";

import { ScoreData } from "@/lib/types";
import { useMemo, useState } from "react";
import Image from "next/image";

type TeamIntelProps = {
  allScores: ScoreData[];
  selectedStage: string;
};

export default function TeamIntel({ allScores, selectedStage }: TeamIntelProps) {
  const [hiddenPlayerIds, setHiddenPlayerIds] = useState<Set<number>>(new Set());

  const uniquePlayers = useMemo(() => {
    const playersMap = new Map<number, any>();
    allScores.filter(s => s.stage === selectedStage).forEach(mapData => {
      mapData.players.forEach(p => {
        if (!playersMap.has(p.id)) playersMap.set(p.id, p);
      });
    });
    return Array.from(playersMap.values());
  }, [allScores, selectedStage]);

  const filteredScores = useMemo(() => {
    if (hiddenPlayerIds.size === 0) return allScores;
    return allScores.map(mapData => ({
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

      mapData.players.forEach(p => {
        let maxForPlayer = 0;
        let pTotal = 0;
        let pCount = 0;

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

          if (h.timestamp) {
            const hour = new Date(h.timestamp).getHours();
            if (hour >= 0 && hour < 5) nightOwlPlays++;
          }
        });
        if (maxForPlayer > 0) topScores.push(maxForPlayer);

        if (pCount > 0) {
          playerAveragesTotal += (pTotal / pCount);
          playersWithScoresCount += 1;
        }
      });

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

    const avgStdDev = stdDevCount > 0 ? totalStdDev / stdDevCount : null;
    let playstyle = null;
    if (avgStdDev !== null) {
      if (avgStdDev < 40000) playstyle = { type: 'CONSISTENT', dev: avgStdDev };
      else if (avgStdDev > 75000) playstyle = { type: 'COINFLIP', dev: avgStdDev };
    }

      const mapsToPractice = mapStats
        .filter(m => m.id !== bestMap.id && m.id !== worstMap.id && m.id !== safePick.id && m.id !== coinflipPick.id)
        .sort((a, b) => a.plays - b.plays || a.avg - b.avg)
        .slice(0, 3);

    return {
      fortress: bestMap.avg > 0 ? bestMap : null,
      achilles: worstMap.avg < Infinity ? worstMap : null,
      nightOwls: totalPlays > 0 ? (nightOwlPlays / totalPlays) * 100 : 0,
      hiveMind: closestMap.spread < Infinity ? closestMap : null,
      playstyle,
      safePick: safePick.dev < Infinity ? safePick : null,
      coinflipPick: coinflipPick.dev > 0 ? coinflipPick : null,
      mapsToPractice: mapsToPractice.length > 0 ? mapsToPractice : null,
      matchPerformance,
    };
  }, [allScores, selectedStage]);

  if (!intel || (!intel.fortress && !intel.achilles && intel.nightOwls === 0 && !intel.hiveMind && !intel.playstyle && !intel.safePick && !intel.coinflipPick && !intel.mapsToPractice && !intel.matchPerformance)) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg p-8 text-center transition-colors duration-200">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">Not enough data</h3>
        <p className="text-sm text-gray-500 mt-2">Play more maps and matches as a team in <span className="font-semibold text-pink-400">{selectedStage}</span> to generate intelligent insights here.</p>
      </div>
    );
  }

  return (
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
              return (
                <button
                  key={p.id}
                  onClick={() => togglePlayer(p.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                    isHidden 
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-100' 
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 shadow-sm hover:border-pink-400 dark:hover:border-pink-500'
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
                  <span className={isHidden ? 'line-through' : ''}>{p.username}</span>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Picks & Bans */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">What to Pick & Avoid</h3>
          
          {intel.fortress && (
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded border border-green-200 dark:border-green-800/50 flex flex-col shadow-sm">
              <span className="text-green-600 dark:text-green-400 font-bold mb-1">The Fortress (Auto-Pick)</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold">{intel.fortress.id}</span> is the team's best map, averaging {Math.round(intel.fortress.avg).toLocaleString()}.
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

          {intel.achilles && (
            <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded border border-red-200 dark:border-red-800/50 flex flex-col shadow-sm">
              <span className="text-red-600 dark:text-red-400 font-bold mb-1">Achilles' Heel (Auto-Ban)</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold">{intel.achilles.id}</span> is the team's weakest map, averaging only {Math.round(intel.achilles.avg).toLocaleString()}.
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
        </div>

        {/* Maps to Practice */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Maps to Practice</h3>
          
          {intel.mapsToPractice ? intel.mapsToPractice.map((map, i) => (
            <div key={map.id} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col shadow-sm">
              <span className="text-gray-800 dark:text-gray-200 font-bold mb-1">Priority #{i + 1}: {map.id}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {map.plays === 0 ? "No plays recorded yet. Needs immediate attention!" : `Only ${map.plays} plays recorded. Team averages ${Math.round(map.avg).toLocaleString()}.`}
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
                Top 3 players are incredibly close on <span className="font-semibold">{intel.hiveMind.id}</span> (±{Math.round(intel.hiveMind.spread).toLocaleString()} spread).
              </span>
            </div>
          )}

          {intel.playstyle && intel.playstyle.type === 'CONSISTENT' && (
            <div className="bg-teal-50 dark:bg-teal-900/30 p-4 rounded border border-teal-200 dark:border-teal-800/50 flex flex-col shadow-sm">
              <span className="text-teal-600 dark:text-teal-400 font-bold mb-1">Consistent Performers</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Extremely stable performance. Scores only fluctuate by an average of ±{Math.round(intel.playstyle.dev).toLocaleString()} points.
              </span>
            </div>
          )}

          {intel.playstyle && intel.playstyle.type === 'COINFLIP' && (
            <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded border border-orange-200 dark:border-orange-800/50 flex flex-col shadow-sm">
              <span className="text-orange-600 dark:text-orange-400 font-bold mb-1">High Risk, High Reward</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Overall scores fluctuate wildly by an average of ±{Math.round(intel.playstyle.dev).toLocaleString()} points. Try to stabilize averages.
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
        </div>
      </div>
    </div>
  );
}