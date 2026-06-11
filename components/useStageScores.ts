"use client";

import { useEffect, useRef, useState } from "react";
import { fetchStageScoresForClient } from "@/app/actions/tournament";
import { useTournamentData } from "@/components/TournamentDataProvider";
import type { ScoreData } from "@/lib/types";

export function useStageScores(stageId?: string) {
  const { data, dataVersion } = useTournamentData();
  const tournamentId = data?.activeTournament?.id;

  const cacheRef = useRef(new Map<string, ScoreData[]>());
  const [scores, setScores] = useState<ScoreData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (dataVersion > 0) {
      cacheRef.current.clear();
    }
  }, [dataVersion]);

  useEffect(() => {
    if (!tournamentId || !stageId) {
      setScores([]);
      setIsLoading(false);
      return;
    }

    const memKey = `${tournamentId}:${stageId}`;
    const cached = cacheRef.current.get(memKey);
    if (cached) {
      setScores(cached);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      const result = await fetchStageScoresForClient(tournamentId, stageId);
      if (cancelled) return;

      const nextScores = result.scores ?? [];
      cacheRef.current.set(memKey, nextScores);
      setScores(nextScores);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [tournamentId, stageId, dataVersion]);

  return { scores, isLoadingScores: isLoading };
}
