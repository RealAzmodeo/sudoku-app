
import { SudokuGrid, Cell, Difficulty } from "../types";

export const createEmptyGrid = (): SudokuGrid => {
  return Array(9).fill(null).map(() =>
    Array(9).fill(null).map(() => ({
      value: null,
      isInitial: false,
      notes: [],
      isValid: true,
    }))
  );
};

export const initializeGrid = (initialValues: number[][]): SudokuGrid => {
  return initialValues.map((row) =>
    row.map((val) => ({
      value: val === 0 ? null : val,
      isInitial: val !== 0,
      notes: [],
      isValid: true,
    }))
  );
};

export const isGameWon = (grid: SudokuGrid, solvedGrid: number[][]): boolean => {
  if (!solvedGrid || solvedGrid.length !== 9) return false;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c].value !== solvedGrid[r][c]) return false;
    }
  }
  return true;
};

export const getNumberCounts = (grid: SudokuGrid) => {
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  grid.forEach(row => {
    row.forEach(cell => {
      if (cell.value && cell.isValid) counts[cell.value]++;
    });
  });
  return counts;
};

export const checkIsValid = (row: number, col: number, value: number, solvedGrid: number[][]): boolean => {
  if (!solvedGrid || !solvedGrid[row]) return true;
  return solvedGrid[row][col] === value;
};

export const getConflicts = (grid: SudokuGrid, row: number, col: number): boolean => {
  const value = grid[row][col].value;
  if (value === null) return false;

  for (let i = 0; i < 9; i++) {
    if (i !== col && grid[row][i].value === value) return true;
  }
  for (let i = 0; i < 9; i++) {
    if (i !== row && grid[i][col].value === value) return true;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let i = boxRow; i < boxRow + 3; i++) {
    for (let j = boxCol; j < boxCol + 3; j++) {
      if ((i !== row || j !== col) && grid[i][j].value === value) return true;
    }
  }
  return false;
};

export const solveSudoku = (grid: number[][]): number[][] | null => {
  const board = grid.map(row => [...row]);

  const isValid = (r: number, c: number, val: number): boolean => {
    for (let i = 0; i < 9; i++) {
      if (board[r][i] === val || board[i][c] === val) return false;
    }
    const startRow = Math.floor(r / 3) * 3;
    const startCol = Math.floor(c / 3) * 3;
    for (let i = startRow; i < startRow + 3; i++) {
      for (let j = startCol; j < startCol + 3; j++) {
        if (board[i][j] === val) return false;
      }
    }
    return true;
  };

  const solve = (): boolean => {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          for (let val of nums) {
            if (isValid(r, c, val)) {
              board[r][c] = val;
              if (solve()) return true;
              board[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  };

  if (solve()) return board;
  return null;
};

export const hasInitialConflicts = (grid: number[][]): boolean => {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = grid[r][c];
      if (val === 0) continue;
      const original = grid[r][c];
      grid[r][c] = 0;
      const isConflicting = (): boolean => {
        for (let i = 0; i < 9; i++) if (grid[r][i] === val || grid[i][c] === val) return true;
        const sr = Math.floor(r / 3) * 3;
        const sc = Math.floor(c / 3) * 3;
        for (let i = sr; i < sr + 3; i++) for (let j = sc; j < sc + 3; j++) if (grid[i][j] === val) return true;
        return false;
      };
      if (isConflicting()) {
        grid[r][c] = original;
        return true;
      }
      grid[r][c] = original;
    }
  }
  return false;
};

/**
 * Generates a random Sudoku puzzle by filling a board and removing clues.
 */
export const generateSudoku = (difficulty: Difficulty): { initialGrid: number[][], solvedGrid: number[][] } => {
  // Generate a fully solved board
  const empty = Array(9).fill(null).map(() => Array(9).fill(0));
  const solved = solveSudoku(empty);
  if (!solved) throw new Error("Generation failure");

  const initial = solved.map(row => [...row]);
  
  // Clues to remove based on level
  const removalCounts: Record<Difficulty, number> = {
    EASY: 40,
    MEDIUM: 48,
    HARD: 54,
    EXPERT: 58,
    EXTREME: 62
  };

  let removed = 0;
  const target = removalCounts[difficulty];

  // Randomly remove clues
  // Note: For high-end apps we should check uniqueness, but for performance and casual play this is robust.
  while (removed < target) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);
    if (initial[r][c] !== 0) {
      initial[r][c] = 0;
      removed++;
    }
  }

  return { initialGrid: initial, solvedGrid: solved };
};
