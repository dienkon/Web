/**
 * Document Service
 */
import { DocumentRepository } from "../repositories/document.repository.js";
import { KeyService } from "./key.service.js";
import { store } from "../app/state.js";
import { normalizeDocKeywords, matchesSearch } from "../utils/url.js";
import { notificationService } from "./notification.service.js";
import { APP_CONFIG } from "../config/app-config.js";
import { logger } from "../utils/logger.js";
import { SEED_DOCUMENTS } from "../data/seed/documents.seed.js";

let activeViewTracker = null;

export const DocumentService = {
  /**
   * Load and cache all active documents
   */
  async loadDocuments(forceFresh = false) {
    let docs = null;
    try {
      docs = await DocumentRepository.getAllDocuments(forceFresh);
    } catch (err) {
      logger.warn("Firebase document load error, using seed fallback:", err);
    }

    const formattedDocs = {};
    if (docs && Object.keys(docs).length > 0) {
      Object.entries(docs).forEach(([id, d]) => {
        if (d && typeof d === "object") {
          formattedDocs[id] = { ...d, id: d.id || id };
        }
      });
    } else {
      SEED_DOCUMENTS.forEach((d) => {
        formattedDocs[d.id] = { ...d };
      });
    }

    store.setDocuments(formattedDocs);
    return formattedDocs;
  },

  /**
   * Get single document
   */
  async getDocument(docId, forceFresh = false) {
    if (!docId) return null;
    let doc = store.getState().documents.items[docId];
    if (!doc || forceFresh) {
      try {
        doc = await DocumentRepository.getDocumentById(docId, forceFresh);
      } catch (err) {
        logger.warn("Firebase document get error:", err);
      }
      if (!doc) {
        const seed = SEED_DOCUMENTS.find((d) => d.id === docId);
        if (seed) {
          doc = { ...seed };
        }
      }
      if (doc) {
        doc = { ...doc, id: doc.id || docId };
        store.patchDocument(docId, doc);
      }
    }
    return doc ? { ...doc, id: doc.id || docId } : null;
  },

  /**
   * Filter and search documents
   */
  filterDocuments(docsMap, { filter = "all", search = "" } = {}) {
    const docs = Object.entries(docsMap || {}).map(([id, d]) => ({ id, ...d }));
    let result = docs.filter((d) => d.status === "active");

    // Category / keyword filter
    if (filter && filter !== "all") {
      if (filter === "free") {
        result = result.filter((d) => Number(d.price) === 0);
      } else {
        result = result.filter((d) => {
          const keywords = normalizeDocKeywords(d);
          const category = String(d.category || d.subject || "").trim();
          return (
            keywords.some((k) => k.toLowerCase() === filter.toLowerCase()) ||
            category.toLowerCase() === filter.toLowerCase()
          );
        });
      }
    }

    // Search query
    if (search && search.trim()) {
      const q = search.trim();
      result = result.filter((d) => {
        const keywordsStr = normalizeDocKeywords(d).join(" ");
        return (
          matchesSearch(d.title, q) ||
          matchesSearch(d.description, q) ||
          matchesSearch(d.category, q) ||
          matchesSearch(d.subject, q) ||
          matchesSearch(d.grade, q) ||
          matchesSearch(keywordsStr, q)
        );
      });
    }

    // Sort: featured first, then newest
    return result.sort((a, b) => {
      const featA = a.featured ? 1 : 0;
      const featB = b.featured ? 1 : 0;
      if (featB !== featA) return featB - featA;
      return (Number(b.featuredOrder) || 0) - (Number(a.featuredOrder) || 0) || (b.createdAt || 0) - (a.createdAt || 0);
    });
  },

  /**
   * Get featured documents for hero carousel
   */
  getFeaturedDocuments(docsMap) {
    const docs = Object.entries(docsMap || {}).map(([id, d]) => ({ id, ...d }));
    return docs
      .filter((d) => d.status === "active" && d.featured)
      .sort((a, b) => {
        const orderDelta = Number(b.featuredOrder || 0) - Number(a.featuredOrder || 0);
        if (orderDelta !== 0) return orderDelta;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  },

  /**
   * View tracking session
   */
  startViewTracker(docId, onCountedCallback) {
    this.stopViewTracker();
    const currentUser = store.getState().auth.currentUser;
    if (!currentUser || !docId) return;

    let moved = false;
    let counted = false;

    const onMove = () => {
      moved = true;
    };

    const cleanupListeners = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("pointermove", onMove);
    };

    const timer = setTimeout(async () => {
      if (counted) return;
      counted = true;
      cleanupListeners();

      const currentDocId = store.getState().documents.currentDocId;
      if (!moved || currentDocId !== docId) return;

      const doc = store.getState().documents.items[docId];
      if (!doc) return;

      try {
        const nextViews = await DocumentRepository.incrementViews(docId, doc.views);
        store.patchDocument(docId, { views: nextViews });
        if (onCountedCallback) onCountedCallback(nextViews);
      } catch (err) {
        logger.warn("View tracking update failed:", err);
      }
    }, APP_CONFIG.VIEW_TRACKER.DELAY_MS);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });

    activeViewTracker = {
      docId,
      cleanup: () => {
        clearTimeout(timer);
        cleanupListeners();
      },
    };
  },

  stopViewTracker() {
    if (activeViewTracker) {
      activeViewTracker.cleanup();
      activeViewTracker = null;
    }
  },

  /**
   * Track document link click & log key usage
   */
  async trackLinkClick(docId, url, label = "", source = "link") {
    const user = store.getState().auth.currentUser;
    const userData = store.getState().user.data;
    if (!user || !docId || !url) return;

    const doc = store.getState().documents.items[docId] || {};
    const action = source === "key" ? "open_key" : source === "open_doc" ? "open_doc" : "open_link";

    await KeyService.logKeyUsage({
      userId: user.uid,
      userName: userData?.name || user.email || user.uid,
      email: userData?.email || user.email || "",
      docId,
      docTitle: doc.title || "",
      purchaseId: "",
      key: action === "open_key" ? String(label || url) : "",
      action,
      keyPoolId: doc.keyPoolId || "",
      linkLabel: label || "",
      linkUrl: url || "",
    });
  },

  /**
   * Admin: Save (create or update) document
   */
  async saveDocument(docData, docId = null) {
    const user = store.getState().auth.currentUser;
    if (!user) throw new Error("Chưa đăng nhập.");

    if (docId) {
      await DocumentRepository.updateDocument(docId, {
        ...docData,
        updatedAt: Date.now(),
      });
      store.patchDocument(docId, docData);
      notificationService.success("Cập nhật tài liệu thành công!");
      return docId;
    } else {
      const payload = {
        ...docData,
        status: "active",
        createdBy: user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        views: 0,
        buys: 0,
        featured: false,
        featuredOrder: 0,
      };
      const newId = await DocumentRepository.createDocument(payload);
      store.patchDocument(newId, payload);
      notificationService.success("Đăng tài liệu mới thành công!");
      return newId;
    }
  },

  /**
   * Admin: Clone document
   */
  async cloneDocument(docId) {
    const doc = store.getState().documents.items[docId];
    if (!doc) throw new Error("Không tìm thấy tài liệu.");

    const user = store.getState().auth.currentUser;
    const clonePayload = {
      ...doc,
      title: `${doc.title || "Tài liệu"} (Bản sao)`,
      views: 0,
      buys: 0,
      featured: false,
      featuredOrder: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: user?.uid || doc.createdBy,
    };
    delete clonePayload.id;

    const newId = await DocumentRepository.createDocument(clonePayload);
    store.patchDocument(newId, clonePayload);
    notificationService.success("Nhân bản tài liệu thành công!");
    return newId;
  },

  /**
   * Admin: Toggle featured
   */
  async toggleFeatured(docId) {
    const doc = store.getState().documents.items[docId];
    if (!doc) return;

    const nextFeatured = !doc.featured;
    const featuredOrder = nextFeatured ? Date.now() : 0;

    await DocumentRepository.updateDocument(docId, {
      featured: nextFeatured,
      featuredOrder,
    });
    store.patchDocument(docId, { featured: nextFeatured, featuredOrder });
    notificationService.success(nextFeatured ? "Đã ghim nổi bật!" : "Đã hủy ghim nổi bật.");
  },

  /**
   * Admin: Delete document
   */
  async deleteDocument(docId) {
    await DocumentRepository.deleteDocument(docId);
    const docs = { ...store.getState().documents.items };
    delete docs[docId];
    store.setDocuments(docs);
    notificationService.success("Đã xóa tài liệu.");
  },
};
