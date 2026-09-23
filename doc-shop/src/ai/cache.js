/**
 * DkAI In-Memory & Local Query Cache with TTL (Section BC)
 */

const CACHE_PREFIX = "dkai_cache_";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class AICache {
  constructor() {
    this.memoryMap = new Map();
  }

  hashKey(mode, prompt, context = "") {
    const raw = `${mode}__${prompt.trim().toLowerCase()}__${context.trim().slice(0, 100)}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return `${CACHE_PREFIX}${Math.abs(hash)}`;
  }

  get(mode, prompt, context = "") {
    const key = this.hashKey(mode, prompt, context);

    // 1. Check memory cache
    const mem = this.memoryMap.get(key);
    if (mem && mem.expiresAt > Date.now()) {
      return mem.value;
    }

    // 2. Check localStorage
    try {
      const item = localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        if (parsed.expiresAt > Date.now()) {
          this.memoryMap.set(key, parsed);
          return parsed.value;
        } else {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // Storage unavailable or disabled
    }

    return null;
  }

  set(mode, prompt, value, context = "", ttlMs = DEFAULT_TTL_MS) {
    const key = this.hashKey(mode, prompt, context);
    const record = {
      value,
      expiresAt: Date.now() + ttlMs,
    };

    this.memoryMap.set(key, record);

    try {
      localStorage.setItem(key, JSON.stringify(record));
    } catch {
      // Quota exceeded or private browsing
    }
  }

  clear() {
    this.memoryMap.clear();
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(k);
        }
      });
    } catch {}
  }
}

export const aiCache = new AICache();
export default aiCache;
