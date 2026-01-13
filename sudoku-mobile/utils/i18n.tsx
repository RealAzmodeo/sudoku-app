import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'en' | 'es';

const translations = {
  en: {
    appTitle: 'Famidoku',
    ready: 'Ready to Play?',
    subtitle: 'Scan a board or generate a new challenge.',
    createNew: 'Create New Puzzle',
    tools: 'Tools',
    scanImage: 'Scan Image',
    manualEntry: 'Manual Entry',
    loadGame: 'Load Game',
    difficulty: 'Difficulty',
    mistakes: 'Mistakes',
    time: 'Time',
    assist: 'Assist',
    editMode: 'Edit Mode',
    start: 'START',
    conflicts: 'Conflicts detected!',
    unsolvable: 'Puzzle is unsolvable.',
    gameComplete: 'Game Complete',
    legendary: 'Legendary!',
    nextTime: 'Next Time...',
    home: 'HOME',
    save: 'Save',
    undo: 'Undo',
    erase: 'Erase',
    notes: 'Notes',
    hint: 'Hint',
    saveGameTitle: 'Save Game',
    keepProgress: 'Keep your progress',
    nameSave: 'Name this save',
    cancel: 'Cancel',
    saveBtn: 'Save Game',
    yourSaves: 'Your Saves',
    close: 'Close',
    noSaves: 'No saved games found',
    deleteTitle: 'Delete Save?',
    deleteMsg: 'This action cannot be undone.',
    delete: 'Delete',
    loading: 'Analyzing grid...',
    generating: 'Generating puzzle...',
    featureDisabled: 'Feature Disabled',
    aiDisabled: 'AI Scanning is currently disabled.',
    savedSuccess: 'Game saved successfully!',
    errorSave: 'Could not save game.',
    errorDelete: 'Could not delete save.',
    manual: 'Manual',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    expert: 'Expert',
    extreme: 'Extreme',
    comingSoon: 'Coming Soon!'
  },
  es: {
    appTitle: 'Famidoku',
    ready: '¿Listo para jugar?',
    subtitle: 'Escanea un tablero o crea un reto nuevo.',
    createNew: 'Crear Nuevo Puzzle',
    tools: 'Herramientas',
    scanImage: 'Escanear',
    manualEntry: 'Manual',
    loadGame: 'Cargar',
    difficulty: 'Dificultad',
    mistakes: 'Errores',
    time: 'Tiempo',
    assist: 'Ayuda',
    editMode: 'Modo Edición',
    start: 'JUGAR',
    conflicts: '¡Conflictos detectados!',
    unsolvable: 'El puzzle no tiene solución.',
    gameComplete: 'Juego Terminado',
    legendary: '¡Legendario!',
    nextTime: 'Casi lo tienes...',
    home: 'INICIO',
    save: 'Guardar',
    undo: 'Deshacer',
    erase: 'Borrar',
    notes: 'Notas',
    hint: 'Pista',
    saveGameTitle: 'Guardar Partida',
    keepProgress: 'Guarda tu progreso actual',
    nameSave: 'Nombre de la partida',
    cancel: 'Cancelar',
    saveBtn: 'Guardar',
    yourSaves: 'Tus Partidas',
    close: 'Cerrar',
    noSaves: 'No hay partidas guardadas',
    deleteTitle: '¿Borrar partida?',
    deleteMsg: 'Esta acción no se puede deshacer.',
    delete: 'Borrar',
    loading: 'Analizando...',
    generating: 'Generando puzzle...',
    featureDisabled: 'Función Desactivada',
    aiDisabled: 'El escaneo IA está desactivado.',
    savedSuccess: '¡Partida guardada!',
    errorSave: 'No se pudo guardar.',
    errorDelete: 'No se pudo borrar.',
    manual: 'Manual',
    easy: 'Fácil',
    medium: 'Medio',
    hard: 'Difícil',
    expert: 'Experto',
    extreme: 'Extremo',
    comingSoon: '¡Próximamente!'
  }
};

const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['en']) => string;
}>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    AsyncStorage.getItem('appLanguage').then((lang) => {
      if (lang === 'en' || lang === 'es') {
        setLanguageState(lang);
      }
    });
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem('appLanguage', lang);
  };

  const t = (key: keyof typeof translations['en']) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
