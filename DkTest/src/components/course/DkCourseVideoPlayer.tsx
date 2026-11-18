import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronUp,
  Gauge,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  buildCloudinaryQualityUrl,
  CLOUDINARY_QUALITY_OPTIONS,
  DEFAULT_YOUTUBE_QUALITY_OPTIONS,
  formatDurationClock,
  formatQualityLabel,
  isCloudinaryVideoUrl,
  parseVideoSource,
  VIDEO_SPEED_OPTIONS,
  type VideoQualityOption,
  type VideoQualityValue,
} from "../../services/courseService";
import type { CourseVideoType } from "../../types";
import { safeExitFullscreen, safeRequestFullscreen } from "../../utils/mobileCompat";

interface DkCourseVideoPlayerProps {
  lessonId: string;
  title: string;
  videoUrl: string;
  videoType?: CourseVideoType;
  initialSeconds?: number;
  knownDurationSeconds?: number;
  autoPlay?: boolean;
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

export default function DkCourseVideoPlayer({
  lessonId,
  title,
  videoUrl,
  videoType,
  initialSeconds = 0,
  knownDurationSeconds = 0,
  autoPlay = false,
  onDetectedDuration,
  onWatchProgress,
}: DkCourseVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsMenuAreaRef = useRef<HTMLDivElement | null>(null);
  const htmlVideoRef = useRef<HTMLVideoElement | null>(null);
  const ytHostRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);

  const parsed = useMemo(() => parseVideoSource(videoUrl, videoType), [videoUrl, videoType]);
  const isCloudinary = useMemo(
    () => parsed.kind === "video" && isCloudinaryVideoUrl(parsed.embedUrl),
    [parsed.kind, parsed.embedUrl]
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSec, setCurrentSec] = useState(0);
  const [durationSec, setDurationSec] = useState(knownDurationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [selectedQuality, setSelectedQuality] = useState<VideoQualityValue>("auto");
  const [availableYtQualities, setAvailableYtQualities] = useState<VideoQualityOption[]>(
    DEFAULT_YOUTUBE_QUALITY_OPTIONS
  );
  const [actualYtQuality, setActualYtQuality] = useState<string>("");
  const [nativeVideoHeight, setNativeVideoHeight] = useState<number>(0);
  const [openMenu, setOpenMenu] = useState<"none" | "quality" | "speed">("none");
  const [muted, setMuted] = useState(false);
  const [volume] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ytApiFallback, setYtApiFallback] = useState(false);
  const [showCenterIcon, setShowCenterIcon] = useState(true);

  const durationNotifiedRef = useRef(false);
  const driveTimerRef = useRef(0);
  const pendingHtmlResumeRef = useRef<{ time: number; playing: boolean; rate: number } | null>(null);
  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;
  const autoPlayRef = useRef(autoPlay);
  autoPlayRef.current = autoPlay;

  useEffect(() => {
    durationNotifiedRef.current = false;
    pendingHtmlResumeRef.current = null;
    setCurrentSec(initialSeconds > 0 ? initialSeconds : 0);
    setDurationSec(knownDurationSeconds || 0);
    setIsPlaying(false);
    setYtApiFallback(false);
    setShowCenterIcon(true);
    setSelectedQuality("auto");
    setAvailableYtQualities(DEFAULT_YOUTUBE_QUALITY_OPTIONS);
    setActualYtQuality("");
    setNativeVideoHeight(0);
    setOpenMenu("none");
    driveTimerRef.current = initialSeconds > 0 ? initialSeconds : 0;
  }, [lessonId, videoUrl, knownDurationSeconds, initialSeconds]);

  // Listen to fullscreen state changes cleanly
  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Close open speed/quality dropdown when clicking outside menu controls
  useEffect(() => {
    if (openMenu === "none") return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (controlsMenuAreaRef.current && target && controlsMenuAreaRef.current.contains(target)) {
        return;
      }
      setOpenMenu("none");
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [openMenu]);

  // YouTube IFrame API custom DkTEST controller (controls=0 + strict-origin-when-cross-origin avoids Error 153)
  useEffect(() => {
    if (parsed.kind !== "youtube" || !parsed.youtubeId) return;
    let active = true;
    let pollTimer: any = null;

    const syncYtMetadata = (player: any) => {
      if (!active || !player) return;
      try {
        const levels: string[] = player.getAvailableQualityLevels?.() || [];
        if (Array.isArray(levels) && levels.length > 0) {
          const mapped: VideoQualityOption[] = [{ value: "auto", label: "Tự động", shortLabel: "Auto" }];
          const seen = new Set<string>(["auto"]);
          for (const rawLevel of levels) {
            const info = formatQualityLabel(rawLevel);
            if (!seen.has(info.value)) {
              seen.add(info.value);
              mapped.push(info);
            }
          }
          setAvailableYtQualities(mapped);
        }
        const currentQ = player.getPlaybackQuality?.();
        if (currentQ && currentQ !== "unknown") {
          setActualYtQuality(currentQ);
        }
      } catch {}
    };

    loadYouTubeIframeApi()
      .then((YT) => {
        if (!active || !ytHostRef.current || !YT?.Player) return;
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
            autoplay: autoPlayRef.current ? 1 : 0,
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
                if (playbackRateRef.current !== 1) {
                  e.target.setPlaybackRate?.(playbackRateRef.current);
                }
                if (initialSeconds > 5 && d > 0 && initialSeconds < d - 5) {
                  e.target.seekTo(initialSeconds, true);
                }
                if (autoPlayRef.current) {
                  e.target.playVideo?.();
                }
                syncYtMetadata(e.target);
              } catch {}
            },
            onPlaybackQualityChange: (e: any) => {
              if (!active) return;
              if (e?.data && e.data !== "unknown") {
                setActualYtQuality(String(e.data));
              }
              syncYtMetadata(e.target);
            },
            onStateChange: (e: any) => {
              if (!active) return;
              const state = e.data;
              if (state === 1) {
                setIsPlaying(true);
                setShowCenterIcon(false);
                syncYtMetadata(e.target);
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

  // Active viewing tracker for Drive / External Iframe embeds
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

  const activeHtmlVideoSrc = useMemo(() => {
    if (parsed.kind !== "video") return "";
    if (isCloudinary) {
      return buildCloudinaryQualityUrl(parsed.embedUrl, selectedQuality);
    }
    return parsed.embedUrl;
  }, [parsed.kind, parsed.embedUrl, isCloudinary, selectedQuality]);

  const qualityOptions: VideoQualityOption[] = useMemo(() => {
    if (parsed.kind === "youtube") return availableYtQualities;
    if (isCloudinary) return CLOUDINARY_QUALITY_OPTIONS;
    const nativeBadge = nativeVideoHeight >= 720 ? "HD" : undefined;
    return [
      {
        value: "auto",
        label: nativeVideoHeight > 0 ? `Bản gốc (${nativeVideoHeight}p)` : "Tự động (Gốc)",
        shortLabel: nativeVideoHeight > 0 ? `${nativeVideoHeight}p` : "Gốc",
        badge: nativeBadge,
      },
    ];
  }, [parsed.kind, availableYtQualities, isCloudinary, nativeVideoHeight]);

  const activeQualityLabel = useMemo(() => {
    if (selectedQuality === "auto") {
      if (parsed.kind === "youtube" && actualYtQuality) {
        return formatQualityLabel(actualYtQuality).shortLabel;
      }
      if (!isCloudinary && parsed.kind === "video" && nativeVideoHeight > 0) {
        return `${nativeVideoHeight}p`;
      }
      return "Auto";
    }
    return formatQualityLabel(selectedQuality).shortLabel;
  }, [selectedQuality, parsed.kind, actualYtQuality, isCloudinary, nativeVideoHeight]);

  const handleTogglePlay = () => {
    if (openMenu !== "none") {
      setOpenMenu("none");
      return;
    }
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

  const handleSpeedSelect = (nextRate: number) => {
    setPlaybackRate(nextRate);
    setOpenMenu("none");
    if (parsed.kind === "video" && htmlVideoRef.current) {
      htmlVideoRef.current.playbackRate = nextRate;
    } else if (parsed.kind === "youtube" && ytPlayerRef.current) {
      ytPlayerRef.current.setPlaybackRate?.(nextRate);
    }
  };

  const handleQualitySelect = (nextQuality: VideoQualityValue) => {
    setOpenMenu("none");
    if (nextQuality === selectedQuality) return;

    if (parsed.kind === "video" && isCloudinary && htmlVideoRef.current) {
      pendingHtmlResumeRef.current = {
        time: htmlVideoRef.current.currentTime || currentSec,
        playing: !htmlVideoRef.current.paused,
        rate: playbackRate,
      };
      setSelectedQuality(nextQuality);
      return;
    }

    setSelectedQuality(nextQuality);
    if (parsed.kind === "youtube" && ytPlayerRef.current) {
      const targetQ = nextQuality === "auto" ? "default" : nextQuality;
      try {
        ytPlayerRef.current.setPlaybackQuality?.(targetQ);
        ytPlayerRef.current.setPlaybackQualityRange?.(targetQ, targetQ);
        // Hint buffer with seamless current second when explicit quality is chosen
        if (nextQuality !== "auto" && typeof ytPlayerRef.current.loadVideoById === "function" && parsed.youtubeId) {
          const cur = Number(ytPlayerRef.current.getCurrentTime?.() || currentSec || 0);
          const wasPlaying = isPlaying;
          ytPlayerRef.current.loadVideoById({
            videoId: parsed.youtubeId,
            startSeconds: cur,
            suggestedQuality: targetQ,
          });
          if (!wasPlaying) {
            setTimeout(() => {
              ytPlayerRef.current?.pauseVideo?.();
            }, 350);
          }
          if (playbackRate !== 1) {
            setTimeout(() => {
              ytPlayerRef.current?.setPlaybackRate?.(playbackRate);
            }, 250);
          }
        }
      } catch {}
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

  // Trigger playback when parent enables autoPlay on an already-mounted video (e.g. post-unlock)
  useEffect(() => {
    if (!autoPlay) return;
    if (parsed.kind === "video" && htmlVideoRef.current && htmlVideoRef.current.paused) {
      setShowCenterIcon(false);
      void htmlVideoRef.current.play().catch(() => {});
    } else if (parsed.kind === "youtube" && ytPlayerRef.current && !isPlaying) {
      setShowCenterIcon(false);
      try {
        ytPlayerRef.current.playVideo?.();
      } catch {}
    }
  }, [autoPlay, lessonId, parsed.kind, isPlaying]);

  // Drive or fallback external iframe (uses Drive/YouTube built-in bar including gear settings)
  if (parsed.kind === "iframe" || (parsed.kind === "youtube" && ytApiFallback)) {
    const driveSrc =
      autoPlay && parsed.embedUrl && !/[?&]autoplay=/i.test(parsed.embedUrl)
        ? `${parsed.embedUrl}${parsed.embedUrl.includes("?") ? "&" : "?"}autoplay=1`
        : parsed.embedUrl;
    const blockPointerEvent = (e: React.SyntheticEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    return (
      <div
        ref={containerRef}
        className={`relative w-full max-w-full bg-black overflow-hidden select-none flex items-center justify-center ${
          isFullscreen ? "h-full" : "h-[268px] sm:h-auto sm:aspect-video"
        }`}
        onContextMenu={(e) => e.preventDefault()}
      >
        <iframe
          key={driveSrc}
          src={driveSrc}
          title={title}
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox={
            parsed.isDrive || parsed.kind === "iframe"
              ? "allow-scripts allow-same-origin allow-forms allow-presentation"
              : undefined
          }
          className="block w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
        {/* Flush full-coverage guard covering Drive's [↗] pop-out & toolbar corner (including PDF scrollbar shift) without native tooltip or exposed edges */}
        <div
          role="presentation"
          aria-label="Vùng được DkTEST bảo vệ"
          onClick={blockPointerEvent}
          onMouseDown={blockPointerEvent}
          onPointerDown={blockPointerEvent}
          onTouchStart={blockPointerEvent}
          onDoubleClick={blockPointerEvent}
          onContextMenu={blockPointerEvent}
          className="absolute top-0 right-0 w-[84px] h-[58px] sm:w-[92px] sm:h-[64px] z-20 rounded-bl-2xl bg-transparent hover:bg-slate-950/90 hover:backdrop-blur-sm text-transparent hover:text-blue-200 flex items-center justify-center transition-colors duration-150 cursor-default select-none pointer-events-auto"
        >
          <ShieldCheck className="w-4 h-4 pointer-events-none" />
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
        if (e.code === "Escape" && openMenu !== "none") {
          e.preventDefault();
          setOpenMenu("none");
          return;
        }
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
      className={`group relative w-full max-w-full bg-black overflow-hidden select-none focus:outline-none ${
        isFullscreen ? "h-full" : "aspect-video"
      }`}
    >
      {parsed.kind === "video" ? (
        <video
          ref={htmlVideoRef}
          key={activeHtmlVideoSrc}
          src={activeHtmlVideoSrc}
          playsInline
          preload="metadata"
          controls={false}
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          onClick={handleTogglePlay}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (v.videoHeight > 0 && selectedQuality === "auto") {
              setNativeVideoHeight(v.videoHeight);
            }
            const d = Math.round(Number(v.duration) || 0);
            if (d > 0) {
              setDurationSec(d);
              if (!durationNotifiedRef.current) {
                durationNotifiedRef.current = true;
                onDetectedDuration?.(d);
              }
            }
            const resume = pendingHtmlResumeRef.current;
            if (resume) {
              pendingHtmlResumeRef.current = null;
              v.playbackRate = resume.rate;
              if (resume.time > 0 && d > 0) {
                v.currentTime = Math.min(resume.time, Math.max(0, d - 0.5));
              }
              if (resume.playing) {
                void v.play().catch(() => {});
              }
            } else {
              v.playbackRate = playbackRateRef.current;
              if (initialSeconds > 5 && d > 0 && initialSeconds < d - 5) {
                v.currentTime = initialSeconds;
              }
              if (autoPlayRef.current) {
                setShowCenterIcon(false);
                void v.play().catch(() => {});
              }
            }
          }}
          onError={() => {
            // Gracefully fall back to original URL if dynamic quality transform fails
            if (selectedQuality !== "auto") {
              setSelectedQuality("auto");
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
          <div
            ref={ytHostRef}
            className="w-full h-full pointer-events-none flex items-center justify-center [&>div]:!w-full [&>div]:!h-full [&>iframe]:!w-full [&>iframe]:!h-full [&>iframe]:!max-w-full [&>iframe]:block"
          />
          {/* Transparent tap layer so clicking anywhere toggles DkTEST play/pause or closes open popover */}
          <div
            onClick={handleTogglePlay}
            onDoubleClick={() => {
              if (openMenu === "none") void handleToggleFullscreen();
            }}
            className="absolute inset-0 bottom-14 z-10 cursor-pointer"
          />
        </>
      )}

      {/* Center Play Overlay when idle/paused */}
      {(!isPlaying || showCenterIcon) && openMenu === "none" && (
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
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-slate-950/95 via-slate-950/85 to-transparent pt-6 pb-2.5 px-3 sm:px-4 space-y-2 transition-opacity">
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
        <div className="flex items-center justify-between gap-1 sm:gap-2 text-white text-xs">
          <div className="flex items-center gap-0.5 sm:gap-2 min-w-0">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer shrink-0"
              title={isPlaying ? "Tạm dừng" : "Phát"}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            <button
              type="button"
              onClick={() => handleSeek(currentSec - 10)}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer flex items-center gap-0.5 shrink-0"
              title="Lùi 10 giây"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold hidden sm:inline">10s</span>
            </button>

            <button
              type="button"
              onClick={() => handleSeek(currentSec + 10)}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer flex items-center gap-0.5 shrink-0"
              title="Tua tới 10 giây"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold hidden sm:inline">10s</span>
            </button>

            <button
              type="button"
              onClick={handleToggleMute}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer shrink-0"
              title={muted ? "Bật tiếng" : "Tắt tiếng"}
            >
              {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <span className="font-mono text-[10px] sm:text-[11px] font-bold text-slate-200 tabular-nums truncate">
              {formatDurationClock(currentSec)} / {formatDurationClock(durationSec)}
            </span>
          </div>

          <div ref={controlsMenuAreaRef} className="relative flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Resolution / Quality List Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu((m) => (m === "quality" ? "none" : "quality"))}
                className={`px-1.5 sm:px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  openMenu === "quality"
                    ? "bg-blue-600 text-white"
                    : "bg-white/15 hover:bg-blue-600/80 text-white"
                }`}
                title="Chọn độ phân giải video"
                aria-expanded={openMenu === "quality"}
              >
                <SlidersHorizontal className="w-3 h-3 shrink-0 hidden sm:inline" />
                <span>{activeQualityLabel}</span>
                <ChevronUp
                  className={`w-3 h-3 transition-transform ${openMenu === "quality" ? "rotate-180" : ""}`}
                />
              </button>

              {openMenu === "quality" && (
                <div
                  role="menu"
                  aria-label="Danh sách độ phân giải"
                  className="absolute bottom-full right-0 mb-2 w-48 sm:w-52 max-h-36 sm:max-h-64 overflow-y-auto rounded-2xl bg-slate-900/95 backdrop-blur-md border border-white/15 shadow-2xl p-1.5 space-y-0.5 z-30"
                >
                  <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-white/10">
                    Độ phân giải
                  </div>
                  {qualityOptions.map((opt) => {
                    const isActive = selectedQuality === opt.value;
                    const actualNote =
                      opt.value === "auto" && parsed.kind === "youtube" && actualYtQuality
                        ? ` (${formatQualityLabel(actualYtQuality).shortLabel})`
                        : "";
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isActive}
                        onClick={() => handleQualitySelect(opt.value)}
                        className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : "text-slate-200 hover:bg-white/10"
                        }`}
                      >
                        <span className="truncate">
                          {opt.label}
                          {actualNote}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          {opt.badge && (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                                isActive ? "bg-white/25 text-white" : "bg-blue-500/30 text-blue-200"
                              }`}
                            >
                              {opt.badge}
                            </span>
                          )}
                          {isActive && <Check className="w-3.5 h-3.5" />}
                        </span>
                      </button>
                    );
                  })}
                  {parsed.kind === "video" && !isCloudinary && (
                    <div className="px-2.5 pt-1 pb-0.5 text-[10px] text-slate-400 leading-snug">
                      Video MP4 phát trực tiếp đúng độ phân giải gốc.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Playback Speed List Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu((m) => (m === "speed" ? "none" : "speed"))}
                className={`px-1.5 sm:px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center gap-1 transition-colors cursor-pointer ${
                  openMenu === "speed"
                    ? "bg-blue-600 text-white"
                    : "bg-white/15 hover:bg-blue-600/80 text-white"
                }`}
                title="Chọn tốc độ phát"
                aria-expanded={openMenu === "speed"}
              >
                <Gauge className="w-3 h-3 shrink-0 hidden sm:inline" />
                <span>{playbackRate}x</span>
                <ChevronUp
                  className={`w-3 h-3 transition-transform ${openMenu === "speed" ? "rotate-180" : ""}`}
                />
              </button>

              {openMenu === "speed" && (
                <div
                  role="menu"
                  aria-label="Danh sách tốc độ phát"
                  className="absolute bottom-full right-0 mb-2 w-40 sm:w-44 max-h-36 sm:max-h-64 overflow-y-auto rounded-2xl bg-slate-900/95 backdrop-blur-md border border-white/15 shadow-2xl p-1.5 space-y-0.5 z-30"
                >
                  <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-white/10">
                    Tốc độ phát
                  </div>
                  {VIDEO_SPEED_OPTIONS.map((rate) => {
                    const isActive = playbackRate === rate;
                    return (
                      <button
                        key={rate}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isActive}
                        onClick={() => handleSpeedSelect(rate)}
                        className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-bold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : "text-slate-200 hover:bg-white/10"
                        }`}
                      >
                        <span>{rate === 1 ? "1x (Chuẩn)" : `${rate}x`}</span>
                        {isActive && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <span
              className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600/30 border border-blue-400/30 text-[10px] font-bold text-blue-200"
              title="DkTEST Video Player"
            >
              <ShieldCheck className="w-3 h-3" />
              <span>DkTEST</span>
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
