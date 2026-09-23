/**
 * Transaction Service
 */
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { UserRepository } from "../repositories/user.repository.js";
import { DocumentRepository } from "../repositories/document.repository.js";
import { store } from "../app/state.js";

export const TransactionService = {
  /**
   * Load transactions for admin panel with user and document joining
   */
  async loadAdminTransactions(forceFresh = false) {
    const txMap = await TransactionRepository.getAllTransactions(forceFresh);
    const userMap = await UserRepository.getAllUsers(forceFresh);
    const docMap = await DocumentRepository.getAllDocuments(forceFresh);

    const txs = Object.entries(txMap || {})
      .map(([id, t]) => ({
        id,
        ...t,
        user: userMap[t.userId] || { name: t.userId, email: "" },
        document: docMap[t.docId] || { title: t.docId },
      }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    store.setAdminState({
      transactions: txMap,
      users: userMap,
    });

    return txs;
  },

  /**
   * Calculate overview stats for admin dashboard
   */
  calculateAdminStats({ users, docs, txs, keyLogs }) {
    const userList = Object.values(users || {});
    const docList = Object.values(docs || {});
    const txList = Object.values(txs || {});
    const logList = Object.values(keyLogs || {});

    const totalRevenue = txList
      .filter((t) => t.type === "deposit" && (t.status === "verified" || t.status === "success"))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const pendingTx = txList.filter((t) => t.type === "deposit" && t.status === "pending").length;

    const keyClicks = logList.filter(
      (l) => l.action === "open_key" || l.action === "open_doc" || l.action === "open_link",
    ).length;

    return {
      totalUsers: userList.length,
      totalDocs: docList.length,
      totalRevenue,
      pendingTx,
      keyClicks,
    };
  },
};
