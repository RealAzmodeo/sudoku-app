import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState, Difficulty } from '../types';

export interface SavedGame {
  id: string;
  name: string;
  date: number; // Timestamp
  difficulty: Difficulty; // Inferred from context or stored
  gameState: GameState;
}

const SAVES_KEY = '@sudoku_lens_saves_v1';

export const saveGame = async (name: string, gameState: GameState, difficulty: Difficulty = 'MEDIUM'): Promise<SavedGame> => {
  try {
    const existingData = await AsyncStorage.getItem(SAVES_KEY);
    const saves: SavedGame[] = existingData ? JSON.parse(existingData) : [];

    const newSave: SavedGame = {
      id: Date.now().toString(), // Simple unique ID
      name: name.trim() || `Untitled ${new Date().toLocaleDateString()}`,
      date: Date.now(),
      difficulty,
      gameState
    };

    const updatedSaves = [newSave, ...saves]; // Add to top
    await AsyncStorage.setItem(SAVES_KEY, JSON.stringify(updatedSaves));
    return newSave;
  } catch (e) {
    console.error("Error saving game", e);
    throw e;
  }
};

export const getSavedGames = async (): Promise<SavedGame[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(SAVES_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error("Error loading games", e);
    return [];
  }
};

export const deleteSavedGame = async (id: string): Promise<SavedGame[]> => {
  try {
    const existingData = await AsyncStorage.getItem(SAVES_KEY);
    if (!existingData) return [];
    
    const saves: SavedGame[] = JSON.parse(existingData);
    const filteredSaves = saves.filter(s => s.id !== id);
    
    await AsyncStorage.setItem(SAVES_KEY, JSON.stringify(filteredSaves));
    return filteredSaves;
  } catch (e) {
    console.error('Error deleting game', e);
    return [];
  }
};

// --- OFFLINE QUEUE LOGIC ---

export interface PendingScore {
  id: string; // unique local ID
  data: any; // The score object
  timestamp: number;
}

export interface PendingPuzzle {
  id: string; // unique local ID
  data: any; // The puzzle object (id, grid, etc)
  timestamp: number;
}

interface OfflineQueue {
  scores: PendingScore[];
  puzzles: PendingPuzzle[];
}

const QUEUE_KEY = 'SUDOKU_OFFLINE_QUEUE';

const getQueue = async (): Promise<OfflineQueue> => {
  try {
    const json = await AsyncStorage.getItem(QUEUE_KEY);
    return json ? JSON.parse(json) : { scores: [], puzzles: [] };
  } catch {
    return { scores: [], puzzles: [] };
  }
};

const saveQueue = async (queue: OfflineQueue) => {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Failed to save queue", e);
  }
};

export const queuePendingScore = async (scoreData: any) => {
  const queue = await getQueue();
  queue.scores.push({ id: Date.now().toString(), data: scoreData, timestamp: Date.now() });
  await saveQueue(queue);
};

export const queuePendingPuzzle = async (puzzleData: any) => {
  const queue = await getQueue();
  queue.puzzles.push({ id: Date.now().toString(), data: puzzleData, timestamp: Date.now() });
  await saveQueue(queue);
};

export const getPendingData = async () => {
  return await getQueue();
};

export const clearPendingData = async () => {
  await saveQueue({ scores: [], puzzles: [] });
};

