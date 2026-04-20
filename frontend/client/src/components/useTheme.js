import { useState, useEffect, useCallback } from 'react';

export const useTheme = (storageKey, defaultTheme = 'dark') => {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(storageKey) || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, theme);
    } catch {

    }
  }, [storageKey, theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  return [theme, toggleTheme];
};