'use client';

import { useState } from 'react';
// @ts-expect-error: osu-db-parser does not have TypeScript types available
import { ScoreDecoder } from 'osu-db-parser'; 
import { Buffer } from 'buffer';
import { saveScoresToDatabase } from '@/app/actions/scores';

export function ScoresDbUploader({ mappoolHashes }: { mappoolHashes: string[] }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const decoder = new ScoreDecoder();
      const db = decoder.decodeFromBuffer(buffer);

      const relevantScores = [];
      for (const beatmap of db.beatmaps) {
        if (mappoolHashes.includes(beatmap.md5)) {
          relevantScores.push(...beatmap.scores);
        }
      }

      if (relevantScores.length > 0) {
        await saveScoresToDatabase(relevantScores);
        alert(`Successfully synced ${relevantScores.length} scores!`);
      } else {
        alert('No scores found for the current mappool.');
      }
    } catch (error) {
      console.error("Failed to parse scores.db", error);
      alert('Error parsing scores.db file.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="font-medium text-sm">Upload scores.db</label>
      <input type="file" accept=".db" onChange={handleFileUpload} disabled={isProcessing} />
      {isProcessing && <p className="text-sm text-gray-500">Processing local scores...</p>}
    </div>
  );
}