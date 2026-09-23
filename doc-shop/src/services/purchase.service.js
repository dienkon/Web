/**
 * Purchase Service
 */
import { PurchaseRepository } from "../repositories/purchase.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { DocumentRepository } from "../repositories/document.repository.js";
import { KeyService } from "./key.service.js";
import { promotionService } from "./promotion.service.js";
import { gamificationService } from "./gamification.service.js";
import { store } from "../app/state.js";
import { formatVND } from "../utils/format.js";
import { notificationService } from "./notification.service.js";
import { logger } from "../utils/logger.js";

export const PurchaseService = {
  /**
   * Load purchases for current user
   */
  async loadPurchases(uid) {
    if (!uid) return {};
    const purchases = await PurchaseRepository.getPurchasesByUser(uid);
    store.setPurchases(purchases);
    return purchases;
  },

  /**
   * Check if user has access to document
   */
  hasAccess(docId) {
    const doc = store.getState().documents.items[docId];
    if (!doc) return false;
    if (Number(doc.price) === 0) return true;

    const user = store.getState().auth.currentUser;
    const userData = store.getState().user.data;
    if (!user || !userData) return false;
    if (userData.role === "admin") return true;

    const purchases = Object.values(store.getState().purchases.items || {});
    return purchases.some((p) => p.userId === user.uid && (p.documentId === docId || p.docId === docId));
  },

  /**
   * Get latest purchase record for document (user-scoped)
   */
  getLatestPurchase(docId) {
    const user = store.getState().auth.currentUser;
    if (!user) return null;

    const purchases = Object.values(store.getState().purchases.items || {})
      .filter((p) => p.userId === user.uid && (p.documentId === docId || p.docId === docId))
      .sort((a, b) => Number(b.purchasedAt || 0) - Number(a.purchasedAt || 0));

    return purchases[0] || null;
  },

  /**
   * Purchase a document with optional discount coupon code
   */
  async purchaseDocument(docId, couponCode = "") {
    const user = store.getState().auth.currentUser;
    const userData = store.getState().user.data;
    if (!user) throw new Error("Bạn cần đăng nhập để mua hoặc nhận tài liệu.");

    const doc = store.getState().documents.items[docId];
    if (!doc) throw new Error("Không tìm thấy tài liệu.");

    // Duplicate purchase check
    if (this.hasAccess(docId) && Number(doc.price) > 0) {
      throw new Error("Bạn đã mua tài liệu này rồi.");
    }

    let price = Number(doc.price || 0);

    // Apply coupon if valid
    if (couponCode && price > 0) {
      const promoResult = promotionService.validateCode(couponCode, price);
      if (promoResult && promoResult.valid) {
        price = promoResult.finalPrice;
      }
    }

    const balance = Number(userData?.walletBalance || 0);

    if (balance < price && price > 0) {
      const needed = price - balance;
      throw new Error(`Số dư không đủ. Bạn cần thêm ${formatVND(needed)} để mua tài liệu này.`);
    }

    try {
      // 1. Deduct balance and create transaction if paid
      if (price > 0) {
        const newBalance = balance - price;
        await UserRepository.updateWalletBalance(user.uid, newBalance);
        store.setUser({
          ...(userData || {}),
          walletBalance: newBalance,
        });

        await TransactionRepository.createTransaction({
          userId: user.uid,
          type: "purchase",
          amount: price,
          docId,
          status: "success",
          createdAt: Date.now(),
        });
      }

      // 2. Allocate key if document has keyPoolId
      const assignedKey = doc.keyPoolId
        ? await KeyService.allocateKey(doc.keyPoolId, docId, user.uid)
        : null;

      const redeemUrl = assignedKey ? KeyService.buildKeyRedeemUrl(assignedKey) : null;

      // 3. Determine access links
      const docLinks = Array.isArray(doc.links) && doc.links.length
        ? doc.links
        : doc.fileLink
          ? [{ label: "Tài liệu", url: doc.fileLink }]
          : [];

      const accessLinks = assignedKey
        ? [{ label: "Mở key truy cập", url: redeemUrl }]
        : docLinks;

      // 4. Save purchase
      const purchaseData = {
        userId: user.uid,
        userName: userData?.name || user.displayName || "Học sinh",
        userEmail: user.email || "",
        documentId: docId,
        docId,
        docTitle: doc.title || "",
        docPrice: price,
        purchasedAt: Date.now(),
        purchaseDate: Date.now(),
        assignedKey: assignedKey || "",
        uniqueKey: assignedKey || "",
        redeemUrl: redeemUrl || "",
        links: accessLinks,
        driveUrl: doc.driveUrl || (docLinks[0]?.url) || "",
      };

      const newPurchaseId = await PurchaseRepository.createPurchase(purchaseData);

      // 5. Update local store
      const updatedPurchases = {
        ...(store.getState().purchases.items || {}),
        [newPurchaseId]: { id: newPurchaseId, ...purchaseData },
      };
      store.setPurchases(updatedPurchases);

      // 6. Increment purchase count on document
      await DocumentRepository.incrementPurchaseCount(docId);

      // 7. Record coupon usage if applied
      if (couponCode) {
        await promotionService.recordUsage(couponCode);
      }

      // 8. Gamification XP award
      gamificationService.addXP(price > 0 ? 100 : 30, `Mua tài liệu: ${doc.title}`);

      // 8. Send Discord notification
      await notificationService.notifyPurchase({
        studentName: userData?.name || user.displayName || "Học sinh",
        studentClass: userData?.class || "",
        studentSchool: userData?.school || "",
        documentTitle: doc.title,
        price,
        remainingBalance: userData?.walletBalance !== undefined ? userData.walletBalance - price : undefined,
      });

      return { purchaseId: newPurchaseId, ...purchaseData };
    } catch (err) {
      logger.error("Purchase execution error:", err);
      throw err;
    }
  },
};
