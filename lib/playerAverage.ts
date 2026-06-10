export const PRACTICE_SCORE_WEIGHT = 1;
export const LOBBY_SCORE_WEIGHT = 1.5;

export type WeightedScoreEntry = {
  score: number;
  scoreType?: string;
};

function isPracticeScoreType(scoreType?: string): boolean {
  return !scoreType || scoreType === "PRACTICE" || scoreType === "LOBBY";
}

export function getScoreWeight(scoreType?: string): number {
  if (scoreType === "LOBBY") return LOBBY_SCORE_WEIGHT;
  if (!scoreType || scoreType === "PRACTICE") return PRACTICE_SCORE_WEIGHT;
  return 0;
}

/**
 * Weighted trimmed mean (Excel TRIMMEAN-style). MATCH and qualifier scores are excluded.
 */
export function calculateWeightedTrimmedMean(
  entries: WeightedScoreEntry[],
  percent: number
): number | null {
  const weighted = entries
    .filter((e) => isPracticeScoreType(e.scoreType))
    .flatMap((e) => {
      const weight = getScoreWeight(e.scoreType);
      const copies = weight >= 1.5 ? 2 : 1;
      return Array.from({ length: copies }, () => e.score);
    });

  if (weighted.length < 2) return null;

  const sortedScores = [...weighted].sort((a, b) => a - b);
  const trimCount = Math.floor((sortedScores.length * percent) / 2);
  const trimmedScores = sortedScores.slice(trimCount, sortedScores.length - trimCount);

  if (trimmedScores.length === 0) return null;

  return trimmedScores.reduce((sum, val) => sum + val, 0) / trimmedScores.length;
}
