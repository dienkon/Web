/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * ProgressReplayModal: Historical Progression Timeline Replay
 */

import React, { useState, useEffect } from "react";
import { X, Play, Pause, RotateCcw, Award, CheckCircle2, Calendar, Star } from "lucide-react";
import type { SubjectThemeType } from "../types/journey3D";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: number;
  activeSubject: SubjectThemeType;
}

export default function ProgressReplayModal({
  isOpen,
  onClose,
  currentLevel,
  activeSubject,
}: Props) {
  const [replayStep, setReplayStep] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setReplayStep(1);
      setIsPlaying(true);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setReplayStep((prev) => {
          if (prev >= currentLevel) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 350);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentLevel]);

  if (!isOpen) return null;

  const subjectLabel =
    activeSubject === "math" ? "Toán Học" : activeSubject === "physics" ? "Vật Lý" : "Hóa Học";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <h3 className="font-black text-base text-slate-900 dark:text-white">
              Tua Lại Dấu Mốc Chinh Phục (Progress Replay)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Milestone Animation Visualizer */}
        <div className="p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-black rounded-2xl text-center text-white space-y-3 relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/50 border border-indigo-400 flex items-center justify-center mx-auto shadow-xl">
            <span className="text-2xl font-black font-mono">{replayStep}</span>
          </div>

          <h4 className="text-base font-black">
            {replayStep === 1
              ? "Khởi hành: Cửa ngõ Chương 1"
              : replayStep === 10
              ? "Hoàn thành: Trạm Nhận Biết (Mốc 10)"
              : replayStep === 25
              ? "Hoàn thành: Trạm Thông Hiểu (Mốc 25)"
              : replayStep === 40
              ? "Hoàn thành: Trạm Vận Dụng (Mốc 40)"
              : replayStep === 50
              ? "Đỉnh cao Vinh quang: Màn 50"
              : `Màn ${replayStep}: Bước tiến vững chắc môn ${subjectLabel}`}
          </h4>

          <p className="text-xs text-indigo-200">
            Tiến độ đã tua: {replayStep}/{currentLevel} màn đã chinh phục
          </p>

          {/* Progress Ribbon */}
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${(replayStep / Math.max(1, currentLevel)) * 100}%` }}
            />
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setReplayStep(1)}
            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Xem lại từ đầu"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-6 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center gap-1.5 transition-all"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-white" />
                <span>Tạm dừng</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Tiếp tục tua</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
