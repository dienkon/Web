/**
 * Safe localStorage Cache with TTL
 */

const PREFIX = "dkdoc_";

export const localCache = {
  set(key, value, ttlMs = 60 * 60 * 1000) {
    try {
      const payload = {
        data: value,
        expiresAt: Date.now() + ttlMs,
      };
      localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(payload));
    } catch {}
  },

  get(key) {
    try {
      const item = localStorage.getItem(`${PREFIX}${key}`);
      if (!item) return null;

      const payload = JSON.parse(item);
      if (Date.now() > payload.expiresAt) {
        localStorage.removeItem(`${PREFIX}${key}`);
        return null;
      }

      return payload.data;
    } catch {
      return null;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(`${PREFIX}${key}`);
    } catch {}
  },

  clear() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  },
};
