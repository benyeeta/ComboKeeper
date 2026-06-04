"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MappoolMap, PlayerData, ScoreData } from "@/lib/types";
import { addStage, deleteStage } from "@/app/actions";
import StageSelector from "@/components/StageSelector";
import MappoolFeed from "@/components/MappoolFeed";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import AddDataModal from "@/components/AddDataModal";
import ManualScoreEntry from "@/components/ManualScoreEntry";
import PlayerScoreHistoryModal from "@/components/PlayerScoreHistoryModal";
import AddTournamentModal from "@/components/AddTournamentModal";
import EditRosterModal from "@/components/EditRosterModal";
import ManageTournamentModal from "@/components/ManageTournamentModal";

type DashboardProps = {
  initialData: {
    mappool: Record<string, MappoolMap[]>;
    allScores: ScoreData[];
    activeTournament: { 
      id: string; 
      name: string; 
      acronym: string | null;
      teamId: string; 
      teamName: string;
      isCompleted?: boolean;
      placement?: string | null;
      players: { osuId: string; username: string; isAdmin: boolean; status: string }[];
    } | null;
    stages: { id: string; name: string }[];
    allTournaments?: { id: string; name: string; acronym: string | null; isCompleted: boolean }[];
  };
};

export default function Dashboard({ initialData }: DashboardProps) {
  const [selectedStage, setSelectedStage] = useState<string>(initialData.stages?.[0]?.name || "");
  const [selectedMap, setSelectedMap] = useState<MappoolMap | null>(null);
  const [isImportModalOpen, setisImportModalOpen] = useState(false);
  const [manualEntryMap, setManualEntryMap] = useState<MappoolMap | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<PlayerData | null>(null);
  const [isAddTournamentOpen, setIsAddTournamentOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditRosterOpen, setIsEditRosterOpen] = useState(false);
  const [isManageTournamentOpen, setIsManageTournamentOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (initialData.stages && !initialData.stages.find(s => s.name === selectedStage)) {
      setSelectedStage(initialData.stages[0]?.name || "");
    }
  }, [initialData.stages, selectedStage]);

  const handleAddStage = async () => {
    const name = prompt("Enter new stage name (e.g. Group Stage, Round of 16):");
    if (name && name.trim() && initialData.activeTournament) {
      await addStage(initialData.activeTournament.id, name.trim());
    }
  };

  const handleDeleteStage = async () => {
    const stageObj = initialData.stages.find(s => s.name === selectedStage);
    if (stageObj && confirm(`Are you sure you want to delete ${selectedStage}? All maps and scores in this stage will be permanently lost!`)) {
      await deleteStage(stageObj.id);
    }
  };

  return <>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        {/* TODO: Replace with a proper TournamentSelector component */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Tournament:</span> 
          <select 
            className="max-w-[200px] truncate rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-1 text-sm text-gray-900 dark:text-white focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
            value={initialData.activeTournament?.id || ""}
            onChange={(e) => {
              if (e.target.value) {
                router.push(`/?t=${e.target.value}`);
              } else {
                router.push("/");
              }
            }}
          >
            {!initialData.activeTournament && <option value="">No Active Tournament</option>}
            {initialData.allTournaments?.map(t => (
              <option key={t.id} value={t.id}>
                {t.acronym ? `[${t.acronym}] ` : ''}{t.name} {t.isCompleted ? "(Finished)" : ""}
              </option>
            ))}
          </select>
          {initialData.activeTournament && (
            <>
              <button 
                onClick={() => setIsEditMode(!isEditMode)} 
                className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                  isEditMode 
                    ? "bg-pink-600 text-white hover:bg-pink-700" 
                    : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {isEditMode ? "Done Editing" : "Edit Mappool"}
              </button>
              <button 
                onClick={() => setIsEditRosterOpen(true)}
                className="rounded bg-gray-200 dark:bg-gray-700 px-3 py-1 text-sm font-medium text-gray-800 dark:text-gray-200 transition-colors hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Edit Roster
              </button>
              <button 
                onClick={() => setIsManageTournamentOpen(true)}
                className="rounded bg-gray-200 dark:bg-gray-700 px-3 py-1 text-sm font-medium text-gray-800 dark:text-gray-200 transition-colors hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Manage
              </button>
            </>
          )}
          <button onClick={() => setIsAddTournamentOpen(true)} className="rounded bg-gray-200 dark:bg-gray-700 px-3 py-1 text-sm font-medium text-gray-800 dark:text-gray-200 transition-colors hover:bg-gray-300 dark:hover:bg-gray-600">+ Add</button>
        </div>
        <button
          onClick={() => setisImportModalOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 font-bold text-white shadow-lg hover:bg-blue-700"
        >
          + Import Scores
        </button>
      </div>

      <AddDataModal 
        isOpen={isImportModalOpen} 
        onClose={() => setisImportModalOpen(false)} 
        tournamentId={initialData.activeTournament?.id} 
      />
      <AddTournamentModal isOpen={isAddTournamentOpen} onClose={() => setIsAddTournamentOpen(false)} />
      {initialData.activeTournament && (
        <EditRosterModal
          isOpen={isEditRosterOpen}
          onClose={() => setIsEditRosterOpen(false)}
          teamId={initialData.activeTournament.teamId}
          teamName={initialData.activeTournament.teamName}
          initialPlayers={initialData.activeTournament.players}
        />
      )}
      {initialData.activeTournament && (
        <ManageTournamentModal
          isOpen={isManageTournamentOpen}
          onClose={() => setIsManageTournamentOpen(false)}
          tournamentId={initialData.activeTournament.id}
          tournamentName={initialData.activeTournament.name}
          teamId={initialData.activeTournament.teamId}
          isCompleted={initialData.activeTournament.isCompleted}
          placement={initialData.activeTournament.placement}
        />
      )}
      <ManualScoreEntry
        isOpen={!!manualEntryMap}
        onClose={() => setManualEntryMap(null)}
        map={manualEntryMap}
        stage={selectedStage}
        teamPlayers={initialData.activeTournament?.players.filter(p => p.status === "ACCEPTED") || []}
      />
      <PlayerScoreHistoryModal
        isOpen={!!viewingPlayer}
        onClose={() => setViewingPlayer(null)}
        playerData={viewingPlayer}
        map={selectedMap}
      />

      {initialData.activeTournament ? (
        <>
          <div className="flex items-center gap-4 flex-wrap">
            <StageSelector
              stages={initialData.stages.map(s => s.name)}
              selectedStage={selectedStage}
              setSelectedStage={setSelectedStage}
            />
            {isEditMode && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddStage}
                  className="rounded-md bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  + Add Stage
                </button>
                {initialData.stages.length > 0 && (
                  <button
                    onClick={handleDeleteStage}
                    className="rounded-md bg-red-900/30 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors border border-red-900/50"
                    title="Delete current stage"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex-grow mt-6 max-w-7xl mx-auto w-full">
            <MappoolFeed
              stage={selectedStage}
              onMapSelect={setSelectedMap}
              selectedMap={selectedMap}
              onAddScore={setManualEntryMap}
              mappool={initialData.mappool}
              allScores={initialData.allScores}
              isEditMode={isEditMode}
              stageId={initialData.stages?.find(s => s.name === selectedStage)?.id}
              tournamentId={initialData.activeTournament.id}
              onViewPlayerScores={setViewingPlayer}
            />
          </div>
        </>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center mt-24 text-center text-gray-500">
          <svg className="w-16 h-16 mb-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-400 mb-2">No Tournament Selected</h2>
          <p className="max-w-md">You aren't currently viewing any tournament workspaces. Select an existing tournament from the dropdown above, or click "+ Add" to create a new one.</p>
        </div>
      )}
  </>;
}