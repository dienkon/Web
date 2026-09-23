/**
 * Notification Service
 */
import { ENV } from "../config/environment.js";
import { logger } from "../utils/logger.js";

class NotificationService {
  constructor() {
    this._listeners = new Set();
  }

  onToast(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  showToast(message, type = "info", duration = 3500) {
    this._listeners.forEach((fn) => {
      try {
        fn({ message, type, duration });
      } catch (err) {}
    });
  }

  success(msg, duration) {
    this.showToast(msg, "success", duration);
  }

  error(msg, duration) {
    this.showToast(msg, "error", duration);
  }

  warning(msg, duration) {
    this.showToast(msg, "warning", duration);
  }

  info(msg, duration) {
    this.showToast(msg, "info", duration);
  }

  /**
   * Safe Discord Webhook notification
   */
  async notifyDiscord(content) {
    const url = ENV.DISCORD_WEBHOOK_URL;
    if (!url || !url.startsWith("http")) return;

    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    } catch (err) {
      logger.warn("Discord webhook notification failed (non-critical):", err);
    }
  }
}

export const notificationService = new NotificationService();
