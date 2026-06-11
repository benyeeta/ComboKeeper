"use client";

import Dashboard from "@/components/Dashboard";
import LandingPage from "@/components/LandingPage";
import TournamentLoadingSpinner from "@/components/TournamentLoadingSpinner";
import { useTournamentData } from "@/components/TournamentDataProvider";

export default function HomePage() {
  const { data, isLoading, isLoggedOut } = useTournamentData();

  if (isLoggedOut) {
    return <LandingPage />;
  }

  if (!data && isLoading) {
    return <TournamentLoadingSpinner label="Loading Tournament..." />;
  }

  if (!data) {
    return <TournamentLoadingSpinner label="Loading Tournament..." />;
  }

  return <Dashboard initialData={data as any} />;
}
