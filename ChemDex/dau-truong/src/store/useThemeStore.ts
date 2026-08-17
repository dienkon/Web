import { create } from 'zustand';

interface ThemeState {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const storedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('chem_theme') : null;
  const initialTheme: 'dark' | 'light' = (storedTheme as 'dark' | 'light') || 'light';

  // Apply class on load
  if (typeof document !== 'undefined') {
    if (initialTheme === 'light') {
      document.documentElement.classList.add('light-mode');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light-mode');
      document.documentElement.classList.add('dark');
    }
  }

  return {
    theme: initialTheme,
    toggleTheme: () => {
      const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('chem_theme', nextTheme);
      if (nextTheme === 'light') {
        document.documentElement.classList.add('light-mode');
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.remove('light-mode');
        document.documentElement.classList.add('dark');
      }
      set({ theme: nextTheme });
    },
    setTheme: (theme) => {
      localStorage.setItem('chem_theme', theme);
      if (theme === 'light') {
        document.documentElement.classList.add('light-mode');
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.remove('light-mode');
        document.documentElement.classList.add('dark');
      }
      set({ theme });
    },
  };
});

