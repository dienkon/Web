import React from "react";
import clsx from "clsx";

export interface BrandLogoProps {
  /** Size preset for the logo icon */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Optional custom class for the container */
  className?: string;
  /** Optional custom class for the img element */
  imageClassName?: string;
  /** Whether to render the 'DkTEST' text next to the logo */
  showText?: boolean;
  /** Custom badge or subtitle next to/below the text */
  badgeText?: string;
  /** Subtitle below the title (e.g., 'Hệ thống khảo thí') */
  subText?: string;
  /** Color theme for text ('blue' | 'indigo' | 'white' | 'slate') */
  theme?: "blue" | "indigo" | "white" | "slate";
}

const SIZE_MAP = {
  xs: "w-6 h-6 rounded-lg",
  sm: "w-8 h-8 sm:w-9 sm:h-9 rounded-xl",
  md: "w-10 h-10 rounded-xl",
  lg: "w-14 h-14 rounded-2xl",
  xl: "w-20 h-20 rounded-3xl",
};

const TEXT_SIZE_MAP = {
  xs: "text-sm",
  sm: "text-lg sm:text-xl",
  md: "text-xl sm:text-2xl",
  lg: "text-2xl sm:text-3xl",
  xl: "text-3xl sm:text-4xl",
};

export default function BrandLogo({
  size = "sm",
  className,
  imageClassName,
  showText = true,
  badgeText,
  subText,
  theme = "blue",
}: BrandLogoProps) {
  const textColor = {
    blue: "text-blue-600",
    indigo: "text-indigo-600",
    white: "text-white",
    slate: "text-slate-900",
  }[theme];

  return (
    <div className={clsx("inline-flex items-center gap-2.5 select-none", className)}>
      <img
        src="/logo.png"
        alt="DKTEST Logo"
        className={clsx(
          SIZE_MAP[size],
          "object-contain shrink-0 drop-shadow-xs transition-transform duration-200 group-hover:scale-105",
          imageClassName
        )}
        loading="eager"
      />
      {showText && (
        <div className="flex flex-col min-w-0 leading-tight">
          <div className="flex items-center gap-1.5">
            <span
              className={clsx(
                TEXT_SIZE_MAP[size],
                "font-black tracking-tight",
                textColor
              )}
            >
              DkTEST
            </span>
            {badgeText && (
              <span
                className={clsx(
                  "text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-lg border shrink-0",
                  theme === "indigo"
                    ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                    : theme === "white"
                    ? "bg-white/20 text-white border-white/20"
                    : "bg-blue-50 text-blue-700 border-blue-100"
                )}
              >
                {badgeText}
              </span>
            )}
          </div>
          {subText && (
            <p
              className={clsx(
                "text-[11px] font-medium truncate",
                theme === "white" ? "text-blue-100" : "text-slate-400"
              )}
            >
              {subText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
