/**
 * Document Repository
 */
import { FirebaseRepository } from "./firebase.repository.js";
import { Collections } from "../app/constants.js";
import { memoryCache } from "../cache/memory-cache.js";
import { CacheKeys, cachePolicy } from "../cache/cache-policy.js";
import { APP_CONFIG } from "../config/app-config.js";

export const DocumentRepository = {
  /**
   * Fetch all documents with memory caching
   */
  async getAllDocuments(forceFresh = false) {
    if (!forceFresh) {
      const cached = memoryCache.get(CacheKeys.DOCUMENTS);
      if (cached) return cached;
    }

    const rawDocs = await FirebaseRepository.getAll(Collections.DOCUMENTS);
    const docs = {};
    if (rawDocs && typeof rawDocs === "object") {
      Object.entries(rawDocs).forEach(([id, d]) => {
        if (d && typeof d === "object") {
          docs[id] = { ...d, id: d.id || id };
        }
      });
    }

    memoryCache.set(CacheKeys.DOCUMENTS, docs, APP_CONFIG.CACHE.DOCUMENTS_TTL_MS);
    return docs;
  },

  /**
   * Fetch single document with memory caching
   */
  async getDocumentById(id, forceFresh = false) {
    if (!id) return null;
    const cacheKey = `${CacheKeys.DOC_PREFIX}${id}`;

    if (!forceFresh) {
      const cached = memoryCache.get(cacheKey);
      if (cached) return cached;
    }

    const doc = await FirebaseRepository.get(Collections.DOCUMENTS, id);
    if (doc && typeof doc === "object") {
      const formatted = { ...doc, id: doc.id || id };
      memoryCache.set(cacheKey, formatted, APP_CONFIG.CACHE.DOCUMENTS_TTL_MS);
      return formatted;
    }
    return null;
  },

  /**
   * Create new document
   */
  async createDocument(data) {
    cachePolicy.invalidateDocuments();
    cachePolicy.invalidateAdmin("docs");
    return await FirebaseRepository.push(Collections.DOCUMENTS, data);
  },

  /**
   * Update existing document
   */
  async updateDocument(id, partial) {
    cachePolicy.invalidateDocuments();
    cachePolicy.invalidateAdmin("docs");
    return await FirebaseRepository.update(Collections.DOCUMENTS, id, partial);
  },

  /**
   * Delete document
   */
  async deleteDocument(id) {
    cachePolicy.invalidateDocuments();
    cachePolicy.invalidateAdmin("docs");
    return await FirebaseRepository.remove(Collections.DOCUMENTS, id);
  },

  /**
   * Increment document view count safely
   */
  async incrementViews(id, currentViews) {
    const nextViews = Number(currentViews || 0) + 1;
    await FirebaseRepository.update(Collections.DOCUMENTS, id, {
      views: nextViews,
      updatedAt: Date.now(),
    });
    return nextViews;
  },

  /**
   * Increment document buys count
   */
  async incrementBuys(id, currentBuys) {
    const nextBuys = Number(currentBuys || 0) + 1;
    await FirebaseRepository.update(Collections.DOCUMENTS, id, {
      buys: nextBuys,
    });
    return nextBuys;
  },
};
