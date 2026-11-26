import React, { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, ShieldCheck, Sparkles } from "lucide-react";
import type { MinigameType } from "../../types/minigame";
import { getMinigameArtwork } from "../../services/minigame/minigameAssets";
import { MINIGAME_TYPE_META } from "../../services/minigame/gameLogic";

interface MinigamePreviewCardProps {
  gameType: MinigameType;
  /** Optional custom event title (falls back to game label) */
  title?: string;
  /** Optional custom event description */
  description?: string;
  /** Optional status chip rendered top-right over artwork */
  statusBadge?: React.ReactNode;
  /** Whether the 3-step how-to-play guide starts expanded */
  defaultShowGuide?: boolean;
  /** Compact mode for Admin Create Event live preview */
  compact?: boolean;
  /** Optional footer slot (e.g., social preview domain & prize chips) */
  footer?: React.ReactNode;
}

export const MinigamePreviewCard: React.FC<MinigamePreviewCardProps> = ({
  gameType,
  title,
  description,
  statusBadge,
  defaultShowGuide = true,
  compact = false,
  footer,
}) => {
  const [showGuide, setShowGuide] = useState(defaultShowGuide);
  const art = getMinigameArtwork(gameType);
  const meta = MINIGAME_TYPE_META[gameType];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
      {/* 1200x630 Artwork Banner */}
      <div className="relative aspect-[1200/630] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={art.imagePath}
          alt={art.imageAlt}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black text-white shadow-sm bg-gradient-to-r ${meta.gradient}`}
          >
            <span>{meta.emoji}</span>
            <span>{art.label}</span>
          </span>
          {statusBadge || (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-white/90 text-emerald-700 shadow-sm">
              <ShieldCheck className="w-3 h-3" />
              Miễn phí 100%
            </span>
          )}
        </div>

        {/* Bottom title overlay */}
        <div className="absolute bottom-3 left-3.5 right-3.5 text-white">
          <h3 className={`${compact ? "text-sm" : "text-base sm:text-lg"} font-black leading-snug drop-shadow-xs`}>
            {title?.trim() || art.label}
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-100/95 line-clamp-2 mt-0.5">
            {description?.trim() || art.tagline}
          </p>
        </div>
      </div>

      {/* Highlights & Expandable How-To-Play */}
      <div className={compact ? "p-3.5 space-y-2.5" : "p-4 space-y-3"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {art.highlights.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-200"
              >
                <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                {chip}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowGuide((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{showGuide ? "Ẩn hướng dẫn" : "Xem hướng dẫn chơi"}</span>
            {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showGuide && (
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            {art.howToPlay.map((step, index) => (
              <li
                key={index}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70 flex items-start gap-2"
              >
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-200">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        )}

        {footer}
      </div>
    </div>
  );
};
