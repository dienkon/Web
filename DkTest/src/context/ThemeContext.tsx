import React, { createContext, useContext, useEffect, useState, useTransition } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export type DarkIntensity = "soft" | "chrome" | "deep" | "oled";

export interface DarkIntensityOption {
  id: DarkIntensity;
  label: string;
  name: string;
  description: string;
  previewBg: string;
  previewCard: string;
  previewBorder: string;
  tag?: string;
}

export const DARK_INTENSITIES: DarkIntensityOption[] = [
  {
    id: "soft",
    label: "Tối nhẹ",
    name: "Soft Slate",
    description: "Tông xám êm dịu, giảm mỏi mắt khi đọc lâu trong bóng tối",
    previewBg: "#23272f",
    previewCard: "#2d323f",
    previewBorder: "#3e4453",
  },
  {
    id: "chrome",
    label: "Tối vừa",
    name: "Chrome Neutral",
    description: "Chuẩn Google Chrome & Material. Cân bằng thị giác lý tưởng",
    previewBg: "#202124",
    previewCard: "#292a2d",
    previewBorder: "#3c4043",
    tag: "Mặc định",
  },
  {
    id: "deep",
    label: "Tối sâu",
    name: "Deep Midnight",
    description: "Tông xanh đêm vũ trụ sâu thẳm, phong cách hiện đại và tập trung",
    previewBg: "#0b0f19",
    previewCard: "#151c2e",
    previewBorder: "#283548",
  },
  {
    id: "oled",
    label: "Siêu tối",
    name: "OLED Pitch Black",
    description: "Đen tuyền 100%, tiết kiệm pin tối đa cho màn hình OLED / AMOLED",
    previewBg: "#000000",
    previewCard: "#0e1014",
    previewBorder: "#242730",
    tag: "Tiết kiệm pin",
  },
];

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  darkIntensity: DarkIntensity;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setDarkIntensity: (intensity: DarkIntensity) => void;
  availableIntensities: DarkIntensityOption[];
}

const STORAGE_THEME_KEY = "dktest_theme";
const STORAGE_INTENSITY_KEY = "dktest_dark_intensity";
const DEFAULT_DARK_INTENSITY: DarkIntensity = "chrome";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
  } catch {
    // fallback
  }
  return "system";
}

function getInitialDarkIntensity(): DarkIntensity {
  try {
    const saved = localStorage.getItem(STORAGE_INTENSITY_KEY);
    if (saved === "soft" || saved === "chrome" || saved === "deep" || saved === "oled") {
      return saved;
    }
  } catch {
    // fallback
  }
  return DEFAULT_DARK_INTENSITY;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Trigger smooth transition for changing themes/intensity
 */
function triggerSmoothTransition() {
  if (typeof window === "undefined") return;
  // Respect user preference for reduced motion
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  const root = document.documentElement;
  root.classList.add("theme-transitioning");
  if ((window as any).__dkThemeTimer) {
    window.clearTimeout((window as any).__dkThemeTimer);
  }
  (window as any).__dkThemeTimer = window.setTimeout(() => {
    root.classList.remove("theme-transitioning");
  }, 350);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);
  const [darkIntensity, setDarkIntensityState] = useState<DarkIntensity>(getInitialDarkIntensity);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const initial = getInitialTheme();
    return initial === "system" ? getSystemTheme() : initial;
  });
  const [, startTransition] = useTransition();

  const applyThemeToDOM = (resolved: ResolvedTheme, intensity: DarkIntensity, animate: boolean = false) => {
    if (typeof window === "undefined") return;
    if (animate) {
      triggerSmoothTransition();
    }
    const root = document.documentElement;
    root.setAttribute("data-dark-intensity", intensity);

    if (resolved === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
  };

  const setTheme = (mode: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_THEME_KEY, mode);
    } catch {
      // ignore
    }
    setThemeState(mode);
    const resolved = mode === "system" ? getSystemTheme() : mode;
    startTransition(() => {
      setResolvedTheme(resolved);
      applyThemeToDOM(resolved, darkIntensity, true);
    });
  };

  const setDarkIntensity = (intensity: DarkIntensity) => {
    try {
      localStorage.setItem(STORAGE_INTENSITY_KEY, intensity);
    } catch {
      // ignore
    }
    setDarkIntensityState(intensity);
    startTransition(() => {
      applyThemeToDOM(resolvedTheme, intensity, true);
    });
  };

  const toggleTheme = () => {
    if (resolvedTheme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  // Listen to OS system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (theme === "system") {
        const nextResolved = mediaQuery.matches ? "dark" : "light";
        setResolvedTheme(nextResolved);
        applyThemeToDOM(nextResolved, darkIntensity, true);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, darkIntensity]);

  // Sync state on mount (without animation to avoid FOUC)
  useEffect(() => {
    const resolved = theme === "system" ? getSystemTheme() : theme;
    setResolvedTheme(resolved);
    applyThemeToDOM(resolved, darkIntensity, false);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        darkIntensity,
        setTheme,
        toggleTheme,
        setDarkIntensity,
        availableIntensities: DARK_INTENSITIES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
