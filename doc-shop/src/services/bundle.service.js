/**
 * Document Bundle & Combo Service for DkDocShop 2.0
 * Comprehensive bundle management: dynamic document composition, pricing calculations,
 * ownership checks, transactional multi-document purchase with key allocation, and admin CRUD.
 */
import { FirebaseRepository } from "../repositories/firebase.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { DocumentRepository } from "../repositories/document.repository.js";
import { PurchaseRepository } from "../repositories/purchase.repository.js";
import { KeyService } from "./key.service.js";
import { promotionService } from "./promotion.service.js";
import { gamificationService } from "./gamification.service.js";
import { store } from "../app/state.js";
import { formatVND } from "../utils/format.js";
import { logger } from "../utils/logger.js";

const STORAGE_KEY_BUNDLES = "dkdocshop_admin_bundles";

class BundleService {
  constructor() {
    this._bundles = [];
    this.init();
  }

  async init() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BUNDLES);
      if (saved) {
        this._bundles = JSON.parse(saved);
      }
    } catch {
      this._bundles = [];
    }

    // Try fetching from Firebase RTDB if available
    try {
      const fbData = await FirebaseRepository.getAll("bundles");
      if (fbData && Object.keys(fbData).length > 0) {
        this._bundles = Object.entries(fbData).map(([id, val]) => ({
          id,
          ...val,
          salesCount: Number(val.salesCount) || 0,
          originalPrice: Number(val.originalPrice) || 0,
          bundlePrice: Number(val.bundlePrice) || 0,
          savingAmount: Number(val.savingAmount) || 0,
          discountPercent: Number(val.discountPercent) || 0,
          documentIds: Array.isArray(val.documentIds) ? val.documentIds : [],
        }));
        this._persist();
      }
    } catch {
      // Gracefully maintain local/empty bundles
    }
  }

  _persist() {
    try {
      localStorage.setItem(STORAGE_KEY_BUNDLES, JSON.stringify(this._bundles));
    } catch (e) {
      logger.warn("Failed to persist bundles to localStorage:", e);
    }
  }

  getBundles() {
    return this._bundles;
  }

  getActiveBundles() {
    return this._bundles.filter((b) => b.active);
  }

  getBundleById(id) {
    return this._bundles.find((b) => b.id === id) || null;
  }

  /**
   * Get all resolved document objects contained within a bundle
   */
  getBundleDocuments(bundleId) {
    const bundle = this.getBundleById(bundleId);
    if (!bundle || !Array.isArray(bundle.documentIds)) return [];

    const docsMap = store.getState().documents.items || {};
    return bundle.documentIds.map((id) => docsMap[id]).filter(Boolean);
  }

  /**
   * Check which documents in the bundle the user already owns
   */
  checkOwnership(bundleId, userId) {
    const bundle = this.getBundleById(bundleId);
    if (!bundle || !userId) {
      return { ownedCount: 0, totalCount: 0, allOwned: false, ownedDocIds: [] };
    }

    const purchases = Object.values(store.getState().purchases.items || {});
    const userPurchasedDocIds = new Set(
      purchases
        .filter((p) => p.userId === userId)
        .map((p) => p.documentId || p.docId)
    );

    const docIds = bundle.documentIds || [];
    const ownedDocIds = docIds.filter((id) => userPurchasedDocIds.has(id));

    return {
      ownedCount: ownedDocIds.length,
      totalCount: docIds.length,
      allOwned: docIds.length > 0 && ownedDocIds.length === docIds.length,
      ownedDocIds,
    };
  }

  /**
   * Purchase entire bundle of documents atomically
   */
  async purchaseBundle(bundleId, couponCode = "") {
    const user = store.getState().auth.currentUser;
    const userData = store.getState().user.data;

    if (!user) {
      throw new Error("Vui lòng đăng nhập để mua gói combo.");
    }

    const bundle = this.getBundleById(bundleId);
    if (!bundle) {
      throw new Error("Gói combo tài liệu không tồn tại hoặc đã ngừng cung cấp.");
    }

    if (!bundle.active) {
      throw new Error("Gói combo này hiện đang tạm khóa.");
    }

    const docIds = bundle.documentIds || [];
    if (docIds.length === 0) {
      throw new Error("Gói combo này hiện chưa chứa tài liệu nào.");
    }

    // Check if user already owns all documents in this bundle
    const ownership = this.checkOwnership(bundleId, user.uid);
    if (ownership.allOwned) {
      throw new Error("Bạn đã sở hữu toàn bộ tài liệu trong gói combo này rồi!");
    }

    let finalPrice = Number(bundle.bundlePrice) || 0;
    let appliedCoupon = null;

    // Apply voucher if supplied
    if (couponCode && couponCode.trim()) {
      const promoResult = promotionService.validateCode(couponCode, finalPrice);
      if (promoResult && promoResult.valid) {
        appliedCoupon = promoResult;
        finalPrice = promoResult.finalPrice;
      } else {
        throw new Error(promoResult?.error || "Mã giảm giá không hợp lệ cho gói combo này.");
      }
    }

    const balance = Number(userData?.walletBalance || 0);
    if (balance < finalPrice) {
      const needed = finalPrice - balance;
      throw new Error(`Số dư ví không đủ. Bạn cần nạp thêm ${formatVND(needed)} để mua gói combo này.`);
    }

    // 1. Deduct wallet balance
    const newBalance = balance - finalPrice;
    await UserRepository.updateWalletBalance(user.uid, newBalance);
    store.setUser({
      ...(userData || {}),
      walletBalance: newBalance,
    });

    // 2. Record transaction
    await TransactionRepository.createTransaction({
      userId: user.uid,
      type: "bundle_purchase",
      amount: finalPrice,
      docId: bundle.id,
      bundleId: bundle.id,
      bundleTitle: bundle.title,
      couponCode: appliedCoupon ? appliedCoupon.code : "",
      status: "success",
      createdAt: Date.now(),
    });

    // 3. Grant access to all documents in the bundle
    const docsMap = store.getState().documents.items || {};
    const newlyPurchased = [];
    const currentPurchases = { ...(store.getState().purchases.items || {}) };

    for (const docId of docIds) {
      // Skip if already owned
      if (ownership.ownedDocIds.includes(docId)) continue;

      const doc = docsMap[docId];
      if (!doc) continue;

      // Allocate key if document has key pool
      let assignedKey = "";
      let redeemUrl = "";
      if (doc.keyPoolId) {
        try {
          assignedKey = await KeyService.allocateKey(doc.keyPoolId, docId, user.uid);
          redeemUrl = assignedKey ? KeyService.buildKeyRedeemUrl(assignedKey) : "";
        } catch (e) {
          logger.warn(`Key allocation for doc ${docId} in bundle failed:`, e);
        }
      }

      const docLinks = Array.isArray(doc.links) && doc.links.length
        ? doc.links
        : doc.fileLink
          ? [{ label: "Tài liệu", url: doc.fileLink }]
          : [];

      const accessLinks = assignedKey
        ? [{ label: "Mở key truy cập", url: redeemUrl }]
        : docLinks;

      const purchaseData = {
        userId: user.uid,
        userName: userData?.name || user.displayName || "Học sinh",
        userEmail: user.email || "",
        documentId: docId,
        docId,
        docTitle: doc.title || "",
        docPrice: Number(doc.price) || 0,
        purchasedAt: Date.now(),
        purchaseDate: Date.now(),
        bundleId: bundle.id,
        bundleTitle: bundle.title,
        assignedKey: assignedKey || "",
        uniqueKey: assignedKey || "",
        redeemUrl: redeemUrl || "",
        links: accessLinks,
        driveUrl: doc.driveUrl || (docLinks[0]?.url) || "",
      };

      const newPurchaseId = await PurchaseRepository.createPurchase(purchaseData);
      currentPurchases[newPurchaseId] = { id: newPurchaseId, ...purchaseData };
      newlyPurchased.push(doc);

      // Increment doc purchase count
      try {
        await DocumentRepository.incrementPurchaseCount(docId);
      } catch (e) {
        logger.debug("Failed to increment doc buys:", e);
      }
    }

    // 4. Update store purchases
    store.setPurchases(currentPurchases);

    // 5. Increment bundle sales count
    bundle.salesCount = (Number(bundle.salesCount) || 0) + 1;
    this._persist();
    try {
      await FirebaseRepository.update("bundles", bundle.id, { salesCount: bundle.salesCount });
    } catch (e) {
      logger.debug("Failed to sync bundle sales count:", e);
    }

    // 6. Record coupon usage if applied
    if (appliedCoupon) {
      await promotionService.recordUsage(appliedCoupon.code);
    }

    // 7. Award Gamification XP
    gamificationService.addXP(250, `Sở hữu gói combo: ${bundle.title}`);

    return {
      success: true,
      bundle,
      finalPrice,
      unlockedCount: newlyPurchased.length,
      unlockedDocs: newlyPurchased,
    };
  }

  /**
   * Admin: Add new bundle
   */
  async addBundle(data) {
    const id = `bundle-${Date.now()}`;
    const origPrice = Number(data.originalPrice) || 0;
    const bunPrice = Number(data.bundlePrice) || 0;
    const savingAmount = Math.max(0, origPrice - bunPrice);
    const discountPercent = origPrice > 0 ? Math.round((savingAmount / origPrice) * 100) : 0;

    const bundle = {
      id,
      title: data.title ? data.title.trim() : "Combo Tài Liệu",
      description: data.description ? data.description.trim() : "",
      coverImage: data.coverImage || "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600",
      documentIds: Array.isArray(data.documentIds) ? data.documentIds : [],
      grade: data.grade ? data.grade.trim() : "Chung",
      subject: data.subject ? data.subject.trim() : "Tổng hợp",
      originalPrice: origPrice,
      bundlePrice: bunPrice,
      savingAmount,
      discountPercent,
      salesCount: 0,
      active: data.active !== undefined ? Boolean(data.active) : true,
      createdAt: Date.now(),
    };

    this._bundles.unshift(bundle);
    this._persist();

    try {
      await FirebaseRepository.set("bundles", id, bundle);
    } catch (err) {
      logger.debug("Failed to save bundle to Firebase:", err);
    }

    return bundle;
  }

  /**
   * Admin: Update existing bundle
   */
  async updateBundle(id, partial) {
    const idx = this._bundles.findIndex((b) => b.id === id);
    if (idx === -1) return null;

    const updated = { ...this._bundles[idx], ...partial };
    if (partial.originalPrice !== undefined || partial.bundlePrice !== undefined) {
      const origPrice = Number(updated.originalPrice) || 0;
      const bunPrice = Number(updated.bundlePrice) || 0;
      updated.savingAmount = Math.max(0, origPrice - bunPrice);
      updated.discountPercent = origPrice > 0 ? Math.round((updated.savingAmount / origPrice) * 100) : 0;
    }

    this._bundles[idx] = updated;
    this._persist();

    try {
      await FirebaseRepository.update("bundles", id, updated);
    } catch (err) {
      logger.debug("Failed to update bundle in Firebase:", err);
    }

    return updated;
  }

  /**
   * Admin: Toggle active status
   */
  async toggleBundle(id) {
    const bundle = this._bundles.find((b) => b.id === id);
    if (!bundle) return null;

    bundle.active = !bundle.active;
    this._persist();

    try {
      await FirebaseRepository.update("bundles", id, { active: bundle.active });
    } catch (err) {
      logger.debug("Failed to toggle bundle status in Firebase:", err);
    }

    return bundle;
  }

  /**
   * Admin: Delete bundle
   */
  async deleteBundle(id) {
    const idx = this._bundles.findIndex((b) => b.id === id);
    if (idx === -1) return false;

    this._bundles.splice(idx, 1);
    this._persist();

    try {
      await FirebaseRepository.remove("bundles", id);
    } catch (err) {
      logger.debug("Failed to delete bundle from Firebase:", err);
    }

    return true;
  }
}

export const bundleService = new BundleService();
export default bundleService;
