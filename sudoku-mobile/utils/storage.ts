import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState, Difficulty } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface SavedGame {
  id: string;
  name: string;
  date: number; // Timestamp
  difficulty: Difficulty; // Inferred from context or stored
  gameState: GameState;
}

const SAVES_KEY = '@sudoku_lens_saves_v1';
const AUTOSAVE_PREFIX = '@sudoku_autosave_';
const LOCKED_PREFIX = '@sudoku_locked_';
const ACTIVE_GAME_ID_KEY = '@sudoku_active_game_id';
const INSTALLATION_ID_KEY = '@sudoku_installation_id';

export const getInstallationId = async (): Promise<string> => {
    try {
        let id = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
        if (!id) {
            id = uuidv4();
            await AsyncStorage.setItem(INSTALLATION_ID_KEY, id);
        }
        return id;
    } catch (e) {
        return 'unknown-device';
    }
};

export const setActiveGameId = async (puzzleId: string) => {
    try {
        await AsyncStorage.setItem(ACTIVE_GAME_ID_KEY, puzzleId);
    } catch (e) {
        console.error("Failed to set active game", e);
    }
};

export const getActiveGameId = async (): Promise<string | null> => {
    try {
        return await AsyncStorage.getItem(ACTIVE_GAME_ID_KEY);
    } catch (e) {
        return null;
    }
};

export const clearActiveGameId = async () => {
    try {
        await AsyncStorage.removeItem(ACTIVE_GAME_ID_KEY);
    } catch (e) {
        console.error("Failed to clear active game", e);
    }
};

export const autoSaveGame = async (puzzleId: string, gameState: GameState) => {
  if (!puzzleId) return;
  try {
    await AsyncStorage.setItem(`${AUTOSAVE_PREFIX}${puzzleId}`, JSON.stringify(gameState));
  } catch (e) {
    console.error("Auto-save failed", e);
  }
};

export const getAutoSave = async (puzzleId: string): Promise<GameState | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(`${AUTOSAVE_PREFIX}${puzzleId}`);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    return null;
  }
};

export const lockPuzzle = async (puzzleId: string) => {
    await AsyncStorage.setItem(`${LOCKED_PREFIX}${puzzleId}`, 'true');
};

export const isPuzzleLocked = async (puzzleId: string): Promise<boolean> => {
    const val = await AsyncStorage.getItem(`${LOCKED_PREFIX}${puzzleId}`);
    return val === 'true';
};

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

export const getLocalPuzzleStatuses = async (): Promise<Record<string, 'STARTED' | 'COMPLETED'>> => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const statusMap: Record<string, 'STARTED' | 'COMPLETED'> = {};

        keys.forEach(key => {
            if (key.startsWith(LOCKED_PREFIX)) {
                const id = key.replace(LOCKED_PREFIX, '');
                statusMap[id] = 'COMPLETED';
            } else if (key.startsWith(AUTOSAVE_PREFIX)) {
                const id = key.replace(AUTOSAVE_PREFIX, '');
                // Only mark as started if not already completed
                if (statusMap[id] !== 'COMPLETED') {
                    statusMap[id] = 'STARTED';
                }
            }
        });
        return statusMap;
    } catch (e) {
        return {};
    }
};

