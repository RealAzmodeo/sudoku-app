import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, ThemeName, ThemeColors } from './themes';

interface ThemeContextType {
  themeName: ThemeName;
  colors: ThemeColors;
  setTheme: (name: ThemeName) => void;
  toggleTheme: () => void; // Cycle through themes
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useNativeColorScheme();
  const [themeName, setThemeName] = useState<ThemeName>(systemScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    const loadTheme = async () => {
      const stored = await AsyncStorage.getItem('app_theme');
      if (stored && themes[stored as ThemeName]) {
        setThemeName(stored as ThemeName);
      }
    };
    loadTheme();
  }, []);

  const setTheme = async (name: ThemeName) => {
    setThemeName(name);
    await AsyncStorage.setItem('app_theme', name);
  };

  const toggleTheme = async () => {
    const themeKeys: ThemeName[] = ['light', 'dark', 'vintage', 'girly', 'solar', 'jungle'];
    const currentIndex = themeKeys.indexOf(themeName);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    setTheme(themeKeys[nextIndex]);
  };

  return (
    <ThemeContext.Provider value={{ themeName, colors: themes[themeName], setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
