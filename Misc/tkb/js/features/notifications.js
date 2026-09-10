/**
 * Notifications & Reminders Feature
 * Web Notifications API + Web Audio Alerts for Lesson Start, Finish, and 5-min warning.
 * Operates reliably whenever the browser tab is open (both active or in the background).
 */

import { TimeEngine } from "../core/time-engine.js";
import { soundEngine } from "../core/sound.js";
import { events } from "../core/events.js";
import { $ } from "../utils/dom.js";

export class NotificationsFeature {
  constructor(store) {
    this.store = store;
    this.notifiedSet = new Set();
    this.lastCheckedDate = new Date().toDateString();
    this.notificationsEnabled = true;

    try {
      const saved = localStorage.getItem("tkb_notifications_enabled");
      if (saved !== null) {
        this.notificationsEnabled = saved === "true";
      }
    } catch (e) {
      // Ignore
    }
  }

  init() {
    this.bindHeaderButton();
    this.updateHeaderUI();
  }

  bindHeaderButton() {
    const btn = $("#btn-header-notifications");
    if (btn) {
      btn.addEventListener("click", async () => {
        if (!("Notification" in window)) {
          events.emit("toast:show", {
            message: "Trình duyệt của bạn không hỗ trợ tính năng Web Notification.",
            type: "error",
          });
          return;
        }

        if (Notification.permission === "default") {
          const granted = await this.requestPermission();
          if (granted) {
            this.notificationsEnabled = true;
            this.saveState();
            soundEngine.playChime();
            this.send(
              "🔔 Đã bật thông báo lịch học!",
              "Bạn sẽ nhận thông báo kèm âm thanh rõ ràng khi tới tiết và hết tiết học."
            );
            events.emit("toast:show", { message: "Đã bật thông báo trình duyệt thành công!", type: "success" });
          } else {
            events.emit("toast:show", {
              message: "Bạn đã từ chối quyền thông báo trên trình duyệt.",
              type: "warning",
            });
          }
        } else if (Notification.permission === "granted") {
          this.notificationsEnabled = !this.notificationsEnabled;
          this.saveState();
          if (this.notificationsEnabled) {
            soundEngine.playChime();
            this.send("🔔 Thông báo đã được bật", "Hệ thống sẽ nhắc nhở khi tới tiết và hết tiết.");
          }
          events.emit("toast:show", {
            message: this.notificationsEnabled ? "Đã bật thông báo nhắc tiết học" : "Đã tạm tắt thông báo",
            type: "info",
          });
        } else {
          // Denied
          events.emit("toast:show", {
            message: "Quyền thông báo đang bị chặn. Vui lòng bấm vào icon ổ khóa trên thanh địa chỉ để cấp quyền.",
            type: "warning",
          });
        }

        this.updateHeaderUI();
      });
    }
  }

  saveState() {
    try {
      localStorage.setItem("tkb_notifications_enabled", String(this.notificationsEnabled));
    } catch (e) {
      // Ignore
    }
  }

  updateHeaderUI() {
    const btn = $("#btn-header-notifications");
    const container = $("#header-bell-icon-container");
    const dot = $("#header-bell-dot");

    if (!btn || !("Notification" in window)) return;

    const isGranted = Notification.permission === "granted" && this.notificationsEnabled;

    if (dot) {
      dot.classList.toggle("hidden", !isGranted);
    }

    if (container) {
      if (Notification.permission === "denied") {
        container.innerHTML = `<i data-lucide="bell-off" class="w-4 h-4 text-slate-400"></i>`;
        btn.classList.add("opacity-60");
        btn.title = "Thông báo bị chặn trong cài đặt trình duyệt";
      } else if (isGranted) {
        container.innerHTML = `<i data-lucide="bell-ring" class="w-4 h-4 text-emerald-500"></i>`;
        btn.classList.remove("opacity-60");
        btn.title = "Thông báo trình duyệt & âm thanh: ĐANG BẬT";
      } else {
        container.innerHTML = `<i data-lucide="bell" class="w-4 h-4"></i>`;
        btn.classList.remove("opacity-60");
        btn.title = "Bấm để bật thông báo khi tới tiết / hết tiết";
      }
    }

    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  async requestPermission() {
    if (!("Notification" in window)) return false;
    try {
      const perm = await Notification.requestPermission();
      return perm === "granted";
    } catch (e) {
      return false;
    }
  }

  send(title, body, tag = null) {
    if (!this.notificationsEnabled) return;

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const notif = new Notification(title, {
          body,
          icon: "logo.png",
          tag: tag || undefined,
          badge: "logo.png",
          requireInteraction: false,
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {
        console.warn("Notification error:", e);
      }
    }
  }

  /**
   * Main period monitoring loop - called every tick from app.js
   */
  checkScheduleAlerts(now = new Date(), schedule = [], timeSlots = []) {
    if (!this.notificationsEnabled) return;

    const todayDateStr = now.toDateString();
    if (todayDateStr !== this.lastCheckedDate) {
      this.notifiedSet.clear();
      this.lastCheckedDate = todayDateStr;
    }

    const currentDay = now.getDay();
    const curMinutes = now.getHours() * 60 + now.getMinutes();
    const curSeconds = now.getSeconds();

    // Check once per minute window (within the first 20 seconds of each minute)
    if (curSeconds > 20) return;

    // Filter today's scheduled items
    const todayPrefix = `${currentDay}-`;
    const todayItems = schedule.filter((s) => s && s.slotId && s.slotId.startsWith(todayPrefix));
    if (todayItems.length === 0) return;

    todayItems.forEach((item) => {
      const [, sId] = item.slotId.split("-");
      const slot = timeSlots.find((s) => s.id === sId);
      if (!slot) return;

      const startMin = TimeEngine.parseToMinutes(slot.start);
      let endMin = TimeEngine.parseToMinutes(slot.end);
      if (endMin < startMin) endMin += 1440; // Overnight handling

      // 1. TỚI TIẾT HỌC (Period Start)
      if (curMinutes === startMin) {
        const key = `${todayDateStr}_start_${item.slotId}_${slot.start}`;
        if (!this.notifiedSet.has(key)) {
          this.notifiedSet.add(key);

          // Play period start announcement chime
          soundEngine.playPeriodStart();

          // Send desktop notification
          this.send(
            `🔔 Tới tiết học: ${item.subject}`,
            `Khung giờ: ${slot.start} - ${slot.end} • ${item.teacher || "Tự do"} • Phòng: ${item.room || "Tự do"}`,
            `start_${item.slotId}`
          );

          events.emit("toast:show", {
            message: `🔔 Tới tiết học: "${item.subject}" (${slot.start} - ${slot.end})`,
            type: "info",
          });
        }
      }

      // 2. HẾT TIẾT HỌC (Period End)
      if (curMinutes === endMin) {
        const key = `${todayDateStr}_end_${item.slotId}_${slot.end}`;
        if (!this.notifiedSet.has(key)) {
          this.notifiedSet.add(key);

          // Play period end chime
          soundEngine.playPeriodEnd();

          // Send desktop notification
          this.send(
            `🏁 Hết tiết học: ${item.subject}`,
            `Đã kết thúc lúc ${slot.end}. Nghỉ ngơi giải lao hoặc chuẩn bị tiết tiếp theo nhé!`,
            `end_${item.slotId}`
          );

          events.emit("toast:show", {
            message: `🏁 Đã hết tiết học: "${item.subject}" (${slot.end})`,
            type: "info",
          });
        }
      }

      // 3. SẮP TỚI TIẾT (5 minutes prior)
      if (curMinutes === startMin - 5) {
        const key = `${todayDateStr}_pre5_${item.slotId}_${slot.start}`;
        if (!this.notifiedSet.has(key)) {
          this.notifiedSet.add(key);

          soundEngine.playChime();

          this.send(
            `⏰ Sắp tới tiết học (5 phút nữa): ${item.subject}`,
            `Chuẩn bị vào tiết lúc ${slot.start} tại ${item.room || "phòng học"}.`,
            `pre5_${item.slotId}`
          );
        }
      }
    });
  }
}
