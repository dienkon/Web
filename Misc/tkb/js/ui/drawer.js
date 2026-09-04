/**
 * Drawers & Bottom Sheets UI Component
 */

import { escapeHTML, $, $$ } from "../utils/dom.js";
import { DAY_NAMES, DAY_SHORT_NAMES, formatDurationShort } from "../utils/format.js";
import { COLOR_MAP } from "../state/store.js";
import { events } from "../core/events.js";

export class DrawerUI {
  constructor(store, storage, history) {
    this.store = store;
    this.storage = storage;
    this.history = history;
  }

  init() {
    this.bindEvents();
    this.bindFormEditDetail();
  }

  bindEvents() {
    // Backdrop clicks to close
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("drawer-backdrop")) {
        this.closeAll();
      }

      // Close buttons
      const closeBtn = e.target.closest("[data-drawer-close]");
      if (closeBtn) {
        const id = closeBtn.dataset.drawerClose;
        this.close(id);
      }

      // Open buttons (CRITICAL FIX: Allow buttons with [data-drawer-open] to open drawers!)
      const openBtn = e.target.closest("[data-drawer-open]");
      if (openBtn) {
        const id = openBtn.dataset.drawerOpen;
        this.open(id);
      }
    });

    events.on("drawer:open", (id) => this.open(id));
    events.on("drawer:close", (id) => this.close(id));
    events.on("drawer:open-detail", (slotKey) => this.openActivityDetail(slotKey));
  }

  bindFormEditDetail() {
    const form = $("#form-edit-activity-detail");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const slotKey = $("#detail-slot-key").value;
      if (!slotKey) return;

      const state = this.store.getState();
      const item = state.schedule.find((s) => s.slotId === slotKey);
      if (!item) return;

      this.history.recordState();

      item.subject = $("#detail-subject").value.trim();
      item.teacher = $("#detail-teacher").value.trim();
      item.room = $("#detail-room").value.trim();
      item.status = $("#detail-status").value;
      item.priority = $("#detail-priority").value;
      item.isFocus = $("#detail-is-focus").checked;
      item.notes = $("#detail-notes").value.trim();

      const selectedColor = document.querySelector('input[name="edit_detail_color"]:checked');
      if (selectedColor) item.color = selectedColor.value;

      this.storage.debouncedSave();
      this.close("drawer-activity-detail");
      events.emit("schedule:updated");
      events.emit("toast:show", { message: `Đã lưu thay đổi cho "${item.subject}"`, type: "success" });
    });
  }

  open(drawerId) {
    const backdrop = $(`#${drawerId}-backdrop`) || $("#generic-drawer-backdrop");
    const panel = $(`#${drawerId}`);

    if (backdrop) backdrop.classList.add("active");
    if (panel) {
      panel.classList.add("active");
      if (typeof lucide !== "undefined") lucide.createIcons();
    }
  }

  close(drawerId) {
    const backdrop = $(`#${drawerId}-backdrop`) || $("#generic-drawer-backdrop");
    const panel = $(`#${drawerId}`);

    if (backdrop) backdrop.classList.remove("active");
    if (panel) panel.classList.remove("active");
  }

  closeAll() {
    $$(".drawer-backdrop.active").forEach((b) => b.classList.remove("active"));
    $$(".drawer-panel.active").forEach((p) => p.classList.remove("active"));
    $$(".mobile-bottom-sheet.active").forEach((s) => s.classList.remove("active"));
  }

  openActivityDetail(slotKey) {
    const state = this.store.getState();
    const item = state.schedule.find((s) => s.slotId === slotKey);
    if (!item) return;

    const [d, slotId] = slotKey.split("-");
    const slot = state.timeSlots.find((s) => s.id === slotId);

    const drawer = $("#drawer-activity-detail");
    if (!drawer) return;

    // Populate form
    $("#detail-slot-key").value = slotKey;
    $("#detail-subject").value = item.subject || "";
    $("#detail-teacher").value = item.teacher || "";
    $("#detail-room").value = item.room || "";
    $("#detail-status").value = item.status || "planned";
    $("#detail-priority").value = item.priority || "medium";
    $("#detail-is-focus").checked = Boolean(item.isFocus);
    $("#detail-notes").value = item.notes || "";

    const slotInfoEl = $("#detail-slot-info");
    if (slotInfoEl && slot) {
      slotInfoEl.textContent = `${DAY_NAMES[d]} • ${slot.label} (${slot.start} - ${slot.end})`;
    }

    // Color options
    const colorContainer = $("#detail-color-options");
    if (colorContainer) {
      colorContainer.innerHTML = Object.keys(COLOR_MAP)
        .map(
          (c) => `
          <label class="cursor-pointer">
            <input type="radio" name="edit_detail_color" value="${c}" class="hidden peer" ${item.color === c ? "checked" : ""} />
            <div class="w-6 h-6 rounded-lg ${COLOR_MAP[c].accent} border-2 border-transparent peer-checked:border-white peer-checked:ring-2 peer-checked:ring-sky-500 transition"></div>
          </label>
        `
        )
        .join("");
    }

    // Render Quick Copy to Other Days Chips
    const copyContainer = $("#detail-copy-days-container");
    if (copyContainer) {
      const days = [1, 2, 3, 4, 5, 6, 0];
      copyContainer.innerHTML = days
        .filter((targetDay) => String(targetDay) !== String(d))
        .map(
          (targetDay) => `
          <button
            type="button"
            data-copy-target-day="${targetDay}"
            class="btn-copy-day px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-sky-100 dark:hover:bg-sky-900/50 hover:text-sky-600 transition"
            title="Chép ca này sang ${DAY_NAMES[targetDay]}"
          >
            + ${DAY_SHORT_NAMES[targetDay]}
          </button>
        `
        )
        .join("");

      copyContainer.querySelectorAll(".btn-copy-day").forEach((btn) => {
        btn.onclick = () => {
          const targetDay = btn.dataset.copyTargetDay;
          const targetKey = `${targetDay}-${slotId}`;
          this.history.recordState();

          // Remove any existing in target slot or overwrite
          state.schedule = state.schedule.filter((s) => s.slotId !== targetKey);
          state.schedule.push({
            ...item,
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            slotId: targetKey,
          });

          this.storage.debouncedSave();
          events.emit("schedule:updated");
          events.emit("toast:show", {
            message: `Đã sao chép sang ${DAY_NAMES[targetDay]}`,
            type: "success",
          });
        };
      });
    }

    // Delete Button
    const btnDel = $("#btn-detail-delete");
    if (btnDel) {
      btnDel.onclick = () => {
        this.history.recordState();
        state.schedule = state.schedule.filter((s) => s.slotId !== slotKey);
        this.storage.debouncedSave();
        this.close("drawer-activity-detail");
        events.emit("schedule:updated");
        events.emit("toast:show", { message: `Đã xóa "${item.subject}"`, type: "info" });
      };
    }

    // Duplicate Button
    const btnDup = $("#btn-detail-duplicate");
    if (btnDup) {
      btnDup.onclick = () => {
        const emptySlot = state.timeSlots.find((sl) => !state.schedule.some((s) => s.slotId === `${d}-${sl.id}`));
        if (emptySlot) {
          this.history.recordState();
          state.schedule.push({
            ...item,
            id: `item_${Date.now()}`,
            slotId: `${d}-${emptySlot.id}`,
          });
          this.storage.debouncedSave();
          this.close("drawer-activity-detail");
          events.emit("schedule:updated");
          events.emit("toast:show", { message: "Đã nhân bản ca học", type: "success" });
        } else {
          events.emit("toast:show", { message: "Ngày này không còn ô trống để nhân bản", type: "error" });
        }
      };
    }

    this.open("drawer-activity-detail");
  }
}
