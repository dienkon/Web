/**
 * Promotion & Coupon Voucher Service for DkDocShop 2.0
 * Fully detailed voucher management: percentages, fixed discounts, min orders,
 * max discounts, usage limits, expiration dates, and usage tracking.
 */
import { FirebaseRepository } from "../repositories/firebase.repository.js";
import { logger } from "../utils/logger.js";

const STORAGE_KEY_PROMOTIONS = "dkdocshop_admin_promotions";

class PromotionService {
  constructor() {
    this._promotions = [];
    this.init();
  }

  async init() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROMOTIONS);
      if (saved) {
        this._promotions = JSON.parse(saved);
      }
    } catch {
      this._promotions = [];
    }

    // Fetch from Firebase RTDB if available
    try {
      const fbData = await FirebaseRepository.getAll("promotions");
      if (fbData && Object.keys(fbData).length > 0) {
        this._promotions = Object.entries(fbData).map(([id, val]) => ({
          id,
          ...val,
          usedCount: Number(val.usedCount) || 0,
          usageLimit: Number(val.usageLimit) || 0,
          minOrder: Number(val.minOrder) || 0,
          maxDiscount: Number(val.maxDiscount) || 0,
          value: Number(val.value) || 0,
        }));
        this._persist();
      }
    } catch {
      // Gracefully fallback to local storage
    }
  }

  _persist() {
    try {
      localStorage.setItem(STORAGE_KEY_PROMOTIONS, JSON.stringify(this._promotions));
    } catch (e) {
      logger.warn("Failed to persist promotions to localStorage:", e);
    }
  }

  getPromotions() {
    return this._promotions;
  }

  /**
   * Get all active and non-expired vouchers that still have remaining uses
   */
  getActivePromotions() {
    const now = Date.now();
    return this._promotions.filter((p) => {
      if (!p.active) return false;
      if (p.validTo && now > p.validTo) return false;
      if (p.usageLimit > 0 && p.usedCount >= p.usageLimit) return false;
      return true;
    });
  }

  getPromotionById(id) {
    return this._promotions.find((p) => p.id === id) || null;
  }

  getPromotionByCode(codeStr) {
    if (!codeStr) return null;
    const clean = codeStr.trim().toUpperCase();
    return this._promotions.find((p) => p.code === clean) || null;
  }

  /**
   * Validate voucher code against an order amount
   */
  validateCode(codeStr, orderPrice = 0) {
    if (!codeStr || !codeStr.trim()) {
      return { valid: false, error: "Vui lòng nhập mã giảm giá." };
    }

    const clean = codeStr.trim().toUpperCase();
    const promo = this._promotions.find((p) => p.code === clean);

    if (!promo) {
      return { valid: false, error: `Mã giảm giá "${clean}" không tồn tại trên hệ thống.` };
    }

    if (!promo.active) {
      return { valid: false, error: `Mã ưu đãi "${clean}" hiện đang tạm khóa hoặc đã ngừng áp dụng.` };
    }

    const now = Date.now();
    if (promo.validTo && now > promo.validTo) {
      return { valid: false, error: `Mã ưu đãi "${clean}" đã hết hạn sử dụng.` };
    }

    if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
      return { valid: false, error: `Mã ưu đãi "${clean}" đã đạt tối đa số lượt sử dụng.` };
    }

    const minOrder = Number(promo.minOrder) || 0;
    if (minOrder > 0 && orderPrice < minOrder) {
      return {
        valid: false,
        error: `Đơn hàng tối thiểu phải từ ${minOrder.toLocaleString("vi-VN")}đ trở lên để áp dụng mã này (Đơn hiện tại: ${orderPrice.toLocaleString("vi-VN")}đ).`,
      };
    }

    let discountAmount = 0;
    const val = Number(promo.value) || 0;

    if (promo.type === "percentage" || promo.type === "percent") {
      discountAmount = Math.round((orderPrice * val) / 100);
      const maxCap = Number(promo.maxDiscount) || 0;
      if (maxCap > 0 && discountAmount > maxCap) {
        discountAmount = maxCap;
      }
    } else {
      // Fixed amount discount
      discountAmount = Math.min(orderPrice, val);
    }

    const finalPrice = Math.max(0, orderPrice - discountAmount);

    return {
      valid: true,
      code: promo.code,
      discountAmount,
      finalPrice,
      description: promo.description,
      type: promo.type,
      value: promo.value,
      promo,
    };
  }

  /**
   * Record usage when purchase is completed
   */
  async recordUsage(codeStr) {
    if (!codeStr) return false;
    const clean = codeStr.trim().toUpperCase();
    const promo = this._promotions.find((p) => p.code === clean);
    if (!promo) return false;

    promo.usedCount = (Number(promo.usedCount) || 0) + 1;
    this._persist();

    try {
      await FirebaseRepository.update("promotions", promo.id, {
        usedCount: promo.usedCount,
      });
    } catch (err) {
      logger.debug("Failed to sync promotion usedCount to Firebase:", err);
    }

    return true;
  }

  /**
   * Admin: Add new promotion
   */
  async addPromotion(data) {
    const cleanCode = data.code.trim().toUpperCase();
    const existing = this.getPromotionByCode(cleanCode);
    if (existing) {
      throw new Error(`Mã giảm giá "${cleanCode}" đã tồn tại.`);
    }

    const id = `promo-${Date.now()}`;
    const newPromo = {
      id,
      code: cleanCode,
      type: data.type === "fixed" ? "fixed" : "percentage",
      value: Number(data.value) || 0,
      description: data.description ? data.description.trim() : "",
      minOrder: Number(data.minOrder) || 0,
      maxDiscount: Number(data.maxDiscount) || 0,
      usageLimit: Number(data.usageLimit) || 0,
      usedCount: 0,
      validFrom: data.validFrom || Date.now(),
      validTo: data.validTo ? Number(data.validTo) : null,
      active: data.active !== undefined ? Boolean(data.active) : true,
      createdAt: Date.now(),
    };

    this._promotions.unshift(newPromo);
    this._persist();

    try {
      await FirebaseRepository.set("promotions", id, newPromo);
    } catch (err) {
      logger.debug("Failed to save promotion to Firebase:", err);
    }

    return newPromo;
  }

  /**
   * Admin: Update existing promotion
   */
  async updatePromotion(id, partial) {
    const idx = this._promotions.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    if (partial.code) {
      const cleanCode = partial.code.trim().toUpperCase();
      const existing = this._promotions.find((p) => p.code === cleanCode && p.id !== id);
      if (existing) {
        throw new Error(`Mã giảm giá "${cleanCode}" đã tồn tại ở voucher khác.`);
      }
      partial.code = cleanCode;
    }

    const updated = {
      ...this._promotions[idx],
      ...partial,
      value: partial.value !== undefined ? Number(partial.value) : this._promotions[idx].value,
      minOrder: partial.minOrder !== undefined ? Number(partial.minOrder) : this._promotions[idx].minOrder,
      maxDiscount: partial.maxDiscount !== undefined ? Number(partial.maxDiscount) : this._promotions[idx].maxDiscount,
      usageLimit: partial.usageLimit !== undefined ? Number(partial.usageLimit) : this._promotions[idx].usageLimit,
      validTo: partial.validTo !== undefined ? (partial.validTo ? Number(partial.validTo) : null) : this._promotions[idx].validTo,
    };

    this._promotions[idx] = updated;
    this._persist();

    try {
      await FirebaseRepository.update("promotions", id, updated);
    } catch (err) {
      logger.debug("Failed to update promotion in Firebase:", err);
    }

    return updated;
  }

  /**
   * Admin: Toggle active status
   */
  async togglePromotion(id) {
    const promo = this._promotions.find((p) => p.id === id);
    if (!promo) return null;

    promo.active = !promo.active;
    this._persist();

    try {
      await FirebaseRepository.update("promotions", id, { active: promo.active });
    } catch (err) {
      logger.debug("Failed to toggle promotion status in Firebase:", err);
    }

    return promo;
  }

  /**
   * Admin: Delete promotion
   */
  async deletePromotion(id) {
    const idx = this._promotions.findIndex((p) => p.id === id);
    if (idx === -1) return false;

    this._promotions.splice(idx, 1);
    this._persist();

    try {
      await FirebaseRepository.remove("promotions", id);
    } catch (err) {
      logger.debug("Failed to delete promotion from Firebase:", err);
    }

    return true;
  }
}

export const promotionService = new PromotionService();
export default promotionService;
