import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import ConfettiCannon from 'react-native-confetti-cannon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
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
import {
  Trophy,
  X,
  Keyboard,
  Moon,
  Sun,
  PlusCircle,
  Sparkles,
  ChevronLeft,
  FolderOpen,
  RotateCcw,
  Globe,
  Share2,
  Users,
  User,
  Settings as SettingsIcon,
  Pause,
  Play as PlayIcon,
  Volume2,
  VolumeX,
  Languages
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
import {
  saveGame, 
  getSavedGames, 
  deleteSavedGame, 
  SavedGame, 
  autoSaveGame, 
  getAutoSave, 
  lockPuzzle, 
  isPuzzleLocked,
  setActiveGameId,
  getActiveGameId,
  clearActiveGameId,
  getLocalPuzzleStatuses
} from './utils/storage';
import { LanguageProvider, useLanguage } from './utils/i18n';
import { api } from './utils/api';
import { GridCellMemo } from './components/GridCell';
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

  const totalDeductions = 32 + 8 + 20 + 8;
  const cellSize = Math.floor((width - totalDeductions) / 9);

  const [phase, setPhase] = useState<AppPhase>('HOME');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing...");
  const [error, setError] = useState<string | null>(null);
  
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [areHapticsEnabled, setAreHapticsEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [areAnimationsEnabled, setAreAnimationsEnabled] = useState(true);

  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [tempName, setTempName] = useState("");

  const [joinGameId, setJoinGameId] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [communityPuzzles, setCommunityPuzzles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'NEW' | 'STARTED' | 'COMPLETED'>('ALL');
  const [localStatuses, setLocalStatuses] = useState<Record<string, 'STARTED' | 'COMPLETED'>>({});
  
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [currentSaveId, setCurrentSaveId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);

  const [rewards, setRewards] = useState<{ id: string, type: string, startPos: {x:number, y:number} }[]>([]);
  const gridRef = useRef<View>(null);
  const confettiRef = useRef<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [gridPageY, setGridPageY] = useState(0);

  const { t, language, setLanguage } = useLanguage();
  const toggleLanguage = () => setLanguage(language === 'en' ? 'es' : 'en');

  const playSound = useCallback(async (type: 'click' | 'mistake' | 'win') => {
      if (!isAudioEnabled) return;
      // Audio logic here
  }, [isAudioEnabled]);

  useEffect(() => {
    const loadData = async () => {
        const name = await AsyncStorage.getItem('sudoku_username');
        const haptics = await AsyncStorage.getItem('settings_haptics');
        const audio = await AsyncStorage.getItem('settings_audio');
        const anim = await AsyncStorage.getItem('settings_anim');
        if (name) setCurrentUser(name); else setShowOnboarding(true);
        if (haptics !== null) setAreHapticsEnabled(haptics === 'true');
        if (audio !== null) setIsAudioEnabled(audio === 'true');
        if (anim !== null) setAreAnimationsEnabled(anim === 'true');

        const activeId = await getActiveGameId();
        if (activeId) {
            const autoSave = await getAutoSave(activeId);
            if (autoSave && !autoSave.isGameOver && !autoSave.isWon) {
                setGameState(autoSave);
                setPhase('PLAYING');
                setIsPaused(true); 
            } else { await clearActiveGameId(); }
        }
    };
    loadData();
  }, []);

  const handleSaveUser = async () => {
      if(tempName.trim().length > 0) {
          const newName = tempName.trim();
          if (currentUser && currentUser !== newName) await api.updateAuthorName(currentUser, newName);
          await AsyncStorage.setItem('sudoku_username', newName);
          setCurrentUser(newName);
          setShowOnboarding(false);
      } else Alert.alert("Name Required", "Please enter a name to play.");
  };

  const persistSettings = async (key: string, val: boolean) => { await AsyncStorage.setItem(key, val.toString()); };

  useEffect(() => {
    const checkConnection = async () => {
        const healthy = await api.checkHealth();
        setIsOnline(healthy);
        if (healthy) await api.syncPendingData();
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
            const newTimer = prev.timer + 1;
            if (newTimer % 5 === 0 && prev.puzzleId) autoSaveGame(prev.puzzleId, { ...prev, timer: newTimer });
            return { ...prev, timer: newTimer };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase, isPaused, showSettings, gameState?.isGameOver, gameState?.isWon]);

  useEffect(() => {
    if (phase === 'LOAD_GAME') loadSavedGamesList();
    if (phase === 'COMMUNITY') fetchCommunityPuzzles();
  }, [phase]);

  const fetchCommunityPuzzles = async () => {
      const [list, localStatusMap] = await Promise.all([api.getCommunityPuzzles(), getLocalPuzzleStatuses()]);
      setCommunityPuzzles(list.map((p: any) => ({
          ...p,
          status: p.userCompleted === 1 ? 'COMPLETED' : (localStatusMap[p.id] === 'STARTED' ? 'STARTED' : 'NEW')
      })));
  };

  const loadSavedGamesList = async () => { setSavedGames(await getSavedGames()); };

  const handleDifficultySelect = async (difficulty: Difficulty) => {
    setIsScanning(true);
    setLoadingMessage(t('generating'));
    setTimeout(async () => {
      try {
        const { initialGrid, solvedGrid } = generateSudoku(difficulty);
        const grid = initializeGrid(initialGrid);
        const uniqueId = `${difficulty}-${Date.now().toString().slice(-6)}`;
        api.savePuzzle(uniqueId, initialGrid, solvedGrid, difficulty, currentUser || "Anonymous");
        await setActiveGameId(uniqueId);
        setGameState({
          grid, solvedGrid, mistakes: 0, maxMistakes: 3, isGameOver: false, isWon: false,
          selectedCell: [0, 0], isNoteMode: false, timer: 0, history: [JSON.parse(JSON.stringify(grid))],
          settings: { autoCheck: true }, puzzleId: uniqueId
        });
        setPhase('PLAYING');
        setCurrentSaveId(null);
        setError(null);
      } catch (err) { setError("Failed to generate puzzle."); } finally { setIsScanning(false); }
    }, 100);
  };

  const handleJoinGame = async (idToJoin?: string) => {
    const id = idToJoin || joinGameId.trim();
    if (!id) return;
    const locked = await isPuzzleLocked(id);
    if (locked) {
        setIsScanning(true); setLoadingMessage("Fetching Stats...");
        await fetchLeaderboard(id); setIsScanning(false); return;
    }
    const progress = await getAutoSave(id);
    if (progress) { setGameState(progress); await setActiveGameId(id); setPhase('PLAYING'); setShowJoinModal(false); return; }
    setIsScanning(true); setLoadingMessage("Fetching Puzzle...");
    try {
        const puzzle = await api.getPuzzle(id);
        if (!puzzle) { Alert.alert("Error", "Puzzle ID not found."); setIsScanning(false); return; }
        const grid = initializeGrid(puzzle.initialGrid);
        await setActiveGameId(puzzle.id);
        setGameState({
          grid, solvedGrid: puzzle.solvedGrid, mistakes: 0, maxMistakes: 3, isGameOver: false, isWon: false,
          selectedCell: [0, 0], isNoteMode: false, timer: 0, history: [JSON.parse(JSON.stringify(grid))],
          settings: { autoCheck: true }, puzzleId: puzzle.id
        });
        setPhase('PLAYING'); setShowJoinModal(false); setJoinGameId("");
    } catch (e) { Alert.alert("Error", "Could not load game."); } finally { setIsScanning(false); }
  };

  const handleSubmitScore = async () => {
    if (!gameState || !gameState.puzzleId) return;
    await api.submitScore({ puzzleId: gameState.puzzleId, playerName: currentUser || "Anonymous", timeSeconds: gameState.timer, mistakes: gameState.mistakes });
    Alert.alert("Success", "Score submitted!");
    fetchLeaderboard(gameState.puzzleId); 
  };

  const fetchLeaderboard = async (puzzleId?: string) => {
    const data = await api.getLeaderboard(puzzleId);
    setLeaderboard(data);
    setShowLeaderboard(true);
  };

  const handleScanComplete = (detectedGrid: number[][]) => {
    const grid = initializeGrid(detectedGrid);
    const solution = solveSudoku(detectedGrid);
    const scannedId = `SCANNED-${Date.now().toString().slice(-6)}`;
    if (!solution) {
        setGameState({ grid, solvedGrid: [], mistakes: 0, maxMistakes: 3, isGameOver: false, isWon: false, selectedCell: [0, 0], isNoteMode: false, timer: 0, history: [JSON.parse(JSON.stringify(grid))], settings: { autoCheck: true } });
        setPhase('SETUP');
    } else {
        api.savePuzzle(scannedId, detectedGrid, solution, "SCANNED", currentUser || "Anonymous");
        setActiveGameId(scannedId);
        setGameState({ grid, solvedGrid: solution, mistakes: 0, maxMistakes: 3, isGameOver: false, isWon: false, selectedCell: [0, 0], isNoteMode: false, timer: 0, history: [JSON.parse(JSON.stringify(grid))], settings: { autoCheck: true }, puzzleId: scannedId });
        setPhase('PLAYING');
    }
  };

  const startManualSetup = () => {
    const empty = createEmptyGrid();
    setGameState({ grid: empty, solvedGrid: [], mistakes: 0, maxMistakes: 3, isGameOver: false, isWon: false, selectedCell: [0, 0], isNoteMode: false, timer: 0, history: [JSON.parse(JSON.stringify(empty))], settings: { autoCheck: true } });
    setPhase('SETUP');
  };

  const handleQuitGame = () => {
    Alert.alert("Abandonar Partida", "¿Seguro que quieres ir al inicio?", [{ text: "Cancelar", style: "cancel" }, { text: "Abandonar", style: "destructive", onPress: async () => { await clearActiveGameId(); setShowSettings(false); setGameState(null); setPhase('HOME'); } }]);
  };

  const handleNumberInput = useCallback((num: number) => {
    setGameState(prev => {
      if (!prev || !prev.selectedCell || prev.isGameOver || prev.isWon || isPaused) return prev;
      const [r, c] = prev.selectedCell;
      if (phase === 'PLAYING' && prev.grid[r][c].isInitial) return prev;
      const newGrid = JSON.parse(JSON.stringify(prev.grid));
      const targetCell = newGrid[r][c];
      if (phase === 'SETUP') {
        targetCell.value = targetCell.value === num ? null : num;
        targetCell.isInitial = targetCell.value !== null;
        return { ...prev, grid: newGrid };
      }
      if (prev.isNoteMode) {
        if (targetCell.value !== null) return prev;
        const notes = [...targetCell.notes];
        const index = notes.indexOf(num);
        if (index > -1) notes.splice(index, 1); else notes.push(num);
        targetCell.notes = notes.sort();
        return { ...prev, grid: newGrid };
      } else {
        if (targetCell.value === num) return prev;
        const isCorrect = checkIsValid(r, c, num, prev.solvedGrid);
        targetCell.value = num; targetCell.notes = [];
        let mistakes = prev.mistakes;
        if (prev.settings.autoCheck) {
          targetCell.isValid = isCorrect;
          if (!isCorrect) {
              mistakes += 1;
              if (areHapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              playSound('mistake');
          } else {
              if (areHapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              playSound('click');
          }
        }
        const gameOver = mistakes >= prev.maxMistakes;
        const won = !gameOver && isGameWon(newGrid, prev.solvedGrid);
        if (isCorrect && !gameOver && !won) {
            const comps = checkCompletion(newGrid, r, c, prev.solvedGrid);
            if (comps.length > 0) {
                const x = 16 + 4 + (c * cellSize) + (c * 2) + (Math.floor(c/3) * 4) + (cellSize/2);
                const y = gridPageY + 4 + (r * cellSize) + (r * 2) + (Math.floor(r/3) * 4) + (cellSize/2);
                setRewards(prevR => [...prevR, ...comps.map((type, i) => ({ id: `${Date.now()}-${i}`, type, startPos: { x, y } }))]);
            }
        }
        if (won) {
            if (areHapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            playSound('win');
            setTimeout(() => confettiRef.current?.start(), 100);
        }
        const newState = { ...prev, grid: newGrid, mistakes, isGameOver: gameOver, isWon: won, history: [...prev.history, JSON.parse(JSON.stringify(newGrid))] };
        if (prev.puzzleId) {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            if (gameOver || won) { autoSaveGame(prev.puzzleId, newState); lockPuzzle(prev.puzzleId); clearActiveGameId(); }
            else { saveTimeoutRef.current = setTimeout(() => autoSaveGame(prev.puzzleId!, newState), 1000); }
        }
        return newState;
      }
    });
  }, [phase, isPaused, areHapticsEnabled, playSound, gridPageY, cellSize]);

  const handleCellClick = useCallback((r: number, c: number) => {
    if(isPaused) return;
    if (areHapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGameState(prev => prev ? ({ ...prev, selectedCell: [r, c] }) : null);
  }, [isPaused, areHapticsEnabled]);

  const containerClass = isDarkMode ? 'bg-zinc-950' : 'bg-slate-50';
  const textClass = isDarkMode ? 'text-slate-100' : 'text-slate-900';

  return (
    <SafeAreaProvider>
    <SafeAreaView className={clsx("flex-1", containerClass)} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View className="flex-1">
          <View className={clsx("flex-row items-center justify-between px-4 py-2 border-b", isDarkMode ? "border-zinc-800" : "border-slate-100")}>
            <View className="flex-row items-center gap-2">
                <View className={clsx("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500" : "bg-red-500")} />
                <Text className={clsx("text-xs font-black tracking-tight", textClass)}>{t('appTitle')}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowSettings(true)} className={clsx("p-2 rounded-xl border", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200")}>
                <SettingsIcon size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View className="flex-1">
            {phase === 'HOME' ? (
               <View className="flex-1 flex-col justify-between px-8 py-16">
                   <View className="items-start mt-8">
                      <View className="w-20 h-20 bg-blue-600 rounded-[2rem] items-center justify-center mb-8 shadow-2xl shadow-blue-500/40">
                         <PlusCircle size={40} color="white" strokeWidth={2.5} />
                      </View>
                      <Text className={clsx("text-5xl font-black leading-tight tracking-tighter", textClass)}>{t('ready')}</Text>
                      <Text className="text-slate-500 text-xl font-medium mt-2">{currentUser ? `Hi, ${currentUser}!` : t('subtitle')}</Text>
                   </View>
                   <View className="w-full gap-6">
                     <TouchableOpacity onPress={() => setPhase('PLAY_MENU')} className="w-full py-8 bg-blue-600 active:bg-blue-500 rounded-[2.5rem] flex-row items-center justify-center gap-4 shadow-2xl shadow-blue-900/50">
                       <PlayIcon size={32} color="white" fill="white" />
                       <Text className="text-white font-black text-3xl tracking-tight">JUGAR</Text>
                     </TouchableOpacity>
                     <TouchableOpacity onPress={() => setPhase('CREATE_MENU')} className={clsx("w-full py-6 border-2 rounded-[2.5rem] flex-row items-center justify-center gap-3", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200")}>
                       <PlusCircle size={28} color="#2563eb" />
                       <Text className={clsx("font-black text-2xl", textClass)}>Crear Sudoku</Text>
                     </TouchableOpacity>
                   </View>
                   <View className="flex-row gap-4 mb-4">
                        <TouchableOpacity onPress={() => setPhase('RANKINGS')} className={clsx("flex-1 py-6 rounded-[2rem] items-center justify-center gap-2", isDarkMode ? "bg-zinc-900 border border-zinc-800" : "bg-white border border-slate-100 shadow-sm")}>
                            <Trophy size={28} color="#f59e0b" />
                            <Text className={clsx("text-xs font-black uppercase tracking-widest", textClass)}>Rankings</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setPhase('LOAD_GAME')} className={clsx("flex-1 py-6 rounded-[2rem] items-center justify-center gap-2", isDarkMode ? "bg-zinc-900 border border-zinc-800" : "bg-white border border-slate-100 shadow-sm")}>
                            <FolderOpen size={28} color="#eab308" />
                            <Text className={clsx("text-xs font-black uppercase tracking-widest", textClass)}>Partidas</Text>
                        </TouchableOpacity>
                   </View>
               </View>
            ) : phase === 'COMMUNITY' ? (
                <View className="flex-1 p-6 pt-2">
                    <NavHeader title="Community" onBack={() => setPhase('PLAY_MENU')} />
                    <View className={clsx("mb-2 px-4 py-3 rounded-xl border flex-row items-center gap-3", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200")}>
                        <Globe size={20} color="#94a3b8" />
                        <TextInput className={clsx("flex-1 font-bold text-base", textClass)} placeholder="Buscar por ID, Autor..." value={searchQuery} onChangeText={setSearchQuery} />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mb-4 max-h-10">
                        {(['ALL', 'NEW', 'STARTED', 'COMPLETED'] as const).map(status => (
                            <TouchableOpacity key={status} onPress={() => setFilterStatus(status)} className={clsx("px-4 py-2 rounded-full border", filterStatus === status ? "bg-blue-600 border-blue-600" : isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-200")}>
                                <Text className={clsx("text-xs font-black", filterStatus === status ? "text-white" : textClass)}>{status}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <FlatList 
                        data={communityPuzzles.filter(p => (p.id.toLowerCase().includes(searchQuery.toLowerCase()) || (p.author && p.author.toLowerCase().includes(searchQuery.toLowerCase()))) && (filterStatus === 'ALL' || p.status === filterStatus))}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View className={clsx("p-4 mb-3 rounded-2xl border flex-row items-center justify-between", isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-slate-100 shadow-sm")}>
                                <View className="flex-1 pr-2">
                                    <View className="flex-row items-center gap-2 mb-2">
                                        <Text className="font-black text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">{item.difficulty}</Text>
                                        {item.status !== 'NEW' && <Text className="text-[10px] font-black uppercase text-blue-500">{item.status}</Text>}
                                    </View>
                                    <Text className={clsx("text-base font-black font-mono", textClass)}>{item.id}</Text>
                                    <Text className="text-xs text-slate-500">by {item.author}</Text>
                                </View>
                                <View className="items-end gap-2">
                                    <View className="flex-row items-center gap-1"><Users size={12} color="#64748b" /><Text className={clsx("text-xs font-bold", textClass)}>{item.plays}</Text></View>
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity onPress={() => fetchLeaderboard(item.id)} className="p-2 bg-slate-100 dark:bg-zinc-800 rounded-full"><Trophy size={18} color="#f59e0b" /></TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleJoinGame(item.id)} className="p-2 bg-blue-600 rounded-full"><PlayIcon size={18} color="white" fill="white" /></TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                    />
                </View>
            ) : phase === 'PLAYING' || phase === 'SETUP' ? (
                <View className="flex-1 flex-col">
                    <View className="mx-4 mt-2 mb-3 p-3 rounded-2xl border flex-row items-center justify-between">
                        <TouchableOpacity onPress={() => setIsPaused(true)} className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl"><Pause size={20} color="#3b82f6" /></TouchableOpacity>
                        <Text className={clsx("text-lg font-mono font-black", textClass)}>{Math.floor(gameState!.timer / 60).toString().padStart(2, '0')}:{(gameState!.timer % 60).toString().padStart(2, '0')}</Text>
                        <Text className={clsx("text-lg font-black", textClass)}>{gameState!.mistakes}/{gameState!.maxMistakes}</Text>
                    </View>
                    <View className="items-center justify-center flex-1 px-4 relative">
                        <View ref={gridRef} onLayout={() => gridRef.current?.measure((x,y,w,h,px,py) => setGridPageY(py))} className={clsx("w-full aspect-square rounded-2xl p-1 border-2", isDarkMode ? "bg-zinc-950 border-zinc-800" : "bg-slate-100 border-slate-800")}>
                            <View className="flex-1 flex-col gap-[2px]">
                                {gameState!.grid.map((row, r) => (
                                    <View key={r} className="flex-1 flex-row gap-[2px]">
                                        {row.map((cell, c) => (
                                            <GridCellMemo key={`${r}-${c}`} cell={cell} row={r} col={c} isSelected={gameState!.selectedCell?.[0] === r && gameState!.selectedCell?.[1] === c} isHighlighted={gameState!.selectedCell && (gameState!.selectedCell[0] === r || gameState!.selectedCell[1] === c || (Math.floor(r/3) === Math.floor(gameState!.selectedCell[0]/3) && Math.floor(c/3) === Math.floor(gameState!.selectedCell[1]/3)))} isSameNumber={gameState!.selectedCell && gameState!.grid[gameState!.selectedCell[0]][gameState!.selectedCell[1]].value === cell.value && cell.value !== null} isConflict={gameState!.settings.autoCheck && cell.value !== null && getConflicts(gameState!.grid, r, c)} onClick={() => handleCellClick(r, c)} isDarkMode={isDarkMode} animationsEnabled={areAnimationsEnabled} style={{ width: cellSize, height: cellSize }} />
                                        ))}
                                    </View>
                                ))}
                            </View>
                        </View>
                        {(isPaused || showSettings) && phase === 'PLAYING' && !isGameFinished && (
                            <View style={StyleSheet.absoluteFill} className={clsx("rounded-2xl items-center justify-center z-50", isDarkMode ? "bg-zinc-950" : "bg-slate-50")}>
                                {!showSettings && <TouchableOpacity onPress={() => setIsPaused(false)} className="bg-blue-600 w-20 h-20 rounded-full items-center justify-center shadow-2xl"><PlayIcon size={32} color="white" fill="white" /></TouchableOpacity>}
                            </View>
                        )}
                    </View>
                    <ControlPanel onNumberClick={handleNumberInput} onErase={handleErase} onUndo={handleUndo} onHint={handleHint} isNoteMode={gameState!.isNoteMode} toggleNoteMode={() => setGameState(p => p ? ({ ...p, isNoteMode: !p.isNoteMode }) : null)} numberCounts={getNumberCounts(gameState!.grid)} isDarkMode={isDarkMode} />
                </View>
            ) : (
                <View className="flex-1 p-6">
                    <NavHeader title={phase} onBack={() => setPhase('HOME')} />
                </View>
            )}
          </View>
        </View>

        <Modal visible={showSettings} animationType="slide" transparent>
            <View className="flex-1 bg-black/60 justify-end">
                <View className={clsx("w-full h-[80%] rounded-t-[3rem] p-8", isDarkMode ? "bg-zinc-900" : "bg-white")}>
                    <View className="flex-row items-center justify-between mb-8">
                        <Text className={clsx("text-3xl font-black", textClass)}>Settings</Text>
                        <TouchableOpacity onPress={() => setShowSettings(false)}><X size={24} color={isDarkMode ? "white" : "black"} /></TouchableOpacity>
                    </View>
                    <ScrollView>
                        <TouchableOpacity onPress={toggleColorScheme} className="p-5 bg-slate-100 dark:bg-zinc-800 rounded-2xl mb-4"><Text className={clsx("font-bold", textClass)}>Toggle Theme</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => { setAreHapticsEnabled(!areHapticsEnabled); persistSettings('settings_haptics', !areHapticsEnabled); }} className="p-5 bg-slate-100 dark:bg-zinc-800 rounded-2xl mb-4 flex-row justify-between"><Text className={clsx("font-bold", textClass)}>Haptic Feedback</Text><View className={clsx("w-10 h-5 rounded-full", areHapticsEnabled ? "bg-blue-600" : "bg-slate-300")} /></TouchableOpacity>
                        <TouchableOpacity onPress={() => { setIsAudioEnabled(!isAudioEnabled); persistSettings('settings_audio', !isAudioEnabled); }} className="p-5 bg-slate-100 dark:bg-zinc-800 rounded-2xl mb-4 flex-row justify-between"><Text className={clsx("font-bold", textClass)}>Sound Effects</Text><View className={clsx("w-10 h-5 rounded-full", isAudioEnabled ? "bg-blue-600" : "bg-slate-300")} /></TouchableOpacity>
                        <TouchableOpacity onPress={handleQuitGame} className="p-5 bg-red-100 rounded-2xl"><Text className="text-red-600 font-bold">Abandonar Partida</Text></TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>

        <RewardOverlay rewards={rewards} onRemove={(id) => setRewards(prev => prev.filter(r => r.id !== id))} />
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents="none">
            <ConfettiCannon count={200} origin={{x: width / 2, y: -50}} autoStart={false} ref={confettiRef} fadeOut={true} />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}