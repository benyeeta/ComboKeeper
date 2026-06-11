import { Suspense } from "react";
import { TournamentDataProvider } from "@/components/TournamentDataProvider";

export default function TournamentLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <TournamentDataProvider>{children}</TournamentDataProvider>
    </Suspense>
  );
}
