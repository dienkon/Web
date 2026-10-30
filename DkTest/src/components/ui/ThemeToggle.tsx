import React, { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor, Check, Sliders, ChevronRight } from "lucide-react";
import { useTheme, type ThemeMode, type DarkIntensity, DARK_INTENSITIES } from "../../context/ThemeContext";

interface ThemeToggleProps {
  variant?: "icon" | "dropdown" | "pills";
  className?: string;
  showIntensityPicker?: boolean;
}

export default function ThemeToggle({
  variant = "icon",
  className = "",
  showIntensityPicker = true,
}: ThemeToggleProps) {
  const { theme, resolvedTheme, darkIntensity, setTheme, toggleTheme, setDarkIntensity } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowSubMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  if (variant === "pills") {
    const options: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
      { mode: "light", label: "Sáng", icon: <Sun className="w-3.5 h-3.5" /> },
      { mode: "dark", label: "Tối", icon: <Moon className="w-3.5 h-3.5" /> },
      { mode: "system", label: "Hệ thống", icon: <Monitor className="w-3.5 h-3.5" /> },
    ];

    return (
      <div className={`inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 ${className}`}>
        {options.map((opt) => {
          const isActive = theme === opt.mode;
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setTheme(opt.mode)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                isActive
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "dropdown") {
    const currentIntensityObj = DARK_INTENSITIES.find((i) => i.id === darkIntensity) || DARK_INTENSITIES[1];

    return (
      <div className={`relative inline-block ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center justify-center border border-slate-200/60 dark:border-slate-700"
          title={`Giao diện: ${theme === "light" ? "Sáng" : theme === "dark" ? `Tối (${currentIntensityObj.label})` : "Theo hệ thống"}`}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          {resolvedTheme === "dark" ? (
            <Moon className="w-4 h-4 text-blue-400" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Chủ đề giao diện
            </div>

            <button
              type="button"
              onClick={() => {
                setTheme("light");
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                theme === "light"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"
              }`}
            >
              <span className="flex items-center gap-2">
                <Sun className="w-3.5 h-3.5 text-amber-500" /> Sáng
              </span>
              {theme === "light" && <Check className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setTheme("dark");
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                theme === "dark"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"
              }`}
            >
              <span className="flex items-center gap-2">
                <Moon className="w-3.5 h-3.5 text-blue-400" /> Tối
                <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                  ({currentIntensityObj.label})
                </span>
              </span>
              {theme === "dark" && <Check className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setTheme("system");
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                theme === "system"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"
              }`}
            >
              <span className="flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5 text-slate-400" /> Hệ thống
              </span>
              {theme === "system" && <Check className="w-3.5 h-3.5" />}
            </button>

            {/* Quick Dark Intensity Picker */}
            {showIntensityPicker && (
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/80">
                <div className="px-2 py-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Sliders className="w-3 h-3" />
                    Sắc thái màu tối
                  </span>
                  <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.2 rounded font-medium">
                    {currentIntensityObj.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 p-1 mt-1 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                  {DARK_INTENSITIES.map((opt) => {
                    const isSelected = darkIntensity === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setDarkIntensity(opt.id);
                          if (theme === "light") {
                            setTheme("dark");
                          }
                        }}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                        }`}
                        title={`${opt.name}: ${opt.description}`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: opt.previewBg }}
                        />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default: fast toggle with tooltip
  const currentIntensityLabel = DARK_INTENSITIES.find((i) => i.id === darkIntensity)?.label || "Tối vừa";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center justify-center border border-slate-200/60 dark:border-slate-700 ${className}`}
      title={resolvedTheme === "dark" ? "Chuyển sang giao diện Sáng" : `Chuyển sang giao diện Tối (${currentIntensityLabel})`}
      aria-label="Chuyển đổi giao diện Sáng / Tối"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-200" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700 dark:text-slate-300 animate-in spin-in-90 duration-200" />
      )}
    </button>
  );
}
