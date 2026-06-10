"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import StageSelector from "@/components/StageSelector";
import TeamIntel from "@/components/TeamIntel";
import TournamentPicker from "@/components/TournamentPicker";
import { ScoreData } from "@/lib/types";

type TeamHubClientProps = {
  initialData: {
    mappool?: Record<string, any[]>;
    allScores: ScoreData[];
    activeTournament: any;
    stages: { id: string; name: string }[];
    allTournaments?: any[];
  };
};

export default function TeamHubClient({ initialData }: TeamHubClientProps) {
  const getDefaultStage = (stages: { id: string; name: string }[], mappool?: Record<string, any[]>, allScores?: ScoreData[]) => {
    if (!stages || !Array.isArray(stages) || stages.length === 0) return "";
    for (let i = stages.length - 1; i >= 0; i--) {
      const stageName = stages[i].name;
      if (mappool && mappool[stageName] && Array.isArray(mappool[stageName]) && mappool[stageName].length > 0) {
        return stageName;
      }
      if (allScores && allScores.some(s => s.stage === stageName)) {
        return stageName;
      }
    }
    return stages[0]?.name || "";
  };

  const [selectedStage, setSelectedStage] = useState<string>(() => getDefaultStage(initialData.stages || [], initialData.mappool, initialData.allScores));
  const [currentTournamentId, setCurrentTournamentId] = useState(initialData.activeTournament?.id);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (initialData.activeTournament?.id !== currentTournamentId) {
      setCurrentTournamentId(initialData.activeTournament?.id);
      setSelectedStage(getDefaultStage(initialData.stages || [], initialData.mappool, initialData.allScores));
    } else if (initialData.stages && Array.isArray(initialData.stages) && !initialData.stages.find(s => s.name === selectedStage)) {
      setSelectedStage(getDefaultStage(initialData.stages || [], initialData.mappool, initialData.allScores));
    }
  }, [initialData.activeTournament?.id, currentTournamentId, initialData.stages, selectedStage, initialData.mappool, initialData.allScores]);

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col flex-grow mt-4">
      <div className="flex flex-col mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team Hub</h1>
            {initialData.activeTournament && (
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Viewing team intel for <span className="font-semibold text-pink-400">{initialData.activeTournament.name}</span>
              </p>
            )}
          </div>
          
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Tournament</label>
            <TournamentPicker
              allTournaments={initialData.allTournaments}
              activeTournamentId={initialData.activeTournament?.id}
              className="max-w-[250px] truncate rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm font-medium text-gray-900 dark:text-white shadow-sm focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
              onChange={(tournamentId) => {
                startTransition(() => {
                  router.push(tournamentId ? `/team?t=${tournamentId}` : "/team");
                });
              }}
            />
          </div>
        </div>
      </div>
      
      {initialData.activeTournament?.teamId ? (
        <div className={`flex-grow flex flex-col transition-opacity duration-200 ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="mb-4">
            <StageSelector
              stages={(initialData.stages || []).map(s => s.name)}
              selectedStage={selectedStage}
              setSelectedStage={setSelectedStage}
            />
          </div>
          <TeamIntel allScores={initialData.allScores} selectedStage={selectedStage} activeTournament={initialData.activeTournament} mappool={initialData.mappool} />
        </div>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center mt-24 text-center text-gray-500">
          <svg className="w-16 h-16 mb-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-400 mb-2">No Team Found</h2>
          <p className="max-w-md">You aren't currently on a team for this tournament, or no tournament is selected.</p>
        </div>
      )}
    </div>
  );
}