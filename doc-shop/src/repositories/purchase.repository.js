/**
 * Purchase Repository
 */
import { FirebaseRepository } from "./firebase.repository.js";
import { Collections } from "../app/constants.js";

export const PurchaseRepository = {
  /**
   * Get all purchases for a specific user
   */
  async getPurchasesByUser(uid) {
    if (!uid) return {};
    return await FirebaseRepository.queryByChild(Collections.PURCHASES, "userId", uid);
  },

  /**
   * Get all purchases (Admin only)
   */
  async getAllPurchases() {
    return await FirebaseRepository.getAll(Collections.PURCHASES);
  },

  /**
   * Create new purchase record
   */
  async createPurchase(purchaseData) {
    return await FirebaseRepository.push(Collections.PURCHASES, purchaseData);
  },

  /**
   * Update purchase record (e.g. key reissued)
   */
  async updatePurchase(purchaseId, partial) {
    return await FirebaseRepository.update(Collections.PURCHASES, purchaseId, partial);
  },
};
