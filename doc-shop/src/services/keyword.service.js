/**
 * Keyword & Category Service
 */
import { KeywordRepository } from "../repositories/keyword.repository.js";
import { store } from "../app/state.js";
import { slugify, normalizeDocKeywords } from "../utils/url.js";
import { notificationService } from "./notification.service.js";

export const KeywordService = {
  /**
   * Load all keywords
   */
  async loadKeywords(forceFresh = false) {
    const raw = await KeywordRepository.getAllKeywords(forceFresh);
    store.setKeywords(raw);
    return raw;
  },

  /**
   * Format keywords as standardized array of objects
   */
  getKeywordList() {
    const raw = store.getState().keywords.items || {};
    if (Array.isArray(raw)) {
      return raw
        .map((item) =>
          typeof item === "string"
            ? { id: slugify(item), name: item, createdAt: 0, updatedAt: 0 }
            : item,
        )
        .filter((item) => item?.name)
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "vi"));
    }

    return Object.entries(raw)
      .map(([id, val]) => ({
        id,
        ...(val || {}),
        name: val?.name || val?.label || id,
      }))
      .filter((item) => item.name)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "vi"));
  },

  /**
   * Get all known categories across keywords and existing documents
   */
  getKnownCategories() {
    const set = new Set();
    this.getKeywordList().forEach((kw) => {
      if (kw.name) set.add(kw.name);
    });

    const docs = store.getState().documents.items || {};
    Object.values(docs).forEach((doc) => {
      normalizeDocKeywords(doc).forEach((tag) => {
        if (tag) set.add(tag);
      });
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b, "vi"));
  },

  /**
   * Admin: Add/Update keyword
   */
  async saveKeyword(name) {
    const cleanName = String(name || "").trim();
    if (!cleanName) return null;

    const id = slugify(cleanName);
    const existing = store.getState().keywords.items?.[id] || {};

    const payload = {
      id,
      name: cleanName,
      createdAt: existing.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    await KeywordRepository.setKeyword(id, payload);
    const updated = { ...store.getState().keywords.items, [id]: payload };
    store.setKeywords(updated);

    notificationService.success(`Đã lưu từ khóa "${cleanName}".`);
    return id;
  },

  /**
   * Admin: Delete keyword
   */
  async deleteKeyword(id) {
    await KeywordRepository.deleteKeyword(id);
    const updated = { ...store.getState().keywords.items };
    delete updated[id];
    store.setKeywords(updated);
    notificationService.success("Đã xóa từ khóa.");
  },
};
