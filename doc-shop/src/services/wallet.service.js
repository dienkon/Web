/**
 * Wallet Service
 */
import { UserRepository } from "../repositories/user.repository.js";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { store } from "../app/state.js";
import { formatVND } from "../utils/format.js";
import { notificationService } from "./notification.service.js";
import { logger } from "../utils/logger.js";

export const WalletService = {
  /**
   * Get current user's balance
   */
  getBalance() {
    return Number(store.getState().user.data?.walletBalance || 0);
  },

  /**
   * Load current user's transactions
   */
  async loadTransactions(uid) {
    if (!uid) return {};
    const txs = await TransactionRepository.getTransactionsByUser(uid);
    store.setTransactions(txs);
    return txs;
  },

  /**
   * Process verified deposit after user confirmations
   */
  async processDeposit(amount) {
    const user = store.getState().auth.currentUser;
    const userData = store.getState().user.data;
    if (!user) throw new Error("Bạn cần đăng nhập trước khi nạp tiền.");

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      throw new Error("Số tiền nạp không hợp lệ.");
    }

    try {
      const tx = {
        userId: user.uid,
        type: "deposit",
        amount: numAmount,
        status: "verified",
        verification: {
          confirmed: true,
          confirmSteps: 3,
        },
        createdAt: Date.now(),
      };

      const txId = await TransactionRepository.createTransaction(tx);

      // Update user wallet balance
      const newBalance = Number(userData?.walletBalance || 0) + numAmount;
      await UserRepository.updateWalletBalance(user.uid, newBalance);

      // Update local state
      store.setUser({
        ...(userData || {}),
        walletBalance: newBalance,
      });

      const currentTxs = store.getState().wallet.transactions;
      store.setTransactions({
        ...currentTxs,
        [txId]: { ...tx, id: txId },
      });

      // Notify Discord
      await notificationService.notifyDiscord(
        `✅ **Nạp tiền đã xác minh**\n- User: ${userData?.name || user.email} (${user.email})\n- Số tiền: ${formatVND(numAmount)}\n- Mã GD: ${txId}`,
      );

      notificationService.success(`Đã nạp thành công ${formatVND(numAmount)} vào ví!`);
      return txId;
    } catch (err) {
      logger.error("Deposit processing failed:", err);
      notificationService.error("Không thể xử lý nạp tiền: " + (err.message || "Lỗi hệ thống"));
      throw err;
    }
  },

  /**
   * Admin: Approve pending transaction
   */
  async approveTransaction(txId) {
    await TransactionRepository.updateTransaction(txId, { status: "verified" });
    notificationService.success("Đã duyệt giao dịch.");
  },

  /**
   * Admin: Reject transaction
   */
  async rejectTransaction(txId) {
    await TransactionRepository.updateTransaction(txId, { status: "rejected" });
    notificationService.success("Đã từ chối giao dịch.");
  },

  /**
   * Admin: Edit transaction
   */
  async editTransaction(txId, data) {
    await TransactionRepository.updateTransaction(txId, data);
    notificationService.success("Đã cập nhật giao dịch.");
  },

  /**
   * Admin: Delete transaction
   */
  async deleteTransaction(txId) {
    await TransactionRepository.deleteTransaction(txId);
    notificationService.success("Đã xóa giao dịch.");
  },
};
