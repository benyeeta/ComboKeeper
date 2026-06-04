export const MODS = ['NM', 'HD', 'HR', 'DT', 'MM', 'TB'] as const;
export type Mod = (typeof MODS)[number];

export type MappoolMap = {
  id: string;
  mod: Mod;
  artist: string;
  songName: string;
  skill: string;
};

export const STAGES = [
  'Qualifiers',
  'Round of 32',
  'Quarterfinals',
  'Semifinals',
  'Finals',
  'Grand Finals',
] as const;
export type Stage = (typeof STAGES)[number];

export type Score = {
  score: number;
  accuracy: number;
};

export type PlayerData = {
  username: string;
  id: number;
  avatarUrl: string;
  history: Score[];
};

export type ScoreData = {
  mapId: string;
  stage: string;
  artist: string;
  songName: string;
  players: PlayerData[];
};