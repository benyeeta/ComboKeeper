import { getTournamentData } from "@/lib/queries";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { redirect } from "next/navigation";
import TeamHubClient from "@/components/TeamHubClient";

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
    <TeamHubClient initialData={data as any} />
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