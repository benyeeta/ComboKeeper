"use client";

import { deleteTeam, updateTeamPlacement } from "@/app/actions";
import { useRouter } from "next/navigation";
import { useTournamentRefetch } from "@/components/TournamentDataProvider";
import { useState, useEffect } from "react";

export default function ManageTeamModal({
  isOpen,
  onClose,
  tournamentId,
  teamId,
  teamName,
  placement,
}: {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  teamId: string;
  teamName: string;
  placement?: string | null;
}) {
  const router = useRouter();
  const refetchTournament = useTournamentRefetch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDeleteTeam = async () => {
    if (
      !confirm(
        `Delete ${teamName} from this tournament? This removes the entire team and roster. This cannot be undone.`
      )
    ) {
      return;
    }

    setError("");
    setIsSubmitting(true);
    const result = await deleteTeam(teamId);
    setIsSubmitting(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    onClose();
    router.push("/");
    refetchTournament();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4 transition-opacity">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 text-white shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            Manage <span className="text-blue-400">{teamName}</span>
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/50 border border-red-500 text-red-200 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <div className="mb-6 pb-6 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Team Placement</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              setError("");
              setIsSubmitting(true);
              const result = await updateTeamPlacement(formData);
              setIsSubmitting(false);
              if (result?.error) setError(result.error);
              else {
                refetchTournament();
                onClose();
              }
            }}
            className="flex flex-col gap-3"
          >
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <input type="hidden" name="teamId" value={teamId} />
            <input
              type="text"
              name="placement"
              defaultValue={placement || ""}
              placeholder="Placement (e.g. 1st, Top 8)"
              className="w-full rounded-md border border-gray-700 bg-gray-800 p-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              Save Placement
            </button>
          </form>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-red-400 mb-2">Danger Zone</h3>
          <p className="text-xs text-gray-400 mb-3">
            Permanently delete this team and remove it from the tournament.
          </p>
          <button
            type="button"
            onClick={handleDeleteTeam}
            disabled={isSubmitting}
            className="w-full rounded border border-red-900 bg-red-900/30 px-4 py-2 text-sm font-bold text-red-400 transition-colors hover:bg-red-900/50 disabled:opacity-50"
          >
            Delete Team
          </button>
        </div>
      </div>
    </div>
  );
}
