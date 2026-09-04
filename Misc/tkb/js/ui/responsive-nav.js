/**
 * Mobile Responsive Navigation & Day Selector UI Component
 */

import { $, $$, setupSwipeListener } from "../utils/dom.js";
import { DAY_NAMES, DAY_SHORT_NAMES, DAY_ORDER } from "../utils/format.js";
import { events } from "../core/events.js";

export class ResponsiveNavUI {
  constructor(store) {
    this.store = store;
    this.currentMobileTab = "schedule";
  }

  init() {
    this.bindEvents();
    this.renderDaySelector();
  }

  bindEvents() {
    // Mobile Bottom Navigation Tabs Click
    const nav = $("#mobile-bottom-nav");
    if (nav) {
      nav.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-mobile-tab]");
        if (btn) {
          const tab = btn.dataset.mobileTab;
          this.switchTab(tab);
        }
      });
    }

    // Mobile Day Selector Chips Click
    const daySelector = $("#mobile-day-selector");
    if (daySelector) {
      daySelector.addEventListener("click", (e) => {
        const chip = e.target.closest("[data-day]");
        if (chip) {
          const day = parseInt(chip.dataset.day, 10);
          this.selectDay(day);
        }
      });
    }

    // Touch Swipe Left / Right to switch days
    const viewport = $("#timetable-viewport");
    if (viewport) {
      setupSwipeListener(viewport, {
        onSwipeLeft: () => this.nextDay(),
        onSwipeRight: () => this.prevDay(),
        threshold: 40,
      });
    }

    events.on("schedule:updated", () => this.renderDaySelector());
  }

  switchTab(tab) {
    this.currentMobileTab = tab;
    $$("#mobile-bottom-nav [data-mobile-tab]").forEach((btn) => {
      const isActive = btn.dataset.mobileTab === tab;
      btn.classList.toggle("text-sky-600", isActive);
      btn.classList.toggle("dark:text-sky-400", isActive);
      btn.classList.toggle("font-bold", isActive);
      btn.classList.toggle("text-slate-400", !isActive);
    });

    if (tab === "home" || tab === "schedule") {
      events.emit("nav:show-schedule");
    } else if (tab === "focus") {
      events.emit("focus:start");
    } else if (tab === "stats") {
      events.emit("modal:open", "modal-analytics");
    } else if (tab === "more") {
      events.emit("modal:open", "modal-settings");
    }
  }

  selectDay(day) {
    this.store.setState({ selectedDayMobile: day });
    this.renderDaySelector();
    events.emit("schedule:day-changed", day);
  }

  nextDay() {
    const state = this.store.getState();
    const currentIdx = DAY_ORDER.indexOf(state.selectedDayMobile);
    const nextIdx = (currentIdx + 1) % DAY_ORDER.length;
    this.selectDay(DAY_ORDER[nextIdx]);
  }

  prevDay() {
    const state = this.store.getState();
    const currentIdx = DAY_ORDER.indexOf(state.selectedDayMobile);
    const prevIdx = (currentIdx - 1 + DAY_ORDER.length) % DAY_ORDER.length;
    this.selectDay(DAY_ORDER[prevIdx]);
  }

  renderDaySelector() {
    const container = $("#mobile-day-selector");
    if (!container) return;

    const state = this.store.getState();
    const now = new Date();
    const today = now.getDay();

    container.innerHTML = DAY_ORDER.map((d) => {
      const isActive = d === state.selectedDayMobile;
      const isToday = d === today;
      const count = state.schedule.filter((s) => s.slotId && s.slotId.startsWith(`${d}-`)).length;

      return `
        <button
          type="button"
          data-day="${d}"
          class="mobile-day-chip ${isActive ? "active" : ""} ${isToday ? "is-today ring-1 ring-sky-500 font-bold" : ""}"
          title="${DAY_NAMES[d]}${isToday ? " (Hôm nay)" : ""}"
        >
          <span class="text-xs font-bold">${DAY_SHORT_NAMES[d]}</span>
          <span class="text-[9px] opacity-80">${isToday ? "Nay" : DAY_NAMES[d].replace("Thứ ", "T")}</span>
          ${count > 0 ? `<span class="text-[9px] px-1 py-0.2 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500"} font-bold mt-0.5">${count}</span>` : ""}
        </button>
      `;
    }).join("");
  }
}
