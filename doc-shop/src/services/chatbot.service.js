/**
 * Chatbot Service
 * Integrates rule-based assistant with optional AI API proxy/fallback
 */
import { ENV } from "../config/environment.js";
import { store } from "../app/state.js";
import { KeyService } from "./key.service.js";
import { PurchaseRepository } from "../repositories/purchase.repository.js";
import { notificationService } from "./notification.service.js";
import { logger } from "../utils/logger.js";

const KEY_PATTERN = /\b[A-Za-z0-9_-]{6,}\b/;

export const ChatbotService = {
  /**
   * Rule-based local assistant fallback
   */
  async answerLocal(msg) {
    const q = String(msg || "").trim();
    const lower = q.toLowerCase();
    const user = store.getState().auth.currentUser;
    const userData = store.getState().user.data;

    // Login queries
    if (/[đd]ăng nhập|login/i.test(lower)) {
      return "Bạn có thể bấm nút Đăng nhập Google ở góc trên thanh điều hướng hoặc ở phần chi tiết tài liệu.";
    }

    // Wallet / deposit queries
    if (/nạp|deposit|ví/i.test(lower)) {
      return "Để nạp tiền: Bạn vào mục 'Ví của tôi', nhập số tiền và bấm xác nhận 3 lần. Số dư sẽ được cộng vào ví ngay lập tức.";
    }

    // Purchase / download queries
    if (/mua|tài liệu|mở tài liệu|mở link/i.test(lower)) {
      return "Để mua tài liệu: Bạn chọn tài liệu muốn mua, bấm 'Mua ngay'. Sau khi mua thành công, tài liệu sẽ xuất hiện trong mục 'Tài liệu đã mua' để bạn mở trực tiếp hoặc copy link.";
    }

    // Share queries
    if (/share|chia sẻ|copy|link/i.test(lower)) {
      return "Nút 'Chia sẻ' trong chi tiết tài liệu sẽ tự động sao chép đường link liên kết để bạn gửi cho bạn bè.";
    }

    // Broken key / reissue queries
    if (/lỗi key|reissue|cấp lại key|đổi key|key lỗi/i.test(lower)) {
      if (!user) {
        return "Bạn cần đăng nhập vào tài khoản đã mua tài liệu để mình kiểm tra và hỗ trợ cấp lại key.";
      }

      const match = q.match(KEY_PATTERN);
      const foundKey = match ? match[0] : null;

      if (!foundKey) {
        return "Vui lòng gửi kèm mã key bị lỗi trong tin nhắn để mình đối soát với đơn hàng và cấp lại key mới nhé.";
      }

      const purchases = Object.entries(store.getState().purchases.items || {})
        .map(([id, val]) => ({ id, ...val }))
        .filter((p) => p.userId === user.uid);

      const purchase = purchases.find(
        (p) => String(p.assignedKey || "").toLowerCase() === foundKey.toLowerCase(),
      );

      if (!purchase) {
        return `Mình chưa tìm thấy mã key "${foundKey}" trong danh sách tài liệu đã mua của bạn. Hãy kiểm tra lại mã key nhé.`;
      }

      const doc = store.getState().documents.items[purchase.documentId];
      if (!doc?.keyPoolId) {
        return "Tài liệu này chưa cấu hình kho link gốc để cấp lại key tự động. Vui lòng bấm 'Báo lỗi' trong chi tiết tài liệu để admin hỗ trợ bạn.";
      }

      const oldKey = purchase.assignedKey;
      const newKey = await KeyService.reissueKey(doc.keyPoolId, purchase.documentId, user.uid, oldKey);

      if (!newKey) {
        return "Kho key hiện tại đang hết key trống. Mình đã ghi nhận yêu cầu, admin sẽ bổ sung thêm key sớm nhất.";
      }

      const redeemUrl = KeyService.buildKeyRedeemUrl(newKey);
      await PurchaseRepository.updatePurchase(purchase.id, {
        assignedKey: newKey,
        redeemUrl,
        accessLinks: [{ label: "Mở link key", url: redeemUrl }],
        reissuedAt: Date.now(),
      });

      store.addPurchase(purchase.id, {
        ...purchase,
        assignedKey: newKey,
        redeemUrl,
        accessLinks: [{ label: "Mở link key", url: redeemUrl }],
      });

      await notificationService.notifyDiscord(
        `🔁 **Cấp lại key tự động qua Chatbot**\n- User: ${userData?.name || user.email}\n- Doc: ${doc?.title || purchase.documentId}\n- Key cũ: \`${oldKey}\`\n- Key mới: \`${newKey}\``,
      );

      return `Đã xác minh và cấp lại key mới thành công cho bạn!\nKey mới: ${newKey}\nLink mở: ${redeemUrl}`;
    }

    // Document search by name
    const docs = Object.values(store.getState().documents.items || {});
    const matchDoc = docs.find((d) => String(d.title || "").toLowerCase().includes(lower));

    if (matchDoc) {
      return `Mình tìm thấy tài liệu liên quan: "${matchDoc.title}". Giá: ${Number(matchDoc.price) === 0 ? "Miễn phí" : matchDoc.price + "đ"}. Bạn có thể vào mục Cửa hàng để xem chi tiết nhé.`;
    }

    return "Mình là trợ lý DkDocShop. Mình có thể hỗ trợ bạn về: hướng dẫn nạp tiền, cách mua tài liệu, kiểm tra & cấp lại key lỗi, chia sẻ link, hoặc tìm kiếm tài liệu. Bạn cần trợ giúp gì cứ nhắn cho mình nhé!";
  },

  /**
   * Optional AI API call
   */
  async callAiApi(msg, history = []) {
    const { apiKey, model, apiUrl } = ENV.CHATBOT;
    if (!apiKey) return null;

    const systemPrompt = {
      role: "system",
      content:
        "Bạn là trợ lý hỗ trợ khách hàng của DkDocShop (nền tảng tài liệu học tập số). Trả lời ngắn gọn, thân thiện bằng tiếng Việt, hướng dẫn thao tác rõ ràng, trung thực và hữu ích.",
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

      const res = await fetch(apiUrl, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [systemPrompt, ...history.slice(-6), { role: "user", content: msg }],
          temperature: 0.4,
        }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const data = await res.json();
      return data?.choices?.[0]?.message?.content?.trim() || null;
    } catch (err) {
      logger.warn("Chatbot AI API failed, falling back to local assistant:", err);
      return null;
    }
  },

  /**
   * Smart answer: tries AI API first, falls back smoothly to local rules
   */
  async answer(msg, history = []) {
    try {
      const aiReply = await this.callAiApi(msg, history);
      if (aiReply) return aiReply;
    } catch {}

    return await this.answerLocal(msg);
  },
};
