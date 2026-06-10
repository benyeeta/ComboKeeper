import type { TrophyCard as TrophyCardData } from "@/lib/trophies/playerTrophies";

export default function TrophyCard({ trophy }: { trophy: TrophyCardData }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 flex flex-col items-start shadow-sm">
      <span className={`font-bold mb-1 ${trophy.titleClassName}`}>{trophy.title}</span>
      <span className="text-sm text-gray-700 dark:text-gray-300">{trophy.description}</span>
    </div>
  );
}
