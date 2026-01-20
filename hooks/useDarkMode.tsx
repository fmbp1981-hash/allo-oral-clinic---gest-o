import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DarkModeContextType {
  isDark: boolean;
  toggle: () => void;
  enable: () => void;
  disable: () => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export const DarkModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check localStorage first
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      setIsDark(saved === 'true');
    } else {
      // Otherwise check system preference
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Apply dark mode class to html element
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Save preference
    localStorage.setItem('darkMode', isDark.toString());
  }, [isDark, mounted]);

  const toggle = () => setIsDark(prev => !prev);
  const enable = () => setIsDark(true);
  const disable = () => setIsDark(false);

  return (
    <DarkModeContext.Provider value={{ isDark, toggle, enable, disable }}>
      {children}
    </DarkModeContext.Provider>
  );
};

export const useDarkMode = (): DarkModeContextType => {
  const context = useContext(DarkModeContext);
  if (!context) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
};
