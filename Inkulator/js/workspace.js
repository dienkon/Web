(function (root) {
  "use strict";
  let lastPanel = "geometry";
  const navIcons = {
    pages: "M4 3h16v18H4zM8 7h8M8 11h8M8 15h5",
    "paste-image": "M8 5H4v17h16V5h-4M8 3h8v5H8zM8 13h8M12 10v8",
    image: "M3 3h18v18H3zM3 17l6-6 5 5 3-3 4 4M16 7h.01",
    capture: "M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5M7 7h10v10H7z",
    pdf: "M5 2h9l5 5v15H5zM14 2v6h6M8 12h8M8 16h6",
    graph: "M3 3v18h18M5 16c4-17 9 8 15-10",
    geometry: "M12 3L2 21h20zM12 3v18",
    solid: "M12 2l10 6v10l-10 5L2 18V8zM2 8l10 6 10-6M12 14v9",
    calculator: "M5 2h14v20H5zM8 5h8v4H8zM8 13h1M12 13h1M16 13h1M8 17h1M12 17h1M16 17h1",
    math: "M19 4H6l8 8-8 8h13", formula: "M17 3h-3c-4 0-2 18-7 18H5M7 9h11",
    paper: "M4 2h16v20H4zM7 7h10M7 12h10M7 17h10",
    layers: "M12 3L2 8l10 5 10-5zM2 12l10 5 10-5M2 16l10 5 10-5",
  };
  function init() {
    for (const b of document.querySelectorAll(".workspace-tabs button")) {
      const label = b.textContent.trim().replace(/^[^\p{L}]+/u, "");
      const key = b.dataset.panel || b.dataset.action;
      b.title = label;
      b.setAttribute("aria-label", label);
      if (navIcons[key]) b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + navIcons[key] + '"/></svg>';
    }
    setupResize(document.getElementById("pages-sidebar"), "left", 140, 300);
    setupResize(document.getElementById("panel"), "right", 270, 520);
    const reopen = document.createElement("button");
    reopen.id = "panel-reopen";
    reopen.textContent = "‹";
    reopen.title = "Mở lại bảng công cụ";
    reopen.setAttribute("aria-label", reopen.title);
    reopen.hidden = true;
    document.getElementById("workspace").append(reopen);
    const panel = document.getElementById("panel");
    new MutationObserver(() => {
      if (!panel.hidden && Store.state.panel) lastPanel = Store.state.panel;
      reopen.hidden = !panel.hidden;
      reopen.title = "Mở lại bảng: " + document.getElementById("panel-title").textContent;
    }).observe(panel, { attributes: true, attributeFilter: ["hidden"] });
    reopen.onclick = () => App.openPanel(lastPanel);
    const pages = document.getElementById("pages-sidebar");
    const pagesButton = document.getElementById("pages-toggle");
    const syncPages = () => {
      pagesButton.setAttribute("aria-expanded", String(!pages.hidden));
      pagesButton.classList.toggle("active", !pages.hidden);
    };
    new MutationObserver(syncPages).observe(pages, { attributes: true, attributeFilter: ["hidden"] });
    syncPages();
  }
  function setupResize(el, side, min, max) {
    const grip = document.createElement("div");
    grip.className = "panel-grip grip-" + side;
    grip.tabIndex = 0;
    grip.setAttribute("role", "separator");
    grip.setAttribute("aria-orientation", "vertical");
    grip.setAttribute("aria-label", "Kéo để đổi độ rộng; kéo về mép để thu gọn");
    grip.setAttribute("aria-valuemin", min);
    grip.setAttribute("aria-valuemax", max);
    let drag = null, frame = 0, pending = 0;
    const apply = () => {
      frame = 0;
      const w = Math.max(min, Math.min(max, pending, innerWidth - 60));
      el.style.width = w + "px";
      grip.setAttribute("aria-valuenow", Math.round(w));
    };
    const close = () => document.querySelector(side === "left" ? "#pages-toggle" : '[data-action="close-panel"]').click();
    grip.onpointerdown = (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      drag = { x: e.clientX, width: el.getBoundingClientRect().width };
      pending = drag.width;
      grip.setPointerCapture(e.pointerId);
    };
    grip.onpointermove = (e) => {
      if (!drag) return;
      pending = drag.width + (e.clientX - drag.x) * (side === "left" ? 1 : -1);
      if (!frame) frame = requestAnimationFrame(apply);
    };
    grip.onpointerup = () => {
      if (!drag) return;
      if (frame) cancelAnimationFrame(frame);
      apply();
      drag = null;
      if (pending < min - 60) close();
    };
    grip.onpointercancel = () => { drag = null; };
    grip.onkeydown = (e) => {
      if (e.key === "Enter") return close();
      if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
      e.preventDefault();
      pending = el.getBoundingClientRect().width + (e.key === "ArrowRight" ? 20 : -20) * (side === "left" ? 1 : -1);
      apply();
    };
    el.append(grip);
  }
  function settings() {
    const history = document.getElementById("setting-history");
    history.max = "2000";
    history.previousElementSibling.textContent = "Số bước Undo (10–2.000)";
    const label = document.createElement("label");
    label.className = "field";
    label.innerHTML = '<span>Hiệu năng hiển thị</span><select id="setting-performance"><option value="auto">Tự động · cân bằng</option><option value="economy">Máy yếu · tiết kiệm bộ nhớ</option><option value="quality">Độ nét cao</option></select>';
    history.closest("label").after(label);
    const select = label.querySelector("select");
    select.value = Store.state.settings.performance;
    select.onchange = () => {
      Store.state.settings.performance = select.value;
      Renderer.resize();
      Store.scheduleSave();
    };
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = "Nhấp đúp chỉ sửa đối tượng khi dùng công cụ Chọn. Undo lưu riêng từng nét; lịch sử có giới hạn bộ nhớ. Tự lưu khi tạm ngưng viết và khi chuyển ứng dụng.";
    label.after(hint);
  }
  root.WorkspaceUI = { init, settings, rememberPanel(id) { lastPanel = id; } };
})(window);
