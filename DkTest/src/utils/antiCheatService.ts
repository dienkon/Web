/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Comprehensive Anti-Cheat & Academic Integrity Shield for DkTEST
 * Covers:
 * - PC & Mobile Screenshot detection (PrintScreen, Meta+Shift+S, Snipping tool, blur on capture)
 * - Copy/Paste/Cut/ContextMenu/Drag interception & Clipboard wiping
 * - Gemini Live, AI overlay, and Screen Share detection (blur, visibilitychange, devtools, mediaDevices)
 * - Screen shield flash to foil screen captures
 */

import { useEffect, useRef, useState, useCallback } from "react";

export type AntiCheatViolationType =
  | "screenshot"
  | "copy_attempt"
  | "cut_attempt"
  | "context_menu"
  | "tab_switch"
  | "window_blur"
  | "gemini_live_or_screen_share"
  | "devtools_open";

export interface AntiCheatViolation {
  type: AntiCheatViolationType;
  message: string;
  timestamp: number;
}

export interface AntiCheatOptions {
  enabled: boolean;
  maxViolations?: number;
  onViolation?: (violation: AntiCheatViolation, totalViolations: number) => void;
  onAutoSubmit?: (reason: string) => void;
  containerElement?: HTMLElement | null;
  targetExamOrStageName?: string;
}

/**
 * Checks if a touch event matches the mobile 3-finger swipe screenshot gesture
 */
export function isMobileScreenshotTouch(
  e: TouchEvent | { touches?: { length: number }[] | ArrayLike<any> }
): boolean {
  return !!(e && e.touches && e.touches.length >= 3);
}

/**
 * Checks if key event matches common screenshot keyboard shortcuts across OSes (PC & Mobile)
 */
export function isScreenshotKeyEvent(
  e: KeyboardEvent | { key?: string; code?: string; keyCode?: number; metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean }
): boolean {
  const key = e.key || "";
  const code = e.code || "";
  const keyCode = e.keyCode || 0;

  // 1. Direct PrintScreen key
  if (
    key === "PrintScreen" ||
    code === "PrintScreen" ||
    keyCode === 44 ||
    key === "Snapshot"
  ) {
    return true;
  }

  // 2. Windows Snipping Tool: Meta + Shift + S OR Win + Shift + S
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && (key.toLowerCase() === "s" || code === "KeyS")) {
    return true;
  }

  // 3. MacOS Screenshot Shortcuts: Cmd + Shift + 3, 4, 5
  if (e.metaKey && e.shiftKey && ["3", "4", "5", "Digit3", "Digit4", "Digit5"].includes(key || code)) {
    return true;
  }

  // 4. Ctrl + PrintScreen / Alt + PrintScreen
  if ((e.ctrlKey || e.altKey) && (key === "PrintScreen" || keyCode === 44)) {
    return true;
  }

  // 5. Mobile Hardware Keys (VolumeDown / AudioVolumeDown keyCode 174 or 25)
  if (
    key === "VolumeDown" ||
    key === "AudioVolumeDown" ||
    code === "VolumeDown" ||
    code === "AudioVolumeDown" ||
    keyCode === 174 ||
    keyCode === 25
  ) {
    return true;
  }

  return false;
}

/**
 * Clears or overwrites clipboard content with anti-cheat academic integrity notice
 */
export async function sanitizeClipboardOnViolation(): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(
        "CẢNH BÁO HỆ THỐNG DkTEST: Đề thi được bảo mật theo chuẩn khảo thí. Hành vi sao chép hoặc chụp ảnh đã bị ghi nhận vào nhật ký vi phạm."
      );
    }
  } catch (_) {
    // Clipboard permission denied or unsupported in non-secure context
  }
}

/**
 * React hook to attach complete anti-cheat monitoring to a taking session
 */
export function useAntiCheat({
  enabled = true,
  maxViolations = 3,
  onViolation,
  onAutoSubmit,
  containerElement = null,
  targetExamOrStageName = "Bài thi / Thử thách",
}: AntiCheatOptions) {
  const [violationsCount, setViolationsCount] = useState<number>(0);
  const [isScreenShielded, setIsScreenShielded] = useState<boolean>(false);
  const [lastViolation, setLastViolation] = useState<AntiCheatViolation | null>(null);

  const lastViolationTimeRef = useRef<number>(0);
  const lastVolumeKeyPressTimeRef = useRef<number>(0);
  const shieldTimeoutRef = useRef<any>(null);

  const triggerViolation = useCallback(
    (type: AntiCheatViolationType, message: string) => {
      if (!enabled) return;
      const now = Date.now();
      // 1200ms cooldown to avoid cascade alerts (e.g. keydown + blur simultaneous)
      if (now - lastViolationTimeRef.current < 1200) return;
      lastViolationTimeRef.current = now;

      const violation: AntiCheatViolation = { type, message, timestamp: now };
      setLastViolation(violation);

      setViolationsCount((prev) => {
        const next = prev + 1;
        onViolation?.(violation, next);

        if (maxViolations > 0 && next >= maxViolations) {
          onAutoSubmit?.(
            `Đã vượt quá số lần cảnh báo gian lận (${next}/${maxViolations}). Hệ thống tiến hành xử lý bài làm.`
          );
        }
        return next;
      });

      // Temporarily blank/shield the screen to ruin screenshot captures
      if (type === "screenshot" || type === "gemini_live_or_screen_share") {
        setIsScreenShielded(true);
        sanitizeClipboardOnViolation();
        if (shieldTimeoutRef.current) clearTimeout(shieldTimeoutRef.current);
        shieldTimeoutRef.current = setTimeout(() => {
          setIsScreenShielded(false);
        }, 1500);
      }
    },
    [enabled, maxViolations, onViolation, onAutoSubmit]
  );

  useEffect(() => {
    if (!enabled) return;

    // 1. Keyboard Screenshot Interception (PC & Mobile External Keys)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Track VolumeDown key for mobile hardware screenshot combination (Power + VolDown)
      if (
        e.key === "VolumeDown" ||
        e.key === "AudioVolumeDown" ||
        e.code === "VolumeDown" ||
        e.code === "AudioVolumeDown" ||
        e.keyCode === 174 ||
        e.keyCode === 25
      ) {
        lastVolumeKeyPressTimeRef.current = Date.now();
      }

      if (isScreenshotKeyEvent(e)) {
        if (e.key !== "VolumeDown" && e.key !== "AudioVolumeDown") {
          e.preventDefault();
        }
        triggerViolation(
          "screenshot",
          "Phát hiện phím chụp ảnh màn hình (PrintScreen / Snipping Tool / Phím cứng điện thoại). Đề thi được bảo vệ chống sao chụp!"
        );
      }

      // Block Ctrl+C, Ctrl+A, Ctrl+U, Ctrl+Shift+I in exam container
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
        // Only allow if user is in an input or textarea
        const target = e.target as HTMLElement;
        if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
        e.preventDefault();
        sanitizeClipboardOnViolation();
        triggerViolation("copy_attempt", "Phát hiện tổ hợp phím sao chép nội dung câu hỏi!");
      }

      // Block Inspect / DevTools shortcut (F12 or Ctrl+Shift+I)
      if (e.key === "F12" || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j"))) {
        e.preventDefault();
        triggerViolation("devtools_open", "Phát hiện thao tác mở Developer Tools hoặc kiểm tra mã nguồn!");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isScreenshotKeyEvent(e)) {
        triggerViolation("screenshot", "Phát hiện thao tác chụp màn hình!");
      }
    };

    // 2. Mobile Touch Gestures (3-finger swipe screenshot on Android / iOS)
    const handleTouchStart = (e: TouchEvent) => {
      if (isMobileScreenshotTouch(e)) {
        e.preventDefault();
        triggerViolation(
          "screenshot",
          "Phát hiện cử chỉ chụp màn hình 3 ngón tay trên điện thoại! Đề thi đã được che bảo mật."
        );
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isMobileScreenshotTouch(e)) {
        e.preventDefault();
        triggerViolation(
          "screenshot",
          "Phát hiện cử chỉ vuốt 3 ngón tay để chụp màn hình trên điện thoại!"
        );
      }
    };

    // 3. Copy & Cut Interception
    const handleCopy = (e: ClipboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && ["INPUT", "TEXTAREA"].includes(activeEl.tagName)) return;
      e.preventDefault();
      sanitizeClipboardOnViolation();
      triggerViolation("copy_attempt", "Không được phép sao chép nội dung bài kiểm tra / câu hỏi!");
    };

    const handleCut = (e: ClipboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && ["INPUT", "TEXTAREA"].includes(activeEl.tagName)) return;
      e.preventDefault();
      triggerViolation("cut_attempt", "Không được phép cắt nội dung đề thi!");
    };

    // 4. Drag & Selection Interception (Prevents dragging questions into AI overlays/sidebars)
    const handleDragStart = (e: DragEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && ["INPUT", "TEXTAREA"].includes(activeEl.tagName)) return;
      e.preventDefault();
      triggerViolation("copy_attempt", "Không được phép kéo thả nội dung đề bài ra ngoài giao diện thi!");
    };

    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      // Suppress text selection
    };

    // 5. Context Menu (Right Click / Long press on mobile)
    const handleContextMenu = (e: MouseEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && ["INPUT", "TEXTAREA"].includes(activeEl.tagName)) return;
      e.preventDefault();
      triggerViolation("context_menu", "Thao tác chuột phải / giữ đè bị vô hiệu hóa trong phiên làm bài!");
    };

    // 6. Tab Switch, Window Blur & Gemini Live / AI Overlay / Mobile Screenshot Detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // If volume down was pressed right before visibility change, it's a mobile screenshot
        if (Date.now() - lastVolumeKeyPressTimeRef.current < 1200) {
          triggerViolation(
            "screenshot",
            "Phát hiện thao tác chụp màn hình bằng phím cứng trên điện thoại!"
          );
        } else {
          triggerViolation(
            "tab_switch",
            "Cảnh báo: Bạn đã rời khỏi giao diện làm bài hoặc chuyển sang tab khác!"
          );
        }
      }
    };

    const handleWindowBlur = () => {
      // If volume down was pressed within 1200ms, flag as hardware screenshot
      if (Date.now() - lastVolumeKeyPressTimeRef.current < 1200) {
        triggerViolation(
          "screenshot",
          "Phát hiện thao tác chụp màn hình bằng phím cứng trên điện thoại!"
        );
      } else {
        triggerViolation(
          "window_blur",
          "Cảnh báo: Cửa sổ thi mất tiêu điểm (chuyển ứng dụng hoặc bật trợ lý Gemini Live / Sidebar)!"
        );
      }
    };

    // 7. Screen Share / Media Stream Interception (Gemini Live Desktop Screen Sharing)
    let displayMediaDetector: any = null;
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getDisplayMedia) {
        const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getDisplayMedia = async function (...args: any[]) {
          triggerViolation(
            "gemini_live_or_screen_share",
            "Phát hiện yêu cầu chia sẻ màn hình trực tiếp (Gemini Live / Screen Recording)!"
          );
          return originalGetDisplayMedia(...args);
        };
        displayMediaDetector = () => {
          try {
            navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
          } catch (_) {}
        };
      }
    } catch (_) {}

    // Attach listeners
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("touchstart", handleTouchStart, { passive: false, capture: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true });
    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("cut", handleCut, true);
    document.addEventListener("dragstart", handleDragStart, true);
    document.addEventListener("selectstart", handleSelectStart, true);
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("touchstart", handleTouchStart, true);
      window.removeEventListener("touchmove", handleTouchMove, true);
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("cut", handleCut, true);
      document.removeEventListener("dragstart", handleDragStart, true);
      document.removeEventListener("selectstart", handleSelectStart, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      if (shieldTimeoutRef.current) clearTimeout(shieldTimeoutRef.current);
      if (displayMediaDetector) displayMediaDetector();
    };
  }, [enabled, triggerViolation]);

  return {
    violationsCount,
    setViolationsCount,
    isScreenShielded,
    lastViolation,
    triggerViolation,
  };
}

