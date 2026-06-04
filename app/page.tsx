import Dashboard from "@/components/Dashboard";
import { getTournamentData } from "@/lib/queries";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";

async function DashboardLoader({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const user = sessionCookie ? await decrypt(sessionCookie) : null;

  if (!user) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center mt-24 text-center">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">Welcome to ComboKeeper</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
          A private, automated score tracking and analysis dashboard for competitive osu! tournament teams.
        </p>
        <a
          href="/api/auth/login"
          className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-6 rounded-md text-lg transition-colors shadow-lg shadow-pink-600/20"
        >
          Login with osu! to get started
        </a>
      </div>
    );
  }

  const resolvedParams = await searchParams;
  const data = await getTournamentData(user.id, resolvedParams.t);
  return <Dashboard initialData={data} />;
}

export default function Home(props: { searchParams: Promise<{ t?: string }> }) {
  return (
    <Suspense fallback={
      <div className="flex-grow flex flex-col items-center justify-center mt-24 text-gray-500">
        <div className="w-12 h-12 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-lg font-medium">Loading Workspace...</p>
      </div>
    }>
      <DashboardLoader searchParams={props.searchParams} />
    </Suspense>
  );
}