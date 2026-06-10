"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { reorderStages, updateStageMappool } from "@/app/actions";
import BeatmapLink from "@/components/BeatmapLink";

interface EditMappoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  stages: { id: string; name: string }[];
  selectedStage: string;
  onSelectStage: (stage: string) => void;
  onAddStage: () => void;
  onRenameStage: () => void;
  onDeleteStage: () => void;
  mappool: Record<string, any[]>;
}

export default function EditMappoolModal({ isOpen, onClose, tournamentId, stages, selectedStage, onSelectStage, onAddStage, onRenameStage, onDeleteStage, mappool }: EditMappoolModalProps) {
  const router = useRouter();
  const [maps, setMaps] = useState<any[]>([]);
  const [orderedStages, setOrderedStages] = useState(stages);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReorderingStages, setIsReorderingStages] = useState(false);
  const [error, setError] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedStageIndex, setDraggedStageIndex] = useState<number | null>(null);
  const [selectedMaps, setSelectedMaps] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) setOrderedStages(stages);
  }, [isOpen, stages]);

  useEffect(() => {
    if (isOpen && selectedStage) {
      const currentMappool = mappool[selectedStage] || [];
      setMaps(currentMappool.map(m => ({
        dbId: m.dbId,
        mod: m.mod,
        mapId: m.id,
        beatmapId: m.beatmapId?.toString() || ""
      })));
      setError("");
      setSelectedMaps(new Set());
    }
  }, [isOpen, selectedStage, mappool]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getNextMapId = (mod: string, skipIndex: number, currentMaps: any[]) => {
    const existing = currentMaps.filter((m, i) => i !== skipIndex && m.mod.toUpperCase() === mod.toUpperCase()).map(m => m.mapId);
    const numbers = existing.map((id: string) => {
      const match = id.match(/\d+$/);
      return match ? parseInt(match[0], 10) : 0;
    });
    let nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    let result = mod.toUpperCase() === 'TB' && nextNum === 1 ? 'TB' : `${mod.toUpperCase()}${nextNum}`;
    while (existing.includes(result)) {
      nextNum++;
      result = `${mod.toUpperCase()}${nextNum}`;
    }
    return result;
  };

  const handleStageChange = (newStage: string) => {
    // Check if they have unsaved changes before switching tabs
    const currentOriginal = (mappool[selectedStage] || []).map(m => ({
      dbId: m.dbId, mod: m.mod, mapId: m.id, beatmapId: m.beatmapId?.toString() || ""
    }));
    
    if (JSON.stringify(maps) !== JSON.stringify(currentOriginal)) {
      if (!confirm("You have unsaved changes. Are you sure you want to switch stages without saving?")) return;
    }
    setSelectedMaps(new Set());
    onSelectStage(newStage);
  };

  const handleDrop = (dropIndex: number) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    const newMaps = [...maps];
    const [draggedMap] = newMaps.splice(draggedIndex, 1);
    newMaps.splice(dropIndex, 0, draggedMap);
    setMaps(newMaps);
    setDraggedIndex(null);
  };

  const handleStageDrop = async (dropIndex: number) => {
    if (draggedStageIndex === null || draggedStageIndex === dropIndex) return;

    const previousOrder = orderedStages;
    const newStages = [...orderedStages];
    const [draggedStage] = newStages.splice(draggedStageIndex, 1);
    newStages.splice(dropIndex, 0, draggedStage);
    setOrderedStages(newStages);
    setDraggedStageIndex(null);
    setIsReorderingStages(true);
    setError("");

    const result = await reorderStages(tournamentId, newStages.map(s => s.id));
    setIsReorderingStages(false);
    if (result?.error) {
      setError(result.error);
      setOrderedStages(previousOrder);
    } else {
      router.refresh();
    }
  };

  const getModColor = (mod: string) => {
    switch (mod.toUpperCase()) {
      case 'NM': return 'border-l-gray-500';
      case 'HD': return 'border-l-yellow-500';
      case 'HR': return 'border-l-red-500';
      case 'DT': return 'border-l-blue-500';
      case 'FM': return 'border-l-orange-500';
      case 'MM': return 'border-l-purple-500';
      case 'TB': return 'border-l-green-500';
      default: return 'border-l-gray-600';
    }
  };

  const handleUpdate = (index: number, field: string, value: string) => {
    const newMaps = [...maps];
    let processedValue = value;
    
    if (field === 'beatmapId') {
      const match = value.match(/(?:beatmaps\/|#(?:osu|taiko|fruits|mania)\/|b\/)(\d+)/);
      if (match && match[1]) processedValue = match[1];
    }
    
    newMaps[index] = { ...newMaps[index], [field]: processedValue };
    if (field === 'mod') newMaps[index].mapId = getNextMapId(processedValue, index, newMaps);
    setMaps(newMaps);
  };

  const addRow = () => {
    const nextMod = maps.length > 0 ? maps[maps.length - 1].mod : 'NM';
    const nextMapId = getNextMapId(nextMod, -1, maps);
    setMaps([...maps, { mod: nextMod, mapId: nextMapId, beatmapId: '' }]);
  };

  const removeRow = (index: number) => {
    const newMaps = [...maps];
    newMaps.splice(index, 1);
    setSelectedMaps(new Set());
    setMaps(newMaps);
  };

  const isAllSelected = maps.length > 0 && selectedMaps.size === maps.length;
  const toggleSelection = (index: number) => {
    const newSet = new Set(selectedMaps);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelectedMaps(newSet);
  };
  const removeSelected = () => {
    setMaps(maps.filter((_, i) => !selectedMaps.has(i)));
    setSelectedMaps(new Set());
  };

  const handleSubmit = async () => {
    setError("");
    setIsSubmitting(true);
    
    const stageId = orderedStages.find(s => s.name === selectedStage)?.id || "";
    if (!stageId) {
      setError("No active stage selected.");
      setIsSubmitting(false);
      return;
    }

    const validMaps = maps.filter(m => m.mapId && m.beatmapId);
    if (maps.length > 0 && validMaps.length !== maps.length) {
      setError("Please fill out all Map Slots and Beatmap IDs, or remove empty rows.");
      setIsSubmitting(false);
      return;
    }

    const fd = new FormData();
    fd.append("stageId", stageId);
    fd.append("maps", JSON.stringify(validMaps));
    
    const result = await updateStageMappool(fd);
    setIsSubmitting(false);
    
    if (result?.error) setError(result.error);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 transition-opacity">
      <div className="w-full max-w-4xl rounded-lg border border-gray-700 bg-gray-900 p-6 text-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Edit Mappool</h2>
            <p className="text-sm text-gray-400">Managing maps for <span className="font-semibold text-pink-400">{selectedStage}</span></p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="mb-4 pb-3 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Stages</span>
            <div className="flex items-center gap-1">
              <button
                onClick={onAddStage}
                className="inline-flex items-center justify-center h-8 px-2.5 rounded text-sm font-medium leading-none bg-gray-800 text-gray-400 hover:bg-white/10 hover:text-white whitespace-nowrap transition-colors"
                title="Add stage"
              >
                + Add
              </button>
              {orderedStages.length > 0 && (
                <>
                  <button
                    onClick={onRenameStage}
                    disabled={isReorderingStages}
                    className="inline-flex items-center justify-center h-8 w-8 rounded text-sm font-medium bg-gray-800 text-gray-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
                    title="Rename current stage"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button
                    onClick={onDeleteStage}
                    disabled={isReorderingStages}
                    className="inline-flex items-center justify-center h-8 w-8 rounded text-sm font-medium bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors disabled:opacity-50"
                    title="Delete current stage"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </>
              )}
            </div>
          </div>
          <div className={`flex flex-wrap items-center gap-2 ${isReorderingStages ? "opacity-60 pointer-events-none" : ""}`}>
            {orderedStages.map((s, index) => (
              <button
                key={s.id}
                draggable
                onDragStart={() => setDraggedStageIndex(index)}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                onDrop={(e) => { e.preventDefault(); handleStageDrop(index); }}
                onClick={() => handleStageChange(s.name)}
                className={`flex items-center gap-1.5 h-8 px-3 rounded text-sm font-medium whitespace-nowrap transition-colors cursor-grab active:cursor-grabbing ${selectedStage === s.name ? "bg-pink-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-white/10 hover:text-white"} ${draggedStageIndex === index ? "opacity-50 border border-dashed border-gray-500" : ""}`}
                title="Drag to reorder"
              >
                <svg className="w-3.5 h-3.5 opacity-50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" /></svg>
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/50 border border-red-500 text-red-200 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

      <div className="flex justify-between items-center mb-2 px-1">
        <label className="text-sm font-medium text-gray-400">Map Slots</label>
        {maps.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isAllSelected) setSelectedMaps(new Set());
                else setSelectedMaps(new Set(maps.map((_, i) => i)));
              }}
              className="text-xs px-2 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition-colors"
            >
              {isAllSelected ? "Unselect All" : "Select All"}
            </button>
            {selectedMaps.size > 0 && (
              <button
                type="button"
                onClick={removeSelected}
                className="text-xs px-2 py-1.5 rounded bg-red-900/30 hover:bg-red-900/50 text-red-400 font-medium transition-colors border border-red-900/50"
              >
                Delete Selected ({selectedMaps.size})
              </button>
            )}
          </div>
        )}
      </div>

        <div className="flex-grow overflow-y-auto pr-2 space-y-2 mb-4 min-h-[50vh]">
          <datalist id="modal-mod-options">
            {['NM', 'HD', 'HR', 'DT', 'FM', 'MM', 'TB'].map(m => <option key={m} value={m} />)}
          </datalist>

          {maps.map((map, index) => (
            <div 
              key={index} 
              draggable
              onDragStart={(e) => setDraggedIndex(index)}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
              onDrop={(e) => { e.preventDefault(); handleDrop(index); }}
              className={`flex gap-2 items-center bg-gray-800 p-2 rounded-md border-y border-r border-gray-700 border-l-4 ${getModColor(map.mod)} ${draggedIndex === index ? 'opacity-50 border-dashed' : ''} transition-opacity cursor-grab active:cursor-grabbing`}
            >
              <div className="text-gray-500 hover:text-gray-300 pr-2 border-r border-gray-600 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" /></svg>
              </div>
            <input
              type="checkbox"
              checked={selectedMaps.has(index)}
              onChange={() => toggleSelection(index)}
              title="Select map"
              className="w-4 h-4 ml-1 text-pink-600 bg-gray-900 border-gray-600 rounded focus:ring-pink-500 focus:ring-offset-gray-800 flex-shrink-0 cursor-pointer"
            />
              <input 
                list="modal-mod-options"
                value={map.mod} 
                onChange={e => handleUpdate(index, 'mod', e.target.value.toUpperCase())} 
                className="w-16 rounded bg-gray-900 border border-gray-600 p-2 text-sm focus:border-pink-500 focus:outline-none uppercase font-semibold text-center" 
                placeholder="Mod"
              />
              <input 
                type="text" 
                value={map.mapId} 
                onChange={e => handleUpdate(index, 'mapId', e.target.value)} 
                className="w-20 rounded bg-gray-900 border border-gray-600 p-2 text-sm focus:border-pink-500 focus:outline-none text-center" 
                placeholder="Slot" 
              />
              <input 
                type="text" 
                value={map.beatmapId} 
                onChange={e => handleUpdate(index, 'beatmapId', e.target.value)} 
                className="flex-grow rounded bg-gray-900 border border-gray-600 p-2 text-sm focus:border-pink-500 focus:outline-none font-mono" 
                placeholder="Beatmap ID or Link" 
              />
              <BeatmapLink beatmapId={map.beatmapId} className="flex-shrink-0 p-1.5" />
              <button type="button" onClick={() => removeRow(index)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-md transition-colors flex-shrink-0" title="Delete Map">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
          
          <button onClick={addRow} className="w-full mt-2 rounded-md border border-gray-600 bg-gray-800 border-dashed px-4 py-3 text-sm font-semibold text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors">
            + Add Map to Stage
          </button>
        </div>

        <div className="pt-4 border-t border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="rounded-md bg-pink-600 px-6 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50 transition-colors">
            {isSubmitting ? "Saving Changes..." : "Save Mappool"}
          </button>
        </div>
      </div>
    </div>
  );
}