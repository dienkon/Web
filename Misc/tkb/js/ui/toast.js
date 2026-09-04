/**
 * Toast Notifications UI Component
 */

import { escapeHTML, $ } from "../utils/dom.js";
import { events } from "../core/events.js";

export class ToastUI {
  constructor() {
    this.container = $("#toast-container");
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "toast-container";
      document.body.appendChild(this.container);
    }
    this.bindEvents();
  }

  bindEvents() {
    events.on("toast:show", ({ message, type = "info", duration = 3000 }) => {
      this.show(message, type, duration);
    });
  }

  show(message, type = "info", duration = 3000) {
    const toast = document.createElement("div");

    let colorClasses = "bg-slate-900 text-white border-slate-700";
    if (type === "success") colorClasses = "bg-emerald-600 text-white border-emerald-500";
    if (type === "warning") colorClasses = "bg-amber-600 text-white border-amber-500";
    if (type === "error") colorClasses = "bg-rose-600 text-white border-rose-500";

    toast.className = `toast-item ${colorClasses}`;
    toast.innerHTML = `<span>${escapeHTML(message)}</span>`;
    this.container.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }
}
