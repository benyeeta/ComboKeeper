"use client";

import { leaveTeam } from "@/app/actions";
import { useState } from "react";

export default function LeaveTeamButton({ teamId }: { teamId: string }) {
  const [isLeaving, setIsLeaving] = useState(false);

  const handleLeave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to leave this team?")) {
      setIsLeaving(true);
      await leaveTeam(teamId);
      setIsLeaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLeave}
      disabled={isLeaving}
      className="text-xs bg-red-900/50 hover:bg-red-800/80 text-red-400 px-2 py-1 rounded border border-red-800 transition-colors disabled:opacity-50"
    >
      {isLeaving ? "Leaving..." : "Leave Team"}
    </button>
  );
}