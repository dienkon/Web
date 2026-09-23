/**
 * User Service
 */
import { UserRepository } from "../repositories/user.repository.js";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { KeyRepository } from "../repositories/key.repository.js";
import { store } from "../app/state.js";
import { notificationService } from "./notification.service.js";
import { logger } from "../utils/logger.js";

export const UserService = {
  /**
   * Update profile
   */
  async updateProfile(uid, { name, className, school, avatar }) {
    if (!uid) throw new Error("Chưa đăng nhập.");

    const cleanName = String(name || "").trim();
    const cleanClass = String(className || "").trim();
    const cleanSchool = String(school || "").trim();

    if (!cleanName || !cleanClass) {
      throw new Error("Vui lòng điền đầy đủ Họ tên và Lớp.");
    }

    const payload = {
      name: cleanName,
      class: cleanClass,
      school: cleanSchool,
      profileCompleted: true,
      updatedAt: Date.now(),
    };

    if (avatar) payload.avatar = avatar;

    await UserRepository.updateUser(uid, payload);
    const currentUserData = store.getState().user.data;
    store.setUser({ ...currentUserData, ...payload });

    notificationService.success("Cập nhật hồ sơ thành công!");
  },

  /**
   * Calculate financial summaries for user
   */
  getUserDepositTotal(txList, uid) {
    return (txList || [])
      .filter((t) => t.userId === uid && t.type === "deposit" && (t.status === "verified" || t.status === "success"))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  },

  getUserPurchaseTotal(txList, uid) {
    return (txList || [])
      .filter((t) => t.userId === uid && t.type === "purchase")
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  },

  getUserPaidOfflineTotal(user) {
    return Number(user?.offlinePaidAmount || 0);
  },

  getUserRemainingCash(user, txList) {
    const uid = user?.uid || user?.id;
    const deposits = this.getUserDepositTotal(txList, uid);
    const paidOffline = this.getUserPaidOfflineTotal(user);
    return Math.max(deposits - paidOffline, 0);
  },

  /**
   * Admin: Add offline payment received
   */
  async recordOfflinePayment(uid, addAmount, note) {
    const user = await UserRepository.getUserById(uid);
    if (!user) throw new Error("Không tìm thấy người dùng.");

    const currentPaid = Number(user.offlinePaidAmount || 0);
    const nextPaid = currentPaid + Math.max(Number(addAmount || 0), 0);

    await UserRepository.updateUser(uid, {
      offlinePaidAmount: nextPaid,
      lastOfflinePaidNote: String(note || "").trim(),
      lastOfflinePaidAt: Date.now(),
    });

    notificationService.success("Đã ghi nhận thu tiền thành công.");
  },

  /**
   * Admin: Toggle user verification
   */
  async toggleVerify(uid, status) {
    await UserRepository.updateUser(uid, {
      verified: status,
      profileCompleted: status ? true : false,
    });
    notificationService.success(status ? "Đã duyệt người dùng." : "Đã bỏ duyệt người dùng.");
  },

  /**
   * Admin: Delete user
   */
  async deleteUser(uid) {
    await UserRepository.deleteUser(uid);
    notificationService.success("Đã xóa người dùng.");
  },
};
