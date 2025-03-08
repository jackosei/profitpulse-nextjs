"use client";

import { useState, useEffect } from 'react';

interface JournalEntry {
  text: string;
  timestamp: number;
}

export default function GratitudeJournal() {
  const [entry, setEntry] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Load entry from localStorage when component mounts
  useEffect(() => {
    const today = new Date().toDateString();
    const savedEntryJson = localStorage.getItem(`gratitude-${today}`);
    if (savedEntryJson) {
      const savedEntry: JournalEntry = JSON.parse(savedEntryJson);
      // Check if the entry is less than 24 hours old
      const now = Date.now();
      if (now - savedEntry.timestamp < 24 * 60 * 60 * 1000) {
        setEntry(savedEntry.text);
        setIsSaved(true);
      }
    }
  }, []);

  const saveEntry = () => {
    if (!entry.trim()) return;

    const now = Date.now();
    const today = new Date().toDateString();
    const journalEntry: JournalEntry = {
      text: entry,
      timestamp: now
    };

    // Save today's entry
    localStorage.setItem(`gratitude-${today}`, JSON.stringify(journalEntry));

    // Also save to history with unique timestamp key for future reference
    localStorage.setItem(`gratitude-history-${now}`, JSON.stringify(journalEntry));
    
    setIsSaved(true);
  };

  const startNewEntry = () => {
    setEntry('');
    setIsSaved(false);
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <label htmlFor="gratitude" className="block text-lg font-medium text-gray-200 mb-2">
        What are you grateful for today?
      </label>
      {!isSaved ? (
        <>
          <textarea
            id="gratitude"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            className="w-full h-32 p-3 bg-gray-700 text-white rounded-md focus:ring-2 focus:ring-accent focus:outline-none mb-3"
            placeholder="Take a moment to reflect on what you're thankful for..."
          />
          <button
            onClick={saveEntry}
            className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/80 transition-colors"
          >
            Save Entry
          </button>
        </>
      ) : (
        <div className="space-y-4">
          <div className="w-full p-3 bg-gray-700 text-white rounded-md min-h-[8rem] whitespace-pre-wrap">
            {entry}
          </div>
          <button
            onClick={startNewEntry}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
          >
            Write New Entry
          </button>
        </div>
      )}
    </div>
  );
} 