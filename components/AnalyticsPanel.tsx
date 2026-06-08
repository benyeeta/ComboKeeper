import Image from "next/image";
import { useMemo } from "react";
import { MappoolMap, PlayerData, ScoreData } from "@/lib/types";

type AnalyticsPanelProps = {
  selectedMap: MappoolMap | null;
  selectedStage: string;
  onViewPlayerScores: (player: PlayerData) => void;
  allScores: ScoreData[];
  activeTournament?: any;
};

/**
 * Calculates the mean of a dataset, excluding a percentage of data points from the top and bottom tails.
 * This is equivalent to Excel's TRIMMEAN function.
 * @param scores - An array of numbers.
 * @param percent - The fractional number of data points to exclude (e.g., 0.5 for 50%).
 * @returns The trimmed mean, or null if there are not enough scores.
 */
function calculateTrimmedMean(scores: number[], percent: number): number | null {
  if (scores.length < 2) {
    return null;
  }

  const sortedScores = [...scores].sort((a, b) => a - b);
  const trimCount = Math.floor((sortedScores.length * percent) / 2);

  const trimmedScores = sortedScores.slice(trimCount, sortedScores.length - trimCount);
  if (trimmedScores.length === 0) {
    return null;
  }

  const sum = trimmedScores.reduce((acc, val) => acc + val, 0);
  return sum / trimmedScores.length;
}

export default function AnalyticsPanel({ selectedMap, selectedStage, onViewPlayerScores, allScores, activeTournament }: AnalyticsPanelProps) {
  if (!selectedMap) return null;

  // Memoize the processed leaderboard data to avoid re-computation on every render.
  const leaderboardData = useMemo(() => {
    if (!selectedMap) return null;

    // Find score data for the selected map from our array of scores
    const mapScoreData = (allScores || []).find(data => data.mapId === selectedMap.id && data.stage === selectedStage);
    if (!mapScoreData) {
      return null;
    }

    const processed = mapScoreData.players.map((player) => {
      // Find the play with the highest score from the player's history
      const topPlay = player.history.reduce(
        (best, current) => (current.score > best.score ? current : best),
        player.history[0] || { score: 0, accuracy: 0 }
      );

      // Segment scores to find actual performance vs expectations
      const practiceScores = player.history.filter((p: any) => p.scoreType === 'PRACTICE' || !p.scoreType);
      const matchScores = player.history.filter((p: any) => p.scoreType && p.scoreType !== 'PRACTICE');

      const bestMatch = matchScores.reduce(
        (best: any, current: any) => (current.score > best.score ? current : best),
        matchScores[0] || { score: 0 }
      );

      // The trend is the historical scores over time
      const trend = player.history.map((play) => play.score);
      const practiceScoreVals = practiceScores.map((p: any) => p.score);
      const average = calculateTrimmedMean(practiceScoreVals, 0.5);

      let perfDiff = null;
      if (bestMatch.score > 0 && average !== null) {
        perfDiff = bestMatch.score - average;
      }

      return {
        ...player, // Pass through the original player object
        name: player.username,
        avatarUrl: player.avatarUrl || `https://a.ppy.sh/${player.id}`,
        score: topPlay.score.toLocaleString(),
        trend: trend,
        averageScore: average !== null ? Math.round(average).toLocaleString() : 'min 2 plays',
        bestMatchScore: bestMatch.score > 0 ? bestMatch.score.toLocaleString() : '-',
        perfDiff: perfDiff !== null ? Math.round(perfDiff) : null,
        isCaptain: activeTournament?.players?.some((ap: any) => ap.osuId === player.id.toString() && ap.isAdmin) || false,
      };
    });

    // Sort the leaderboard by score (descending)
    return processed.sort((a, b) => {
      const scoreA = parseInt(a.score.replace(/,/g, ''), 10);
      const scoreB = parseInt(b.score.replace(/,/g, ''), 10);
      return scoreB - scoreA;
    });
  }, [selectedMap, selectedStage, allScores, activeTournament]);

  return (
    <div className="flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-0">Player</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Score Trend</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Practice Avg</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Match Best</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">+/- Expected</th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Top Overall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {leaderboardData ? (
                  leaderboardData.map((player) => (
                    <tr key={player.name} onClick={() => onViewPlayerScores(player)} className="cursor-pointer group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-0">
                        <div className="flex items-center gap-3 text-left transition-colors group-hover:text-pink-400">
                          <div className="flex-shrink-0">
                            <Image src={player.avatarUrl} alt={player.name} width={32} height={32} className="w-8 h-8 rounded-full" />
                          </div>
                          <span className={player.isCaptain ? "font-bold" : "font-medium"}>
                            {player.name}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600 dark:text-gray-300">
                          <div className="flex items-center gap-4 text-green-400">
                              <Sparkline scores={player.trend} />
                              <span>{player.trend.length} plays</span>
                          </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-600 dark:text-gray-300">{player.averageScore}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-blue-600 dark:text-blue-300">{player.bestMatchScore}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold">
                        {player.perfDiff !== null ? (
                          <span className={player.perfDiff > 0 ? "text-green-400" : "text-red-400"}>
                            {player.perfDiff > 0 ? "+" : ""}{player.perfDiff.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold text-gray-900 dark:text-white">{player.score}</td>
                    </tr>
                  ))
                ) : (
                    <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">No score data available for this map.</td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}

// A more visually appealing sparkline component to show score progression.
// Moved outside the main component to prevent re-declaration on every render.
function Sparkline({ scores }: { scores: number[] }) {
  if (!scores || scores.length < 2) {
    // Can't draw a line with less than 2 points. Return a placeholder.
    return <div className="w-24 h-8" />;
  }

  const width = 100;
  const height = 25;
  const padding = 3; // Vertical padding for the graph
  const drawingHeight = height - padding * 2;

  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore;

  const points = scores.map((score, i) => {
    const x = (i / (scores.length - 1)) * width;
    
    let y_normalized = 0.5; // Default to middle if all scores are the same
    if (range > 0) {
      y_normalized = (score - minScore) / range;
    }
    
    // Invert Y axis for SVG, and apply padding
    const y = (height - padding) - (y_normalized * drawingHeight);
    return { x, y };
  });

  const linePoints = points.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const areaPoints = `${points[0].x.toFixed(2)},${height} ${linePoints} ${points[points.length - 1].x.toFixed(2)},${height}`;
  const lastPoint = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-24 h-8" preserveAspectRatio="none" role="img" aria-label="A line graph of score progression.">
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.4} />
          <stop offset="75%" stopColor="currentColor" stopOpacity={0.05} />
        </linearGradient>
      </defs>
      
      {/* Gradient fill area */}
      <polygon points={areaPoints} fill="url(#sparkline-gradient)" />
      
      {/* The trend line */}
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={linePoints}
      />
      
      {/* Highlight the last data point */}
      <circle
        cx={lastPoint.x.toFixed(2)}
        cy={lastPoint.y.toFixed(2)}
        r="2.5"
        fill="currentColor"
        stroke="#1f2937" // bg-gray-800
        strokeWidth="1.5"
      />
    </svg>
  );
}