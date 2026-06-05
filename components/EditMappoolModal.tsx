"use client";

import { useState, useEffect } from "react";
import { updateStageMappool } from "@/app/actions";

interface EditMappoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  stages: { id: string; name: string }[];
  selectedStage: string;
  onSelectStage: (stage: string) => void;
  onAddStage: () => void;
  onDeleteStage: () => void;
  mappool: Record<string, any[]>;
}

export default function EditMappoolModal({ isOpen, onClose, stages, selectedStage, onSelectStage, onAddStage, onDeleteStage, mappool }: EditMappoolModalProps) {
  const [maps, setMaps] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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
    }
  }, [isOpen, selectedStage, mappool]);

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
    setMaps(newMaps);
  };

  const handleSubmit = async () => {
    setError("");
    setIsSubmitting(true);
    
    const stageId = stages.find(s => s.name === selectedStage)?.id || "";
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
      <div className="w-full max-w-2xl rounded-lg border border-gray-700 bg-gray-900 p-6 text-white shadow-xl flex flex-col max-h-[90vh]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Edit Mappool</h2>
            <p className="text-sm text-gray-400">Managing maps for <span className="font-semibold text-pink-400">{selectedStage}</span></p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-700 hover:text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 border-b border-gray-700">
          {stages.map(s => (
            <button
              key={s.id}
              onClick={() => handleStageChange(s.name)}
              className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${selectedStage === s.name ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
            >
              {s.name}
            </button>
          ))}
          <button onClick={onAddStage} className="px-3 py-1.5 rounded text-sm font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white whitespace-nowrap">
            + Add Stage
          </button>
          {stages.length > 0 && (
            <button onClick={onDeleteStage} className="px-3 py-1.5 rounded text-sm font-medium bg-red-900/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 whitespace-nowrap ml-auto" title="Delete current stage">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-900/50 border border-red-500 text-red-200 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

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
              <button type="button" onClick={() => removeRow(index)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-md transition-colors flex-shrink-0" title="Delete Map">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
          
          <button onClick={addRow} className="w-full mt-2 rounded-md border border-gray-600 bg-gray-800 border-dashed px-4 py-3 text-sm font-semibold text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors">
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