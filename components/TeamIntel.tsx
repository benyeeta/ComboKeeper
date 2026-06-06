"use client";

import { ScoreData } from "@/lib/types";
import { useMemo } from "react";

type TeamIntelProps = {
  allScores: ScoreData[];
};

export default function TeamIntel({ allScores }: TeamIntelProps) {
  const intel = useMemo(() => {
    if (!allScores || allScores.length === 0) return null;

    let bestMap = { id: "", avg: 0 };
    let worstMap = { id: "", avg: Infinity };
    let nightOwlPlays = 0;
    let totalPlays = 0;
    
    let closestMap = { id: "", spread: Infinity };

    allScores.forEach(mapData => {
      let mapTotal = 0;
      let mapCount = 0;
      let topScores: number[] = [];

      mapData.players.forEach(p => {
        let maxForPlayer = 0;
        p.history.forEach(h => {
          mapTotal += h.score;
          mapCount += 1;
          totalPlays += 1;

          if (h.score > maxForPlayer) maxForPlayer = h.score;

          const hour = new Date(h.timestamp).getHours();
          if (hour >= 0 && hour < 5) nightOwlPlays++;
        });
        if (maxForPlayer > 0) topScores.push(maxForPlayer);
      });

      const avg = mapCount > 0 ? mapTotal / mapCount : 0;
      if (avg > bestMap.avg) bestMap = { id: mapData.mapId, avg };
      if (avg < worstMap.avg && avg > 0) worstMap = { id: mapData.mapId, avg };

      topScores.sort((a, b) => b - a);
      if (topScores.length >= 3) {
        const spread = topScores[0] - topScores[2];
        if (spread < closestMap.spread) {
          closestMap = { id: mapData.mapId, spread };
        }
      }
    });

    return {
      fortress: bestMap.avg > 0 ? bestMap : null,
      achilles: worstMap.avg < Infinity ? worstMap : null,
      nightOwls: totalPlays > 0 ? (nightOwlPlays / totalPlays) * 100 : 0,
      hiveMind: closestMap.spread < Infinity ? closestMap : null
    };
  }, [allScores]);

  if (!intel || (!intel.fortress && !intel.achilles && intel.nightOwls === 0 && !intel.hiveMind)) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-lg p-4 mt-4 transition-colors duration-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
        <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Captain's Intel
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {intel.fortress && (
          <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded border border-green-200 dark:border-green-800/50 flex flex-col shadow-sm">
            <span className="text-green-600 dark:text-green-400 font-bold mb-1">The Fortress (Auto-Pick)</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-semibold">{intel.fortress.id}</span> is the team's best map, averaging {Math.round(intel.fortress.avg).toLocaleString()}.
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
        {intel.hiveMind && (
          <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded border border-purple-200 dark:border-purple-800/50 flex flex-col shadow-sm">
            <span className="text-purple-600 dark:text-purple-400 font-bold mb-1">The Hive Mind</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Top 3 players are incredibly close on <span className="font-semibold">{intel.hiveMind.id}</span> (±{Math.round(intel.hiveMind.spread).toLocaleString()} spread).
            </span>
          </div>
        )}
        {intel.nightOwls > 10 && (
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded border border-blue-200 dark:border-blue-800/50 flex flex-col shadow-sm">
            <span className="text-blue-600 dark:text-blue-400 font-bold mb-1">The Night Owls</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {intel.nightOwls.toFixed(1)}% of the team's scores are set between 12 AM and 5 AM. Sleep is for the weak.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}