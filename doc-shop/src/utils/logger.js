/**
 * Safe logger for development & production
 */

const isProd = typeof import.meta !== "undefined" && import.meta.env?.PROD;

export const logger = {
  debug(...args) {
    if (!isProd) {
      console.debug("[DkDocShop]", ...args);
    }
  },
  info(...args) {
    console.info("[DkDocShop]", ...args);
  },
  warn(...args) {
    console.warn("[DkDocShop]", ...args);
  },
  error(...args) {
    console.error("[DkDocShop]", ...args);
  },
};
