export default function TournamentLoadingSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex-grow flex flex-col items-center justify-center mt-24 text-gray-500">
      <div className="w-12 h-12 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-lg font-medium">{label}</p>
    </div>
  );
}
