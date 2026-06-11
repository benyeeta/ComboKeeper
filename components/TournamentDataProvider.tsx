"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { fetchTournamentDataForClient } from "@/app/actions/tournament";
import type { TournamentInitialData } from "@/lib/queries";

export type { TournamentInitialData };

type TournamentDataContextValue = {
  data: TournamentInitialData | null;
  isLoading: boolean;
  isLoggedOut: boolean;
  dataVersion: number;
  refetch: () => void;
};

const TournamentDataContext = createContext<TournamentDataContextValue | null>(null);

export function tournamentCacheKey(tournamentId?: string | null) {
  return tournamentId ?? "active";
}

export function TournamentDataProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const tournamentId = searchParams.get("t") ?? undefined;
  const cacheKey = tournamentCacheKey(tournamentId);

  const cacheRef = useRef(new Map<string, TournamentInitialData>());
  const fetchIdRef = useRef(0);

  const [data, setData] = useState<TournamentInitialData | null>(
    () => cacheRef.current.get(cacheKey) ?? null,
  );
  const [isLoading, setIsLoading] = useState(!cacheRef.current.has(cacheKey));
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [fetchVersion, setFetchVersion] = useState(0);

  const refetch = useCallback(() => {
    setFetchVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setData(cached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    setIsLoggedOut(false);
  }, [cacheKey]);

  useEffect(() => {
    const fetchId = ++fetchIdRef.current;
    let cancelled = false;

    (async () => {
      const result = await fetchTournamentDataForClient(tournamentId);
      if (cancelled || fetchId !== fetchIdRef.current) return;

      if (result.error === "unauthorized") {
        setIsLoggedOut(true);
        setData(null);
        setIsLoading(false);
        return;
      }

      if (result.error || !result.data) {
        setIsLoading(false);
        return;
      }

      cacheRef.current.set(cacheKey, result.data);
      setData(result.data);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, tournamentId, fetchVersion]);

  return (
    <TournamentDataContext.Provider value={{ data, isLoading, isLoggedOut, dataVersion: fetchVersion, refetch }}>
      {children}
    </TournamentDataContext.Provider>
  );
}

export function useTournamentData() {
  const ctx = useContext(TournamentDataContext);
  if (!ctx) {
    throw new Error("useTournamentData must be used within TournamentDataProvider");
  }
  return ctx;
}

export function useTournamentRefetch() {
  return useTournamentData().refetch;
}
