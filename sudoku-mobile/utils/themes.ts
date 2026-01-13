export type ThemeName = 'light' | 'dark' | 'vintage' | 'girly' | 'solar' | 'jungle';

export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  primary: string;
  accent: string;
  border: string;
  cellBgA: string; // Lighter block
  cellBgB: string; // Darker block (checkerboard)
  cellText: string;
  cellSelected: string;
  cellHighlight: string;
  error: string;
  success: string;
}

export const themes: Record<ThemeName, ThemeColors> = {
  light: {
    background: '#f8fafc', // slate-50
    card: '#ffffff',
    text: '#0f172a', // slate-900
    textSecondary: '#64748b', // slate-500
    primary: '#2563eb', // blue-600
    accent: '#f59e0b', // amber-500
    border: '#e2e8f0', // slate-200
    cellBgA: '#ffffff',
    cellBgB: '#f1f5f9', // slate-100 (Subtle difference)
    cellText: '#0f172a',
    cellSelected: '#bfdbfe', // blue-200
    cellHighlight: '#eff6ff', // blue-50
    error: '#ef4444',
    success: '#10b981',
  },
  dark: {
    background: '#09090b', // zinc-950
    card: '#18181b', // zinc-900
    text: '#f1f5f9', // slate-100
    textSecondary: '#94a3b8', // slate-400
    primary: '#3b82f6', // blue-500
    accent: '#fbbf24', // amber-400
    border: '#27272a', // zinc-800
    cellBgA: '#18181b',
    cellBgB: '#27272a', // zinc-800 (Subtle difference)
    cellText: '#f1f5f9',
    cellSelected: '#1e3a8a', // blue-900
    cellHighlight: '#172554', // blue-950
    error: '#f87171',
    success: '#34d399',
  },
  vintage: {
    background: '#fef3c7', // warm beige
    card: '#fffbeb', // lighter beige
    text: '#451a03', // dark brown
    textSecondary: '#92400e', // amber-800
    primary: '#059669', // emerald-600 (retro green)
    accent: '#dc2626', // red-600
    border: '#d97706', // amber-600
    cellBgA: '#fffbeb',
    cellBgB: '#fde68a', // amber-200
    cellText: '#451a03',
    cellSelected: '#a7f3d0', // emerald-200
    cellHighlight: '#d1fae5', // emerald-100
    error: '#b91c1c',
    success: '#047857',
  },
  girly: {
    background: '#fff1f2', // rose-50
    card: '#ffffff',
    text: '#881337', // rose-900
    textSecondary: '#fb7185', // rose-400
    primary: '#ec4899', // purple-500
    accent: '#f472b6', // pink-400
    border: '#fbcfe8', // pink-200
    cellBgA: '#ffffff',
    cellBgB: '#fff1f2', // rose-50
    cellText: '#881337',
    cellSelected: '#fbcfe8', // pink-200
    cellHighlight: '#fce7f3', // pink-100
    error: '#e11d48',
    success: '#10b981',
  },
  solar: {
    background: '#2a221b', // Very dark brown
    card: '#451a03', // Dark amber/brown
    text: '#fef3c7', // Amber-100
    textSecondary: '#d97706', // Amber-600
    primary: '#f59e0b', // Amber-500 (Solar Gold)
    accent: '#fbbf24', // Amber-400
    border: '#78350f', // Amber-900
    cellBgA: '#451a03',
    cellBgB: '#2a221b',
    cellText: '#fef3c7',
    cellSelected: '#78350f',
    cellHighlight: '#92400e',
    error: '#ef4444',
    success: '#10b981',
  },
  jungle: {
    background: '#022c22', // emerald-950
    card: '#064e3b', // emerald-900
    text: '#ecfdf5', // emerald-50
    textSecondary: '#6ee7b7', // emerald-300
    primary: '#ef4444', // red-500 (Exotic flower)
    accent: '#facc15', // yellow-400 (Sun)
    border: '#065f46', // emerald-800
    cellBgA: '#064e3b',
    cellBgB: '#022c22', 
    cellText: '#ecfdf5',
    cellSelected: '#047857', // emerald-700
    cellHighlight: '#065f46',
    error: '#f87171',
    success: '#34d399',
  }
};
