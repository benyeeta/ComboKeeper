import Dashboard from "@/components/Dashboard";
import { getTournamentData } from "@/lib/queries";
import { Suspense } from "react";

async function DashboardLoader({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const resolvedParams = await searchParams;
  const data = await getTournamentData(resolvedParams.t);
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