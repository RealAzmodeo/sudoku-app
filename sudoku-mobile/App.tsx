import React, { useState, useEffect, useRef } from 'react';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
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
  CloudOff,
  Copy,
  ClipboardPaste,
  User,
  Settings as SettingsIcon,
  Pause,
  Play as PlayIcon,
  Volume2,
  VolumeX,
  Languages,
  Image as ImageIcon
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
import { saveGame, getSavedGames, deleteSavedGame, SavedGame, autoSaveGame, getAutoSave, lockPuzzle, isPuzzleLocked } from './utils/storage';
import { LanguageProvider, useLanguage } from './utils/i18n';
import { api } from './utils/api';
import { GridCell } from './components/GridCell';
import { ControlPanel } from './components/ControlPanel';
import { SaveModal } from './components/SaveModal';
import { SavedGamesList } from './components/SavedGamesList';
import { CameraScanner } from './components/CameraScanner';
import { RewardOverlay } from './components/RewardOverlay';
import clsx from 'clsx';
import "./global.css";
import { useColorScheme } from "nativewind";

type AppPhase = 'HOME' | 'PLAY_MENU' | 'CREATE_MENU' | 'DIFFICULTY_SELECT' | 'SETUP' | 'PLAYING' | 'LOAD_GAME' | 'SCANNING' | 'COMMUNITY' | 'RANKINGS';

const AppContent = () => {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const { width } = useWindowDimensions();
  const isDarkMode = colorScheme === 'dark';

  // Calculate Cell Size
  const totalDeductions = 32 + 8 + 20 + 8;
  const cellSize = Math.floor((width - totalDeductions) / 9);

  const [phase, setPhase] = useState<AppPhase>('HOME');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing grid...");
  const [error, setError] = useState<string | null>(null);
  
  // New UI/UX State
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [areAnimationsEnabled, setAreAnimationsEnabled] = useState(true);

  // Backend & User State
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [tempName, setTempName] = useState("");

  const [joinGameId, setJoinGameId] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [communityPuzzles, setCommunityPuzzles] = useState<any[]>([]);
  
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [currentSaveId, setCurrentSaveId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  // Rewards State
  const [rewards, setRewards] = useState<{ id: string, type: string, startPos: {x:number, y:number} }[]>([]);
  const gridRef = useRef<View>(null);
  const [gridPageY, setGridPageY] = useState(0);

  const { t, language, setLanguage } = useLanguage();
  const toggleLanguage = () => setLanguage(language === 'en' ? 'es' : 'en');

  // --- INITIAL LOAD & ONBOARDING ---
  useEffect(() => {
    const loadUser = async () => {
        const name = await AsyncStorage.getItem('sudoku_username');
        const sound = await AsyncStorage.getItem('settings_sound');
        const anim = await AsyncStorage.getItem('settings_anim');
        
        if (name) setCurrentUser(name);
        else setShowOnboarding(true);
        
        if (sound !== null) setIsSoundEnabled(sound === 'true');
        if (anim !== null) setAreAnimationsEnabled(anim === 'true');
    };
    loadUser();
  }, []);

  const handleSaveUser = async () => {
      if(tempName.trim().length > 0) {
          await AsyncStorage.setItem('sudoku_username', tempName.trim());
          setCurrentUser(tempName.trim());
          setShowOnboarding(false);
      } else {
          Alert.alert("Name Required", "Please enter a name to play.");
      }
  };

  const persistSettings = async (key: string, val: boolean) => {
      await AsyncStorage.setItem(key, val.toString());
  };

  // --- ONLINE CHECK & SYNC LOOP ---
  useEffect(() => {
    const checkConnection = async () => {
        const healthy = await api.checkHealth();
        setIsOnline(healthy);
        if (healthy) {
            await api.syncPendingData();
        }
    };
    
    checkConnection(); 
    const interval = setInterval(checkConnection, 10000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval: any;
    if (phase === 'PLAYING' && gameState && !gameState.isGameOver && !gameState.isWon && !isPaused && !showSettings) {
      interval = setInterval(() => {
        setGameState(prev => {
            if(!prev) return null;
            return { ...prev, timer: prev.timer + 1 };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase, gameState?.isGameOver, gameState?.isWon, isPaused, showSettings]);

  useEffect(() => {
    if (phase === 'LOAD_GAME') {
      loadSavedGamesList();
    }
    if (phase === 'COMMUNITY') {
        fetchCommunityPuzzles();
    }
  }, [phase]);

  const fetchCommunityPuzzles = async () => {
      const list = await api.getCommunityPuzzles();
      setCommunityPuzzles(list);
  };

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
        const uniqueId = `${difficulty}-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;
        
        api.savePuzzle(uniqueId, initialGrid, solvedGrid, difficulty, currentUser || "Anonymous");

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

  const handleJoinGame = async (idToJoin?: string) => {
    const id = idToJoin || joinGameId.trim();
    if (!id) return;
    
    const locked = await isPuzzleLocked(id);
    if (locked) {
        setIsScanning(true);
        setLoadingMessage("Fetching Stats...");
        await fetchLeaderboard(id);
        setIsScanning(false);
        return;
    }

    const progress = await getAutoSave(id);
    if (progress) {
        setGameState(progress);
        setPhase('PLAYING');
        setShowJoinModal(false);
        return;
    }

    setIsScanning(true);
    setLoadingMessage("Fetching Puzzle...");
    try {
        const puzzle = await api.getPuzzle(id);
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
        playerName: currentUser || "Anonymous",
        timeSeconds: gameState.timer,
        mistakes: gameState.mistakes
    });
    Alert.alert("Success", "Score submitted to leaderboard!");
    fetchLeaderboard(gameState.puzzleId); 
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
    const scannedId = `SCANNED-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;

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
        Alert.alert("Scan Results", "The puzzle was scanned but seems to have errors or is unsolvable. Please correct it in Edit Mode.");
    } else {
        api.savePuzzle(scannedId, detectedGrid, solution, "SCANNED", currentUser || "Anonymous");

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
            settings: { autoCheck: true },
            puzzleId: scannedId 
        });
        
        setPhase('PLAYING');
        Alert.alert("Puzzle Ready!", "ID: " + scannedId + "\nShare this ID with your family to play the same board.");
    }
  };

  const finishSetupAndStart = async () => {
    if (!gameState) return;
    const numericGrid = gameState.grid.map(row => row.map(cell => cell.value || 0));
    if (hasInitialConflicts(numericGrid)) {
      setError(t('conflicts'));
      return;
    }
    
    let solution = solveSudoku(numericGrid);
    if (!solution) {
      setError(t('unsolvable'));
      return;
    }

    setLoadingMessage("Uploading Custom Puzzle...");
    setIsScanning(true);

    try {
        const customId = `CUSTOM-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;
        const initialGridValues = gameState.grid.map(row => row.map(cell => cell.value || 0));
        await api.savePuzzle(customId, initialGridValues, solution, "CUSTOM", currentUser || "Anonymous");

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
            history: [JSON.parse(JSON.stringify(finalGrid))],
            puzzleId: customId 
          };
        });
        
        setPhase('PLAYING');
        setError(null);
        Alert.alert("Success", "Custom puzzle created! Share the ID: " + customId);

    } catch (e) {
        Alert.alert("Error", "Could not upload puzzle. You can play locally but cannot share it.");
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
              history: [JSON.parse(JSON.stringify(finalGrid))],
              puzzleId: undefined 
            };
        });
        setPhase('PLAYING');
    } finally {
        setIsScanning(false);
    }
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

  const handleQuitGame = () => {
    Alert.alert(
      "Abandonar Partida",
      "¿Seguro que quieres ir al inicio? Perderás el progreso actual.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Abandonar", 
          style: "destructive", 
          onPress: () => {
            setShowSettings(false);
            setGameState(null);
            setPhase('HOME');
            setError(null);
          }
        }
      ]
    );
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
      if (!prev || !prev.selectedCell || prev.isGameOver || prev.isWon || isPaused) return prev;
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
                const x = 16 + 4 + (c * cellSize) + (c * 2) + (Math.floor(c/3) * 4) + (cellSize/2);
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

        const newState = {
          ...prev,
          grid: newGrid,
          mistakes,
          isGameOver: gameOver,
          isWon: won,
          history: [...prev.history, JSON.parse(JSON.stringify(newGrid))]
        };

        if (prev.puzzleId) {
            autoSaveGame(prev.puzzleId, newState);
            if (gameOver || won) lockPuzzle(prev.puzzleId);
        }

        return newState;
      }
    });
  };

  const handleErase = () => {
    setGameState(prev => {
      if (!prev || !prev.selectedCell || prev.isGameOver || prev.isWon || isPaused) return prev;
      const [r, c] = prev.selectedCell;
      if (phase === 'PLAYING' && prev.grid[r][c].isInitial) return prev;
      
      const newGrid = JSON.parse(JSON.stringify(prev.grid));
      newGrid[r][c].value = null;
      newGrid[r][c].notes = [];
      newGrid[r][c].isValid = true;
      if (phase === 'SETUP') newGrid[r][c].isInitial = false;
      
      const newState = { ...prev, grid: newGrid };
      if (prev.puzzleId && phase === 'PLAYING') autoSaveGame(prev.puzzleId, newState);
      
      return newState;
    });
  };

  const handleUndo = () => {
    setGameState(prev => {
      if (!prev || prev.history.length <= 1 || isPaused) return prev;
      const newHistory = [...prev.history];
      newHistory.pop();
      const lastState = newHistory[newHistory.length - 1];
      return { ...prev, grid: JSON.parse(JSON.stringify(lastState)), history: newHistory };
    });
  };

  const handleHint = () => {
    if (phase === 'SETUP' || isPaused) return;
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
    if(isPaused) return;
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
    if (gameState?.isWon) gridBorderClass = 'border-emerald-500';
    else {
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

  const NavHeader = ({ title, onBack }: { title: string, onBack: () => void }) => (
    <View className={clsx("flex-row items-center justify-between px-4 py-4 border-b mb-4", isDarkMode ? "border-zinc-800" : "border-slate-100")}>
        <TouchableOpacity onPress={onBack} className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-xl">
            <ChevronLeft size={20} color={isDarkMode ? "white" : "black"} />
        </TouchableOpacity>
        <Text className={clsx("text-xl font-black", textClass)}>{title}</Text>
        <View className="w-10" />
    </View>
  );

  return (
    <SafeAreaView className={clsx("flex-1", containerClass)} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View className={clsx("flex-1", containerClass)}>
          
          <View className={clsx("flex-row items-center justify-between px-4 py-2 border-b", isDarkMode ? "border-zinc-800" : "border-slate-100")}>
            <View className="flex-row items-center gap-2">
                <View className={clsx("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500" : "bg-red-500")} />
                <Text className={clsx("text-xs font-black tracking-tight", textClass)}>
                {t('appTitle')}
                </Text>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => setShowSettings(true)} className={clsx("p-2 rounded-xl border shadow-sm", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200")}>
                <SettingsIcon size={18} color={isDarkMode ? "#94a3b8" : "#64748b"} />
              </TouchableOpacity>
              
              {phase !== 'HOME' && phase !== 'PLAYING' && (
                <TouchableOpacity onPress={() => { setGameState(null); setPhase('HOME'); setError(null); }} className={clsx("p-2 rounded-xl border shadow-sm", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200")}>
                  <X size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View className="flex-1">
            {phase === 'HOME' ? (
               <View className="flex-1 items-center justify-center p-6">
                 <View className={clsx("w-full rounded-[2.5rem] p-8 shadow-2xl border items-center space-y-8", cardClass)}>
                   <View className="w-24 h-24 bg-blue-600 rounded-[2rem] items-center justify-center shadow-xl shadow-blue-500/30">
                     <PlusCircle size={48} color="white" strokeWidth={2.5} />
                   </View>
                   
                   <View className="items-center">
                      <Text className={clsx("text-3xl font-black", textClass)}>{t('ready')}</Text>
                      <Text className="text-slate-500 text-sm font-medium mt-1">{currentUser ? `Hi, ${currentUser}!` : t('subtitle')}</Text>
                   </View>
                   
                   <View className="w-full gap-4">
                     <TouchableOpacity 
                        onPress={() => setPhase('PLAY_MENU')} 
                        className="w-full py-5 bg-blue-600 active:bg-blue-500 rounded-[1.5rem] flex-row items-center justify-center gap-3 shadow-lg shadow-blue-900/40"
                     >
                       <PlayIcon size={24} color="white" fill="white" />
                       <Text className="text-white font-black text-xl">Comenzar Partida</Text>
                     </TouchableOpacity>

                     <TouchableOpacity 
                        onPress={() => setPhase('CREATE_MENU')} 
                        className={clsx("w-full py-5 border-2 rounded-[1.5rem] flex-row items-center justify-center gap-3", isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-slate-200")}
                     >
                       <PlusCircle size={24} color={isDarkMode ? "white" : "#2563eb"} />
                       <Text className={clsx("font-black text-xl", textClass)}>Crear Sudoku</Text>
                     </TouchableOpacity>

                     <View className="flex-row gap-4 mt-2">
                        <TouchableOpacity 
                            onPress={() => setPhase('RANKINGS')}
                            className={clsx("flex-1 py-4 rounded-2xl items-center justify-center gap-1", isDarkMode ? "bg-zinc-800/50" : "bg-slate-100")}
                        >
                            <Trophy size={20} color="#f59e0b" />
                            <Text className={clsx("text-[10px] font-black uppercase", textClass)}>Rankings</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            onPress={() => setPhase('LOAD_GAME')}
                            className={clsx("flex-1 py-4 rounded-2xl items-center justify-center gap-1", isDarkMode ? "bg-zinc-800/50" : "bg-slate-100")}
                        >
                            <FolderOpen size={20} color="#eab308" />
                            <Text className={clsx("text-[10px] font-black uppercase", textClass)}>My Saves</Text>
                        </TouchableOpacity>
                     </View>
                   </View>
                 </View>
               </View>
            ) : phase === 'PLAY_MENU' ? (
                <View className="flex-1 p-6">
                    <NavHeader title="Jugar" onBack={() => setPhase('HOME')} />
                    <View className="gap-4">
                        <TouchableOpacity 
                            onPress={() => setPhase('DIFFICULTY_SELECT')}
                            className={clsx("p-6 rounded-3xl border flex-row items-center gap-4", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-100 shadow-sm")}
                        >
                            <View className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl items-center justify-center">
                                <Sparkles size={24} color="#3b82f6" />
                            </View>
                            <View>
                                <Text className={clsx("text-lg font-black", textClass)}>Partida Aleatoria</Text>
                                <Text className="text-xs text-slate-500">Genera un reto nuevo al instante</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={() => setPhase('COMMUNITY')}
                            className={clsx("p-6 rounded-3xl border flex-row items-center gap-4", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-100 shadow-sm")}
                        >
                            <View className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl items-center justify-center">
                                <Globe size={24} color="#10b981" />
                            </View>
                            <View>
                                <Text className={clsx("text-lg font-black", textClass)}>Community Sudoku</Text>
                                <Text className="text-xs text-slate-500">Puzzles creados por la familia</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : phase === 'CREATE_MENU' ? (
                <View className="flex-1 p-6">
                    <NavHeader title="Crear" onBack={() => setPhase('HOME')} />
                    <View className="gap-4">
                        <TouchableOpacity 
                            onPress={handleOpenScanner}
                            className={clsx("p-6 rounded-3xl border flex-row items-center gap-4", isDarkMode ? "bg-blue-600" : "bg-blue-600 shadow-lg")}
                        >
                            <View className="w-12 h-12 bg-white/20 rounded-2xl items-center justify-center">
                                <Camera size={24} color="white" />
                            </View>
                            <View>
                                <Text className="text-lg font-black text-white">Escanear (IA)</Text>
                                <Text className="text-xs text-blue-100">Usa tu cámara o galería</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            onPress={startManualSetup}
                            className={clsx("p-6 rounded-3xl border flex-row items-center gap-4", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-100 shadow-sm")}
                        >
                            <View className="w-12 h-12 bg-slate-100 dark:bg-zinc-800 rounded-2xl items-center justify-center">
                                <Keyboard size={24} color="#64748b" />
                            </View>
                            <View>
                                <Text className={clsx("text-lg font-black", textClass)}>Creación Manual</Text>
                                <Text className="text-xs text-slate-500">Escribe el puzzle tú mismo</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : phase === 'COMMUNITY' ? (
                <View className="flex-1 p-6 pt-2">
                    <NavHeader title="Community" onBack={() => setPhase('PLAY_MENU')} />
                    {communityPuzzles.length === 0 ? (
                        <View className="flex-1 items-center justify-center">
                            <ActivityIndicator size="large" color="#3b82f6" />
                            <Text className="text-slate-400 mt-4">Buscando puzzles familiares...</Text>
                        </View>
                    ) : (
                        <FlatList 
                            data={communityPuzzles}
                            keyExtractor={(item) => item.id}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    onPress={() => handleJoinGame(item.id)}
                                    className={clsx("p-4 mb-3 rounded-2xl border flex-row items-center justify-between", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-100 shadow-sm")}
                                >
                                    <View className="flex-1">
                                        <View className="flex-row items-center gap-2 mb-1">
                                            <Text className={clsx("font-black text-base capitalize", 
                                                item.difficulty === 'EASY' ? 'text-emerald-500' :
                                                item.difficulty === 'MEDIUM' ? 'text-blue-500' :
                                                item.difficulty === 'HARD' ? 'text-amber-500' :
                                                item.difficulty === 'SCANNED' ? 'text-purple-500' : 'text-rose-500'
                                            )}>
                                                {item.difficulty}
                                            </Text>
                                            <Text className="text-[10px] text-slate-400 font-mono">
                                                {new Date(item.createdAt).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center gap-1.5">
                                            <User size={12} color="#94a3b8" />
                                            <Text className={clsx("text-xs font-bold", textClass)}>
                                                Por {item.author || "Anónimo"}
                                            </Text>
                                        </View>
                                    </View>
                                    <ChevronLeft size={20} color="#3b82f6" style={{ transform: [{ rotate: '180deg' }]}} />
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            ) : phase === 'RANKINGS' ? (
                <View className="flex-1 p-6">
                    <NavHeader title="Rankings" onBack={() => setPhase('HOME')} />
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <TouchableOpacity onPress={() => fetchLeaderboard()} className="p-6 bg-amber-500 rounded-3xl flex-row items-center gap-4 mb-4">
                            <Trophy size={32} color="white" />
                            <View>
                                <Text className="text-white text-lg font-black">Global Family Ranking</Text>
                                <Text className="text-amber-100 text-xs">Quién es el mejor en la familia</Text>
                            </View>
                        </TouchableOpacity>
                        <Text className="text-slate-400 font-black uppercase text-[10px] mb-4 mt-2">Próximamente: Ranking por mes</Text>
                    </ScrollView>
                </View>
            ) : phase === 'LOAD_GAME' ? (
              <View className="flex-1 p-6">
                <NavHeader title="Mis Partidas" onBack={() => setPhase('HOME')} />
                <SavedGamesList 
                  games={savedGames} 
                  onLoad={handleLoadGame} 
                  onDelete={handleDeleteGame} 
                  isDarkMode={isDarkMode}
                  onClose={() => setPhase('HOME')}
                />
              </View>
            ) : phase === 'DIFFICULTY_SELECT' ? (
             <View className="flex-1 p-6">
               <NavHeader title="Dificultad" onBack={() => setPhase('PLAY_MENU')} />
               <View className="gap-3">
                    {(['EASY', 'MEDIUM', 'HARD', 'EXPERT', 'EXTREME'] as Difficulty[]).map((d) => (
                      <TouchableOpacity key={d} onPress={() => handleDifficultySelect(d)} className={clsx("w-full py-5 px-6 rounded-2xl flex-row items-center justify-between border", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-100 shadow-sm")}>
                        <Text className={clsx("text-lg font-bold capitalize", textClass)}>{getDifficultyLabel(d)}</Text>
                        <Sparkles size={20} color="#60a5fa" />
                      </TouchableOpacity>
                    ))}
               </View>
             </View>
            ) : (
              <View className="flex-1 flex-col">
                {phase === 'PLAYING' && (
                  <View className={clsx("mx-4 mt-2 mb-3 p-3 rounded-2xl shadow-sm border flex-row items-center justify-between", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-100")}>
                      <View className="flex-row items-center gap-4">
                          <TouchableOpacity onPress={() => setIsPaused(true)} className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                             <Pause size={20} color="#3b82f6" fill="#3b82f6" />
                          </TouchableOpacity>
                          <View>
                            <Text className="text-[8px] text-slate-400 font-black uppercase">{t('time')}</Text>
                            <Text className={clsx("text-lg font-mono font-black", textClass)}>
                              {Math.floor(gameState!.timer / 60).toString().padStart(2, '0')}:{(gameState!.timer % 60).toString().padStart(2, '0')}
                            </Text>
                          </View>
                      </View>

                      <View className="flex-row items-center gap-6">
                          <View className="items-center">
                            <Text className="text-[8px] text-slate-400 font-black uppercase">{t('mistakes')}</Text>
                            <Text className={clsx("text-lg font-black", gameState!.mistakes >= gameState!.maxMistakes ? 'text-red-500' : textClass)}>
                              {gameState!.mistakes}/{gameState!.maxMistakes}
                            </Text>
                          </View>
                          <TouchableOpacity 
                            onPress={async () => {
                                if(gameState?.puzzleId) {
                                    await Clipboard.setStringAsync(gameState.puzzleId);
                                    Alert.alert("Copiado!", "ID del puzzle copiado. ¡Pásalo a la familia!");
                                }
                            }}
                            className="p-2 bg-slate-50 dark:bg-zinc-800 rounded-xl"
                          >
                             <Share2 size={18} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                          </TouchableOpacity>
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

                <View className="items-center justify-center flex-1 px-4 relative">
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

                    {/* PAUSE OVERLAY */} 
                    {(isPaused || showSettings) && phase === 'PLAYING' && !isGameFinished && (
                        <View style={{position:'absolute', top:0, left:0, right:0, bottom:0}} className="rounded-2xl overflow-hidden items-center justify-center z-50">
                            <BlurView intensity={100} tint={isDarkMode ? 'dark' : 'light'} style={{position:'absolute', top:0, left:0, right:0, bottom:0}} />
                            {!showSettings && (
                                <>
                                    <TouchableOpacity 
                                        onPress={() => setIsPaused(false)}
                                        className="bg-blue-600 w-20 h-20 rounded-full items-center justify-center shadow-2xl shadow-blue-900"
                                    >
                                        <PlayIcon size={32} color="white" fill="white" />
                                    </TouchableOpacity>
                                    <Text className={clsx("mt-4 text-xl font-black", textClass)}>PAUSA</Text>
                                </>
                            )}
                        </View>
                    )}
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
                                <View className={clsx("flex-1 px-3 py-2 rounded-lg border flex-row items-center gap-2", isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-slate-200")}>
                                    <User size={14} color="#94a3b8" />
                                    <Text className={clsx("text-sm font-bold", textClass)}>{currentUser || "Anonymous"}</Text>
                                </View>
                                <TouchableOpacity onPress={handleSubmitScore} className="bg-blue-600 px-4 justify-center rounded-lg">
                                    <Share2 size={16} color="white" />
                                </TouchableOpacity>
                              </View>
                              <Text className="text-[9px] text-slate-400 mt-1">Puzzle: {gameState!.puzzleId.substring(0, 20)}...</Text>
                           </View>
                        )}

                        <View className="flex-row gap-2 justify-end">
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

        {/* SETTINGS MODAL */} 
        <Modal visible={showSettings} animationType="slide" transparent>
            <View className="flex-1 bg-black/60 justify-end">
                <View className={clsx("w-full h-[80%] rounded-t-[3rem] p-8", isDarkMode ? "bg-zinc-900" : "bg-white")}>
                    <View className="flex-row items-center justify-between mb-8">
                        <Text className={clsx("text-3xl font-black", textClass)}>Settings</Text>
                        <TouchableOpacity onPress={() => setShowSettings(false)} className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-full">
                            <X size={24} color={isDarkMode ? "white" : "black"} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} className="space-y-6">
                        {/* Appearance */} 
                        <View className="mb-6">
                            <Text className="text-slate-400 font-black uppercase text-[10px] mb-3 ml-1">Appearance</Text>
                            <TouchableOpacity onPress={toggleColorScheme} className={clsx("flex-row items-center justify-between p-5 rounded-2xl", isDarkMode ? "bg-zinc-800" : "bg-slate-50")}>
                                <View className="flex-row items-center gap-3">
                                    {isDarkMode ? <Moon size={20} color="#60a5fa" /> : <Sun size={20} color="#f59e0b" />}
                                    <Text className={clsx("font-bold text-base", textClass)}>Dark Mode</Text>
                                </View>
                                <View className={clsx("w-12 h-6 rounded-full p-1", isDarkMode ? "bg-blue-600 items-end" : "bg-slate-300 items-start")}>
                                    <View className="w-4 h-4 bg-white rounded-full" />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Game Audio */} 
                        <View className="mb-6">
                            <Text className="text-slate-400 font-black uppercase text-[10px] mb-3 ml-1">Audio & Effects</Text>
                            <TouchableOpacity onPress={() => { setIsSoundEnabled(!isSoundEnabled); persistSettings('settings_sound', !isSoundEnabled); }} className={clsx("flex-row items-center justify-between p-5 rounded-2xl mb-2", isDarkMode ? "bg-zinc-800" : "bg-slate-50")}>
                                <View className="flex-row items-center gap-3">
                                    {isSoundEnabled ? <Volume2 size={20} color="#3b82f6" /> : <VolumeX size={20} color="#ef4444" />}
                                    <Text className={clsx("font-bold text-base", textClass)}>Sound Effects</Text>
                                </View>
                                <View className={clsx("w-12 h-6 rounded-full p-1", isSoundEnabled ? "bg-blue-600 items-end" : "bg-slate-300 items-start")}>
                                    <View className="w-4 h-4 bg-white rounded-full" />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => { setAreAnimationsEnabled(!areAnimationsEnabled); persistSettings('settings_anim', !areAnimationsEnabled); }} className={clsx("flex-row items-center justify-between p-5 rounded-2xl", isDarkMode ? "bg-zinc-800" : "bg-slate-50")}>
                                <View className="flex-row items-center gap-3">
                                    <Sparkles size={20} color="#a855f7" />
                                    <Text className={clsx("font-bold text-base", textClass)}>VFX Animations</Text>
                                </View>
                                <View className={clsx("w-12 h-6 rounded-full p-1", areAnimationsEnabled ? "bg-blue-600 items-end" : "bg-slate-300 items-start")}>
                                    <View className="w-4 h-4 bg-white rounded-full" />
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Language */} 
                        <View className="mb-6">
                            <Text className="text-slate-400 font-black uppercase text-[10px] mb-3 ml-1">Language</Text>
                            <TouchableOpacity onPress={toggleLanguage} className={clsx("flex-row items-center justify-between p-5 rounded-2xl", isDarkMode ? "bg-zinc-800" : "bg-slate-50")}>
                                <View className="flex-row items-center gap-3">
                                    <Languages size={20} color="#10b981" />
                                    <Text className={clsx("font-bold text-base", textClass)}>{language === 'en' ? 'English' : 'Español'}</Text>
                                </View>
                                <Text className="text-blue-500 font-black">CHANGE</Text>
                            </TouchableOpacity>
                        </View>

                        {/* User */} 
                        <View className="mb-6">
                            <Text className="text-slate-400 font-black uppercase text-[10px] mb-3 ml-1">Account</Text>
                            <View className={clsx("p-5 rounded-2xl flex-row items-center justify-between", isDarkMode ? "bg-zinc-800" : "bg-slate-50")}>
                                <View className="flex-row items-center gap-3">
                                    <User size={20} color="#64748b" />
                                    <Text className={clsx("font-bold text-base", textClass)}>{currentUser}</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowOnboarding(true)}>
                                    <Text className="text-blue-500 font-bold">Edit</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Game Actions */}
                        {phase === 'PLAYING' && (
                            <View className="mb-6">
                                <Text className="text-slate-400 font-black uppercase text-[10px] mb-3 ml-1">Partida</Text>
                                <TouchableOpacity 
                                    onPress={handleQuitGame}
                                    className={clsx("flex-row items-center justify-between p-5 rounded-2xl", isDarkMode ? "bg-red-900/20" : "bg-red-50")}
                                >
                                    <View className="flex-row items-center gap-3">
                                        <RotateCcw size={20} color="#ef4444" />
                                        <Text className="font-bold text-base text-red-500">Abandonar Partida</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
        
        <Modal visible={showJoinModal} transparent animationType="fade">
            <View className="flex-1 bg-black/50 items-center justify-center p-6">
                <View className={clsx("w-full rounded-3xl p-6", isDarkMode ? "bg-zinc-900" : "bg-white")}>
                    <Text className={clsx("text-lg font-black mb-4", textClass)}>Join Game</Text>
                    
                    <View className="flex-row gap-2 mb-4">
                        <TextInput 
                            className={clsx("flex-1 px-4 py-3 rounded-xl text-base font-bold border", isDarkMode ? "bg-zinc-950 border-zinc-800 text-white" : "bg-slate-50 border-slate-200 text-slate-900")}
                            placeholder="Paste Puzzle ID..."
                            placeholderTextColor={isDarkMode ? "#52525b" : "#94a3b8"}
                            value={joinGameId}
                            onChangeText={setJoinGameId}
                        />
                        <TouchableOpacity 
                            onPress={async () => {
                                const text = await Clipboard.getStringAsync();
                                setJoinGameId(text);
                            }}
                            className={clsx("px-4 items-center justify-center rounded-xl border", isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-slate-100 border-slate-200")}
                        >
                            <ClipboardPaste size={20} color={isDarkMode ? "white" : "black"} />
                        </TouchableOpacity>
                    </View>

                    <View className="flex-row gap-3">
                        <TouchableOpacity onPress={() => setShowJoinModal(false)} className="flex-1 py-3 rounded-xl bg-slate-200 dark:bg-zinc-800 items-center">
                            <Text className={clsx("font-bold", textClass)}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleJoinGame()} className="flex-1 py-3 rounded-xl bg-blue-600 items-center">
                            <Text className="font-bold text-white">Join</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

        <Modal visible={showLeaderboard} animationType="slide" presentationStyle="pageSheet">
            <View className={clsx("flex-1 p-6 pt-12", isDarkMode ? "bg-zinc-950" : "bg-white")}>
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
                            <View className={clsx("flex-row items-center justify-between p-4 mb-2 rounded-xl border", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-50 shadow-sm")}
                            >
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

        <Modal visible={showOnboarding} animationType="fade" transparent={false}>
            <SafeAreaView className="flex-1 bg-slate-900 items-center justify-center p-8">
                <View className="items-center mb-10">
                    <View className="w-24 h-24 bg-blue-600 rounded-3xl items-center justify-center mb-6 shadow-xl shadow-blue-500/20">
                        <User size={48} color="white" />
                    </View>
                    <Text className="text-3xl font-black text-white text-center mb-2">Welcome!</Text>
                    <Text className="text-slate-400 text-center text-lg">What should we call you?</Text>
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="w-full">
                    <TextInput 
                        className="w-full bg-slate-800 border border-slate-700 p-5 rounded-2xl text-white text-xl font-bold text-center mb-6"
                        placeholder="Your Name"
                        placeholderTextColor="#64748b"
                        value={tempName}
                        onChangeText={setTempName}
                        autoFocus
                    />
                    <TouchableOpacity 
                        onPress={handleSaveUser}
                        className={clsx("w-full py-5 rounded-2xl items-center shadow-lg", tempName.trim().length > 0 ? "bg-blue-600" : "bg-slate-700")}
                        disabled={tempName.trim().length === 0}
                    >
                        <Text className={clsx("font-black text-lg", tempName.trim().length > 0 ? "text-white" : "text-slate-500")}>
                            Let's Play!
                        </Text>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </SafeAreaView>
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