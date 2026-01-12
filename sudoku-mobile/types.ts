export type CellValue = number | null;

export interface Cell {
  value: CellValue;
  isInitial: boolean;
  notes: number[];
  isValid: boolean;
  isHinted?: boolean;
}

export type SudokuGrid = Cell[][];

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT' | 'EXTREME';

export interface GameSettings {
  autoCheck: boolean;
}

export interface GameState {
  grid: SudokuGrid;
  solvedGrid: number[][];
  mistakes: number;
  maxMistakes: number;
  isGameOver: boolean;
  isWon: boolean;
  selectedCell: [number, number] | null;
  isNoteMode: boolean;
  timer: number;
  history: SudokuGrid[];
  settings: GameSettings;
  puzzleId?: string; // Unique ID for shared games
}

export interface SudokuScanResult {
  initialGrid: number[][];
  solvedGrid: number[][];
}
