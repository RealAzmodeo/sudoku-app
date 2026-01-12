import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  useColorScheme as useNativeColorScheme,
  useWindowDimensions,
  TextInput,
  Modal,
  FlatList
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { 
  Camera, 
  Trophy, 
  AlertCircle, 
  X, 
  Keyboard, 
  ShieldCheck, 
  ShieldAlert, 
  Moon, 
  Sun, 
  PlusCircle, 
  Sparkles, 
  ChevronLeft,
  Save,
  FolderOpen,
  RotateCcw,
  Trash2,
  Globe,
  Share2,
  Users,
  DownloadCloud,
  Cloud,
  CloudOff
} from 'lucide-react-native';
import { GameState, Difficulty } from './types';
import { 
  initializeGrid, 
  isGameWon, 
  getNumberCounts, 
  checkIsValid, 
  getConflicts, 
  solveSudoku, 
  hasInitialConflicts, 
  createEmptyGrid, 
  generateSudoku,
  checkCompletion
} from './utils/sudokuLogic';
import { saveGame, getSavedGames, deleteSavedGame, SavedGame } from './utils/storage';
import { LanguageProvider, useLanguage } from './utils/i18n';
import { api } from './utils/api';
import { GridCell } from './components/GridCell';
import { ControlPanel } from './components/ControlPanel';
import { SaveModal } from './components/SaveModal';
import { SavedGamesList } from './components/SavedGamesList';
import { CameraScanner } from './components/CameraScanner';
import { RewardOverlay } from './components/RewardOverlay';
import clsx from 'clsx';
import "./global.css"
import { useColorScheme } from "nativewind"; 

type AppPhase = 'HOME' | 'DIFFICULTY_SELECT' | 'SETUP' | 'PLAYING' | 'LOAD_GAME' | 'SCANNING';

const AppContent = () => {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const { width } = useWindowDimensions();
  const isDarkMode = colorScheme === 'dark';

  // Calculate Cell Size
  // Screen Width - Container Padding (px-4 = 32) - Board Padding (p-1 = 8) - Gaps (10 * 2 = 20) - Spacers (2 * 4 = 8)
  const totalDeductions = 32 + 8 + 20 + 8;
  const cellSize = Math.floor((width - totalDeductions) / 9);

  const [phase, setPhase] = useState<AppPhase>('HOME');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing grid...");
  const [error, setError] = useState<string | null>(null);
  
  // Backend State
  const [playerName, setPlayerName] = useState("Family Player");
  const [joinGameId, setJoinGameId] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [currentSaveId, setCurrentSaveId] = useState<string | null>(null);
  const [areAnimationsEnabled, setAreAnimationsEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  // Rewards State
  const [rewards, setRewards] = useState<{ id: string, type: string, startPos: {x:number, y:number} }[]>([]);
  const gridRef = useRef<View>(null);
  const [gridPageY, setGridPageY] = useState(0);

  const { t, language, setLanguage } = useLanguage();
  const toggleLanguage = () => setLanguage(language === 'en' ? 'es' : 'en');
  const toggleAnimations = () => setAreAnimationsEnabled(prev => !prev);

  // --- ONLINE CHECK & SYNC LOOP ---
  useEffect(() => {
    const checkConnection = async () => {
        const healthy = await api.checkHealth();
        setIsOnline(healthy);
        if (healthy) {
            await api.syncPendingData();
        }
    };
    
    checkConnection(); // Initial check
    const interval = setInterval(checkConnection, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);
  // --------------------------------

  useEffect(() => {
    let interval: any;
    if (phase === 'PLAYING' && gameState && !gameState.isGameOver && !gameState.isWon) {
      interval = setInterval(() => {
        setGameState(prev => prev ? ({ ...prev, timer: prev.timer + 1 }) : null);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase, gameState?.isGameOver, gameState?.isWon]);

  useEffect(() => {
    if (phase === 'LOAD_GAME') {
      loadSavedGamesList();
    }
  }, [phase]);

  const loadSavedGamesList = async () => {
    const games = await getSavedGames();
    setSavedGames(games);
  };

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
    setCurrentSaveId(null);
    setError(null);
  };

  // --- BACKEND INTEGRATION ---
  
  const handleDifficultySelect = async (difficulty: Difficulty) => {
    setIsScanning(true);
    setLoadingMessage(t('generating'));
    
    setTimeout(async () => {
      try {
        const { initialGrid, solvedGrid } = generateSudoku(difficulty);
        const grid = initializeGrid(initialGrid);
        
        // Generate Unique ID & Upload
        const uniqueId = `${difficulty}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;
        // Fire and forget upload (don't block UI)
        api.savePuzzle(uniqueId, initialGrid, solvedGrid, difficulty).then(res => {
            if(res) console.log("Puzzle uploaded:", res.id);
        });

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
          settings: { autoCheck: true },
          puzzleId: uniqueId
        });
        setPhase('PLAYING');
        setCurrentSaveId(null);
        setError(null);
      } catch (err) {
        setError("Failed to generate puzzle.");
      } finally {
        setIsScanning(false);
      }
    }, 100);
  };

  const handleJoinGame = async () => {
    if (!joinGameId.trim()) return;
    setIsScanning(true);
    setLoadingMessage("Fetching Puzzle...");
    try {
        const puzzle = await api.getPuzzle(joinGameId.trim());
        if (!puzzle) {
            Alert.alert("Error", "Puzzle ID not found.");
            setIsScanning(false);
            return;
        }
        
        const grid = initializeGrid(puzzle.initialGrid);
        setGameState({
          grid,
          solvedGrid: puzzle.solvedGrid,
          mistakes: 0,
          maxMistakes: 3,
          isGameOver: false,
          isWon: false,
          selectedCell: [0, 0],
          isNoteMode: false,
          timer: 0,
          history: [JSON.parse(JSON.stringify(grid))],
          settings: { autoCheck: true },
          puzzleId: puzzle.id
        });
        setPhase('PLAYING');
        setShowJoinModal(false);
        setJoinGameId("");
    } catch (e) {
        Alert.alert("Error", "Could not load game.");
    } finally {
        setIsScanning(false);
    }
  };

  const handleSubmitScore = async () => {
    if (!gameState || !gameState.puzzleId) return;
    await api.submitScore({
        puzzleId: gameState.puzzleId,
        playerName: playerName || "Anonymous",
        timeSeconds: gameState.timer,
        mistakes: gameState.mistakes
    });
    Alert.alert("Success", "Score submitted to leaderboard!");
    fetchLeaderboard(gameState.puzzleId); // Refresh local view if shown
  };

  const fetchLeaderboard = async (puzzleId?: string) => {
    const data = await api.getLeaderboard(puzzleId);
    setLeaderboard(data);
    setShowLeaderboard(true);
  };

  const handleOpenScanner = () => {
    setPhase('SCANNING');
  };

  const handleScanComplete = (detectedGrid: number[][]) => {
    const grid = initializeGrid(detectedGrid);
    const solution = solveSudoku(detectedGrid);
    
    if (!solution) {
        setGameState({
            grid,
            solvedGrid: [],
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
        setPhase('SETUP');
        Alert.alert("Scan Results", "The puzzle was scanned but seems to have errors. Please correct the highlighted numbers in Edit Mode.");
    } else {
        setGameState({
            grid,
            solvedGrid: solution,
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
    }
  };

  const finishSetupAndStart = () => {
    if (!gameState) return;
    const numericGrid = gameState.grid.map(row => row.map(cell => cell.value || 0));
    if (hasInitialConflicts(numericGrid)) {
      setError(t('conflicts'));
      return;
    }
    let solution = gameState.solvedGrid.length === 9 ? gameState.solvedGrid : solveSudoku(numericGrid);
    if (!solution) {
      setError(t('unsolvable'));
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

  const handleOpenSaveModal = () => {
    setIsSaveModalVisible(true);
  };

  const handleSaveGame = async (name: string) => {
    if (!gameState) return;
    try {
      const difficulty = 'MEDIUM'; 
      const save = await saveGame(name, gameState, difficulty);
      setIsSaveModalVisible(false);
      setCurrentSaveId(save.id);
      Alert.alert(t('savedSuccess'));
    } catch (e) {
      Alert.alert("Error", t('errorSave'));
    }
  };

  const handleLoadGame = (game: SavedGame) => {
    setGameState(game.gameState);
    setCurrentSaveId(game.id);
    setPhase('PLAYING');
    setError(null);
  };

  const handleDeleteGame = async (id: string) => {
    try {
      const updatedList = await deleteSavedGame(id);
      setSavedGames(updatedList);
      if (currentSaveId === id) {
        setCurrentSaveId(null);
      }
    } catch (e) {
      Alert.alert("Error", t('errorDelete'));
    }
  };

  const handleDeleteCurrentAndHome = async () => {
    if (currentSaveId) {
      await handleDeleteGame(currentSaveId);
    }
    setGameState(null);
    setPhase('HOME');
  };

  const handleRetry = () => {
    if (!gameState) return;
    const initialGrid = JSON.parse(JSON.stringify(gameState.history[0]));
    setGameState(prev => prev ? ({
        ...prev,
        grid: initialGrid,
        mistakes: 0,
        isGameOver: false,
        isWon: false,
        timer: 0,
        history: [initialGrid]
    }) : null);
  };
  
  const handleNumberInput = (num: number) => {
    setGameState(prev => {
      if (!prev || !prev.selectedCell || prev.isGameOver || prev.isWon) return prev;
      const [r, c] = prev.selectedCell;
      const cell = prev.grid[r][c];
      
      if (phase === 'PLAYING' && cell.isInitial) return prev;
      
      const newGrid = JSON.parse(JSON.stringify(prev.grid));
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
        
        // --- REWARD CHECK ---
        if (isCorrect && !gameOver && !won) {
            const completions = checkCompletion(newGrid, r, c, prev.solvedGrid);
            if (completions.length > 0) {
                // Calculate Cell Position
                // Padding Left (16) + Grid Pad (4) + Cols * (Size + Gap) + Spacers
                const x = 16 + 4 + (c * cellSize) + (c * 2) + (Math.floor(c/3) * 4) + (cellSize/2);
                
                // For Y, we need the Grid's PageY. 
                // We'll calculate relative Y then add gridPageY.
                const relY = 4 + (r * cellSize) + (r * 2) + (Math.floor(r/3) * 4) + (cellSize/2);
                const y = gridPageY + relY;

                const newRewards = completions.map((type, i) => ({
                    id: `${Date.now()}-${i}`,
                    type,
                    startPos: { x, y }
                }));
                
                setRewards(prevR => [...prevR, ...newRewards]);
            }
        }
        // --------------------

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
  };

  const handleErase = () => {
    setGameState(prev => {
      if (!prev || !prev.selectedCell || prev.isGameOver || prev.isWon) return prev;
      const [r, c] = prev.selectedCell;
      if (phase === 'PLAYING' && prev.grid[r][c].isInitial) return prev;
      
      const newGrid = JSON.parse(JSON.stringify(prev.grid));
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
      if (prev.grid[r][c].value === prev.solvedGrid[r][c]) return prev;

      const correctValue = prev.solvedGrid[r][c];
      const newGrid = JSON.parse(JSON.stringify(prev.grid));
      newGrid[r][c].value = correctValue;
      newGrid[r][c].isValid = true;
      newGrid[r][c].isInitial = true; 
      newGrid[r][c].isHinted = true; 
      
      const won = isGameWon(newGrid, prev.solvedGrid);
      return { ...prev, grid: newGrid, isWon: won };
    });
  };

  const handleCellClick = (r: number, c: number) => {
    setGameState(prev => {
      if (!prev) return null;
      return { ...prev, selectedCell: [r, c] };
    });
  };

  if (phase === 'SCANNING') {
    return <CameraScanner onClose={() => setPhase('HOME')} onScanComplete={handleScanComplete} />;
  }

  const isGameFinished = phase === 'PLAYING' && (gameState?.isGameOver || gameState?.isWon);
  const containerClass = isDarkMode ? 'bg-zinc-950' : 'bg-slate-50';
  const textClass = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const cardClass = isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100';

  let gridBorderClass = isDarkMode ? 'border-zinc-800' : 'border-slate-800';
  let gridOpacityClass = 'opacity-100';
  
  if (isGameFinished) {
    if (gameState?.isWon) {
        gridBorderClass = 'border-emerald-500';
    } else {
        gridBorderClass = 'border-red-500';
        gridOpacityClass = 'opacity-60 grayscale';
    }
  }

  const getDifficultyLabel = (diff: string) => {
    switch (diff) {
      case 'EASY': return t('easy');
      case 'MEDIUM': return t('medium');
      case 'HARD': return t('hard');
      case 'EXPERT': return t('expert');
      case 'EXTREME': return t('extreme');
      default: return diff;
    }
  };

  return (
    <SafeAreaView className={clsx("flex-1", containerClass)} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View className={clsx("flex-1", containerClass)}>
          
          <View className={clsx("flex-row items-center justify-between px-4 py-2 border-b", isDarkMode ? "border-zinc-800" : "border-slate-100")}>
            <Text className={clsx("text-xl font-black tracking-tight", textClass)}>
              {t('appTitle')}
            </Text>
            <View className="flex-row gap-2">
              {phase === 'PLAYING' && !isGameFinished && (
                <TouchableOpacity onPress={handleOpenSaveModal} className={clsx("p-2 rounded-xl border shadow-sm", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200")}>
                   <Save size={18} color="#3b82f6" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={toggleLanguage} className={clsx("p-2 rounded-xl border shadow-sm flex-row items-center gap-1 px-3", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200")}>
                <Text className="text-[10px] font-black text-slate-500">{language.toUpperCase()}</Text>
              </TouchableOpacity>
              
              <View className={clsx("p-2 rounded-xl border shadow-sm", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200")}>
                {isOnline ? (
                    <Cloud size={18} color="#10b981" />
                ) : (
                    <CloudOff size={18} color="#ef4444" />
                )}
              </View>

              <TouchableOpacity onPress={toggleAnimations} className={clsx("p-2 rounded-xl border shadow-sm", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200")}>
                <Sparkles size={18} color={areAnimationsEnabled ? "#3b82f6" : "#94a3b8"} fill={areAnimationsEnabled ? "#3b82f6" : "none"} />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleColorScheme} className={clsx("p-2 rounded-xl border shadow-sm", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200")}>
                {isDarkMode ? <Sun size={18} color="#94a3b8" /> : <Moon size={18} color="#94a3b8" />}
              </TouchableOpacity>
              {phase !== 'HOME' && (
                <TouchableOpacity onPress={() => { setGameState(null); setPhase('HOME'); setError(null); }} className={clsx("p-2 rounded-xl border shadow-sm", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200")}>
                  <X size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View className="flex-1">
            {phase === 'HOME' ? (
               <View className="flex-1 items-center justify-center p-6 space-y-6">
                 <View className={clsx("w-full rounded-[2.5rem] p-6 shadow-xl border items-center space-y-6", cardClass)}>
                   <View className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl items-center justify-center">
                     <Camera size={40} color={isDarkMode ? "#60a5fa" : "#2563eb"} strokeWidth={2.5} />
                   </View>
                   <View className="items-center">
                      <Text className={clsx("text-xl font-black", textClass)}>{t('ready')}</Text>
                      <Text className="text-slate-500 text-xs font-medium">{t('subtitle')}</Text>
                   </View>
                   
                   <View className="w-full gap-3">
                     <TouchableOpacity onPress={() => setPhase('DIFFICULTY_SELECT')} className="w-full py-4 bg-blue-600 dark:bg-blue-700 rounded-2xl flex-row items-center justify-center gap-2">
                       <PlusCircle size={18} color="white" />
                       <Text className="text-white font-black text-base">{t('createNew')}</Text>
                     </TouchableOpacity>

                     <View className="flex-row gap-3">
                       <TouchableOpacity onPress={() => setShowJoinModal(true)} className={clsx("flex-1 py-4 border-2 rounded-2xl items-center gap-1", isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-slate-100")}>
                          <DownloadCloud size={20} color="#10b981" />
                          <Text className={clsx("text-[10px] uppercase font-bold", textClass)}>Join Game</Text>
                       </TouchableOpacity>
                       
                       <TouchableOpacity onPress={() => fetchLeaderboard()} className={clsx("flex-1 py-4 border-2 rounded-2xl items-center gap-1", isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-slate-100")}>
                          <Trophy size={20} color="#f59e0b" />
                          <Text className={clsx("text-[10px] uppercase font-bold", textClass)}>Rankings</Text>
                       </TouchableOpacity>
                     </View>

                     <View className="flex-row items-center gap-3">
                       <View className={clsx("flex-1 h-px", isDarkMode ? "bg-zinc-800" : "bg-slate-100")} />
                       <Text className="text-[9px] font-black uppercase text-slate-300 tracking-widest">{t('tools')}</Text>
                       <View className={clsx("flex-1 h-px", isDarkMode ? "bg-zinc-800" : "bg-slate-100")} />
                     </View>

                     <View className="flex-row gap-3">
                        <TouchableOpacity onPress={() => setPhase('LOAD_GAME')} className={clsx("flex-1 py-4 border-2 rounded-2xl items-center gap-1", isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-slate-100")}>
                          <FolderOpen size={20} color="#eab308" />
                          <Text className={clsx("text-[10px] uppercase font-bold", textClass)}>{t('loadGame')}</Text>
                        </TouchableOpacity>

                       <TouchableOpacity 
                        onPress={() => Alert.alert(t('comingSoon'), t('subtitle'))} 
                        className={clsx("flex-1 py-4 border-2 rounded-2xl items-center gap-1 opacity-40", isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-slate-100")}
                       >
                          <Camera size={20} className="text-blue-500" color="#3b82f6" />
                          <Text className={clsx("text-[10px] uppercase font-bold", textClass)}>{t('scanImage')}</Text>
                       </TouchableOpacity>
                       
                       <TouchableOpacity onPress={startManualSetup} className={clsx("flex-1 py-4 border-2 rounded-2xl items-center gap-1", isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-slate-100")}>
                          <Keyboard size={20} color="#94a3b8" />
                          <Text className={clsx("text-[10px] uppercase font-bold", textClass)}>{t('manual')}</Text>
                       </TouchableOpacity>
                     </View>
                   </View>
                 </View>
               </View>
            ) : phase === 'LOAD_GAME' ? (
              <View className="flex-1 p-6">
                <SavedGamesList 
                  games={savedGames} 
                  onLoad={handleLoadGame} 
                  onDelete={handleDeleteGame} 
                  isDarkMode={isDarkMode}
                  onClose={() => setPhase('HOME')}
                />
              </View>
            ) : phase === 'DIFFICULTY_SELECT' ? (
             <View className="flex-1 items-center justify-center p-6">
               <View className={clsx("w-full rounded-[2rem] p-6 shadow-xl border space-y-4", cardClass)}>
                  <View className="flex-row items-center justify-between mb-2">
                    <TouchableOpacity onPress={() => setPhase('HOME')}>
                      <ChevronLeft size={24} color="#94a3b8" />
                    </TouchableOpacity>
                    <Text className={clsx("text-lg font-black", textClass)}>{t('difficulty')}</Text>
                    <View className="w-8" />
                  </View>
                  <View className="gap-2">
                    {(['EASY', 'MEDIUM', 'HARD', 'EXPERT', 'EXTREME'] as Difficulty[]).map((d) => (
                      <TouchableOpacity key={d} onPress={() => handleDifficultySelect(d)} className={clsx("w-full py-4 px-6 rounded-2xl flex-row items-center justify-between border border-transparent", isDarkMode ? "bg-zinc-800/50" : "bg-slate-50")}>
                        <Text className={clsx("font-bold capitalize", textClass)}>{getDifficultyLabel(d)}</Text>
                        <Sparkles size={16} color="#60a5fa" />
                      </TouchableOpacity>
                    ))}
                  </View>
               </View>
             </View>
            ) : (
              <View className="flex-1 flex-col">
                {phase === 'PLAYING' && (
                  <View className={clsx("mx-4 mb-3 p-3 rounded-2xl shadow-sm border flex-col gap-2", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-100")}>
                      {/* Top Row: ID and Toggle */}
                      <View className="flex-row justify-between items-center border-b border-dashed border-slate-200 dark:border-zinc-800 pb-2 mb-1">
                          <View className="flex-row items-center gap-1">
                             <Users size={12} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                             <Text className="text-[10px] font-mono text-slate-500">
                                {gameState?.puzzleId ? gameState.puzzleId : "Local Game"}
                             </Text>
                          </View>
                          <TouchableOpacity 
                            onPress={() => setGameState(p => p ? ({ ...p, settings: { ...p.settings, autoCheck: !p.settings.autoCheck } }) : null)} 
                            className="flex-row items-center gap-1"
                          >
                            <Text className={clsx("text-[8px] font-black uppercase", gameState!.settings.autoCheck ? "text-blue-500" : "text-slate-400")}>
                              {t('assist')} {gameState!.settings.autoCheck ? 'ON' : 'OFF'}
                            </Text>
                          </TouchableOpacity>
                      </View>

                      {/* Bottom Row: Stats */}
                      <View className="flex-row justify-between items-center">
                          <View className="flex-col">
                            <Text className="text-[8px] text-slate-400 font-black uppercase">{t('mistakes')}</Text>
                            <Text className={clsx("text-base font-black", gameState!.mistakes >= gameState!.maxMistakes ? 'text-red-500' : textClass)}>
                              {gameState!.mistakes}/{gameState!.maxMistakes}
                            </Text>
                          </View>
                          <View className="flex-col items-center">
                            <Text className="text-[8px] text-slate-400 font-black uppercase">{t('time')}</Text>
                            <Text className={clsx("text-base font-mono font-black", textClass)}>
                              {Math.floor(gameState!.timer / 60).toString().padStart(2, '0')}:{(gameState!.timer % 60).toString().padStart(2, '0')}
                            </Text>
                          </View>
                          <View className="w-8" /> {/* Spacer for balance */}
                      </View>
                  </View>
                )}

                {phase === 'SETUP' && (
                    <View className="mx-4 bg-blue-600 p-3 rounded-2xl mb-3 flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <Keyboard size={20} color="white" />
                        <Text className="text-[10px] font-black uppercase text-white">{t('editMode')}</Text>
                      </View>
                      <TouchableOpacity onPress={finishSetupAndStart} className="bg-white px-4 py-1.5 rounded-xl">
                        <Text className="text-blue-600 font-black text-xs">{t('start')}</Text>
                      </TouchableOpacity>
                    </View>
                )}

                {error && (
                  <View className="mx-4 mb-3 p-2 bg-red-50 rounded-xl border border-red-100 flex-row items-center gap-2">
                    <AlertCircle size={14} color="#dc2626" />
                    <Text className="text-red-600 text-[10px] font-bold">{error}</Text>
                  </View>
                )}

                <View className="items-center justify-center flex-1 px-4">
                    <View 
                        ref={gridRef}
                        onLayout={() => {
                            gridRef.current?.measure((x, y, w, h, pageX, pageY) => {
                                setGridPageY(pageY);
                            });
                        }}
                        className={clsx("w-full aspect-square rounded-2xl p-1", isDarkMode ? "bg-zinc-950" : "bg-slate-100", gridBorderClass, gridOpacityClass)}
                    >
                      <View className="flex-1 flex-col gap-[2px]">
                        {gameState!.grid.map((row, r) => (
                          <React.Fragment key={r}>
                            <View className="flex-1 flex-row gap-[2px]">
                                {row.map((cell, c) => (
                                  <React.Fragment key={`${r}-${c}`}>
                                      <GridCell 
                                        cell={cell} 
                                        row={r} 
                                        col={c} 
                                        isSelected={!isGameFinished && gameState!.selectedCell?.[0] === r && gameState!.selectedCell?.[1] === c} 
                                        isHighlighted={!isGameFinished && gameState!.selectedCell && (gameState!.selectedCell[0] === r || gameState!.selectedCell[1] === c || (Math.floor(r / 3) === Math.floor(gameState!.selectedCell[0] / 3) && Math.floor(c / 3) === Math.floor(gameState!.selectedCell[1] / 3)))} 
                                        isSameNumber={!isGameFinished && gameState!.selectedCell && gameState!.grid[gameState!.selectedCell[0]][gameState!.selectedCell[1]].value === cell.value && cell.value !== null} 
                                        isConflict={gameState!.settings.autoCheck && cell.value !== null && getConflicts(gameState!.grid, r, c)} 
                                        onClick={() => handleCellClick(r, c)}
                                        isDarkMode={isDarkMode}
                                        animationsEnabled={areAnimationsEnabled}
                                        style={{ width: cellSize, height: cellSize }}
                                      />
                                      {(c + 1) % 3 === 0 && c !== 8 && <View className="w-1 flex-none" />}
                                  </React.Fragment>
                                ))}
                            </View>
                            {(r + 1) % 3 === 0 && r !== 8 && <View className="h-1 flex-none" />}
                          </React.Fragment>
                        ))}
                      </View>
                    </View>
                </View>

                <View className="mt-4">
                    {isGameFinished ? (
                      <View className={clsx("mx-4 rounded-[2rem] p-4 shadow-xl border", cardClass)}>
                        <View className="flex-row items-center justify-between mb-4">
                           <View className="flex-row items-center gap-3">
                             <View className={clsx("w-12 h-12 rounded-xl items-center justify-center", gameState!.isWon ? 'bg-emerald-100' : 'bg-rose-100')}>
                               {gameState!.isWon ? <Trophy size={28} color="#059669" /> : <X size={28} color="#e11d48" />}
                             </View>
                             <View>
                               <Text className={clsx("text-lg font-black", textClass)}>{gameState!.isWon ? t('legendary') : t('nextTime')}</Text>
                               <Text className="text-[10px] text-slate-500 font-bold uppercase">{t('gameComplete')}</Text>
                             </View>
                           </View>
                        </View>
                        
                        {gameState!.isWon && gameState!.puzzleId && (
                           <View className="bg-slate-50 dark:bg-zinc-800 p-3 rounded-xl mb-4">
                              <Text className={clsx("text-[10px] font-bold uppercase mb-2", isDarkMode ? "text-slate-400" : "text-slate-500")}>Submit Score</Text>
                              <View className="flex-row gap-2">
                                <TextInput 
                                    className={clsx("flex-1 px-3 py-2 rounded-lg text-sm font-bold border", isDarkMode ? "bg-zinc-900 border-zinc-700 text-white" : "bg-white border-slate-200 text-slate-900")}
                                    placeholder="Enter Name"
                                    placeholderTextColor={isDarkMode ? "#52525b" : "#cbd5e1"}
                                    value={playerName}
                                    onChangeText={setPlayerName}
                                />
                                <TouchableOpacity onPress={handleSubmitScore} className="bg-blue-600 px-4 justify-center rounded-lg">
                                    <Share2 size={16} color="white" />
                                </TouchableOpacity>
                              </View>
                              <Text className="text-[9px] text-slate-400 mt-1">ID: {gameState!.puzzleId}</Text>
                           </View>
                        )}

                        <View className="flex-row gap-2 justify-end">
                              {!gameState!.isWon && (
                                <TouchableOpacity onPress={handleRetry} className={clsx("px-3 py-3 rounded-xl items-center justify-center", isDarkMode ? "bg-blue-900/30" : "bg-blue-100")}>
                                  <RotateCcw size={18} color="#2563eb" />
                                </TouchableOpacity>
                              )}
                              
                              {currentSaveId && gameState?.isWon && (
                                  <TouchableOpacity onPress={handleDeleteCurrentAndHome} className={clsx("px-3 py-3 rounded-xl items-center justify-center", isDarkMode ? "bg-red-900/30" : "bg-red-100")}>
                                    <Trash2 size={18} color="#ef4444" />
                                  </TouchableOpacity>
                              )}
                              
                              <TouchableOpacity onPress={() => { setGameState(null); setPhase('HOME'); }} className={clsx("px-5 py-3 rounded-xl justify-center", isDarkMode ? "bg-zinc-100" : "bg-slate-900")}>
                                  <Text className={clsx("font-black text-xs", isDarkMode ? "text-zinc-950" : "text-white")}>{t('home')}</Text>
                              </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <ControlPanel 
                        onNumberClick={handleNumberInput} 
                        onErase={handleErase} 
                        onUndo={handleUndo} 
                        onHint={handleHint} 
                        isNoteMode={gameState!.isNoteMode} 
                        toggleNoteMode={() => setGameState(p => p ? ({ ...p, isNoteMode: !p.isNoteMode }) : null)} 
                        numberCounts={getNumberCounts(gameState!.grid)}
                        isDarkMode={isDarkMode}
                      />
                    )}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* --- MODALS --- */}
        
        <Modal visible={showJoinModal} transparent animationType="fade">
            <View className="flex-1 bg-black/50 items-center justify-center p-6">
                <View className={clsx("w-full rounded-3xl p-6", isDarkMode ? "bg-zinc-900" : "bg-white")}>
                    <Text className={clsx("text-lg font-black mb-4", textClass)}>Join Game</Text>
                    <TextInput 
                        className={clsx("w-full px-4 py-3 rounded-xl text-base font-bold border mb-4", isDarkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                        placeholder="Paste Puzzle ID (e.g. MEDIUM-123...)"
                        placeholderTextColor={isDarkMode ? "#52525b" : "#94a3b8"}
                        value={joinGameId}
                        onChangeText={setJoinGameId}
                    />
                    <View className="flex-row gap-3">
                        <TouchableOpacity onPress={() => setShowJoinModal(false)} className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-zinc-800 items-center">
                            <Text className={clsx("font-bold", textClass)}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleJoinGame} className="flex-1 py-3 rounded-xl bg-blue-600 items-center">
                            <Text className="font-bold text-white">Join</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

        <Modal visible={showLeaderboard} animationType="slide" presentationStyle="pageSheet">
            <View className={clsx("flex-1 p-6", isDarkMode ? "bg-zinc-950" : "bg-white")}>
                <View className="flex-row items-center justify-between mb-6">
                    <Text className={clsx("text-2xl font-black", textClass)}>Leaderboard</Text>
                    <TouchableOpacity onPress={() => setShowLeaderboard(false)} className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-full">
                        <X size={20} color={isDarkMode ? "white" : "black"} />
                    </TouchableOpacity>
                </View>
                {leaderboard.length === 0 ? (
                    <Text className="text-slate-500 text-center mt-10">No scores yet.</Text>
                ) : (
                    <FlatList 
                        data={leaderboard}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item, index }) => (
                            <View className={clsx("flex-row items-center justify-between p-4 mb-2 rounded-xl border", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-slate-50 border-slate-100")}>
                                <View className="flex-row items-center gap-3">
                                    <Text className="font-black text-slate-400 w-6">#{index + 1}</Text>
                                    <View>
                                        <Text className={clsx("font-bold", textClass)}>{item.playerName}</Text>
                                        <Text className="text-[10px] text-slate-500 font-mono">ID: {item.puzzleId.substring(0, 15)}...</Text>
                                    </View>
                                </View>
                                <View className="items-end">
                                    <Text className={clsx("font-black text-emerald-500")}>
                                        {Math.floor(item.timeSeconds / 60)}:{(item.timeSeconds % 60).toString().padStart(2, '0')}
                                    </Text>
                                    <Text className="text-[10px] text-slate-400">{item.mistakes} mistakes</Text>
                                </View>
                            </View>
                        )}
                    />
                )}
            </View>
        </Modal>

        <SaveModal 
          isVisible={isSaveModalVisible} 
          onClose={() => setIsSaveModalVisible(false)} 
          onSave={handleSaveGame} 
          isDarkMode={isDarkMode} 
        />

        <RewardOverlay 
            rewards={rewards} 
            onRemove={(id) => setRewards(prev => prev.filter(r => r.id !== id))} 
        />
        
      </SafeAreaView>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
