/**
 * Report Service
 */
import { ReportRepository } from "../repositories/report.repository.js";
import { PurchaseRepository } from "../repositories/purchase.repository.js";
import { KeyRepository } from "../repositories/key.repository.js";
import { KeyService } from "./key.service.js";
import { store } from "../app/state.js";
import { notificationService } from "./notification.service.js";
import { logger } from "../utils/logger.js";

export const ReportService = {
  /**
   * Submit document report & attempt auto-key reissue if eligible
   */
  async submitReport({ docId, type, details }) {
    const user = store.getState().auth.currentUser;
    const userData = store.getState().user.data;
    if (!user) throw new Error("Bạn cần đăng nhập để gửi báo cáo.");

    const doc = store.getState().documents.items[docId];

    const report = {
      userId: user.uid,
      docId,
      type: type || "Khác",
      details: details || "",
      createdAt: Date.now(),
      status: "new",
    };

    const reportId = await ReportRepository.createReport(report);

    // Check if auto-reissue key applies
    const myPurchases = Object.entries(store.getState().purchases.items || {})
      .map(([id, val]) => ({ id, ...val }))
      .filter((p) => p.userId === user.uid && p.documentId === docId);
    const purchase = myPurchases[0];

    let reissuedKey = null;

    if (
      purchase &&
      /key/i.test(type) &&
      doc?.keyPoolId &&
      purchase?.assignedKey
    ) {
      const oldKey = purchase.assignedKey;
      const safeOldKey = KeyService.encodeKey(oldKey);
      const allocation = (await KeyRepository.getSingleAllocation(doc.keyPoolId, safeOldKey)) || {};
      const loginCount = Number(allocation.loginCount || 0);

      if (loginCount < 1) {
        notificationService.warning(
          "Key này chưa ghi nhận lượt đăng nhập nào nên chưa thể cấp lại key mới tự động.",
        );
      } else {
        const newKey = await KeyService.reissueKey(doc.keyPoolId, docId, user.uid, oldKey);
        if (newKey) {
          reissuedKey = newKey;
          const redeemUrl = KeyService.buildKeyRedeemUrl(newKey);
          await PurchaseRepository.updatePurchase(purchase.id, {
            assignedKey: newKey,
            redeemUrl,
            accessLinks: [{ label: "Mở link key", url: redeemUrl }],
            keyReissuedAt: Date.now(),
          });

          store.addPurchase(purchase.id, {
            ...purchase,
            assignedKey: newKey,
            redeemUrl,
            accessLinks: [{ label: "Mở link key", url: redeemUrl }],
          });

          await notificationService.notifyDiscord(
            `🔁 **Cấp lại key do báo lỗi**\n- User: ${userData?.name || user.email}\n- Doc: ${doc?.title || docId}\n- Key cũ: \`${oldKey}\`\n- Key mới: \`${newKey}\`\n- Login count cũ: ${loginCount}`,
          );

          notificationService.success(`Đã cấp lại key mới: ${newKey}`);
        }
      }
    }

    // General report discord notification
    await notificationService.notifyDiscord(
      `🚨 **Báo cáo tài liệu**\n- User: ${userData?.name || user.email}\n- Doc: ${doc?.title || docId}\n- Loại: ${type}\n- Chi tiết: ${details || "Không có"}`,
    );

    if (!reissuedKey) {
      notificationService.success("Đã gửi báo cáo thành công.");
    }

    return { reportId, reissuedKey };
  },

  /**
   * Admin: Resolve report
   */
  async resolveReport(reportId) {
    await ReportRepository.updateReport(reportId, { status: "resolved" });
    notificationService.success("Đã xử lý báo cáo.");
  },
};
