import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { ThemeColors, DEFAULT_THEME_COLORS } from '../types';

/**
 * Merges partial theme colors with defaults, ensuring no undefined values.
 * Any missing or undefined color falls back to the default.
 */
export function mergeWithDefaults(colors: Partial<ThemeColors> | undefined | null): ThemeColors {
  if (!colors) return DEFAULT_THEME_COLORS;

  return {
    background: colors.background || DEFAULT_THEME_COLORS.background,
    backgroundSecondary: colors.backgroundSecondary || DEFAULT_THEME_COLORS.backgroundSecondary,
    backgroundAccent: colors.backgroundAccent || DEFAULT_THEME_COLORS.backgroundAccent,
    text: colors.text || DEFAULT_THEME_COLORS.text,
    textSecondary: colors.textSecondary || DEFAULT_THEME_COLORS.textSecondary,
    textAccent: colors.textAccent || DEFAULT_THEME_COLORS.textAccent,
    border: colors.border || DEFAULT_THEME_COLORS.border,
    borderStrong: colors.borderStrong || DEFAULT_THEME_COLORS.borderStrong,
    buttonPrimary: colors.buttonPrimary || DEFAULT_THEME_COLORS.buttonPrimary,
    buttonPrimaryText: colors.buttonPrimaryText || DEFAULT_THEME_COLORS.buttonPrimaryText,
    buttonSecondary: colors.buttonSecondary || DEFAULT_THEME_COLORS.buttonSecondary,
    buttonSecondaryText: colors.buttonSecondaryText || DEFAULT_THEME_COLORS.buttonSecondaryText,
    success: colors.success || DEFAULT_THEME_COLORS.success,
    warning: colors.warning || DEFAULT_THEME_COLORS.warning,
    danger: colors.danger || DEFAULT_THEME_COLORS.danger,
    shadow: colors.shadow || DEFAULT_THEME_COLORS.shadow,
  };
}

/**
 * Gets a specific color value with fallback to default.
 * Use this when you need a single color and want to ensure it's never undefined.
 */
export function getColor(colors: Partial<ThemeColors> | undefined | null, key: keyof ThemeColors): string {
  if (!colors || !colors[key]) {
    return DEFAULT_THEME_COLORS[key];
  }
  return colors[key];
}

/**
 * Context value for theme colors management.
 */
interface ThemeColorsContextValue {
  /** Current active theme colors (always complete, never undefined) */
  colors: ThemeColors;
  /** Set colors directly (used when loading a game) - handles undefined/partial */
  setColors: (colors: Partial<ThemeColors> | undefined | null) => void;
  /** Reset to default colors */
  resetColors: () => void;
  /** Whether colors are currently being generated */
  isGenerating: boolean;
  /** Set the generating state */
  setIsGenerating: (generating: boolean) => void;
  /** CSS variables object for inline styles */
  cssVariables: React.CSSProperties;
  /** Get a single color with fallback to default */
  getColor: (key: keyof ThemeColors) => string;
}

const ThemeColorsContext = createContext<ThemeColorsContextValue | undefined>(undefined);

/**
 * Converts ThemeColors to CSS custom properties for use in style attributes.
 */
function colorsToCssVariables(colors: ThemeColors): React.CSSProperties {
  return {
    '--theme-bg': colors.background,
    '--theme-bg-secondary': colors.backgroundSecondary,
    '--theme-bg-accent': colors.backgroundAccent,
    '--theme-text': colors.text,
    '--theme-text-secondary': colors.textSecondary,
    '--theme-text-accent': colors.textAccent,
    '--theme-border': colors.border,
    '--theme-border-strong': colors.borderStrong,
    '--theme-btn-primary': colors.buttonPrimary,
    '--theme-btn-primary-text': colors.buttonPrimaryText,
    '--theme-btn-secondary': colors.buttonSecondary,
    '--theme-btn-secondary-text': colors.buttonSecondaryText,
    '--theme-success': colors.success,
    '--theme-warning': colors.warning,
    '--theme-danger': colors.danger,
    '--theme-shadow': colors.shadow,
  } as React.CSSProperties;
}

/**
 * Applies theme colors to the document root as CSS variables.
 * This allows global access to theme colors via CSS var(--theme-*).
 */
function applyColorsToRoot(colors: ThemeColors): void {
  const root = document.documentElement;
  root.style.setProperty('--theme-bg', colors.background);
  root.style.setProperty('--theme-bg-secondary', colors.backgroundSecondary);
  root.style.setProperty('--theme-bg-accent', colors.backgroundAccent);
  root.style.setProperty('--theme-text', colors.text);
  root.style.setProperty('--theme-text-secondary', colors.textSecondary);
  root.style.setProperty('--theme-text-accent', colors.textAccent);
  root.style.setProperty('--theme-border', colors.border);
  root.style.setProperty('--theme-border-strong', colors.borderStrong);
  root.style.setProperty('--theme-btn-primary', colors.buttonPrimary);
  root.style.setProperty('--theme-btn-primary-text', colors.buttonPrimaryText);
  root.style.setProperty('--theme-btn-secondary', colors.buttonSecondary);
  root.style.setProperty('--theme-btn-secondary-text', colors.buttonSecondaryText);
  root.style.setProperty('--theme-success', colors.success);
  root.style.setProperty('--theme-warning', colors.warning);
  root.style.setProperty('--theme-danger', colors.danger);
  root.style.setProperty('--theme-shadow', colors.shadow);

  // Also update body background and text color for immediate visual effect
  document.body.style.backgroundColor = colors.background;
  document.body.style.color = colors.text;
}

interface ThemeColorsProviderProps {
  children: ReactNode;
  /** Initial colors (optional, defaults to DEFAULT_THEME_COLORS) */
  initialColors?: ThemeColors;
}

/**
 * Provider component for the theme colors context.
 * Wrap your app with this to enable dynamic theming.
 */
export const ThemeColorsProvider: React.FC<ThemeColorsProviderProps> = ({
  children,
  initialColors
}) => {
  const [colors, setColorsState] = useState<ThemeColors>(initialColors || DEFAULT_THEME_COLORS);
  const [isGenerating, setIsGenerating] = useState(false);

  // Apply colors to document root whenever they change
  useEffect(() => {
    applyColorsToRoot(colors);
  }, [colors]);

  // Apply default colors on mount
  useEffect(() => {
    applyColorsToRoot(DEFAULT_THEME_COLORS);
  }, []);

  const setColors = useCallback((newColors: Partial<ThemeColors> | undefined | null) => {
    // Always merge with defaults to ensure no undefined values
    setColorsState(mergeWithDefaults(newColors));
  }, []);

  const resetColors = useCallback(() => {
    setColorsState(DEFAULT_THEME_COLORS);
  }, []);

  // Helper to get a single color with fallback
  const getColorFromContext = useCallback((key: keyof ThemeColors): string => {
    return colors[key] || DEFAULT_THEME_COLORS[key];
  }, [colors]);

  const cssVariables = useMemo(() => colorsToCssVariables(colors), [colors]);

  const value = useMemo(() => ({
    colors,
    setColors,
    resetColors,
    isGenerating,
    setIsGenerating,
    cssVariables,
    getColor: getColorFromContext,
  }), [colors, setColors, resetColors, isGenerating, cssVariables, getColorFromContext]);

  return (
    <ThemeColorsContext.Provider value={value}>
      {children}
    </ThemeColorsContext.Provider>
  );
};

/**
 * Hook to access and manage theme colors.
 * Must be used within a ThemeColorsProvider.
 */
export const useThemeColors = (): ThemeColorsContextValue => {
  const context = useContext(ThemeColorsContext);
  if (!context) {
    throw new Error('useThemeColors must be used within a ThemeColorsProvider');
  }
  return context;
};

/**
 * Utility hook to get just the colors without the setters.
 * Useful for components that only need to read colors.
 */
export const useColors = (): ThemeColors => {
  const { colors } = useThemeColors();
  return colors;
};

export default useThemeColors;
