import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Headphones,
  Lock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Radio,
} from "lucide-react";
import type { ExamAudioConfig } from "../../types";

interface Props {
  config: ExamAudioConfig;
  examId: string;
  studentUsername?: string;
}

export default function ExamAudioPlayer({ config, examId, studentUsername = "student" }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const storageKey = `dktest_audio_plays_${examId}_${studentUsername}`;

  const [playsCount, setPlaysCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [hasStartedThisTrack, setHasStartedThisTrack] = useState<boolean>(false);

  const maxPlays = config.maxPlays ?? 0;
  const isPlayLimitReached = maxPlays > 0 && playsCount >= maxPlays && !isPlaying;

  // Format seconds to mm:ss
  const formatTime = (timeInSec: number) => {
    if (isNaN(timeInSec) || timeInSec < 0) return "00:00";
    const m = Math.floor(timeInSec / 60);
    const s = Math.floor(timeInSec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handlePlay = async () => {
    if (!audioRef.current || isPlayLimitReached) return;

    try {
      await audioRef.current.play();
    } catch (err) {
      console.warn("Could not start audio playback:", err);
    }
  };

  const handlePause = () => {
    if (!audioRef.current) return;
    if (config.allowPause === false) return; // Prevent pause if disabled
    audioRef.current.pause();
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current || !config.allowSeek) return;
    const targetTime = (parseFloat(e.target.value) / 100) * duration;
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handleTrackEnded = () => {
    setIsPlaying(false);
    setHasStartedThisTrack(false);
  };

  // Track onPlay to authoritative increment playsCount
  const onAudioPlay = () => {
    setIsPlaying(true);
    if (!hasStartedThisTrack) {
      setHasStartedThisTrack(true);
      setPlaysCount((prev) => {
        const next = prev + 1;
        try {
          localStorage.setItem(storageKey, next.toString());
        } catch {}
        return next;
      });
    }
  };

  const onAudioPause = () => {
    setIsPlaying(false);
  };

  // Autoplay if configured
  useEffect(() => {
    if (config.autoPlay && !isPlayLimitReached && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [config.autoPlay, isPlayLimitReached]);

  const audioUrl = (config?.url || "").trim();
  if (!audioUrl || config.enabled === false) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full bg-white/95 backdrop-blur-md border border-indigo-200/80 rounded-2xl shadow-md overflow-hidden transition-all duration-200">
      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        src={config.url}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleTrackEnded}
        onPlay={onAudioPlay}
        onPause={onAudioPause}
      />

      {/* Header bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 text-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Headphones className="w-4 h-4 text-white" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 text-indigo-100 px-2 py-0.5 rounded-full">
                BÀI NGHE AUDIO
              </span>
              {isPlaying && (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                  <Radio className="w-3.5 h-3.5 animate-pulse" /> Đang phát
                </span>
              )}
            </div>
            <h4 className="text-xs font-bold text-white truncate mt-0.5">
              {config.title || "File nghe Audio bài thi"}
            </h4>
          </div>
        </div>

        {/* Right badges & collapse toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-white/15 border border-white/20 text-white flex items-center gap-1">
            <span>Lượt nghe:</span>
            <strong className={isPlayLimitReached ? "text-rose-300" : "text-emerald-300"}>
              {playsCount}/{maxPlays > 0 ? maxPlays : "Vô hạn"}
            </strong>
          </span>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-white/80 hover:text-white"
            title={isCollapsed ? "Mở rộng thanh phát" : "Thu gọn"}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main player controls body */}
      {!isCollapsed && (
        <div className="p-4 space-y-3 bg-slate-50/60">
          {isPlayLimitReached && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Bạn đã sử dụng hết số lần nghe quy định ({maxPlays} lần).</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Play/Pause Button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={togglePlayPause}
                disabled={isPlayLimitReached || (isPlaying && config.allowPause === false)}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  isPlaying
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                }`}
                title={
                  isPlayLimitReached
                    ? "Hết lượt nghe"
                    : isPlaying && config.allowPause === false
                    ? "Không cho phép tạm dừng"
                    : isPlaying
                    ? "Tạm dừng"
                    : "Bắt đầu nghe"
                }
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
              </button>
            </div>

            {/* Scrubber & Time */}
            <div className="flex-1 w-full space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 font-bold">
                <span>{formatTime(currentTime)}</span>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-sans">
                  {!config.allowSeek && (
                    <span className="flex items-center gap-0.5 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                      <Lock className="w-2.5 h-2.5" /> Không được tua
                    </span>
                  )}
                  {config.allowPause === false && (
                    <span className="flex items-center gap-0.5 text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                      <Lock className="w-2.5 h-2.5" /> Khóa tạm dừng
                    </span>
                  )}
                </div>
                <span>{formatTime(duration)}</span>
              </div>

              {/* Progress Slider */}
              <div className="relative flex items-center">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={progressPercent}
                  onChange={handleSeek}
                  disabled={!config.allowSeek || duration === 0}
                  className={`w-full h-2 rounded-lg appearance-none transition-all ${
                    config.allowSeek
                      ? "cursor-pointer bg-slate-200 accent-blue-600 hover:accent-blue-700"
                      : "cursor-not-allowed bg-slate-200 accent-slate-400"
                  }`}
                  style={{
                    background: `linear-gradient(to right, #2563eb ${progressPercent}%, #e2e8f0 ${progressPercent}%)`,
                  }}
                />
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                title={isMuted ? "Bật âm thanh" : "Tắt tiếng"}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
