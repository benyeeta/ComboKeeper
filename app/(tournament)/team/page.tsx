"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import TeamHubClient from "@/components/TeamHubClient";
import TournamentLoadingSpinner from "@/components/TournamentLoadingSpinner";
import { useTournamentData } from "@/components/TournamentDataProvider";

export default function TeamPage() {
  const router = useRouter();
  const { data, isLoading, isLoggedOut } = useTournamentData();

  useEffect(() => {
    if (isLoggedOut) {
      router.replace("/api/auth/login");
    }
  }, [isLoggedOut, router]);

  if (isLoggedOut) {
    return null;
  }

  if (!data && isLoading) {
    return <TournamentLoadingSpinner label="Loading Team Data..." />;
  }

  if (!data) {
    return <TournamentLoadingSpinner label="Loading Team Data..." />;
  }

  return <TeamHubClient initialData={data as any} />;
}
