/**
 * Voucher / Promotion Repository for DkDocShop 2.0
 * Encapsulates Firebase RTDB operations with local persistence fallback.
 */
import { FirebaseRepository } from "./firebase.repository.js";
import { logger } from "../utils/logger.js";

const COLLECTION = "promotions";
const STORAGE_KEY = "dkdocshop_admin_promotions";

export const VoucherRepository = {
  /**
   * Get all vouchers
   */
  async getAll() {
    try {
      const fbData = await FirebaseRepository.getAll(COLLECTION);
      if (fbData && typeof fbData === "object" && Object.keys(fbData).length > 0) {
        return fbData;
      }
    } catch (e) {
      logger.debug("VoucherRepository getAll fallback to local:", e);
    }

    try {
      const local = localStorage.getItem(STORAGE_KEY);
      return local ? JSON.parse(local) : {};
    } catch {
      return {};
    }
  },

  /**
   * Get voucher by ID
   */
  async getById(id) {
    if (!id) return null;
    try {
      const fbItem = await FirebaseRepository.get(COLLECTION, id);
      if (fbItem) return fbItem;
    } catch (e) {
      logger.debug(`VoucherRepository getById fallback for ${id}:`, e);
    }

    const all = await this.getAll();
    return all[id] || null;
  },

  /**
   * Save or overwrite voucher
   */
  async save(id, voucherData) {
    if (!id || !voucherData) return false;

    // 1. Update local storage
    try {
      const all = await this.getAll();
      all[id] = { ...voucherData, id };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      logger.warn("Failed to save voucher locally:", e);
    }

    // 2. Persist to Firebase
    try {
      await FirebaseRepository.set(COLLECTION, id, voucherData);
      return true;
    } catch (err) {
      logger.debug("VoucherRepository save Firebase sync deferred:", err);
      return true;
    }
  },

  /**
   * Update partial voucher fields
   */
  async update(id, partial) {
    if (!id || !partial) return false;

    try {
      const all = await this.getAll();
      if (all[id]) {
        all[id] = { ...all[id], ...partial };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      }
    } catch (e) {
      logger.warn("Failed to update voucher locally:", e);
    }

    try {
      await FirebaseRepository.update(COLLECTION, id, partial);
      return true;
    } catch (err) {
      logger.debug("VoucherRepository update Firebase sync deferred:", err);
      return true;
    }
  },

  /**
   * Delete voucher
   */
  async remove(id) {
    if (!id) return false;

    try {
      const all = await this.getAll();
      delete all[id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      logger.warn("Failed to delete voucher locally:", e);
    }

    try {
      await FirebaseRepository.remove(COLLECTION, id);
      return true;
    } catch (err) {
      logger.debug("VoucherRepository remove Firebase sync deferred:", err);
      return true;
    }
  },
};

export default VoucherRepository;
