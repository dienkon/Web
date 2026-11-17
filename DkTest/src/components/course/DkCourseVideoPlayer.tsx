import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  Volume2,
  VolumeX,
} from "lucide-react";
import { formatDurationClock, parseVideoSource } from "../../services/courseService";
import type { CourseVideoType } from "../../types";
import { safeExitFullscreen, safeRequestFullscreen } from "../../utils/mobileCompat";

interface DkCourseVideoPlayerProps {
  lessonId: string;
  title: string;
  videoUrl: string;
  videoType?: CourseVideoType;
  initialSeconds?: number;
  knownDurationSeconds?: number;
  onDetectedDuration?: (durationSeconds: number) => void;
  onWatchProgress?: (currentSeconds: number, totalSeconds: number, completed: boolean) => void;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<any> | null = null;
function loadYouTubeIframeApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no_window"));
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
    const prevReady = window.onYouTubeIframeAPIReady;
    const timeout = setTimeout(() => reject(new Error("yt_api_timeout")), 8000);

    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeout);
      if (typeof prevReady === "function") {
        try {
          prevReady();
        } catch {}
      }
      resolve(window.YT);
    };

    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      tag.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("yt_script_error"));
      };
      document.head.appendChild(tag);
    }
  });
  return ytApiPromise;
}

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

export default function DkCourseVideoPlayer({
  lessonId,
  title,
  videoUrl,
  videoType,
  initialSeconds = 0,
  knownDurationSeconds = 0,
  onDetectedDuration,
  onWatchProgress,
}: DkCourseVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const htmlVideoRef = useRef<HTMLVideoElement | null>(null);
  const ytHostRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);

  const parsed = useMemo(() => parseVideoSource(videoUrl, videoType), [videoUrl, videoType]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [durationSec, setDurationSec] = useState(knownDurationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ytApiFallback, setYtApiFallback] = useState(false);
  const [showCenterIcon, setShowCenterIcon] = useState(true);

  const durationNotifiedRef = useRef(false);
  const driveTimerRef = useRef(0);

  useEffect(() => {
    durationNotifiedRef.current = false;
    setCurrentSec(initialSeconds > 0 ? initialSeconds : 0);
    setDurationSec(knownDurationSeconds || 0);
    setIsPlaying(false);
    setYtApiFallback(false);
    setShowCenterIcon(true);
    driveTimerRef.current = initialSeconds > 0 ? initialSeconds : 0;
  }, [lessonId, videoUrl, knownDurationSeconds, initialSeconds]);

  // Listen to fullscreen state changes cleanly
  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // YouTube IFrame API custom DkTEST controller (controls=0 + strict-origin-when-cross-origin avoids Error 153)
  useEffect(() => {
    if (parsed.kind !== "youtube" || !parsed.youtubeId) return;
    let active = true;
    let pollTimer: any = null;

    loadYouTubeIframeApi()
      .then((YT) => {
        if (!active || !ytHostRef.current || !YT?.Player) return;
        // Clear host node before mounting player
        ytHostRef.current.innerHTML = "";
        const mountNode = document.createElement("div");
        ytHostRef.current.appendChild(mountNode);

        const origin =
          typeof window !== "undefined" && window.location?.origin ? window.location.origin : undefined;

        const player = new YT.Player(mountNode, {
          videoId: parsed.youtubeId,
          host: "https://www.youtube.com",
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 0,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            playsinline: 1,
            disablekb: 1,
            enablejsapi: 1,
            ...(origin ? { origin } : {}),
          },
          events: {
            onReady: (e: any) => {
              if (!active) return;
              try {
                const iframe = e.target?.getIframe?.();
                if (iframe) iframe.referrerPolicy = "strict-origin-when-cross-origin";
                const d = Math.round(Number(e.target?.getDuration?.() || 0));
                if (d > 0) {
                  setDurationSec(d);
                  if (!durationNotifiedRef.current) {
                    durationNotifiedRef.current = true;
                    onDetectedDuration?.(d);
                  }
                }
                if (initialSeconds > 5 && d > 0 && initialSeconds < d - 5) {
                  e.target.seekTo(initialSeconds, true);
                }
              } catch {}
            },
            onStateChange: (e: any) => {
              if (!active) return;
              const state = e.data;
              if (state === 1) {
                setIsPlaying(true);
                setShowCenterIcon(false);
              } else if (state === 2) {
                setIsPlaying(false);
              } else if (state === 0) {
                setIsPlaying(false);
                const d = Math.round(Number(e.target?.getDuration?.() || durationSec));
                onWatchProgress?.(d, d, true);
              }
            },
            onError: () => {
              if (active) setYtApiFallback(true);
            },
          },
        });
        ytPlayerRef.current = player;

        pollTimer = setInterval(() => {
          if (!active || !ytPlayerRef.current) return;
          try {
            const cur = Math.floor(Number(ytPlayerRef.current.getCurrentTime?.() || 0));
            const dur = Math.round(Number(ytPlayerRef.current.getDuration?.() || 0));
            if (dur > 0) {
              setDurationSec(dur);
              if (!durationNotifiedRef.current) {
                durationNotifiedRef.current = true;
                onDetectedDuration?.(dur);
              }
            }
            setCurrentSec(cur);
            if (cur > 0 && dur > 0) {
              onWatchProgress?.(cur, dur, cur >= dur * 0.9);
            }
          } catch {}
        }, 1000);
      })
      .catch(() => {
        if (active) setYtApiFallback(true);
      });

    return () => {
      active = false;
      if (pollTimer) clearInterval(pollTimer);
      try {
        ytPlayerRef.current?.destroy?.();
      } catch {}
      ytPlayerRef.current = null;
    };
  }, [parsed.kind, parsed.youtubeId]);

  // Active viewing tracker for Drive / External Iframe embeds (cannot inspect cross-origin currentTime directly)
  useEffect(() => {
    if (parsed.kind !== "iframe" && !(parsed.kind === "youtube" && ytApiFallback)) return;
    const total = knownDurationSeconds > 0 ? knownDurationSeconds : 0;
    const iv = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      driveTimerRef.current += 1;
      setCurrentSec(driveTimerRef.current);
      if (total > 0) {
        onWatchProgress?.(driveTimerRef.current, total, driveTimerRef.current >= total * 0.9);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [parsed.kind, ytApiFallback, knownDurationSeconds, onWatchProgress]);

  const handleTogglePlay = () => {
    if (parsed.kind === "video" && htmlVideoRef.current) {
      if (htmlVideoRef.current.paused) {
        void htmlVideoRef.current.play();
      } else {
        htmlVideoRef.current.pause();
      }
      return;
    }
    if (parsed.kind === "youtube" && ytPlayerRef.current) {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo?.();
      } else {
        ytPlayerRef.current.playVideo?.();
      }
    }
  };

  const handleSeek = (nextSec: number) => {
    const clamped = Math.max(0, Math.min(durationSec || 0, nextSec));
    setCurrentSec(clamped);
    if (parsed.kind === "video" && htmlVideoRef.current) {
      htmlVideoRef.current.currentTime = clamped;
    } else if (parsed.kind === "youtube" && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo?.(clamped, true);
    }
  };

  const handleSpeedChange = (nextRate: number) => {
    setPlaybackRate(nextRate);
    if (parsed.kind === "video" && htmlVideoRef.current) {
      htmlVideoRef.current.playbackRate = nextRate;
    } else if (parsed.kind === "youtube" && ytPlayerRef.current) {
      ytPlayerRef.current.setPlaybackRate?.(nextRate);
    }
  };

  const handleToggleMute = () => {
    const nextMute = !muted;
    setMuted(nextMute);
    if (parsed.kind === "video" && htmlVideoRef.current) {
      htmlVideoRef.current.muted = nextMute;
    } else if (parsed.kind === "youtube" && ytPlayerRef.current) {
      if (nextMute) ytPlayerRef.current.mute?.();
      else ytPlayerRef.current.unMute?.();
    }
  };

  const handleToggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (isFullscreen) {
      await safeExitFullscreen();
    } else {
      await safeRequestFullscreen(containerRef.current);
    }
  };

  // Drive or fallback external iframe
  if (parsed.kind === "iframe" || (parsed.kind === "youtube" && ytApiFallback)) {
    return (
      <div
        ref={containerRef}
        className="relative aspect-video w-full bg-slate-950 overflow-hidden select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        <iframe
          key={parsed.embedUrl}
          src={parsed.embedUrl}
          title={title}
          referrerPolicy="strict-origin-when-cross-origin"
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
        {/* Invisible-until-hovered guard blocking Drive's [↗] pop-out button with 0 ugly black box obscuring slides */}
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Link kho lưu gốc được DkTEST ẩn và bảo vệ"
          className="absolute top-1 right-1 w-12 h-11 z-20 rounded-xl bg-transparent hover:bg-blue-950/80 hover:backdrop-blur-xs text-transparent hover:text-blue-200 flex items-center justify-center transition-all cursor-default pointer-events-auto"
        >
          <ShieldCheck className="w-4 h-4" />
        </div>
      </div>
    );
  }

  // Custom DkTEST Video Player (supports MP4/Cloudinary AND YouTube YT.Player seamlessly)
  const progressPct = durationSec > 0 ? Math.min(100, (currentSec / durationSec) * 100) : 0;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.code === "Space") {
          e.preventDefault();
          handleTogglePlay();
        } else if (e.code === "ArrowLeft") {
          e.preventDefault();
          handleSeek(currentSec - 10);
        } else if (e.code === "ArrowRight") {
          e.preventDefault();
          handleSeek(currentSec + 10);
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
      className="group relative aspect-video w-full bg-black overflow-hidden select-none focus:outline-none"
    >
      {parsed.kind === "video" ? (
        <video
          ref={htmlVideoRef}
          key={parsed.embedUrl}
          src={parsed.embedUrl}
          playsInline
          preload="metadata"
          controls={false}
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          onClick={handleTogglePlay}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            const d = Math.round(Number(v.duration) || 0);
            if (d > 0) {
              setDurationSec(d);
              if (!durationNotifiedRef.current) {
                durationNotifiedRef.current = true;
                onDetectedDuration?.(d);
              }
              if (initialSeconds > 5 && initialSeconds < d - 5) {
                v.currentTime = initialSeconds;
              }
            }
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            const cur = Math.floor(v.currentTime || 0);
            const dur = Math.round(v.duration || durationSec || 0);
            setCurrentSec(cur);
            if (dur > 0) {
              onWatchProgress?.(cur, dur, cur >= dur * 0.9);
            }
          }}
          onPlay={() => {
            setIsPlaying(true);
            setShowCenterIcon(false);
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            onWatchProgress?.(durationSec, durationSec, true);
          }}
          className="w-full h-full object-contain cursor-pointer"
        />
      ) : (
        <>
          <div ref={ytHostRef} className="w-full h-full pointer-events-none" />
          {/* Transparent tap layer so clicking anywhere toggles DkTEST play/pause cleanly instead of opening YouTube */}
          <div
            onClick={handleTogglePlay}
            onDoubleClick={() => void handleToggleFullscreen()}
            className="absolute inset-0 bottom-14 z-10 cursor-pointer"
          />
        </>
      )}

      {/* Center Play Overlay when idle/paused */}
      {(!isPlaying || showCenterIcon) && (
        <button
          type="button"
          onClick={handleTogglePlay}
          className="absolute inset-0 bottom-14 z-10 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer"
          aria-label="Phát video"
        >
          <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-600/95 hover:bg-blue-500 text-white shadow-xl flex items-center justify-center transition-transform active:scale-95">
            <Play className="w-7 h-7 fill-current ml-0.5" />
          </span>
        </button>
      )}

      {/* Custom DkTEST Blue Control Bar */}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-slate-950/95 via-slate-950/80 to-transparent pt-6 pb-2.5 px-3 sm:px-4 space-y-2 transition-opacity">
        {/* Progress / Seek Slider */}
        <div className="relative flex items-center group/seek">
          <div className="w-full h-1.5 group-hover/seek:h-2 rounded-full bg-white/25 overflow-hidden transition-all">
            <div
              className="h-full bg-blue-500 transition-all duration-150"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(1, durationSec)}
            value={Math.min(currentSec, Math.max(1, durationSec))}
            onChange={(e) => handleSeek(Number(e.target.value))}
            aria-label="Tua video"
            className="absolute inset-0 w-full h-4 opacity-0 cursor-pointer"
          />
        </div>

        {/* Transport Controls Row */}
        <div className="flex items-center justify-between gap-2 text-white text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              title={isPlaying ? "Tạm dừng" : "Phát"}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            <button
              type="button"
              onClick={() => handleSeek(currentSec - 10)}
              className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer flex items-center gap-0.5"
              title="Lùi 10 giây"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold hidden sm:inline">10s</span>
            </button>

            <button
              type="button"
              onClick={() => handleSeek(currentSec + 10)}
              className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer flex items-center gap-0.5"
              title="Tua tới 10 giây"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold hidden sm:inline">10s</span>
            </button>

            <button
              type="button"
              onClick={handleToggleMute}
              className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              title={muted ? "Bật tiếng" : "Tắt tiếng"}
            >
              {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <span className="font-mono text-[11px] font-bold text-slate-200 tabular-nums">
              {formatDurationClock(currentSec)} / {formatDurationClock(durationSec)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Speed Cycle Button */}
            <button
              type="button"
              onClick={() => {
                const idx = SPEED_OPTIONS.indexOf(playbackRate);
                handleSpeedChange(SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]);
              }}
              className="px-2 py-1 rounded-lg bg-white/15 hover:bg-blue-600 text-[11px] font-black transition-colors cursor-pointer"
              title="Đổi tốc độ phát"
            >
              {playbackRate}x
            </button>

            <span
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600/30 border border-blue-400/30 text-[10px] font-bold text-blue-200"
              title="DkTEST Video Player"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>DkTEST Player</span>
            </span>

            <button
              type="button"
              onClick={() => void handleToggleFullscreen()}
              className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
              title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
