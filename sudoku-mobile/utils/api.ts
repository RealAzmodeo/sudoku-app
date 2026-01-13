import Constants from 'expo-constants';
import { queuePendingPuzzle, queuePendingScore, getPendingData, clearPendingData } from './storage';

// --- BACKEND CONFIGURATION ---
// Option 1: Live Production Backend (Render)
export const API_URL = 'https://sudoku-app-uyk3.onrender.com'; 

// Option 2: Local Backend (Android Emulator)
// Use this if you are running the backend locally with 'node server.js' and using Android Emulator
// export const API_URL = 'http://10.0.2.2:3000';

// Option 3: Local Backend (Physical Device)
// export const API_URL = 'http://YOUR_PC_IP_ADDRESS:3000'; 


export interface ApiScore {
  id?: number;
  puzzleId: string;
  playerName: string;
  timeSeconds: number;
  mistakes: number;
  timestamp?: string;
}

export const api = {
  // Check if server is up
  checkHealth: async () => {
    try {
        // Just try to fetch leaderboard as a ping
        const res = await fetch(`${API_URL}/api/leaderboard?limit=1`, { method: 'HEAD' }); 
        return res.ok;
    } catch {
        return false;
    }
  },

  // Save a generated puzzle so others can play it
  savePuzzle: async (id: string, initialGrid: number[][], solvedGrid: number[][], difficulty: string, author?: string) => {
    const puzzleData = { id, initialGrid, solvedGrid, difficulty, author };
    try {
      const response = await fetch(`${API_URL}/api/puzzle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(puzzleData),
      });
      if (!response.ok) throw new Error("Server error");
      return await response.json();
    } catch (e) {
      console.log("Offline mode: Queuing puzzle for later.");
      await queuePendingPuzzle(puzzleData);
      return { id, offline: true }; // Return fake success
    }
  },

  // Get Community Puzzles
  getCommunityPuzzles: async () => {
    try {
        const response = await fetch(`${API_URL}/api/puzzles`);
        if (!response.ok) throw new Error("Failed to fetch");
        return await response.json();
    } catch (e) {
        console.error("API Error (getCommunityPuzzles):", e);
        return [];
    }
  },

  // Get a specific puzzle by ID
  getPuzzle: async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/puzzle/${id}`);
      if (!response.ok) throw new Error('Puzzle not found');
      return await response.json();
    } catch (e) {
      console.error("API Error (getPuzzle):", e);
      return null;
    }
  },

  // Submit a score
  submitScore: async (score: ApiScore) => {
    try {
      const response = await fetch(`${API_URL}/api/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(score),
      });
      if (!response.ok) throw new Error("Server error");
      return await response.json();
    } catch (e) {
      console.log("Offline mode: Queuing score for later.");
      await queuePendingScore(score);
      return { offline: true };
    }
  },

  // Get Leaderboard
  getLeaderboard: async (puzzleId?: string) => {
    try {
      const url = puzzleId 
        ? `${API_URL}/api/leaderboard?puzzleId=${puzzleId}` 
        : `${API_URL}/api/leaderboard`;
      const response = await fetch(url);
      return await response.json();
    } catch (e) {
      console.error("API Error (getLeaderboard):", e);
      return [];
    }
  },

  // Sync Data
  syncPendingData: async () => {
    const queue = await getPendingData();
    if (queue.puzzles.length === 0 && queue.scores.length === 0) return true;

    try {
        // Try uploading puzzles
        for (const p of queue.puzzles) {
            await fetch(`${API_URL}/api/puzzle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(p.data),
            });
        }
        // Try uploading scores
        for (const s of queue.scores) {
            await fetch(`${API_URL}/api/score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(s.data),
            });
        }
        // If we got here, we assume success. Clear queue.
        await clearPendingData();
        return true;
    } catch (e) {
        console.log("Sync failed, keeping data queued.");
        return false;
    }
  },

  // Scan Image via Gemini
  scanSudokuImage: async (uri: string) => {
    try {
        const formData = new FormData();
        // @ts-ignore - React Native FormData expects an object with uri, name, type
        formData.append('image', {
            uri,
            name: 'sudoku.jpg',
            type: 'image/jpeg',
        });

        const response = await fetch(`${API_URL}/api/scan`, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        if (!response.ok) throw new Error("Scan failed");
        return await response.json();
    } catch (e) {
        console.error("API Error (scanSudokuImage):", e);
        return null;
    }
  },

  // Update Author Name
  updateAuthorName: async (oldName: string, newName: string) => {
      try {
          await fetch(`${API_URL}/api/update-author`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ oldName, newName }),
          });
      } catch (e) {
          console.error("Failed to update author name", e);
      }
  }
};
