"use client";

import { useState, useEffect, useTransition } from "react";
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
import EditMappoolModal from "@/components/EditMappoolModal";
import ManageTeamModal from "@/components/ManageTeamModal";

type DashboardProps = {
  initialData: {
    mappool: Record<string, MappoolMap[]>;
    allScores: ScoreData[];
    activeTournament: { 
      id: string; 
      name: string; 
      acronym: string | null;
      format?: string;
      isKeeper: boolean;
      teamId?: string; 
      teamName?: string;
      isCompleted?: boolean;
      placement?: string | null;
      currentUserId?: number;
      currentUserRole?: string;
      players: { osuId: string; username: string; isAdmin: boolean; status: string }[];
    } | null;
    stages: { id: string; name: string }[];
    allTournaments?: { id: string; name: string; acronym: string | null; isCompleted: boolean; isKeeper: boolean }[];
    currentUser?: { id: number; username: string };
  };
};

export default function Dashboard({ initialData }: DashboardProps) {
  const getDefaultStage = (stages: { id: string; name: string }[], mappool: Record<string, MappoolMap[]>) => {
    if (!stages || stages.length === 0) return "";
    for (let i = stages.length - 1; i >= 0; i--) {
      const stageName = stages[i].name;
      if (mappool && mappool[stageName] && mappool[stageName].length > 0) {
        return stageName;
      }
    }
    return stages[0].name;
  };

  const [selectedStage, setSelectedStage] = useState<string>(() => getDefaultStage(initialData.stages, initialData.mappool));
  const [currentTournamentId, setCurrentTournamentId] = useState(initialData.activeTournament?.id);
  const [selectedMap, setSelectedMap] = useState<MappoolMap | null>(null);
  const [isImportModalOpen, setisImportModalOpen] = useState(false);
  const [manualEntryMap, setManualEntryMap] = useState<MappoolMap | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<PlayerData | null>(null);
  const [isAddTournamentOpen, setIsAddTournamentOpen] = useState(false);
  const [isEditMappoolOpen, setIsEditMappoolOpen] = useState(false);
  const [isEditRosterOpen, setIsEditRosterOpen] = useState(false);
  const [isManageTournamentOpen, setIsManageTournamentOpen] = useState(false);
  const [isManageTeamOpen, setIsManageTeamOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const managedTournaments = initialData.allTournaments?.filter(t => t.isKeeper) || [];
  const participatingTournaments = initialData.allTournaments?.filter(t => !t.isKeeper) || [];

  const activeManaged = managedTournaments.filter(t => !t.isCompleted);
  const finishedManaged = managedTournaments.filter(t => t.isCompleted);
  
  const activeParticipating = participatingTournaments.filter(t => !t.isCompleted);
  const finishedParticipating = participatingTournaments.filter(t => t.isCompleted);

  useEffect(() => {
    if (initialData.activeTournament?.id !== currentTournamentId) {
      setCurrentTournamentId(initialData.activeTournament?.id);
      setSelectedStage(getDefaultStage(initialData.stages, initialData.mappool));
    } else if (initialData.stages && !initialData.stages.find(s => s.name === selectedStage)) {
      setSelectedStage(getDefaultStage(initialData.stages, initialData.mappool));
    }
  }, [initialData.activeTournament?.id, currentTournamentId, initialData.stages, selectedStage, initialData.mappool]);

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

  return <div className="max-w-7xl mx-auto w-full flex flex-col flex-grow">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Tournament</label>
            <div className="flex items-center gap-2">
              <select 
                className="max-w-[250px] truncate rounded-md border border-border-main bg-surface p-2 text-sm font-medium text-content shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                value={initialData.activeTournament?.id || ""}
                onChange={(e) => {
                  startTransition(() => {
                    if (e.target.value) {
                      router.push(`/?t=${e.target.value}`);
                    } else {
                      router.push("/");
                    }
                  });
                }}
              >
                {!initialData.activeTournament && <option value="">No Active Tournament</option>}
                {activeManaged.length > 0 && (
                  <optgroup label="Active: Tournaments I Keep">
                    {activeManaged.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.acronym ? `[${t.acronym}] ` : ''}{t.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {activeParticipating.length > 0 && (
                  <optgroup label="Active: My Teams">
                    {activeParticipating.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.acronym ? `[${t.acronym}] ` : ''}{t.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {finishedManaged.length > 0 && (
                  <optgroup label="Finished: Tournaments I Keep">
                    {finishedManaged.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.acronym ? `[${t.acronym}] ` : ''}{t.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {finishedParticipating.length > 0 && (
                  <optgroup label="Finished: My Teams">
                    {finishedParticipating.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.acronym ? `[${t.acronym}] ` : ''}{t.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <button onClick={() => setIsAddTournamentOpen(true)} className="rounded-md border border-border-main bg-surface p-2 text-sm font-medium text-content transition-colors hover:bg-hover-overlay/10 shadow-sm" title="Join or Create Tournament">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>
          </div>

          {initialData.activeTournament && (
            <div className="flex flex-wrap items-center gap-4 lg:ml-2 lg:pl-4 lg:border-l border-border-main">
              {initialData.activeTournament.isKeeper && (
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">Keeper Tools</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsEditMappoolOpen(true)} className="rounded border border-border-main bg-surface px-3 py-1.5 text-sm font-medium text-content transition-colors hover:bg-hover-overlay/10 shadow-sm">
                      Edit Mappool
                    </button>
                    <button onClick={() => setIsManageTournamentOpen(true)} className="rounded border border-border-main bg-surface px-3 py-1.5 text-sm font-medium text-content transition-colors hover:bg-hover-overlay/10 shadow-sm">
                      Manage
                    </button>
                  </div>
                </div>
              )}
              {initialData.activeTournament.teamId && initialData.activeTournament.currentUserRole === "CAPTAIN" && (
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider mb-1">Team Tools</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsEditRosterOpen(true)} className="rounded border border-border-main bg-surface px-3 py-1.5 text-sm font-medium text-content transition-colors hover:bg-hover-overlay/10 shadow-sm">
                      Edit Roster
                    </button>
                    <button onClick={() => setIsManageTeamOpen(true)} className="rounded border border-border-main bg-surface px-3 py-1.5 text-sm font-medium text-content transition-colors hover:bg-hover-overlay/10 shadow-sm">
                      Manage Team
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {initialData.activeTournament?.teamId && (
          <div className="flex flex-col w-full lg:w-auto mt-2 lg:mt-0">
            <span className="text-[10px] font-bold text-transparent uppercase tracking-wider mb-1 hidden lg:block">Actions</span>
            <button
              onClick={() => setisImportModalOpen(true)}
              className="w-full lg:w-auto justify-center rounded-md bg-blue-600 px-4 py-2 font-bold text-white shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Import Scores
            </button>
          </div>
        )}
      </div>

      <AddDataModal 
        isOpen={isImportModalOpen} 
        onClose={() => setisImportModalOpen(false)} 
        tournamentId={initialData.activeTournament?.id} 
      />
      <AddTournamentModal 
        isOpen={isAddTournamentOpen} 
        onClose={() => setIsAddTournamentOpen(false)} 
        currentUsername={initialData.currentUser?.username}
      />
      {initialData.activeTournament?.teamId && (
        <EditRosterModal
          isOpen={isEditRosterOpen}
          onClose={() => setIsEditRosterOpen(false)}
          teamId={initialData.activeTournament.teamId}
          teamName={initialData.activeTournament.teamName || "Unknown Team"}
          initialPlayers={initialData.activeTournament.players}
          currentUsername={initialData.activeTournament.players.find(p => p.osuId === initialData.activeTournament?.currentUserId?.toString())?.username}
        />
      )}
      {initialData.activeTournament && (
        <ManageTournamentModal
          isOpen={isManageTournamentOpen}
          onClose={() => setIsManageTournamentOpen(false)}
          tournamentId={initialData.activeTournament.id}
          tournamentName={initialData.activeTournament.name}
          tournamentAcronym={initialData.activeTournament.acronym}
          tournamentFormat={initialData.activeTournament.format}
          isCompleted={initialData.activeTournament.isCompleted}
        />
      )}
      {initialData.activeTournament?.teamId && (
        <ManageTeamModal
          isOpen={isManageTeamOpen}
          onClose={() => setIsManageTeamOpen(false)}
          tournamentId={initialData.activeTournament.id}
          teamId={initialData.activeTournament.teamId}
          teamName={initialData.activeTournament.teamName || "Unknown Team"}
          placement={initialData.activeTournament.placement}
        />
      )}
      <ManualScoreEntry
        isOpen={!!manualEntryMap}
        onClose={() => setManualEntryMap(null)}
        map={manualEntryMap}
        stage={selectedStage}
        teamPlayers={initialData.activeTournament?.players.filter(p => p.status === "ACCEPTED") || []}
        currentUserId={initialData.activeTournament?.currentUserId?.toString()}
        currentUserRole={initialData.activeTournament?.currentUserRole}
      />
      <PlayerScoreHistoryModal
        isOpen={!!viewingPlayer}
        onClose={() => setViewingPlayer(null)}
        playerData={viewingPlayer}
        map={selectedMap}
        currentUserId={initialData.activeTournament?.currentUserId?.toString()}
        currentUserRole={initialData.activeTournament?.currentUserRole}
        activeTournament={initialData.activeTournament}
      />
      <EditMappoolModal
        isOpen={isEditMappoolOpen}
        onClose={() => setIsEditMappoolOpen(false)}
        stages={initialData.stages || []}
        selectedStage={selectedStage}
        onSelectStage={setSelectedStage}
        onAddStage={handleAddStage}
        onDeleteStage={handleDeleteStage}
        mappool={initialData.mappool || {}}
      />

      {initialData.activeTournament ? (
        <>
          <div className="flex items-center gap-4 flex-wrap">
            <StageSelector
              stages={initialData.stages.map(s => s.name)}
              selectedStage={selectedStage}
              setSelectedStage={setSelectedStage}
            />
          </div>

          <div className={`flex-grow mt-6 w-full transition-opacity duration-200 ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
            <MappoolFeed
              stage={selectedStage}
              onMapSelect={setSelectedMap}
              selectedMap={selectedMap}
              onAddScore={setManualEntryMap}
              mappool={initialData.mappool}
              allScores={initialData.allScores}
              stageId={initialData.stages?.find(s => s.name === selectedStage)?.id}
              tournamentId={initialData.activeTournament.id}
              onViewPlayerScores={setViewingPlayer}
              activeTournament={initialData.activeTournament}
            />
          </div>
        </>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center mt-24 text-center text-muted">
          <svg className="w-16 h-16 mb-4 text-border-main" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h2 className="text-xl font-semibold text-muted mb-2">No Tournament Selected</h2>
          <p className="max-w-md mb-6">You aren't currently viewing any tournaments. Select an existing tournament from the dropdown above, or create a new one.</p>
          <button onClick={() => setIsAddTournamentOpen(true)} className="rounded-md bg-accent px-6 py-2.5 font-bold text-white hover:opacity-90 transition-colors shadow-md">
            + Create or Join Tournament
          </button>
        </div>
      )}
  </div>;
}