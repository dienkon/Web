/**
 * App Configuration & Constants
 */

export const APP_CONFIG = {
  APP_NAME: "DkDocShop",
  APP_TITLE: "DkDocShop - Nền tảng Tài Liệu Số",
  APP_DESCRIPTION: "Kho Tài Liệu Số Học Tập Chất Lượng Cao",

  CACHE: {
    DOCUMENTS_TTL_MS: 5 * 60 * 1000, // 5 minutes
    KEYWORDS_TTL_MS: 10 * 60 * 1000, // 10 minutes
    ADMIN_CACHE_TTL_MS: 2 * 60 * 1000, // 2 minutes
  },

  SEARCH: {
    DEBOUNCE_MS: 200,
  },

  VIEW_TRACKER: {
    DELAY_MS: 3000,
  },

  UPLOAD: {
    MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },

  PAGINATION: {
    DEFAULT_PAGE_SIZE: 12,
    ADMIN_PAGE_SIZE: 20,
  },

  CAROUSEL: {
    AUTO_INTERVAL_MS: 4500,
  },
};
