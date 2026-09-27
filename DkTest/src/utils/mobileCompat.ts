/**
 * Mobile Android Chrome Compatibility & API Safety Layer
 * Ensures no missing or restricted browser API can cause a ReferenceError or crash.
 */

/**
 * Safe BroadcastChannel factory: returns a dummy shim if BroadcastChannel is not supported.
 */
export function createSafeBroadcastChannel(channelName: string): {
  postMessage: (message: any) => void;
  close: () => void;
  onmessage: ((ev: MessageEvent) => any) | null;
  onmessageerror: ((ev: MessageEvent) => any) | null;
} {
  try {
    if (typeof window !== "undefined" && typeof window.BroadcastChannel !== "undefined") {
      return new window.BroadcastChannel(channelName);
    }
  } catch (e) {
    console.warn(`[mobileCompat] BroadcastChannel("${channelName}") not available:`, e);
  }

  // Fallback dummy shim
  return {
    postMessage: () => {},
    close: () => {},
    onmessage: null,
    onmessageerror: null,
  };
}

/**
 * Checks if IntersectionObserver is supported
 */
export function hasIntersectionObserver(): boolean {
  return typeof window !== "undefined" && typeof window.IntersectionObserver !== "undefined";
}

/**
 * Checks if ResizeObserver is supported
 */
export function hasResizeObserver(): boolean {
  return typeof window !== "undefined" && typeof window.ResizeObserver !== "undefined";
}

/**
 * Generates a safe UUID v4 even if window.crypto.randomUUID is not available in non-HTTPS / older Android
 */
export function safeRandomUUID(): string {
  try {
    if (typeof window !== "undefined" && window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
  } catch {}

  // Math.random RFC4122-compliant fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Safe Clipboard text copy with fallback to execCommand('copy') for older mobile WebViews
 */
export async function safeCopyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  // execCommand textarea fallback
  try {
    if (typeof document !== "undefined") {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      return successful;
    }
  } catch {}

  return false;
}

/**
 * Safe Fullscreen request
 */
export async function safeRequestFullscreen(element: HTMLElement): Promise<boolean> {
  try {
    if (!element) return false;
    const req =
      element.requestFullscreen ||
      (element as any).webkitRequestFullscreen ||
      (element as any).mozRequestFullScreen ||
      (element as any).msRequestFullscreen;

    if (typeof req === "function") {
      await req.call(element);
      return true;
    }
  } catch (err) {
    console.warn("[mobileCompat] Fullscreen request rejected or unsupported:", err);
  }
  return false;
}

/**
 * Safe Exit Fullscreen
 */
export async function safeExitFullscreen(): Promise<boolean> {
  try {
    if (typeof document === "undefined") return false;
    const isFullscreen =
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement;

    if (!isFullscreen) return true;

    const exit =
      document.exitFullscreen ||
      (document as any).webkitExitFullscreen ||
      (document as any).mozCancelFullScreen ||
      (document as any).msExitFullscreen;

    if (typeof exit === "function") {
      await exit.call(document);
      return true;
    }
  } catch (err) {
    console.warn("[mobileCompat] Exit fullscreen error:", err);
  }
  return false;
}

/**
 * Safe Web Share API
 */
export async function safeShare(data: { title?: string; text?: string; url?: string }): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      await navigator.share(data);
      return true;
    }
  } catch (err) {
    // User cancelled share or unsupported
  }
  return false;
}
