/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Ambient Sound & Accessibility Controls Toolbar
 */

import React, { useState } from "react";
import { Volume2, VolumeX, Eye, EyeOff, RotateCcw } from "lucide-react";
import { escapeAudio } from "../utils/escapeAudio";

interface AmbientSoundControlsProps {
  reducedMotion: boolean;
  onToggleReducedMotion: () => void;
  onResetGame: () => void;
}

export const AmbientSoundControls: React.FC<AmbientSoundControlsProps> = ({
  reducedMotion,
  onToggleReducedMotion,
  onResetGame,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(escapeAudio.getMuted());

  const handleToggleAudio = () => {
    const next = escapeAudio.toggleMute();
    setIsMuted(next);
    if (!next) {
      escapeAudio.playClick();
    }
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* Audio Mute/Unmute Toggle */}
      <button
        type="button"
        onClick={handleToggleAudio}
        className={`p-2 rounded-xl border transition-all cursor-pointer ${
          isMuted
            ? "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200"
            : "bg-indigo-950/80 border-indigo-500/50 text-indigo-300 hover:text-indigo-100 shadow-xs"
        }`}
        title={isMuted ? "Bật âm thanh hiệu ứng" : "Tắt âm thanh hiệu ứng"}
        aria-label={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>

      {/* Reduced Motion Toggle */}
      <button
        type="button"
        onClick={onToggleReducedMotion}
        className={`p-2 rounded-xl border transition-all cursor-pointer ${
          reducedMotion
            ? "bg-amber-950/80 border-amber-500/50 text-amber-300 shadow-xs"
            : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200"
        }`}
        title={reducedMotion ? "Chế độ giảm chuyển động: Đang Bật" : "Bật chế độ giảm chuyển động"}
        aria-label="Chuyển đổi giảm chuyển động"
      >
        {reducedMotion ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>

      {/* Reset Session */}
      <button
        type="button"
        onClick={onResetGame}
        className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-950/80 border border-slate-700 hover:border-red-500/50 text-slate-400 hover:text-red-300 transition-all cursor-pointer"
        title="Chơi lại từ đầu"
        aria-label="Chơi lại từ đầu"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
};
