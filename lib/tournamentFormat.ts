/** Parse players-per-map from a format string like "4v4". Defaults to 3 if unknown. */
export function parseLineupSize(format?: string | null): number {
  if (!format) return 3;
  const match = format.match(/^(\d+)v\d+$/i);
  if (match) return Math.max(1, parseInt(match[1], 10));
  return 3;
}
