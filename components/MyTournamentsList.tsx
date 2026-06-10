"use client";

import Image from "next/image";
import Link from "next/link";
import LeaveTeamButton from "@/components/LeaveTeamButton";
import { formatTournamentLabel, type MyTournamentCard } from "@/lib/tournamentLists";

export type { MyTournamentCard };

type MyTournamentsListProps = {
  tournaments: MyTournamentCard[];
};

export default function MyTournamentsList({ tournaments }: MyTournamentsListProps) {
  if (tournaments.length === 0) {
    return <p className="text-sm text-muted">No tournaments found.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {tournaments.map((t) => (
        <div
          key={`${t.id}-${t.teamId}`}
          className="bg-surface border border-border-main rounded-lg p-4 shadow-sm flex flex-col gap-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-accent truncate">{formatTournamentLabel(t)}</h3>
                <span className="text-xs text-muted">({t.format})</span>
                {t.isCompleted ? (
                  <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded border border-green-800/50">
                    Finished
                  </span>
                ) : (
                  <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-800/50">
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-muted mt-1">
                Team: <span className="text-content font-medium">{t.teamName}</span>
              </p>
              {t.placement && (
                <p className="text-sm text-muted mt-0.5">
                  Placement: <span className="text-content font-semibold">{t.placement}</span>
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                href={`/?t=${t.id}`}
                className="text-xs font-semibold px-3 py-1.5 rounded-md border border-border-main bg-hover-overlay/15 text-content hover:border-accent/50 hover:text-accent transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href={`/team?t=${t.id}`}
                className="text-xs font-semibold px-3 py-1.5 rounded-md border border-border-main bg-hover-overlay/15 text-content hover:border-accent/50 hover:text-accent transition-colors"
              >
                Team Hub
              </Link>
              <LeaveTeamButton teamId={t.teamId} />
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              {t.teamName} Roster
            </h4>
            <div className="flex flex-wrap gap-2">
              {t.roster.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 bg-inset px-2 py-1 rounded-full border border-border-main"
                >
                  <Image
                    src={p.avatarUrl || `https://a.ppy.sh/${p.id}`}
                    alt={p.username}
                    width={20}
                    height={20}
                    className="w-5 h-5 rounded-full"
                  />
                  <span className="text-sm text-content">{p.username}</span>
                  {p.role === "CAPTAIN" && (
                    <span className="text-[10px] text-pink-400 font-bold" title="Captain">
                      ♔
                    </span>
                  )}
                  {p.role === "EDITOR" && (
                    <span className="text-[10px] text-blue-400 font-bold" title="Editor">
                      ✎
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
