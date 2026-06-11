"use client";

import { useState, useEffect } from "react";
import { importMatchScores, importDbScores } from "@/app/actions";
import { useTournamentRefetch } from "@/components/TournamentDataProvider";

type Tab = "mp" | "db";

interface AddDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId?: string;
}

const AddDataModal = ({ isOpen, onClose, tournamentId }: AddDataModalProps) => {
  const refetchTournament = useTournamentRefetch();
  const [activeTab, setActiveTab] = useState<Tab>("mp");
  const [url, setUrl] = useState("");
  const [scoreType, setScoreType] = useState("MATCH");
  const [overwrite, setOverwrite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dbFile, setDbFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      setDbFile(null);
      setUrl("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const TabButton = ({ label, tabName }: { label: string; tabName: Tab }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`${
        activeTab === tabName
          ? "border-blue-500 text-blue-400"
          : "border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-200"
      } whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium`}
    >
      {label}
    </button>
  );

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentId) return setFeedback({ type: "error", text: "No active tournament selected." });
    
    setIsLoading(true);
    setFeedback(null);
    
    const res = await importMatchScores(url, tournamentId, scoreType, overwrite);
    if (res?.error) setFeedback({ type: "error", text: res.error });
    else if (res?.message) {
      setFeedback({ type: "success", text: res.message });
      setUrl("");
      refetchTournament();
      setTimeout(() => onClose(), 1500);
    }
    setIsLoading(false);
  };

  const handleDbImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentId) return setFeedback({ type: "error", text: "No active tournament selected." });
    if (!dbFile) return setFeedback({ type: "error", text: "Please select a scores.db file." });

    setIsLoading(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append("file", dbFile);
    formData.append("tournamentId", tournamentId);
    formData.append("scoreType", "PRACTICE");

    const res = await importDbScores(formData);
    if (res?.error) setFeedback({ type: "error", text: res.error });
    else if (res?.message) {
      setFeedback({ type: "success", text: res.message });
      setDbFile(null);
      refetchTournament();
      setTimeout(() => onClose(), 1500);
    }
    setIsLoading(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "mp":
        return (
          <form onSubmit={handleImport} className="space-y-4">
            <p className="text-sm text-gray-400">
              Import all scores from an osu! multiplayer match lobby. Only scores from players currently on your team roster will be saved.
            </p>
            
            {feedback && (
              <div className={`px-3 py-2 rounded text-sm font-medium ${feedback.type === "error" ? "bg-red-900/50 text-red-300 border border-red-800" : "bg-green-900/50 text-green-300 border border-green-800"}`}>
                {feedback.text}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="mp-link-input" className="block text-sm font-medium text-gray-300">osu! Multiplayer Match URL</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} required type="text" id="mp-link-input" placeholder="e.g. 111818274 or https://osu.ppy.sh/community/matches/..." className="w-full rounded-md border-gray-600 bg-gray-800 p-2 text-white focus:border-blue-500 focus:outline-none" />
            </div>
            <div className="space-y-2 mb-2">
               <label className="block text-sm font-medium text-gray-300">Score Type</label>
               <select value={scoreType} onChange={(e) => setScoreType(e.target.value)} className="w-full rounded-md border-gray-600 bg-gray-800 p-2 text-white focus:border-blue-500 focus:outline-none">
                  <option value="MATCH">In-Match</option>
                  <option value="QUALIFIER">Qualifier (Auto-detect Both Runs)</option>
                  <option value="QUALIFIER_1">Qualifier (Run 1 Only)</option>
                  <option value="QUALIFIER_2">Qualifier (Run 2 Only)</option>
                  <option value="LOBBY">Lobby Practice</option>
               </select>
            </div>
            <div className="flex items-center gap-2 mb-2 mt-4">
              <input type="checkbox" id="overwrite-checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900 cursor-pointer" />
              <label htmlFor="overwrite-checkbox" className="text-sm font-medium text-gray-300 cursor-pointer">Overwrite existing duplicate scores</label>
            </div>
            <button disabled={isLoading} className="w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 mt-4">
              {isLoading ? "Importing..." : "Import Match"}
            </button>
          </form>
        );
      case "db":
        return (
          <form onSubmit={handleDbImport} className="space-y-4">
            <p className="text-sm text-gray-400">
              Drag and drop your osu! <code>scores.db</code> file to import all relevant solo plays. This is processed locally in your browser.
            </p>

            {feedback && (
              <div className={`px-3 py-2 rounded text-sm font-medium ${feedback.type === "error" ? "bg-red-900/50 text-red-300 border border-red-800" : "bg-green-900/50 text-green-300 border border-green-800"}`}>
                {feedback.text}
              </div>
            )}

            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) setDbFile(e.dataTransfer.files[0]); }}
              className={`mt-2 flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors ${
                dbFile ? 'border-pink-500 bg-pink-900/10' : 'border-gray-600 bg-gray-800'
              }`}
            >
              <input type="file" accept=".db" onChange={(e) => setDbFile(e.target.files?.[0] || null)} className="hidden" id="db-file-upload" />
               {dbFile ? (
                <div className="flex items-center gap-3">
                  <p className="text-pink-400 font-semibold">{dbFile.name}</p>
                  <button 
                    type="button" 
                    onClick={() => { 
                      setDbFile(null); 
                      const input = document.getElementById('db-file-upload') as HTMLInputElement;
                      if (input) input.value = '';
                    }} 
                    className="text-pink-400 hover:text-pink-300 p-1 bg-pink-900/30 rounded-full transition-colors"
                    title="Remove file"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <label htmlFor="db-file-upload" className="cursor-pointer text-center w-full">
                  <p className="mt-1 text-sm text-gray-400"><span className="font-semibold text-blue-400">Upload a file</span> or drag and drop</p>
                  <p className="text-xs text-gray-500">scores.db</p>
                </label>
              )}
            </div>
            <div className="text-xs text-gray-400 bg-gray-800/50 p-3 rounded-md border border-gray-700/50 space-y-1.5">
              <p><strong className="text-gray-300 font-medium">Default Location:</strong> <code className="bg-gray-900 px-1 py-0.5 rounded border border-gray-700 select-all">%localappdata%\osu!\scores.db</code></p>
              <p><strong className="text-gray-300 font-medium">Missing Scores?</strong> osu! updates this file periodically. Return to the main menu or close the game to force it to save your newest plays before uploading.</p>
            </div>
            <button disabled={isLoading || !dbFile} className="w-full rounded-md bg-pink-600 px-4 py-2 font-semibold text-white hover:bg-pink-700 disabled:opacity-50 mt-4">
              {isLoading ? "Importing..." : "Process Local File"}
            </button>
          </form>
        );
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 transition-opacity"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-lg border border-border-main bg-background p-6 text-content shadow-xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Import Scores</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-hover-overlay/10 hover:text-content transition-colors">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="mb-4 border-b border-border-main">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <TabButton label="MP Link Import" tabName="mp" />
            <TabButton label="Bulk Upload (.db)" tabName="db" />
          </nav>
        </div>
        <div className="mt-6">{renderTabContent()}</div>
      </div>
    </div>
  );
};

export default AddDataModal;