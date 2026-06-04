import { Stage } from "@/lib/types";

type StageSelectorProps = {
  stages: Stage[];
  selectedStage: Stage;
  setSelectedStage: (stage: Stage) => void;
};
 
export default function StageSelector({
  stages,
  selectedStage,
  setSelectedStage,
}: StageSelectorProps) {
  if (stages.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 p-1.5 rounded-lg shadow-sm border border-gray-200 dark:border-transparent">
      <nav className="flex space-x-1" aria-label="Tabs">
        {stages.map((stage) => (
          <button
            key={stage}
            onClick={() => setSelectedStage(stage)}
            className={`${
              stage === selectedStage
                ? "bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white"
            } rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap`}
          >
            {stage}
          </button>
        ))}
      </nav>
    </div>
  );
}