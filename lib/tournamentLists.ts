export type TournamentListItem = {
  id: string;
  name: string;
  acronym?: string | null;
  isCompleted: boolean;
  isKeeper: boolean;
};

export type TournamentGroups = {
  activeManaged: TournamentListItem[];
  activeParticipating: TournamentListItem[];
  finishedManaged: TournamentListItem[];
  finishedParticipating: TournamentListItem[];
};

export function groupTournaments(allTournaments: TournamentListItem[] = []): TournamentGroups {
  const managed = allTournaments.filter((t) => t.isKeeper);
  const participating = allTournaments.filter((t) => !t.isKeeper);

  return {
    activeManaged: managed.filter((t) => !t.isCompleted),
    activeParticipating: participating.filter((t) => !t.isCompleted),
    finishedManaged: managed.filter((t) => t.isCompleted),
    finishedParticipating: participating.filter((t) => t.isCompleted),
  };
}

export function formatTournamentLabel(t: { name: string; acronym?: string | null }): string {
  return t.acronym ? `[${t.acronym}] ${t.name}` : t.name;
}

export type MyTournamentCard = {
  id: string;
  name: string;
  acronym?: string | null;
  format: string;
  isCompleted: boolean;
  teamId: string;
  teamName: string;
  placement?: string | null;
  roster: {
    id: number;
    username: string;
    avatarUrl: string | null;
    role: string;
  }[];
};
