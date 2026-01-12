
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Camera, 
  Loader2, 
  Trophy, 
  AlertCircle, 
  X, 
  Download, 
  FileJson, 
  Keyboard, 
  Play, 
  Trash2, 
  ShieldCheck, 
  ShieldAlert, 
  Home, 
  Moon, 
  Sun, 
  PlusCircle, 
  Sparkles, 
  ChevronLeft 
} from 'lucide-react';
import { Cell, GameState, SudokuGrid, Difficulty } from './types';
import { analyzeSudokuImage } from './services/geminiService';
import { 
  initializeGrid, 
  isGameWon, 
  getNumberCounts, 
  checkIsValid, 
  getConflicts, 
  solveSudoku, 
  hasInitialConflicts, 
  createEmptyGrid, 
  generateSudoku 
} from './utils/sudokuLogic';
import { GridCell } from './components/GridCell';
import { ControlPanel } from './components/ControlPanel';

type AppPhase = 'HOME' | 'DIFFICULTY_SELECT' | 'SETUP' | 'PLAYING';

const App: React.FC = () => {
  const [phase, setPhase] = useState<AppPhase>('HOME');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing grid...");
  const [error, setError] = useState<string | null>(null);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('sudoku-lens-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sudoku-lens-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sudoku-lens-theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (isScanning) {
      const messages = ["Locating grid...", "Reading digits...", "Checking consistency...", "Almost ready..."];
      let i = 0;
      const interval = setInterval(() => {
        setLoadingMessage(messages[i % messages.length]);
        i++;
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [isScanning]);

  useEffect(() => {
    let interval: any;
    if (phase === 'PLAYING' && gameState && !gameState.isGameOver && !gameState.isWon) {
      interval = setInterval(() => {
        setGameState(prev => prev ? ({ ...prev, timer: prev.timer + 1 }) : null);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase, gameState?.isGameOver, gameState?.isWon]);

  const startManualSetup = () => {
    const empty = createEmptyGrid();
    setGameState({
      grid: empty,
      solvedGrid: [],
      mistakes: 0,
      maxMistakes: 3,
      isGameOver: false,
      isWon: false,
      selectedCell: [0, 0],
      isNoteMode: false,
      timer: 0,
      history: [JSON.parse(JSON.stringify(empty))],
      settings: { autoCheck: true }
    });
    setPhase('SETUP');
    setError(null);
  };

  const handleDifficultySelect = (difficulty: Difficulty) => {
    setIsScanning(true);
    setLoadingMessage("Generating puzzle...");
    setTimeout(() => {
      try {
        const { initialGrid, solvedGrid } = generateSudoku(difficulty);
        const grid = initializeGrid(initialGrid);
        setGameState({
          grid,
          solvedGrid,
          mistakes: 0,
          maxMistakes: 3,
          isGameOver: false,
          isWon: false,
          selectedCell: [0, 0],
          isNoteMode: false,
          timer: 0,
          history: [JSON.parse(JSON.stringify(grid))],
          settings: { autoCheck: true }
        });
        setPhase('PLAYING');
        setError(null);
      } catch (err) {
        setError("Failed to generate puzzle.");
      } finally {
        setIsScanning(false);
      }
    }, 600);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const result = await analyzeSudokuImage(base64);
          const grid = initializeGrid(result.initialGrid);
          setGameState({
            grid,
            solvedGrid: result.solvedGrid || [],
            mistakes: 0,
            maxMistakes: 3,
            isGameOver: false,
            isWon: false,
            selectedCell: null,
            isNoteMode: false,
            timer: 0,
            history: [JSON.parse(JSON.stringify(grid))],
            settings: { autoCheck: true }
          });
          setPhase('SETUP');
        } catch (err: any) {
          setError(err.message || "Could not read the Sudoku. Try a clearer picture.");
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Failed to process image.");
      setIsScanning(false);
    }
    e.target.value = '';
  };

  const finishSetupAndStart = () => {
    if (!gameState) return;
    const numericGrid = gameState.grid.map(row => row.map(cell => cell.value || 0));
    if (hasInitialConflicts(numericGrid)) {
      setError("Conflicts detected! Remove duplicated numbers.");
      return;
    }
    let solution = gameState.solvedGrid.length === 9 ? gameState.solvedGrid : solveSudoku(numericGrid);
    if (!solution) {
      setError("Puzzle is unsolvable. Please check the initial digits.");
      return;
    }
    setGameState(prev => {
      if (!prev) return null;
      const finalGrid = prev.grid.map(row => row.map(cell => ({
        ...cell,
        isInitial: cell.value !== null,
        isValid: true
      })));
      return {
        ...prev,
        grid: finalGrid,
        solvedGrid: solution!,
        history: [JSON.parse(JSON.stringify(finalGrid))]
      };
    });
    setPhase('PLAYING');
    setError(null);
  };

  const handleNumberInput = useCallback((num: number) => {
    setGameState(prev => {
      if (!prev || !prev.selectedCell || prev.isGameOver || prev.isWon) return prev;
      const [r, c] = prev.selectedCell;
      const cell = prev.grid[r][c];
      if (phase === 'PLAYING' && cell.isInitial) return prev;
      const newGrid = JSON.parse(JSON.stringify(prev.grid)) as SudokuGrid;
      const targetCell = newGrid[r][c];
      if (phase === 'SETUP') {
        targetCell.value = targetCell.value === num ? null : num;
        targetCell.isInitial = targetCell.value !== null;
        targetCell.isValid = true;
        setError(null);
        return { ...prev, grid: newGrid };
      }
      if (prev.isNoteMode) {
        if (targetCell.value !== null) return prev;
        const notes = [...targetCell.notes];
        const index = notes.indexOf(num);
        if (index > -1) notes.splice(index, 1);
        else notes.push(num);
        targetCell.notes = notes.sort();
        return { ...prev, grid: newGrid };
      } else {
        if (targetCell.value === num) return prev; 
        const isCorrect = checkIsValid(r, c, num, prev.solvedGrid);
        targetCell.value = num;
        targetCell.notes = [];
        let mistakes = prev.mistakes;
        if (prev.settings.autoCheck) {
          targetCell.isValid = isCorrect;
          if (!isCorrect) mistakes += 1;
        } else {
          targetCell.isValid = true; 
        }
        const gameOver = mistakes >= prev.maxMistakes;
        const won = !gameOver && isGameWon(newGrid, prev.solvedGrid);
        return {
          ...prev,
          grid: newGrid,
          mistakes,
          isGameOver: gameOver,
          isWon: won,
          history: [...prev.history, JSON.parse(JSON.stringify(newGrid))]
        };
      }
    });
  }, [phase]);

  const handleErase = () => {
    setGameState(prev => {
      if (!prev || !prev.selectedCell || prev.isGameOver || prev.isWon) return prev;
      const [r, c] = prev.selectedCell;
      if (phase === 'PLAYING' && prev.grid[r][c].isInitial) return prev;
      const newGrid = JSON.parse(JSON.stringify(prev.grid)) as SudokuGrid;
      newGrid[r][c].value = null;
      newGrid[r][c].notes = [];
      newGrid[r][c].isValid = true;
      if (phase === 'SETUP') newGrid[r][c].isInitial = false;
      return { ...prev, grid: newGrid };
    });
  };

  const handleUndo = () => {
    setGameState(prev => {
      if (!prev || prev.history.length <= 1) return prev;
      const newHistory = [...prev.history];
      newHistory.pop();
      const lastState = newHistory[newHistory.length - 1];
      return { ...prev, grid: JSON.parse(JSON.stringify(lastState)), history: newHistory };
    });
  };

  const handleHint = () => {
    if (phase === 'SETUP') return;
    setGameState(prev => {
      if (!prev || !prev.selectedCell || prev.isGameOver || prev.isWon) return prev;
      const [r, c] = prev.selectedCell;
      const correctValue = prev.solvedGrid[r][c];
      const newGrid = JSON.parse(JSON.stringify(prev.grid)) as SudokuGrid;
      newGrid[r][c].value = correctValue;
      newGrid[r][c].isValid = true;
      newGrid[r][c].isInitial = true; 
      const won = isGameWon(newGrid, prev.solvedGrid);
      return { ...prev, grid: newGrid, isWon: won };
    });
  };

  // Add missing handleCellClick
  const handleCellClick = (r: number, c: number) => {
    setGameState(prev => {
      if (!prev) return null;
      return { ...prev, selectedCell: [r, c] };
    });
  };

  // Add missing handleImportJson
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const grid: SudokuGrid = data.cells.map((row: any) => row.map((c: any) => ({
          value: c.v,
          isInitial: c.i,
          notes: c.n,
          isValid: c.valid
        })));
        setGameState({
          grid,
          solvedGrid: data.solvedGrid,
          mistakes: data.mistakes,
          maxMistakes: 3,
          isGameOver: data.mistakes >= 3,
          isWon: isGameWon(grid, data.solvedGrid),
          selectedCell: [0, 0],
          isNoteMode: false,
          timer: data.timer,
          history: [JSON.parse(JSON.stringify(grid))],
          settings: data.settings
        });
        setPhase(data.phase);
        setError(null);
      } catch (err) {
        setError("Invalid save file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const isGameFinished = phase === 'PLAYING' && (gameState?.isGameOver || gameState?.isWon);

  return (
    <div className={`h-screen flex flex-col overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-zinc-950 text-slate-100' : 'bg-slate-50 text-slate-900'} px-4 pb-safe`}>
      <header className="flex-none flex items-center justify-between py-4 pt-safe">
        <h1 className="text-xl font-black tracking-tight">
          Sudoku <span className="text-blue-600 dark:text-blue-500">Lens</span>
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-400 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm active-scale">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {gameState && (
            <button onClick={() => {
              const data = { version: "1.4", phase, timer: gameState.timer, mistakes: gameState.mistakes, solvedGrid: gameState.solvedGrid, settings: gameState.settings, cells: gameState.grid.map(row => row.map(cell => ({ v: cell.value, i: cell.isInitial, n: cell.notes, valid: cell.isValid }))) };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `sudoku-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
            }} className="p-2 text-slate-400 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm active-scale">
              <Download size={18} />
            </button>
          )}
          {phase !== 'HOME' && (
            <button onClick={() => { setGameState(null); setPhase('HOME'); setError(null); }} className="p-2 text-slate-400 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm active-scale">
              <X size={18} />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
        {phase === 'HOME' ? (
          <div className="w-full bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 shadow-xl border border-slate-100 dark:border-zinc-800 flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Camera size={40} strokeWidth={2.5} />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black">Ready to Play?</h2>
              <p className="text-slate-500 text-xs font-medium">Scan a board or generate a new challenge.</p>
            </div>
            <div className="w-full flex flex-col gap-3">
              <button onClick={() => setPhase('DIFFICULTY_SELECT')} className="w-full py-4 bg-blue-600 dark:bg-blue-700 text-white rounded-2xl font-black text-base flex items-center justify-center gap-2 active-scale">
                <PlusCircle size={18} /><span>Create New Puzzle</span>
              </button>
              <div className="flex items-center gap-3"><div className="h-px flex-1 bg-slate-100 dark:bg-zinc-800"></div><span className="text-[9px] font-black uppercase text-slate-300 tracking-widest">Tools</span><div className="h-px flex-1 bg-slate-100 dark:bg-zinc-800"></div></div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => fileInputRef.current?.click()} className="py-4 bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl font-bold flex flex-col items-center gap-1 active-scale">
                  {isScanning ? <Loader2 size={20} className="animate-spin text-blue-500" /> : <Camera size={20} className="text-blue-500" />}
                  <span className="text-[10px] uppercase">Scan Image</span>
                </button>
                <button onClick={startManualSetup} className="py-4 bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border-2 border-slate-100 dark:border-zinc-700 rounded-2xl font-bold flex flex-col items-center gap-1 active-scale">
                  <Keyboard size={20} className="text-slate-400" />
                  <span className="text-[10px] uppercase">Manual Entry</span>
                </button>
              </div>
              <button onClick={() => jsonInputRef.current?.click()} className="py-2 text-slate-400 text-xs flex items-center justify-center gap-2 active-scale"><FileJson size={14} /><span>Import Save</span></button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              <input type="file" ref={jsonInputRef} className="hidden" accept=".json" onChange={handleImportJson} />
            </div>
          </div>
        ) : phase === 'DIFFICULTY_SELECT' ? (
          <div className="w-full bg-white dark:bg-zinc-900 rounded-[2rem] p-6 shadow-xl border border-slate-100 dark:border-zinc-800 flex flex-col items-center space-y-4 animate-in slide-in-from-right-8">
            <div className="w-full flex items-center justify-between mb-2">
              <button onClick={() => setPhase('HOME')} className="p-1 text-slate-400 active-scale"><ChevronLeft size={24} /></button>
              <h2 className="text-lg font-black">Difficulty</h2>
              <div className="w-8"></div>
            </div>
            <div className="w-full flex flex-col gap-2">
              {(['EASY', 'MEDIUM', 'HARD', 'EXPERT', 'EXTREME'] as Difficulty[]).map((d) => (
                <button key={d} onClick={() => handleDifficultySelect(d)} className="w-full py-4 px-6 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-between active-scale border border-transparent hover:border-slate-200 font-bold capitalize">
                  <span>{d.toLowerCase()}</span><Sparkles size={16} className="text-blue-400" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col overflow-hidden max-h-full">
            {phase === 'PLAYING' && (
              <div className="flex-none flex items-center justify-between mb-3 bg-white dark:bg-zinc-900 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800">
                <div className="flex flex-col"><span className="text-[8px] text-slate-400 font-black uppercase">Mistakes</span><span className={`text-base font-black ${gameState!.mistakes >= gameState!.maxMistakes ? 'text-red-500' : ''}`}>{gameState!.mistakes}/{gameState!.maxMistakes}</span></div>
                <div className="flex flex-col items-center"><span className="text-[8px] text-slate-400 font-black uppercase">Time</span><span className="text-base font-mono font-black">{Math.floor(gameState!.timer / 60).toString().padStart(2, '0')}:{(gameState!.timer % 60).toString().padStart(2, '0')}</span></div>
                <button onClick={() => setGameState(p => p ? ({ ...p, settings: { ...p.settings, autoCheck: !p.settings.autoCheck } }) : null)} className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 active-scale ${gameState!.settings.autoCheck ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-zinc-800 dark:border-zinc-700'}`}>
                  {gameState!.settings.autoCheck ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}<span className="text-[8px] font-black uppercase">Assist: {gameState!.settings.autoCheck ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            )}
            
            {phase === 'SETUP' && (
              <div className="flex-none bg-blue-600 text-white p-3 rounded-2xl mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2"><Keyboard size={20} /><div className="text-[10px] font-black uppercase tracking-tight">Edit Mode</div></div>
                <button onClick={finishSetupAndStart} className="bg-white text-blue-600 px-4 py-1.5 rounded-xl font-black text-xs active-scale">START</button>
              </div>
            )}

            {error && <div className="flex-none p-2 bg-red-50 text-red-600 rounded-xl mb-3 text-[10px] font-bold border border-red-100 flex items-center gap-2"><AlertCircle size={14} />{error}</div>}

            <div className="flex-1 min-h-0 w-full flex items-center justify-center">
              {/* Changed bg-slate-900 to bg-slate-200 to fix light mode background bleeding */}
              <div className="relative w-full aspect-square bg-slate-200 dark:bg-zinc-950 p-0 rounded-xl overflow-hidden shadow-xl border-4 border-slate-800 dark:border-zinc-800 max-w-[min(100%,400px)]">
                <div className="grid grid-cols-9 grid-rows-9 w-full h-full">
                  {gameState!.grid.map((row, r) => row.map((cell, c) => (
                    <GridCell key={`${r}-${c}`} cell={cell} row={r} col={c} isSelected={!isGameFinished && gameState!.selectedCell?.[0] === r && gameState!.selectedCell?.[1] === c} isHighlighted={!isGameFinished && gameState!.selectedCell && (gameState!.selectedCell[0] === r || gameState!.selectedCell[1] === c || (Math.floor(r / 3) === Math.floor(gameState!.selectedCell[0] / 3) && Math.floor(c / 3) === Math.floor(gameState!.selectedCell[1] / 3)))} isSameNumber={!isGameFinished && gameState!.selectedCell && gameState!.grid[gameState!.selectedCell[0]][gameState!.selectedCell[1]].value === cell.value && cell.value !== null} isConflict={gameState!.settings.autoCheck && cell.value !== null && getConflicts(gameState!.grid, r, c)} onClick={() => handleCellClick(r, c)} />
                  )))}
                </div>
              </div>
            </div>

            {isGameFinished ? (
              <div className="flex-none mt-4 bg-white dark:bg-zinc-900 rounded-[2rem] p-4 shadow-xl border border-slate-100 dark:border-zinc-800 animate-in slide-in-from-bottom-8">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${gameState!.isWon ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{gameState!.isWon ? <Trophy size={28} /> : <X size={28} />}</div>
                    <div><h2 className="text-lg font-black">{gameState!.isWon ? "Legendary!" : "Next Time..."}</h2><p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Game Complete</p></div>
                  </div>
                  <button onClick={() => { setGameState(null); setPhase('HOME'); }} className="px-5 py-3 bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-xl font-black text-xs active-scale">HOME</button>
                </div>
              </div>
            ) : (
              <div className="flex-none py-4 w-full">
                <ControlPanel onNumberClick={handleNumberInput} onErase={handleErase} onUndo={handleUndo} onHint={handleHint} isNoteMode={gameState!.isNoteMode} toggleNoteMode={() => setGameState(p => p ? ({ ...p, isNoteMode: !p.isNoteMode }) : null)} numberCounts={getNumberCounts(gameState!.grid)} />
              </div>
            )}
          </div>
        )}
      </main>
      <KeyboardHandler onNumberInput={handleNumberInput} onUndo={handleUndo} onErase={handleErase} />
    </div>
  );
};

const KeyboardHandler: React.FC<{ onNumberInput: (num: number) => void, onUndo: () => void, onErase: () => void }> = ({ onNumberInput, onUndo, onErase }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) onNumberInput(num);
      if (e.key === 'Backspace' || e.key === 'Delete') onErase();
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); onUndo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNumberInput, onUndo, onErase]);
  return null;
};

export default App;
