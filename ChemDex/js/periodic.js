import {
  allElements,
  elementsMap,
  categories,
  escapeHtml,
  formatChemicalFormulaHtml,
  buildReactionLatex,
  renderEquationBlock,
  renderDetailMediaBlocks,
  mountDetailVisuals,
  mediaToCards,
  getElectronConfigText,
  inferLatticeTitle,
  inferLatticeKey,
} from "./core.js";
import {
  openChatbot,
  closeChatbot,
  toggleChatbot,
  sendChatMessage,
  setupChatbotContext,
} from "./chatbot.js";
import { mountMediaBlocks } from "./model-media.js";

const tableContainer = document.getElementById("periodic-table");
const GROUP_LABELS = {
  1: "IA",
  2: "IIA",
  3: "IIIB",
  4: "IVB",
  5: "VB",
  6: "VIB",
  7: "VIIB",
  8: "VIIIB",
  9: "VIIIB",
  10: "VIIIB",
  11: "IB",
  12: "IIB",
  13: "IIIA",
  14: "IVA",
  15: "VA",
  16: "VIA",
  17: "VIIA",
  18: "VIIIA",
};

function getGroupLabel(group) {
  return GROUP_LABELS[Number(group)] || group || "?";
}

function renderPeriodicTable() {
  tableContainer.innerHTML = "";

  // 1. Render Column Labels (Cột 1->18 tương ứng grid-column 2->19, grid-row 1)
  for (let col = 1; col <= 18; col++) {
    let label = document.createElement("div");
    label.className = `grid-label col-label-${col}`;
    label.innerHTML = `
  <div class="flex flex-col items-center">
    <span class="text-[11px] leading-tight">
      ${escapeHtml(getGroupLabel(col))}
    </span>
    <span class="text-[10px] text-slate-500 leading-tight">
      ${col}
    </span>
  </div>
`;
    label.style.gridColumn = col + 1;
    label.style.gridRow = 1;
    // Hover logic: Highlight cột
    label.onmouseenter = () => highlightGrid("col", col + 1);
    label.onmouseleave = () => removeHighlight();
    tableContainer.appendChild(label);
  }

  // 2. Render Row Labels (Chu kỳ 1->7 tương ứng grid-row 2->8, grid-column 1)
  for (let row = 1; row <= 7; row++) {
    let label = document.createElement("div");
    label.className = `grid-label row-label-${row}`;
    label.innerText = row;
    label.style.gridColumn = 1;
    label.style.gridRow = row + 1;
    // Hover logic: Highlight hàng
    label.onmouseenter = () => highlightGrid("row", row + 1);
    label.onmouseleave = () => removeHighlight();
    tableContainer.appendChild(label);
  }

  // 3. Render Elements
  allElements.forEach((el) => {
    if (!el.xpos) return;

    const div = document.createElement("div");
    // Lưu data attr để filter/highlight dễ dàng
    div.className = `element el-cell ${el.hasData ? "" : "no-data"} cat-${el.category}`;
    div.dataset.col = el.xpos;
    div.dataset.row = el.ypos;
    div.dataset.cat = el.category;

    div.style.gridColumn = el.xpos;
    div.style.gridRow = el.ypos;

    let color = categories[el.category]?.color || categories["unknown"].color;
    div.style.setProperty("--color", color);

    div.innerHTML = `
                      <div class="el-number">${el.number}</div>
                      <div class="el-symbol">${el.symbol}</div>
                      <div class="el-name" title="${el.nameVi}">${el.nameVi}</div>
                  `;

    div.addEventListener("click", () => {
      if (el.hasData) showElementDetails(el);
      else showNoData(el);
    });
    tableContainer.appendChild(div);
  });
}

// --- LOGIC HIGHLIGHT (Rê chuột Cột/Hàng/Nhóm) ---
function highlightGrid(type, value) {
  const cells = document.querySelectorAll(".el-cell");
  cells.forEach((c) => {
    c.classList.add("dimmed");
    if (c.dataset[type] == value) {
      c.classList.remove("dimmed");
      c.classList.add("highlight-active");
    }
  });
}

function highlightCategory(catCode) {
  const cells = document.querySelectorAll(".el-cell");
  cells.forEach((c) => {
    c.classList.add("dimmed");
    if (c.dataset.cat === catCode) {
      c.classList.remove("dimmed");
      c.classList.add("highlight-active");
    }
  });
}

function removeHighlight() {
  document.querySelectorAll(".el-cell").forEach((c) => {
    c.classList.remove("dimmed", "highlight-active");
  });
}

// --- LOGIC GIAO DIỆN CHUNG & ĐIỀU HƯỚNG ---
function nav(viewId) {
  document.querySelectorAll("main > div > div[id^='view-']").forEach((el) => {
    el.classList.add("hidden");
    el.classList.remove("fade-in");
  });
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.remove("hidden");
    void target.offsetWidth;
    target.classList.add("fade-in");
  }
  document.getElementById("content-container").scrollTop = 0;
  if (window.innerWidth < 768) toggleSidebar(false);
}

function toggleSidebar(forceState) {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("mobile-overlay");
  if (forceState !== undefined) {
    if (forceState) {
      sidebar.classList.add("sidebar-open");
      overlay.classList.remove("hidden");
    } else {
      sidebar.classList.remove("sidebar-open");
      overlay.classList.add("hidden");
    }
  } else {
    sidebar.classList.toggle("sidebar-open");
    overlay.classList.toggle("hidden");
  }
}

// --- DRAGGABLE BẢNG TUẦN HOÀN ---
const dragContainer = document.getElementById("dragContainer");
let isDown = false,
  startX,
  startY,
  scrollLeft,
  scrollTop;

dragContainer.addEventListener("mousedown", (e) => {
  isDown = true;
  startX = e.pageX - dragContainer.offsetLeft;
  startY = e.pageY - dragContainer.offsetTop;
  scrollLeft = dragContainer.scrollLeft;
  scrollTop = dragContainer.scrollTop;
});
dragContainer.addEventListener("mouseleave", () => {
  isDown = false;
  removeHighlight();
});
dragContainer.addEventListener("mouseup", () => (isDown = false));
dragContainer.addEventListener("mousemove", (e) => {
  if (!isDown) return;
  e.preventDefault();
  const x = e.pageX - dragContainer.offsetLeft;
  const y = e.pageY - dragContainer.offsetTop;
  dragContainer.scrollLeft = scrollLeft - (x - startX);
  dragContainer.scrollTop = scrollTop - (y - startY);
});

// --- NO DATA & BÀI BÁO CHI TIẾT ---
function showNoData(el) {
  document.getElementById("nodata-name").innerText =
    el.nameVi + ` (${el.symbol})`;
  nav("view-nodata");
}

function renderMethodCard(item = {}, idx = 0, fallback = "Phương pháp") {
  if (!item) return "";
  if (typeof item === "string") {
    return `<div class="rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-slate-300 leading-relaxed">${item}</div>`;
  }
  const eq = item.equation || item.eq || item.reaction || "";
  const desc = item.desc || item.description || item.note || "";
  const reagent = item.reagent || item.reagents || item.chemical || "";
  const result = item.result || item.observation || item.signal || "";
  return `
    <div class="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
      <div class="flex items-center justify-between gap-3 mb-3">
        <h4 class="text-white font-bold text-lg">${escapeHtml(item.title || item.name || `${fallback} ${idx + 1}`)}</h4>
        ${item.condition ? `<span class="visual-badge">${escapeHtml(item.condition)}</span>` : ""}
      </div>
      ${reagent ? `<p class="text-sm text-cyan-300 mb-2"><span class="text-slate-400">Thuốc thử/chất dùng:</span> ${escapeHtml(Array.isArray(reagent) ? reagent.join(", ") : reagent)}</p>` : ""}
      ${eq ? `<div class="equation-latex text-xl md:text-2xl font-mono text-emerald-300 mb-3 font-bold bg-slate-950 p-4 rounded-lg overflow-x-auto">${buildReactionLatex({ equation: eq, condition: item.condition })}</div>` : ""}
      ${result ? `<p class="text-amber-200 mb-2"><span class="text-slate-400">Hiện tượng:</span> ${escapeHtml(result)}</p>` : ""}
      ${desc ? `<p class="text-slate-400 leading-relaxed">${escapeHtml(desc)}</p>` : ""}
    </div>
  `;
}

function renderMethodList(items, fallback) {
  const list = Array.isArray(items) ? items : items ? [items] : [];
  if (!list.length) {
    return '<p class="text-slate-500 italic">Đang cập nhật dữ liệu...</p>';
  }
  return `<div class="grid gap-4">${list.map((item, idx) => renderMethodCard(item, idx, fallback)).join("")}</div>`;
}

function renderPreparation(prepSource) {
  if (!prepSource) {
    return '<p class="text-slate-500 italic">Đang cập nhật dữ liệu điều chế...</p>';
  }
  if (typeof prepSource === "string") {
    return `<div class="grid gap-5">
      <div>
        <h4 class="text-white font-bold mb-3">a. Trong phòng thí nghiệm</h4>
        <div class="text-slate-300 leading-relaxed">${prepSource}</div>
      </div>
      <div>
        <h4 class="text-white font-bold mb-3">b. Trong công nghiệp</h4>
        <p class="text-slate-500 italic">Có thể bổ sung vào <code>preparation.industry</code> trong JSON.</p>
      </div>
    </div>`;
  }
  if (!Array.isArray(prepSource) && typeof prepSource === "object") {
    const lab = prepSource.lab || prepSource.laboratory || prepSource.a || [];
    const industry =
      prepSource.industry ||
      prepSource.industrial ||
      prepSource.factory ||
      prepSource.b ||
      [];
    return `<div class="grid gap-6">
      <div>
        <h4 class="text-white font-bold mb-3">a. Trong phòng thí nghiệm</h4>
        ${renderMethodList(lab, "Cách điều chế")}
      </div>
      <div>
        <h4 class="text-white font-bold mb-3">b. Trong công nghiệp</h4>
        ${renderMethodList(industry, "Quy trình")}
      </div>
    </div>`;
  }
  return renderMethodList(prepSource, "Phương pháp");
}

function renderRecognition(el = {}) {
  const source =
    el.recognition || el.identification || el.tests || el.qualitative || null;
  if (!source) {
    return '<p class="text-slate-500 italic">Đang cập nhật dữ liệu nhận biết. Có thể thêm trường <code>recognition</code> trong JSON.</p>';
  }
  if (typeof source === "string") {
    return `<div class="text-slate-300 leading-relaxed">${source}</div>`;
  }
  const groups =
    !Array.isArray(source) && typeof source === "object"
      ? [
          [
            "a. Thuốc thử / dấu hiệu đặc trưng",
            source.tests || source.reagents || source.signals || source.a,
          ],
          [
            "b. Phân biệt với chất dễ nhầm",
            source.distinguish || source.compare || source.b,
          ],
        ]
      : [["Các cách nhận biết", source]];
  return `<div class="grid gap-6">
    ${groups
      .map(
        ([title, items]) => `
          <div>
            <h4 class="text-white font-bold mb-3">${escapeHtml(title)}</h4>
            ${renderMethodList(items, "Cách nhận biết")}
          </div>
        `,
      )
      .join("")}
  </div>`;
}

function showElementDetails(el) {
  nav("view-details");
  const catColor = categories[el.category]?.color || "#475569";
  const sectionMedia = (key) => renderDetailMediaBlocks(el, key);

  const hero = document.getElementById("detail-hero");
  hero.innerHTML = `
          <div class="absolute inset-0 bg-gradient-to-b from-[${catColor}20] to-transparent" style="background: linear-gradient(to bottom, ${catColor}30, transparent);"></div>
          <div class="absolute top-0 right-10 w-96 h-96 rounded-full blur-[120px] opacity-20" style="background-color: ${catColor}"></div>
          <div class="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-end gap-6">
            <div class="w-32 h-32 md:w-40 md:h-40 rounded-3xl flex flex-col items-center justify-center shadow-2xl border-2 bg-slate-900/90 backdrop-blur" style="border-color: ${catColor}">
              <span class="text-slate-400 font-bold mb-1">${el.number}</span>
              <span class="text-6xl font-bold font-mono text-white">${el.symbol}</span>
            </div>
            <div class="flex-1 text-center md:text-left">
              <span class="px-3 py-1 rounded-full text-xs font-bold border inline-block mb-3" style="color: ${catColor}; border-color: ${catColor}; background: rgba(0,0,0,0.3)">
                ${categories[el.category]?.name.toUpperCase() || "CHƯA XÁC ĐỊNH"}
              </span>
              <h2 class="text-5xl font-bold text-white mb-2">${el.nameVi}</h2>
              <p class="text-xl text-slate-300">${el.nameEn} • ${el.mass} g/mol</p>
            </div>
          </div>
        `;

  const discovererList = Array.isArray(el.history?.discoverers)
    ? el.history.discoverers
    : Array.isArray(el.history?.discoverer)
      ? el.history.discoverer
      : [];
  const discoverer =
    !discovererList.length && typeof el.history?.discoverer === "string"
      ? el.history.discoverer
      : "";
  const discovererUrl =
    el.history?.discovererUrl ||
    el.history?.href ||
    discovererList[0]?.url ||
    "";
  let discovererMarkup = "Khuyết danh";
  if (discovererList.length) {
    discovererMarkup = discovererList
      .map((person) =>
        person?.url
          ? `<a href="${escapeHtml(person.url)}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">${escapeHtml(person.name || person.label || "Người phát hiện")}</a>`
          : escapeHtml(person?.name || person?.label || "Người phát hiện"),
      )
      .join(", ");
  } else if (discovererUrl && discoverer) {
    discovererMarkup = `<a href="${escapeHtml(discovererUrl)}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">${escapeHtml(discoverer)} <i class="fa-solid fa-arrow-up-right-from-square text-xs ml-1"></i></a>`;
  } else if (discoverer) {
    discovererMarkup = escapeHtml(discoverer);
  }

  const occurrence = el.occurrence || {};
  const structure = el.structure || {};
  const imageGallery = mediaToCards(el.images, {
    defaultTitle: "Hình ảnh",
    emptyText: "Chưa có hình ảnh minh họa.",
    kindHint: "image",
  });
  const appCards =
    (el.applications && el.applications.length ? el.applications : [])
      .map((app) => {
        const previewHtml = mediaToCards(app.image || app.images || app.media, {
          defaultTitle: app.title || "Ứng dụng",
          emptyText: "",
          kindHint: "image",
        }).html;
        return `
              <div class="glass overflow-hidden rounded-2xl border border-slate-700 group">
                ${previewHtml ? `<div class="h-40 bg-slate-800 overflow-hidden">${previewHtml}</div>` : ""}
                <div class="p-5">
                  <h4 class="font-bold text-white mb-2 text-lg">${escapeHtml(app.title || "")}</h4>
                  <p class="text-slate-400 text-sm leading-relaxed">${escapeHtml(app.desc || "")}</p>
                </div>
              </div>
            `;
      })
      .join("") ||
    '<p class="text-slate-500 italic col-span-2">Đang cập nhật dữ liệu ứng dụng...</p>';

  const prepSource =
    el.preparation || el.preparations || el.manufacture || el.production || [];
  const preparationHtml = renderPreparation(prepSource);
  const recognitionHtml = renderRecognition(el);
  if (false)
    (() => {
      if (!prepSource) {
        return '<p class="text-slate-500 italic">Đang cập nhật dữ liệu điều chế...</p>';
      }
      if (typeof prepSource === "string")
        return `<div class="text-slate-300 leading-relaxed">${prepSource}</div>`;
      const list = Array.isArray(prepSource) ? prepSource : [prepSource];
      return `
            <div class="grid gap-4">
              ${list
                .map((item, idx) => {
                  if (!item) return "";
                  const eq = item.equation || item.eq || "";
                  const desc = item.desc || item.description || "";
                  return `
                    <div class="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
                      <div class="flex items-center justify-between gap-3 mb-3">
                        <h4 class="text-white font-bold text-lg">${escapeHtml(item.title || item.name || `Phương pháp ${idx + 1}`)}</h4>
                        ${item.condition ? `<span class="visual-badge">${escapeHtml(item.condition)}</span>` : ""}
                      </div>
                      ${eq ? `<div class="equation-latex text-xl md:text-2xl font-mono text-emerald-300 mb-3 font-bold bg-slate-950 p-4 rounded-lg overflow-x-auto">${buildReactionLatex({ equation: eq, condition: item.condition })}</div>` : ""}
                      ${desc ? `<p class="text-slate-400 leading-relaxed">${escapeHtml(desc)}</p>` : ""}
                    </div>
                  `;
                })
                .join("")}
            </div>
          `;
    })();

  const notesHtml =
    el.notes ||
    '<p class="text-slate-500 italic">Chưa có ghi chú tổng quan.</p>';
  const savedNote = localStorage.getItem(`chemdex_note_${el.symbol}`) || "";

  let html = "";

  html += `
          <section id="sec-general" class="scroll-mt-24">
            <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span class="w-8 h-8 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm"><i class="fa-solid fa-info"></i></span>
              1. Thông tin chung
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div class="glass p-4 rounded-xl border border-slate-700/50"><p class="text-slate-400 text-sm mb-1">Tên Latin</p><p class="text-lg font-mono text-yellow-300 font-bold">${escapeHtml(el.general?.latinName || "...")}</p></div>
              <div class="glass p-4 rounded-xl border border-slate-700/50"><p class="text-slate-400 text-sm mb-1">Tên Tiếng Anh</p><p class="text-lg font-mono text-green-300 font-bold">${escapeHtml(el.general?.englishName || "...")}</p></div>
              <div class="glass p-4 rounded-xl border border-slate-700/50"><p class="text-slate-400 text-sm mb-1">Đồng vị</p><p class="text-lg font-mono text-blue-300 font-bold">${escapeHtml(el.general?.isotope || "...")}</p></div>
              <div class="glass p-4 rounded-xl border border-slate-700/50"><p class="text-slate-400 text-sm mb-1">Vị trí</p><p class="text-lg text-white">Nhóm ${escapeHtml(el.general?.group || "?")} | Chu kì ${escapeHtml(el.general?.period || "?")}</p></div>
              <div class="glass p-4 rounded-xl border border-slate-700/50"><p class="text-slate-400 text-sm mb-1">Số Oxy hóa</p><p class="text-lg text-white">${escapeHtml(el.general?.oxidation || "...")}</p></div>
              <div class="glass p-4 rounded-xl border border-slate-700/50"><p class="text-slate-400 text-sm mb-1">Độ âm điện</p><p class="text-lg text-white">${escapeHtml(el.general?.electronegativity || "...")}</p></div>
            </div>
            ${sectionMedia("general")}
          </section>
        `;

  html += `
          <section id="sec-history" class="scroll-mt-24">
            <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-3"><span class="w-8 h-8 rounded bg-orange-500/20 text-orange-400 flex items-center justify-center text-sm"><i class="fa-solid fa-landmark"></i></span> 2. Lịch sử khám phá</h3>
            <div class="glass p-6 rounded-2xl border border-slate-700">
              <p class="text-lg text-slate-300 mb-2">Phát hiện bởi: <strong>${discovererMarkup}</strong></p>
              <p class="text-lg text-slate-300 mb-2">Năm công bố: <span class="text-white bg-slate-800 px-2 py-1 rounded">${escapeHtml(el.history?.year || "Cổ đại / Chưa rõ")}</span></p>
              <p class="text-lg text-slate-300 mb-2">Nơi khám phá: <strong>${escapeHtml(el.history?.discoveryLocation || "Chưa rõ")}</strong></p>
              <p class="text-lg text-slate-300 mb-2">Mô tả: <span class="text-white bg-slate-800 px-2 py-1 rounded">${escapeHtml(el.history?.description || "")}</span></p>
            </div>
            ${sectionMedia("history")}
          </section>
        `;

  html += `
          <section id="sec-structure" class="scroll-mt-24">
            <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span class="w-8 h-8 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm"><i class="fa-solid fa-cubes"></i></span>
              3. Cấu tạo
            </h3>

            <div class="flex flex-col gap-6">
              <div class="glass p-5 rounded-2xl border border-slate-700">
                <h4 class="text-white font-semibold mb-4">a. Cấu tạo</h4>

                <div class="structure-visual-grid mb-4">
                  <div class="visual-card p-4">
                    <div class="flex items-center justify-between mb-3 gap-3">
                      <p class="text-slate-200 font-medium">Hoạt họa cấu hình e</p>
                      <span class="visual-badge"><i class="fa-solid fa-bolt text-blue-300"></i> ${getElectronConfigText(el)}</span>
                    </div>
                    <div id="electron-widget" class="electron-canvas-wrap"></div>
                  </div>

                  <div class="visual-card p-4">
                    <div class="flex items-center justify-between mb-3 gap-3">
                      <p class="text-slate-200 font-medium">Mô hình mạng tinh thể</p>
                      <span class="visual-badge"><i class="fa-solid fa-cube text-cyan-300"></i> ${inferLatticeTitle(el, inferLatticeKey(el))}</span>
                    </div>
                    <div id="crystal-widget" class="crystal-scene-wrap"></div>
                  </div>
                </div>

                <div class="grid md:grid-cols-3 gap-3 text-sm text-slate-200">
                  <div class="glass p-4 rounded-xl border border-slate-700/50">
                    <p class="text-slate-400 text-sm mb-1">Số hiệu nguyên tử</p>
                    <p class="text-lg font-bold text-white">${el.number ?? "Chưa có dữ liệu"}</p>
                  </div>
                  <div class="glass p-4 rounded-xl border border-slate-700/50">
                    <p class="text-slate-400 text-sm mb-1">Nguyên tử khối</p>
                    <p class="text-lg font-bold text-white">${el.mass ?? "Chưa có dữ liệu"} g/mol</p>
                  </div>
                  <div class="glass p-4 rounded-xl border border-slate-700/50">
                    <p class="text-slate-400 text-sm mb-1">Vỏ nguyên tử</p>
                    <p class="text-lg font-bold text-white">${structure.electrons ?? "?"} electron</p>
                  </div>
                  <div class="glass p-4 rounded-xl border border-slate-700/50">
                    <p class="text-slate-400 text-sm mb-1">Hạt nhân</p>
                    <p class="text-lg font-bold text-white">${structure.protons ?? "?"} proton, ${structure.neutrons ?? "?"} neutron</p>
                  </div>
                  <div class="glass p-4 rounded-xl border border-slate-700/50">
                    <p class="text-slate-400 text-sm mb-1">Cấu hình e</p>
                    <p class="text-lg font-mono text-blue-300 font-bold">${getElectronConfigText(el)}</p>
                  </div>
                  <div class="glass p-4 rounded-xl border border-slate-700/50">
                    <p class="text-slate-400 text-sm mb-1">Loại mạng</p>
                    <p class="text-lg font-bold text-white">${inferLatticeTitle(el, inferLatticeKey(el))}</p>
                  </div>
                </div>
              </div>

              <div class="glass p-5 rounded-2xl border border-slate-700">
                <h4 class="text-white font-semibold mb-4">b. Trạng thái tự nhiên</h4>

                <div class="grid md:grid-cols-[180px_1fr] gap-4">
                  <div class="h-44 bg-slate-900/50 rounded-xl flex items-center justify-center overflow-hidden">
                    ${
                      el.naturalState?.image
                        ? `<img src="${escapeHtml(el.naturalState.image)}" class="w-full h-full object-cover" alt="Trạng thái" onerror="this.classList.add('hidden'); this.nextElementSibling?.classList.remove('hidden');"><i class="fa-solid fa-gem hidden text-4xl text-slate-600"></i>`
                        : `<i class="fa-solid fa-gem text-4xl text-slate-600"></i>`
                    }
                  </div>

                  <div class="space-y-3 text-slate-200">
                    <p>${occurrence.description ?? "Chưa có dữ liệu"}</p>

                    <div>
                      <p class="text-emerald-400 font-medium">Đơn chất</p>
                      <p>${(occurrence.simple || []).join(", ") || "Chưa có dữ liệu"}</p>
                    </div>

                    <div>
                      <p class="text-sky-400 font-medium">Hợp chất</p>
                      <p>${(occurrence.compounds || []).join(", ") || "Chưa có dữ liệu"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div id="sec-structure-isotopes" class="glass p-5 rounded-2xl border border-slate-700 scroll-mt-24">
                <h4 class="text-white font-semibold mb-4">c. Đồng vị</h4>
                <div class="grid md:grid-cols-[180px_1fr] gap-4">
                  <div class="h-44 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center border border-slate-700/70">
                   
                  </div>
                  <div class="space-y-4 text-slate-200">
                    <p class="text-slate-300 leading-relaxed">
                      ${escapeHtml(
                        el.general?.isotope ||
                          "Chưa có dữ liệu đồng vị trong phiên bản này.",
                      )}
                    </p>
                    <div class="flex flex-wrap gap-2">
                      ${
                        String(el.general?.isotope || "")
                          .split(/[,;]+/)
                          .map((s) => s.trim())
                          .filter(Boolean).length
                          ? String(el.general?.isotope || "")
                              .split(/[,;]+/)
                              .map((item) => item.trim())
                              .filter(Boolean)
                              .map(
                                (item) =>
                                  `<span class="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-sm text-slate-100">${escapeHtml(item)}</span>`,
                              )
                              .join("")
                          : `<span class="text-slate-500 italic">Chưa có danh sách đồng vị riêng.</span>`
                      }
                    </div>
                    
                  </div>
                </div>
              </div>

              <div class="mt-5">
                <div class="grid md:grid-cols-2 gap-4">
                  ${imageGallery.html}
                </div>
              </div>
            </div>

            ${sectionMedia("structure")}
          </section>
        `;
  html += `
          <section id="sec-properties" class="scroll-mt-24">
            <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-3"><span class="w-8 h-8 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm"><i class="fa-solid fa-flask"></i></span> 4. Tính chất</h3>
            <div class="grid lg:grid-cols-2 gap-6">
              <div class="glass p-6 rounded-2xl border border-slate-700">
                <h4 class="text-lg font-bold text-white mb-3 border-l-4 border-cyan-500 pl-3">Tính chất vật lý</h4>
                <div class="text-slate-300 leading-relaxed">${el.physical || '<p class="text-slate-500 italic">Đang cập nhật dữ liệu vật lí...</p>'}</div>
              </div>
              <div class="glass p-6 rounded-2xl border border-slate-700">
                <h4 class="text-lg font-bold text-white mb-3 border-l-4 border-red-500 pl-3">Tính chất hóa học</h4>
                <div class="text-slate-300 leading-relaxed">${el.chemical || '<p class="text-slate-500 italic">Đang cập nhật dữ liệu hoá học...</p>'}</div>
              </div>
            </div>
            ${sectionMedia("properties")}
          </section>
        `;

  html += `
          <section id="sec-preparation" class="scroll-mt-24">
            <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-3"><span class="w-8 h-8 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm"><i class="fa-solid fa-vial-circle-check"></i></span> 5. Điều chế</h3>
            <div class="glass p-6 rounded-2xl border border-slate-700">
              ${preparationHtml}
            </div>
            ${sectionMedia("preparation")}
          </section>
        `;

  html += `
          <section id="sec-recognition" class="scroll-mt-24">
            <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-3"><span class="w-8 h-8 rounded bg-lime-500/20 text-lime-400 flex items-center justify-center text-sm"><i class="fa-solid fa-magnifying-glass-chart"></i></span> 6. Nhận biết</h3>
            <div class="glass p-6 rounded-2xl border border-slate-700">
              ${recognitionHtml}
            </div>
            ${sectionMedia("recognition")}
          </section>
        `;

  const reactHtml =
    el.reactions && el.reactions.length
      ? el.reactions
          .map((r, idx) => renderEquationBlock(r, { el, index: idx }))
          .join("")
      : '<p class="text-slate-500 italic">Đang cập nhật dữ liệu phản ứng...</p>';

  const simHtml = el.simulation
    ? `
            <div class="mt-8 p-6 glass border-2 border-dashed border-blue-500/30 rounded-3xl bg-blue-900/10">
              <h4 class="text-lg font-bold text-white mb-4"><i class="fa-solid fa-flask-vial text-blue-400"></i> Mô phỏng: ${escapeHtml(el.simulation.title || "")}</h4>
              <p class="text-sm text-slate-400 mb-6"><i class="fa-solid fa-hand-pointer text-blue-400 mr-1"></i> <strong>Kéo và thả</strong> các hóa chất bên dưới vào Cốc thủy tinh.</p>
              <div class="flex flex-col md:flex-row gap-8 items-center justify-center">
                <div class="flex md:flex-col gap-4">
                  ${(el.simulation.reagents || [])
                    .map(
                      (re) => `
                      <div draggable="true" ondragstart="simDragStart(event, '${escapeHtml(re.id)}')" class="draggable-item bg-slate-800 hover:bg-slate-700 border border-slate-600 p-4 rounded-2xl flex flex-col items-center gap-2 transition-all w-24">
                        <i class="fa-solid ${escapeHtml(re.icon || "fa-flask")} text-3xl text-slate-300 pointer-events-none"></i>
                        <span class="text-xs font-bold pointer-events-none">${escapeHtml(re.name || re.id || "")}</span>
                      </div>
                    `,
                    )
                    .join("")}
                </div>
                <div id="sim-beaker" ondragover="simDragOver(event)" ondragleave="simDragLeave(event)" ondrop="simDrop(event)" class="dropzone relative w-44 h-72 bg-slate-900/70 border-4 border-slate-600 rounded-b-[3rem] rounded-t-3xl overflow-hidden shadow-2xl flex items-end justify-center p-4">
                  <div id="sim-content" class="absolute bottom-0 left-0 w-full bg-blue-500/50 transition-all duration-300" style="height: 10%;"></div>
                  <div id="sim-items" class="relative z-10 text-3xl space-x-2"></div>
                </div>
              </div>
              <div id="sim-result" class="hidden mt-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-medium">${escapeHtml(el.simulation.resultText || "")}</div>
            </div>
          `
    : "";

  html += `
          <section id="sec-reactions" class="scroll-mt-24">
            <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-3"><span class="w-8 h-8 rounded bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center text-sm"><i class="fa-solid fa-arrow-right-arrow-left"></i></span> 7. Phương trình & Mô phỏng</h3>
            <div class="space-y-4">${reactHtml}</div>
            ${simHtml}
            ${sectionMedia("reactions")}
          </section>
        `;

  html += `
          <section id="sec-applications" class="scroll-mt-24">
            <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-3"><span class="w-8 h-8 rounded bg-pink-500/20 text-pink-400 flex items-center justify-center text-sm"><i class="fa-solid fa-rocket"></i></span> 8. Ứng dụng thực tế</h3>
            <div class="grid md:grid-cols-2 gap-6">${appCards}</div>
            ${sectionMedia("applications")}
          </section>
        `;

  html += `
          <section id="sec-overview" class="scroll-mt-24">
            <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span class="w-8 h-8 rounded bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm"><i class="fa-solid fa-book"></i></span>
              9. Tổng quan
            </h3>
            <div class="bg-slate-800/70 backdrop-blur border border-slate-700 rounded-2xl p-6 text-slate-300 shadow-lg">
              ${notesHtml}
            </div>
            ${sectionMedia("overview")}
          </section>
        `;

  html += `
          <section id="sec-notes" class="scroll-mt-24">
            <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-3"><span class="w-8 h-8 rounded bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-sm"><i class="fa-solid fa-pen"></i></span> 10. Ghi chú cá nhân</h3>
            <textarea id="personal-note" onkeyup="saveNote('${escapeHtml(el.symbol)}')" class="w-full h-40 bg-slate-900 border border-slate-700 rounded-2xl p-5 text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none" placeholder="Nhập ghi chú của bạn về ${escapeHtml(el.nameVi)} tại đây. Dữ liệu sẽ tự động lưu vào trình duyệt...">${escapeHtml(savedNote)}</textarea>
            <p class="text-xs text-slate-500 mt-2 text-right"><i class="fa-solid fa-cloud-arrow-up"></i> Đã đồng bộ</p>
            ${sectionMedia("notes")}
          </section>
        `;

  document.getElementById("article-content").innerHTML = html;
  mountDetailVisuals(el);
  mountMediaBlocks(el);
  enhanceDetailPage(el);

  const prevEl = allElements.find((e) => e.number === el.number - 1);
  const nextEl = allElements.find((e) => e.number === el.number + 1);
  let navHtml = "";
  navHtml += prevEl
    ? `<button onclick="interlinkElement('${prevEl.symbol}')" class="px-5 py-3 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-2"><i class="fa-solid fa-arrow-left"></i> ${escapeHtml(prevEl.nameVi)}</button>`
    : `<div></div>`;
  navHtml += nextEl
    ? `<button onclick="interlinkElement('${nextEl.symbol}')" class="px-5 py-3 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-2">${escapeHtml(nextEl.nameVi)} <i class="fa-solid fa-arrow-right"></i></button>`
    : `<div></div>`;
  document.getElementById("nav-buttons-container").innerHTML = navHtml;
}

Object.assign(window, {
  nav,
  toggleSidebar,
  showNoData,
  showElementDetails,
  interlinkElement,
  saveNote,
  toggleFilter,
  applyFilter,
  clearSearch,
  highlightCategory,
  removeHighlight,
  scrollToSection,
  copyElementLink,
  openChatbot,
  closeChatbot,
  toggleChatbot,
  sendChatMessage,
  simDragStart,
  simDragOver,
  simDragLeave,
  simDrop,
});

// --- HTML5 DRAG & DROP CHO THÍ NGHIỆM ---
function simDragStart(ev, id) {
  ev.dataTransfer.setData("text", id);
  ev.dataTransfer.effectAllowed = "copyMove";
}
function simDragOver(ev) {
  ev.preventDefault(); // Cần thiết để cho phép Drop
  ev.currentTarget.classList.add("dragover");
}
function simDragLeave(ev) {
  ev.currentTarget.classList.remove("dragover");
}
function simDrop(ev) {
  ev.preventDefault();
  ev.currentTarget.classList.remove("dragover");
  let id = ev.dataTransfer.getData("text");
  if (id) processSimDrop(id);
}

function processSimDrop(id) {
  if (!window.currentSimData || window.addedReagents.includes(id)) return;

  window.addedReagents.push(id);
  const beakerItems = document.getElementById("sim-items");
  const beakerLiquid = document.getElementById("sim-content");
  const resultBox = document.getElementById("sim-result");
  const simBeaker = document.getElementById("sim-beaker");

  // Thêm Icon vào bình
  const iconClass = window.currentSimData.reagents.find(
    (r) => r.id === id,
  ).icon;
  beakerItems.innerHTML += `<i class="fa-solid ${iconClass} animate-bounce text-white"></i>`;

  // Dâng nước
  beakerLiquid.style.height = window.addedReagents.length * 30 + "%";
  simBeaker.classList.add("border-blue-400");
  setTimeout(() => simBeaker.classList.remove("border-blue-400"), 300);

  // Kiểm tra kết quả
  const expected = window.currentSimData.expected;
  if (expected.every((val) => window.addedReagents.includes(val))) {
    setTimeout(() => {
      beakerLiquid.classList.replace("bg-blue-500/50", "bg-pink-500/60");
      resultBox.classList.remove("hidden");
      resultBox.classList.add("fade-in");
      beakerItems.innerHTML =
        '<i class="fa-solid fa-star text-yellow-400 text-4xl animate-spin"></i>';
    }, 600);
  }
}

// --- UTILS & FILTER LOGIC ---
const searchState = {
  filter: "all",
  query: "",
};

function saveNote(symbol) {
  const val = document.getElementById("personal-note").value;
  localStorage.setItem(`chemdex_note_${symbol}`, val);
}

function setCurrentElementInUrl(symbol) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("element", symbol);
    window.history.replaceState({}, "", url.toString());
  } catch {
    // Bỏ qua nếu môi trường không hỗ trợ history/url
  }
}

function getCurrentElementFromUrl() {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get("element");
  } catch {
    return null;
  }
}

function updateShareButtonState(symbol) {
  const shareBtn = document.getElementById("share-element-btn");
  const copyBtn = document.getElementById("copy-link-btn");
  if (shareBtn) shareBtn.dataset.symbol = symbol || "";
  if (copyBtn) copyBtn.dataset.symbol = symbol || "";
}

async function copyElementLink(symbol) {
  const url = new URL(window.location.href);
  url.searchParams.set("element", symbol);
  const finalUrl = url.toString();
  try {
    await navigator.clipboard.writeText(finalUrl);
    showToast("Đã sao chép liên kết nguyên tố");
  } catch {
    const temp = document.createElement("input");
    temp.value = finalUrl;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
    showToast("Đã sao chép liên kết nguyên tố");
  }
}

function scrollToSection(sectionId) {
  const container = document.getElementById("content-container");
  const target = document.getElementById(sectionId);
  if (!container || !target) return;
  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const headerOffset = 104;
  const top =
    targetRect.top - containerRect.top + container.scrollTop - headerOffset;
  container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function buildRelatedSuggestions(el) {
  const symbol = el.symbol;
  const name = el.general.englishName || el.general.latinName || el.symbol;
  const searchUrl = encodeURIComponent(name);
  const wiki = `https://en.wikipedia.org/wiki/${name}`;
  const pubchem = `https://pubchem.ncbi.nlm.nih.gov/#query=${searchUrl}`;
  const brit = `https://www.britannica.com/search?query=${searchUrl}`;

  const quickFacts = [
    { label: `Số hiệu ${el.number}`, value: `Z = ${el.number}` },
    { label: "Nhóm", value: `Nhóm ${el.general?.group || "?"}` },
    { label: "Chu kì", value: `Chu kì ${el.general?.period || "?"}` },
    {
      label: "Cấu hình e",
      value: el.general?.electronConfig || "Đang cập nhật",
    },
  ];

  return `
    <section id="sec-suggestions" class="scroll-mt-24 mt-12 w-full">
      <h3 class="text-2xl font-bold text-white mb-6 flex items-center gap-3">
        <span class="w-8 h-8 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center text-sm">
          <i class="fa-solid fa-link"></i>
        </span>
        Liên kết mở rộng
      </h3>

      <div class="w-full">
        <div class="suggestion-card p-5 w-full">
          

          <div class="grid md:grid-cols-3 gap-3">
            <a
              href="${wiki}"
              target="_blank"
              rel="noopener noreferrer"
              class="block glass p-4 rounded-xl border border-slate-700/50 hover:border-blue-500/50 transition-colors w-full"
            >
              <div class="font-medium text-white">Wikipedia</div>
              <div class="text-slate-400 text-sm">
                Tra cứu tổng quan về ${escapeHtml(name)}
              </div>
            </a>

            <a
              href="${pubchem}"
              target="_blank"
              rel="noopener noreferrer"
              class="block glass p-4 rounded-xl border border-slate-700/50 hover:border-blue-500/50 transition-colors w-full"
            >
              <div class="font-medium text-white">PubChem</div>
              <div class="text-slate-400 text-sm">
                Tìm kiếm dữ liệu hoá học liên quan
              </div>
            </a>

            <a
              href="${brit}"
              target="_blank"
              rel="noopener noreferrer"
              class="block glass p-4 rounded-xl border border-slate-700/50 hover:border-blue-500/50 transition-colors w-full"
            >
              <div class="font-medium text-white">Britannica</div>
              <div class="text-slate-400 text-sm">Xem mô tả kiến thức nền</div>
            </a>
          </div>
        </div>
      </div>
    </section>
  `;
}

function enhanceDetailPage(el) {
  updateShareButtonState(el.symbol);

  const hero = document.getElementById("detail-hero");
  if (hero) {
    const actions = document.createElement("div");
    actions.className =
      "relative z-10 max-w-7xl mx-auto mt-6 flex flex-wrap justify-center md:justify-start gap-3";
    actions.innerHTML = `
            <button id="share-element-btn" data-symbol="${escapeHtml(el.symbol)}" class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-600 bg-slate-900/70 hover:bg-slate-800 transition-colors">
              <i class="fa-solid fa-share-nodes text-sky-300"></i> Chia sẻ
            </button>
            
          `;
    if (!hero.querySelector("#share-element-btn")) {
      hero.appendChild(actions);
    }
  }

  const article = document.getElementById("article-content");
  if (article && !document.getElementById("sec-suggestions")) {
    article.insertAdjacentHTML("beforeend", buildRelatedSuggestions(el));
  }

  const toc = document.getElementById("article-toc");
  if (toc && !toc.dataset.bound) {
    toc.dataset.bound = "1";
    toc.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        const target = a.getAttribute("href")?.replace("#", "");
        if (target) scrollToSection(target);
      });
    });
  }

  const shareBtn = document.getElementById("share-element-btn");
  const copyBtn = document.getElementById("copy-link-btn");
  if (shareBtn && !shareBtn.dataset.bound) {
    shareBtn.dataset.bound = "1";
    shareBtn.addEventListener("click", () => copyElementLink(el.symbol));
  }
  if (copyBtn && !copyBtn.dataset.bound) {
    copyBtn.dataset.bound = "1";
    copyBtn.addEventListener("click", () => copyElementLink(el.symbol));
  }

  setupChatbotContext(el);
}

function interlinkElement(symbol) {
  const el = elementsMap.get(symbol);
  if (!el) return;
  setCurrentElementInUrl(symbol);
  if (el && el.hasData) showElementDetails(el);
  else showNoData(el);
}

function toggleFilter() {
  const menu = document.getElementById("filter-menu");
  if (menu) menu.classList.toggle("hidden");
}

function applyFilter() {
  const select = document.getElementById("filter-select");
  const val = select?.value || "all";
  searchState.filter = val;

  const cells = document.querySelectorAll(".el-cell");
  cells.forEach((c) => c.classList.remove("dimmed"));

  const hasQuery = searchState.query && searchState.query.trim().length > 0;
  const searchMatches = new Set(
    hasQuery ? getSearchMatches(searchState.query).map((el) => el.symbol) : [],
  );

  if (val === "all") {
    if (hasQuery) {
      cells.forEach((c) => {
        if (
          !searchMatches.has(c.querySelector(".el-symbol")?.textContent?.trim())
        ) {
          c.classList.add("dimmed");
        }
      });
    }
    return;
  }

  const map = {
    "cat-kiem": ["kiem"],
    "cat-kiem-tho": ["kiem-tho"],
    "cat-chuyen-tiep": ["chuyen-tiep", "kim-loai-yeu"],
    "cat-phi-kim": ["phi-kim"],
    "cat-a-kim": ["a-kim"],
    "cat-halogen": ["halogen"],
    "cat-khi-hiem": ["khi-hiem"],
    "cat-lanthanide": ["lanthanide"],
    "cat-actinide": ["actinide"],
    "per-1": ["row:2"],
    "per-2": ["row:3"],
    "per-3": ["row:4"],
    "per-4": ["row:5"],
    "per-5": ["row:6"],
    "per-6": ["row:7"],
    "per-7": ["row:8"],
  };

  const accepted = map[val] || [];
  cells.forEach((c) => {
    const okByFilter = val.startsWith("per-")
      ? accepted.includes(`row:${c.dataset.row}`)
      : accepted.includes(c.dataset.cat);
    const okBySearch =
      !hasQuery ||
      searchMatches.has(c.querySelector(".el-symbol")?.textContent?.trim());
    if (!(okByFilter && okBySearch)) c.classList.add("dimmed");
  });
}
// --- TÌM KIẾM ---
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("search-results");
const clearSearchBtn = document.getElementById("clearSearchBtn");

function normalizeSearchText(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getSearchNames(el) {
  return {
    symbol: normalizeSearchText(el.symbol),
    vi: normalizeSearchText(el.nameVi || ""),
    en: normalizeSearchText(el.general?.englishName || el.nameEn || ""),
    number: String(el.number || ""),
  };
}

function scoreSearchElement(el, rawQuery) {
  const query = normalizeSearchText(rawQuery);
  if (!query) return 0;

  const { symbol, vi, en, number } = getSearchNames(el);
  const isNumberQuery = /^\d+$/.test(query);

  if (isNumberQuery) {
    const qn = parseInt(query, 10);
    if (qn === el.number) return 10000;
    if (String(el.number).startsWith(query)) return 9000;
  }

  if (symbol === query) return 8000;
  if (symbol.startsWith(query)) return 7000;
  if (symbol.includes(query)) return 6000;

  if (vi === query || en === query) return 5000;
  if (vi.startsWith(query) || en.startsWith(query)) return 4000;
  if (vi.includes(query) || en.includes(query)) return 3000;

  if (String(el.number) === query) return 4500;
  if (String(el.number).startsWith(query)) return 3500;

  const compact = `${symbol} ${vi} ${en} ${number}`;
  if (compact.includes(query)) return 2000;

  return 0;
}

function getSearchMatches(rawQuery) {
  const query = normalizeSearchText(rawQuery);
  if (!query) return [];
  return allElements
    .map((el) => ({ el, score: scoreSearchElement(el, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.el.number - b.el.number)
    .slice(0, 10)
    .map((item) => item.el);
}

function renderSearchResults(matches) {
  if (!matches.length) {
    searchResults.innerHTML =
      '<div class="p-4 text-slate-500 text-sm text-center">Không tìm thấy.</div>';
    searchResults.classList.remove("hidden");
    return;
  }

  searchResults.innerHTML = matches
    .map(
      (m) => `
              <div onclick="interlinkElement('${m.symbol}'); clearSearch();" class="p-3 hover:bg-slate-700/50 cursor-pointer flex items-center gap-4 border-b border-slate-700/50 last:border-0">
                <div class="w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold border shrink-0" style="color: ${categories[m.category]?.color || "#888"}; border-color: ${categories[m.category]?.color || "#888"}">
                  <span class="text-xs">${m.number}</span>
                  <span class="text-lg leading-none">${m.symbol}</span>
                </div>
                <div class="min-w-0">
                  <p class="font-bold text-slate-200">${m.nameVi}</p>
                  <p class="text-xs text-slate-400">${m.general?.englishName || m.nameEn || ""}</p>
                </div>
              </div>
            `,
    )
    .join("");
  searchResults.classList.remove("hidden");
}

searchInput.addEventListener("input", (e) => {
  const query = e.target.value;
  searchState.query = query;
  if (query.trim().length > 0) {
    clearSearchBtn.classList.remove("hidden");
    renderSearchResults(getSearchMatches(query));
  } else {
    clearSearch();
  }
  applyFilter();
});

function clearSearch() {
  searchState.query = "";
  searchInput.value = "";
  clearSearchBtn.classList.add("hidden");
  searchResults.classList.add("hidden");
  applyFilter();
}

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const matches = getSearchMatches(searchInput.value);
    if (matches.length) interlinkElement(matches[0].symbol);
  }
  if (e.key === "Escape") clearSearch();
});

clearSearchBtn.addEventListener("click", clearSearch);

document.addEventListener("click", (e) => {
  if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
    searchResults.classList.add("hidden");
  }
});

function showToast(message) {
  let toast = document.getElementById("toast-notice");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-notice";
    toast.className = "toast-notice";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.display = "block";
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    toast.style.display = "none";
  }, 1800);
}

const GEMINI_API_KEY =
  window.GEMINI_API_KEY ||
  "AQ.Ab8RN6Juy3ij9wnROTLohZ6cT9lXzBHml2WO_iR62y9QYyycOg";
const GEMINI_MODEL = window.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_ENDPOINT =
  window.GEMINI_ENDPOINT ||
  "https://generativelanguage.googleapis.com/v1beta/models/";

export {
  renderPeriodicTable,
  highlightGrid,
  highlightCategory,
  removeHighlight,
  nav,
  toggleSidebar,
  showNoData,
  showElementDetails,
  simDragStart,
  simDragOver,
  simDragLeave,
  simDrop,
  processSimDrop,
  saveNote,
  setCurrentElementInUrl,
  getCurrentElementFromUrl,
  updateShareButtonState,
  scrollToSection,
  buildRelatedSuggestions,
  enhanceDetailPage,
  interlinkElement,
  toggleFilter,
  applyFilter,
  normalizeSearchText,
  getSearchNames,
  scoreSearchElement,
  getSearchMatches,
  renderSearchResults,
  clearSearch,
  showToast,
};
