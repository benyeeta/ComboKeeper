import Image from "next/image";
import { useMemo } from "react";
import { MappoolMap, PlayerData, ScoreData } from "@/lib/types";
import { modBadgeClass, modBadgeLabel } from "@/lib/matchStats";
import { pickRepresentativePlay } from "@/lib/mmLineup";
import { calculateWeightedTrimmedMean } from "@/lib/playerAverage";

type AnalyticsPanelProps = {
  selectedMap: MappoolMap | null;
  selectedStage: string;
  onViewPlayerScores: (player: PlayerData) => void;
  allScores: ScoreData[];
  activeTournament?: any;
};

function isPracticeScoreType(scoreType?: string): boolean {
  return !scoreType || scoreType === "PRACTICE" || scoreType === "LOBBY";
}

function formatModLabel(playedMod?: string | null): string {
  if (!playedMod || playedMod === "NM") return "NM";
  return playedMod.includes("+") ? playedMod : `+${playedMod}`;
}

export default function AnalyticsPanel({ selectedMap, selectedStage, onViewPlayerScores, allScores, activeTournament }: AnalyticsPanelProps) {
  const mapMod = selectedMap?.mod;
  const showModColumn = mapMod === "MM" || mapMod === "FM";

  const leaderboardData = useMemo(() => {
    if (!selectedMap) return null;

    const mapScoreData = (allScores || []).find((data) => data.mapId === selectedMap.id && data.stage === selectedStage);
    if (!mapScoreData) {
      return null;
    }

    const processed = mapScoreData.players.map((player) => {
      const topPlay = player.history.reduce(
        (best, current) => (current.score > best.score ? current : best),
        player.history[0] || { score: 0, accuracy: 0 }
      );

      const practiceScores = player.history.filter((p) => isPracticeScoreType(p.scoreType));
      const matchScores = player.history.filter((p) => p.scoreType && !isPracticeScoreType(p.scoreType));

      const bestMatch = matchScores.reduce(
        (best, current) => (current.score > best.score ? current : best),
        matchScores[0] || { score: 0 }
      );

      const representative = pickRepresentativePlay(player.history);
      const displayMod = representative?.playedMod || bestMatch.playedMod || topPlay.playedMod || "NM";

      const trend = player.history.map((play) => play.score);
      const average = calculateWeightedTrimmedMean(practiceScores, 0.5);

      let perfDiff = null;
      if (bestMatch.score > 0 && average !== null) {
        perfDiff = bestMatch.score - average;
      }

      return {
        ...player,
        name: player.username,
        avatarUrl: player.avatarUrl || `https://a.ppy.sh/${player.id}`,
        score: topPlay.score.toLocaleString(),
        trend,
        averageScore: average !== null ? Math.round(average).toLocaleString() : "min 2 plays",
        bestMatchScore: bestMatch.score > 0 ? bestMatch.score.toLocaleString() : "-",
        perfDiff: perfDiff !== null ? Math.round(perfDiff) : null,
        playedMod: displayMod,
        isCaptain:
          activeTournament?.players?.some((ap: any) => ap.osuId === player.id.toString() && ap.isCaptain) || false,
      };
    });

    return processed.sort((a, b) => {
      const scoreA = parseInt(a.score.replace(/,/g, ""), 10);
      const scoreB = parseInt(b.score.replace(/,/g, ""), 10);
      return scoreB - scoreA;
    });
  }, [selectedMap, selectedStage, allScores, activeTournament]);

  if (!selectedMap) return null;

  const colSpan = showModColumn ? 7 : 6;

  return (
    <div className="flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-0">Player</th>
                  {showModColumn && (
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Mod</th>
                  )}
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
                    <tr key={player.name} onClick={() => onViewPlayerScores(player)} className="cursor-pointer group hover:bg-hover-overlay/10 transition-colors">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-0">
                        <div className="flex items-center gap-3 text-left transition-colors group-hover:text-accent">
                          <div className="flex-shrink-0">
                            <Image src={player.avatarUrl} alt={player.name} width={32} height={32} className="w-8 h-8 rounded-full" />
                          </div>
                          <span className={player.isCaptain ? "font-bold" : "font-medium"}>
                            {player.name}
                          </span>
                        </div>
                      </td>
                      {showModColumn && (
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${modBadgeClass(player.playedMod)}`}>
                            {modBadgeLabel(player.playedMod) || formatModLabel(player.playedMod)}
                          </span>
                        </td>
                      )}
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
                        <td colSpan={colSpan} className="text-center py-8 text-gray-500">No score data available for this map.</td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}

function Sparkline({ scores }: { scores: number[] }) {
  if (!scores || scores.length < 2) {
    return <div className="w-24 h-8" />;
  }

  const width = 100;
  const height = 25;
  const padding = 3;
  const drawingHeight = height - padding * 2;

  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore;

  const points = scores.map((score, i) => {
    const x = (i / (scores.length - 1)) * width;
    
    let y_normalized = 0.5;
    if (range > 0) {
      y_normalized = (score - minScore) / range;
    }
    
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
      
      <polygon points={areaPoints} fill="url(#sparkline-gradient)" />
      
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={linePoints}
      />
      
      <circle
        cx={lastPoint.x.toFixed(2)}
        cy={lastPoint.y.toFixed(2)}
        r="2.5"
        fill="currentColor"
        stroke="#1f2937"
        strokeWidth="1.5"
      />
    </svg>
  );
}
