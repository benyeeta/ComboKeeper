/** osu! game modes — values align with the osu! API (`osu`, `taiko`, `fruits`, `mania`). */
export const GAME_MODES = ["osu", "taiko", "fruits", "mania"] as const;
export type GameMode = (typeof GAME_MODES)[number];

export const DEFAULT_GAME_MODE: GameMode = "osu";

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  osu: "osu!",
  taiko: "osu!taiko",
  fruits: "osu!catch",
  mania: "osu!mania",
};

export function isGameMode(value: string | null | undefined): value is GameMode {
  return !!value && (GAME_MODES as readonly string[]).includes(value);
}

export function parseGameMode(value: string | null | undefined): GameMode {
  return isGameMode(value) ? value : DEFAULT_GAME_MODE;
}

export const GAME_MODE_OPTIONS = GAME_MODES.map((mode) => ({
  value: mode,
  label: GAME_MODE_LABELS[mode],
}));
