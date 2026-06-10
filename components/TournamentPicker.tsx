"use client";

import { groupTournaments, formatTournamentLabel, type TournamentListItem } from "@/lib/tournamentLists";

type TournamentPickerProps = {
  allTournaments?: TournamentListItem[];
  activeTournamentId?: string | null;
  onChange: (tournamentId: string) => void;
  className?: string;
  showEmptyOption?: boolean;
};

export default function TournamentPicker({
  allTournaments = [],
  activeTournamentId,
  onChange,
  className = "",
  showEmptyOption = true,
}: TournamentPickerProps) {
  const { activeManaged, activeParticipating, finishedManaged, finishedParticipating } =
    groupTournaments(allTournaments);

  return (
    <select
      className={className}
      value={activeTournamentId || ""}
      onChange={(e) => onChange(e.target.value)}
    >
      {!activeTournamentId && showEmptyOption && <option value="">No Active Tournament</option>}
      {activeManaged.length > 0 && (
        <optgroup label="Active: Tournaments I Keep">
          {activeManaged.map((t) => (
            <option key={t.id} value={t.id}>
              {formatTournamentLabel(t)}
            </option>
          ))}
        </optgroup>
      )}
      {activeParticipating.length > 0 && (
        <optgroup label="Active: My Teams">
          {activeParticipating.map((t) => (
            <option key={t.id} value={t.id}>
              {formatTournamentLabel(t)}
            </option>
          ))}
        </optgroup>
      )}
      {finishedManaged.length > 0 && (
        <optgroup label="Finished: Tournaments I Keep">
          {finishedManaged.map((t) => (
            <option key={t.id} value={t.id}>
              {formatTournamentLabel(t)}
            </option>
          ))}
        </optgroup>
      )}
      {finishedParticipating.length > 0 && (
        <optgroup label="Finished: My Teams">
          {finishedParticipating.map((t) => (
            <option key={t.id} value={t.id}>
              {formatTournamentLabel(t)}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
