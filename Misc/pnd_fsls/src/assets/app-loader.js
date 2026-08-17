// Hiển thị khung giao diện trước, sau đó mới nạp Firebase và logic ứng dụng.
// App Check vẫn được khởi tạo bên trong app.js trước khi các truy vấn bắt đầu.
const AUTH_HINT_KEY = "pnd_auth_hint";

function escapeUiText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const staticActionHandlers = {
  "toggle-mobile-menu": () => window.toggleMobileMenu?.(),
  "open-login": () => window.moAuthModal?.("login"),
  "open-register": () => window.moAuthModal?.("register"),
  "toggle-notifications": () => window.toggleNotificationPanel?.(),
  "refresh-notifications": () => window.lamMoiThongBao?.(),
  "mark-all-notifications-read": () =>
    window.danhDauTatCaThongBaoDaDoc?.(),
  "exit-exam": () => window.thoatPhongThi?.(),
  "close-answer-sheet": () => window.toggleAnswerSheet?.(false),
  "toggle-answer-sheet": () => window.toggleAnswerSheet?.(),
  "submit-exam": () => window.nopBai?.(),
  "load-more-exams": () => window.taiThemKhoDe?.(),
  "sync-ranking": () => window.dongBoBangXepHangCu?.(),
  "refresh-ranking": () =>
    window.taiBangXepHang?.(
      document.getElementById("ranking-event-select")?.value,
      true,
    ),
  "save-account-name": () => window.luuTenTaiKhoan?.(),
  "verify-email": () => window.guiXacMinhEmail?.(),
  "refresh-account": () => window.taiThongTinTaiKhoan?.(true),
  "change-password": () => window.moDoiMatKhau?.(),
  "sign-out": () => window.dangXuatTaiKhoan?.(),
  "delete-submissions": () => window.xoaTatCaBaiNop?.(),
  "close-result-modal": () => window.closeModal?.(),
  "close-auth-modal": () => window.dongAuthModal?.(),
};

async function runStaticAction(actionNode, event) {
  const action = actionNode.dataset.pndAction;
  if (!action) return;
  if (action === "close-auth-backdrop" && event.target !== actionNode) return;

  event.preventDefault();
  await loadApplication();

  if (action === "navigate") {
    const route = actionNode.dataset.route;
    if (!route) return;
    await window.navigateTo?.(route);
    if (route === "events") await window.taiDanhSachSuKien?.();
    if (route === "account") await window.taiThongTinTaiKhoan?.();
    if (route === "admin-grading") {
      const title = document.getElementById("page-title");
      if (title) title.textContent = "Quản lý chấm bài";
      await window.taiDanhSachBaiThiChoAdmin?.();
    }
    return;
  }

  if (action === "ranking-event-change") {
    window.taiBangXepHang?.(actionNode.value);
    return;
  }

  if (action === "close-auth-backdrop") {
    window.dongAuthModal?.();
    return;
  }

  staticActionHandlers[action]?.();
}

function handleStaticAction(event) {
  const source = event.target;
  const actionNode =
    source instanceof Element ? source.closest("[data-pnd-action]") : null;
  if (!actionNode) return;
  void runStaticAction(actionNode, event);
}

document.addEventListener("click", handleStaticAction);
document.addEventListener("change", handleStaticAction);

function applyExamScheduleConfiguration() {
  const config = window.PND_EXAM_SCHEDULE;
  const exams = Array.isArray(config?.exams) ? config.exams : [];
  if (!config || exams.length === 0) return;

  const target =
    exams.find((exam) => exam.id === config.targetExamId) || exams[0];
  const setText = (id, value) => {
    const node = document.getElementById(id);
    if (node && value) node.textContent = value;
  };

  setText("exam-schedule-heading", config.headline);
  setText("exam-schedule-subtitle", config.subtitle);
  setText("exam-schedule-list-heading", config.scheduleHeading);
  setText("next-exam-name", target.name);
  setText("next-exam-date", `${target.displayDate} - ${target.time}`);
  setText(
    "next-exam-countdown-label",
    `Thời gian còn lại đến môn thi ${target.name}`,
  );

  const list = document.getElementById("exam-schedule-list");
  if (!list) return;
  const dayColors = ["text-red-500", "text-blue-500", "text-emerald-500"];
  list.innerHTML = exams
    .map((exam, index) => {
      const isTarget = exam.id === target.id;
      const cardClass = isTarget
        ? "border-[#D98A49] bg-[#FFF4E5]/50"
        : "border-slate-100 bg-slate-50";
      const status = exam.status
        ? `<span class="absolute top-2 right-2 rounded-full bg-[#FFE4C4] px-2 py-0.5 text-[8px] font-bold text-[#D98A49]">${escapeUiText(exam.status)}</span>`
        : "";
      return `
        <article class="relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4 ${cardClass}">
          <div class="flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-lg bg-white text-[10px] font-black text-slate-700 shadow-sm" aria-hidden="true">
            <span class="${dayColors[index % dayColors.length]} mb-[-2px]">${escapeUiText(exam.day)}</span>
            <span class="text-[8px] text-slate-400">${escapeUiText(exam.monthLabel)}</span>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-bold text-slate-800">${escapeUiText(exam.name)}</p>
            <p class="mt-0.5 text-[10px] text-slate-500">${escapeUiText(exam.displayDate)} | ${escapeUiText(exam.time)} | ${escapeUiText(exam.durationLabel)}</p>
          </div>
          ${status}
        </article>`;
    })
    .join("");
}

let configuredCountdownTimer = null;

function startConfiguredExamCountdown() {
  const config = window.PND_EXAM_SCHEDULE;
  const targetAt = new Date(config?.targetAt || "").getTime();
  const schoolYearStartsAt = new Date(
    config?.schoolYearStartsAt || "",
  ).getTime();
  if (!Number.isFinite(targetAt) || !Number.isFinite(schoolYearStartsAt))
    return;

  if (configuredCountdownTimer) clearInterval(configuredCountdownTimer);
  const tick = () => {
    const remaining = Math.max(0, targetAt - Date.now());
    const values = {
      "cd-days": Math.floor(remaining / 864e5),
      "cd-hours": String(Math.floor((remaining % 864e5) / 36e5)).padStart(
        2,
        "0",
      ),
      "cd-mins": String(Math.floor((remaining % 36e5) / 6e4)).padStart(
        2,
        "0",
      ),
      "cd-secs": String(Math.floor((remaining % 6e4) / 1e3)).padStart(
        2,
        "0",
      ),
    };
    Object.entries(values).forEach(([id, value]) => {
      const node = document.getElementById(id);
      if (node) node.textContent = String(value);
    });

    const elapsedPercent = Math.min(
      100,
      Math.max(
        0,
        ((Date.now() - schoolYearStartsAt) /
          (targetAt - schoolYearStartsAt)) *
          100,
      ),
    );
    const progress = document.getElementById("cd-progress");
    const percent = document.getElementById("cd-percent");
    const progressCopy = document.getElementById("cd-text-progress");
    if (progress) progress.style.width = `${elapsedPercent.toFixed(2)}%`;
    if (percent) percent.textContent = `${elapsedPercent.toFixed(1)}%`;
    if (progressCopy)
      progressCopy.textContent = `${elapsedPercent.toFixed(1)}% thời gian đã qua từ đầu năm học (${config.schoolYearStartLabel}) đến ${config.examLabel}`;
  };

  tick();
  configuredCountdownTimer = setInterval(tick, 1000);
}

function markDecorativeIcons() {
  document
    .querySelectorAll(
      ".nav-item i, button[aria-label] i, .countdown-heading i, .countdown-support-card > i",
    )
    .forEach((icon) => icon.setAttribute("aria-hidden", "true"));
}

document
  .getElementById("pnd-icons-stylesheet")
  ?.setAttribute("media", "all");
applyExamScheduleConfiguration();
markDecorativeIcons();

function syncAuthHintFromUi() {
  const welcome = document.getElementById("guest-welcome");
  const authButton = document.getElementById("header-auth-button");
  const displayName = document.getElementById("tenHienThi")?.textContent.trim();
  const isGuest =
    (welcome && !welcome.classList.contains("hidden")) ||
    (authButton && !authButton.classList.contains("hidden")) ||
    displayName === "Khách";
  const nextHint = isGuest ? "guest" : "signed-in";

  document.documentElement.dataset.authHint = nextHint;
  try {
    if (isGuest) localStorage.removeItem(AUTH_HINT_KEY);
    else localStorage.setItem(AUTH_HINT_KEY, nextHint);
  } catch (_) {
    // Trình duyệt chặn lưu trữ vẫn dùng được trạng thái của phiên hiện tại.
  }
}

function observeAuthLayout() {
  const welcome = document.getElementById("guest-welcome");
  const authButton = document.getElementById("header-auth-button");
  const displayName = document.getElementById("tenHienThi");
  const observer = new MutationObserver(syncAuthHintFromUi);

  if (welcome)
    observer.observe(welcome, { attributes: true, attributeFilter: ["class"] });
  if (authButton)
    observer.observe(authButton, {
      attributes: true,
      attributeFilter: ["class"],
    });
  if (displayName)
    observer.observe(displayName, {
      childList: true,
      characterData: true,
      subtree: true,
    });

  window.addEventListener("pagehide", () => observer.disconnect(), {
    once: true,
  });
}

observeAuthLayout();

let pendingRoute = null;
let applicationPromise = null;
let applicationReady = false;
let guestBootTimer = null;
const pendingInteractions = [];
const pendingInteractionKeys = new Set();
const GUEST_BOOT_DELAY_MS = 1800;

function installMobileMenuAccessibility() {
  const sidebar = document.getElementById("mobile-sidebar");
  const overlay = document.getElementById("mobile-overlay");
  const menuButton = document.getElementById("mobile-menu-button");
  const closeButton = document.getElementById("mobile-menu-close");
  const originalToggle = window.toggleMobileMenu;
  if (
    !sidebar ||
    !menuButton ||
    typeof originalToggle !== "function" ||
    originalToggle.pndAccessibilityReady
  )
    return;

  const syncState = () => {
    const isMobile = window.innerWidth < 768;
    const isOpen = !sidebar.classList.contains("-translate-x-full");
    menuButton.setAttribute("aria-expanded", String(isMobile && isOpen));
    sidebar.setAttribute("aria-hidden", String(isMobile && !isOpen));
    if (overlay) overlay.setAttribute("aria-hidden", String(!isOpen));
  };

  const accessibleToggle = function () {
    originalToggle();
    const isOpen = !sidebar.classList.contains("-translate-x-full");
    if (!isOpen && sidebar.contains(document.activeElement)) menuButton.focus();
    syncState();
    if (isOpen) closeButton?.focus();
  };
  accessibleToggle.pndAccessibilityReady = true;
  window.toggleMobileMenu = accessibleToggle;

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      window.innerWidth < 768 &&
      !sidebar.classList.contains("-translate-x-full")
    )
      accessibleToggle();
  });
  window.addEventListener("resize", syncState);
  syncState();
}

function syncNavigationAccessibility() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    if (item.classList.contains("active"))
      item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
  if (document.getElementById("menu-dashboard")?.classList.contains("active")) {
    const pageTitle = document.getElementById("page-title");
    if (pageTitle) pageTitle.textContent = "Tổng quan học tập";
  }
}

function installNavigationAccessibility() {
  const originalNavigate = window.navigateTo;
  if (
    typeof originalNavigate !== "function" ||
    originalNavigate.pndAccessibilityReady
  )
    return;

  const accessibleNavigate = function (...args) {
    const result = originalNavigate.apply(this, args);
    queueMicrotask(syncNavigationAccessibility);
    return result;
  };
  accessibleNavigate.pndAccessibilityReady = true;
  window.navigateTo = accessibleNavigate;
  syncNavigationAccessibility();
}

function syncDashboardPresentation() {
  const count =
    Number.parseInt(document.getElementById("dash-count")?.textContent, 10) || 0;
  const accuracyText =
    document.getElementById("dash-percent")?.textContent?.trim() || "0%";
  const accuracy =
    Math.min(100, Math.max(0, Number.parseFloat(accuracyText) || 0));
  const progressLabel = document.getElementById("study-progress-label");
  const progress = document
    .getElementById("study-progress-bar")
    ?.closest('[role="progressbar"]');
  if (progressLabel) progressLabel.textContent = `${accuracy}%`;
  if (progress) progress.setAttribute("aria-valuenow", String(accuracy));

  const historyList = document.getElementById("history-list");
  const historyEmpty = document.getElementById("history-empty");
  const hasHistory = Boolean(historyList?.querySelector("button"));
  historyList?.classList.toggle("hidden", !hasHistory);
  historyEmpty?.classList.toggle("hidden", hasHistory);

  const canvas = document.getElementById("performanceChart");
  const chartWrap = document.getElementById("performance-chart-wrap");
  const performanceEmpty = document.getElementById("performance-empty");
  const chartHasData = Boolean(
    canvas && window.Chart?.getChart && window.Chart.getChart(canvas),
  );
  chartWrap?.classList.toggle("hidden", !chartHasData);
  performanceEmpty?.classList.toggle("hidden", chartHasData);

  if (!chartHasData) {
    const title = document.getElementById("performance-empty-title");
    const copy = document.getElementById("performance-empty-copy");
    if (count > 0) {
      if (title) title.textContent = "Đang chờ kết quả được chấm";
      if (copy)
        copy.textContent =
          "Biểu đồ phong độ sẽ xuất hiện khi bài làm đầu tiên được chấm.";
    } else {
      if (title) title.textContent = "Chưa có dữ liệu phong độ";
      if (copy)
        copy.textContent =
          "Hoàn thành bài thi đầu tiên để xem biểu đồ tiến bộ của bạn.";
    }
  }
}

function installDashboardPresentation() {
  const originalLoad = window.taiDuLieuDashboard;
  if (
    typeof originalLoad !== "function" ||
    originalLoad.pndPresentationReady
  ) {
    syncDashboardPresentation();
    return;
  }

  const enhancedLoad = async function (...args) {
    try {
      return await originalLoad.apply(this, args);
    } finally {
      syncDashboardPresentation();
    }
  };
  enhancedLoad.pndPresentationReady = true;
  window.taiDuLieuDashboard = enhancedLoad;
  syncDashboardPresentation();
}

if (typeof window.navigateTo !== "function") {
  window.navigateTo = (route) => {
    pendingRoute = route;
  };
}

function replayPendingInteractions() {
  const interactions = pendingInteractions.splice(0);
  pendingInteractionKeys.clear();
  interactions.forEach((replay) => setTimeout(replay, 0));
}

async function loadApplication() {
  if (applicationPromise) return applicationPromise;

  applicationPromise = (async () => {
    try {
      const nativeSetInterval = window.setInterval;
      const legacyCountdownIntervals = [];
      window.setInterval = function (handler, delay, ...args) {
        const intervalId = nativeSetInterval.call(window, handler, delay, ...args);
        if (
          Number(delay) === 1000 &&
          typeof handler === "function" &&
          String(handler).includes("cd-days")
        )
          legacyCountdownIntervals.push(intervalId);
        return intervalId;
      };
      try {
        await import("./app.js?v=5.33.4");
        await import("./email-verification-sync.js?v=5.33.4");
        document.documentElement.dataset.emailVerificationSync = "ready";
      } finally {
        window.setInterval = nativeSetInterval;
      }
      legacyCountdownIntervals.forEach((intervalId) =>
        window.clearInterval(intervalId),
      );
      startConfiguredExamCountdown();
      applicationReady = true;
      document.documentElement.classList.add("pnd-app-ready");
      installMobileMenuAccessibility();
      installNavigationAccessibility();
      installDashboardPresentation();
      markDecorativeIcons();

      if (pendingRoute && typeof window.navigateTo === "function") {
        const route = pendingRoute;
        pendingRoute = null;
        window.navigateTo(route);
      }
      replayPendingInteractions();
    } catch (error) {
      console.error("Không thể khởi động PND:", error);
      document.documentElement.classList.add("pnd-app-error");
    }
  })();

  return applicationPromise;
}

function requestApplicationLoad() {
  void loadApplication();
}

function captureEarlyInteraction(event) {
  if (applicationReady) return;
  const source = event.target;
  const target =
    source instanceof Element
      ? source.closest(
          "button, a, input, select, textarea, [data-pnd-action], [role='button'], .nav-item",
        )
      : null;
  if (!target) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  const key = `${event.type}:${target.id || target.outerHTML.slice(0, 80)}`;
  if (!pendingInteractionKeys.has(key)) {
    pendingInteractionKeys.add(key);
    pendingInteractions.push(() => {
      if (!target.isConnected) return;
      if (target.matches("input, select, textarea")) target.focus();
      target.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          view: window,
        }),
      );
    });
  }
  requestApplicationLoad();
}

document.addEventListener("click", captureEarlyInteraction, true);

function startAfterFirstPaint() {
  requestAnimationFrame(() => {
    const returningUser =
      document.documentElement.dataset.authHint === "signed-in";
    guestBootTimer = setTimeout(
      requestApplicationLoad,
      returningUser ? 0 : GUEST_BOOT_DELAY_MS,
    );
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startAfterFirstPaint, {
    once: true,
  });
} else {
  startAfterFirstPaint();
}

window.addEventListener(
  "pagehide",
  () => {
    if (guestBootTimer) clearTimeout(guestBootTimer);
    if (configuredCountdownTimer) clearInterval(configuredCountdownTimer);
    document.removeEventListener("click", captureEarlyInteraction, true);
  },
  { once: true },
);