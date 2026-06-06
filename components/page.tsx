import { getTournamentData } from "@/lib/queries";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { redirect } from "next/navigation";
import TeamIntel from "@/components/TeamIntel";

async function TeamLoader({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const user = sessionCookie ? await decrypt(sessionCookie) : null;

  if (!user) {
    redirect("/api/auth/login");
  }

  const resolvedParams = await searchParams;
  const data = await getTournamentData(user.id, resolvedParams.t);
  
  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col flex-grow mt-4">
      <div className="flex flex-col mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team Hub</h1>
        {data.activeTournament ? (
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Viewing team intel for <span className="font-semibold text-pink-400">{data.activeTournament.name}</span>
          </p>
        ) : null}
      </div>
      
      {data.activeTournament?.teamId ? (
        <div className="mt-2">
          <TeamIntel allScores={data.allScores} />
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

export default function TeamPage(props: { searchParams: Promise<{ t?: string }> }) {
  return (
    <Suspense fallback={
      <div className="flex-grow flex flex-col items-center justify-center mt-24 text-gray-500">
        <div className="w-12 h-12 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-lg font-medium">Loading Team Data...</p>
      </div>
    }>
      <TeamLoader searchParams={props.searchParams} />
    </Suspense>
  );
}