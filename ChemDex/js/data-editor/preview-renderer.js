/**
 * ChemDex Data Editor - Clean Preview Renderer
 * Renders the element exactly as it would appear on ChemDex, without editing controls.
 */
import { state } from "./state.js";
import { escapeHtml, sanitizeHtml } from "./utils.js";

export class PreviewRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render(symbol) {
    if (!this.container) return;
    this.container.innerHTML = "";

    if (!symbol) {
      this.container.innerHTML = `
        <div class="p-8 text-center text-slate-500 text-sm">Chưa có nguyên tố nào được chọn.</div>
      `;
      return;
    }

    const data = state.getWorkingCopy(symbol);
    if (!data) return;

    const g = data.general || {};
    const h = data.history || {};
    const s = data.structure || {};
    const occ = data.occurrence || {};
    const reactions = Array.isArray(data.reactions) ? data.reactions : [];
    const apps = Array.isArray(data.applications) ? data.applications : [];
    const cat = data.category || "unknown";

    const wrapper = document.createElement("div");
    wrapper.className = "max-w-4xl mx-auto space-y-6 text-slate-200 pb-16";

    wrapper.innerHTML = `
      <!-- Preview Hero Header -->
      <div class="de-glass-card rounded-2xl p-6 border border-slate-700/60 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div class="flex items-center gap-5">
          <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex flex-col items-center justify-center text-white font-mono shadow-xl shadow-blue-500/30 shrink-0">
            <span class="text-sm font-bold">${data.number || "?"}</span>
            <span class="text-3xl font-black">${escapeHtml(symbol)}</span>
          </div>
          <div>
            <div class="flex items-center gap-3">
              <h2 class="text-2xl sm:text-3xl font-black text-white">${escapeHtml(data.nameVi || "")}</h2>
              <span class="text-xs uppercase font-bold px-3 py-1 rounded-full cat-${cat} border border-slate-700/80">
                ${escapeHtml(cat)}
              </span>
            </div>
            <p class="text-slate-400 text-sm mt-1">
              English: <strong class="text-slate-200">${escapeHtml(data.nameEn || g.englishName || "")}</strong> |
              Latin: <strong class="text-slate-200">${escapeHtml(g.latinName || "")}</strong> |
              Khối lượng: <strong class="text-cyan-300 font-mono">${data.mass != null ? data.mass : "?"}</strong>
            </p>
          </div>
        </div>

        <div class="flex flex-col sm:items-end gap-1 text-xs text-slate-400 font-mono">
          <div>Chu kỳ: <strong class="text-white">${g.period || "?"}</strong> | Nhóm: <strong class="text-white">${g.group || "?"}</strong></div>
          <div>Cấu hình: <strong class="text-cyan-400">${escapeHtml(g.electronConfig || "?")}</strong></div>
          <div>Trạng thái: <strong class="text-white">${escapeHtml(g.state || "?")}</strong></div>
        </div>
      </div>

      <!-- Quick Specs Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <span class="text-slate-400 block mb-1">Độ âm điện</span>
          <span class="text-base font-bold font-mono text-white">${g.electronegativity || "—"}</span>
        </div>
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <span class="text-slate-400 block mb-1">Khối lượng riêng</span>
          <span class="text-base font-bold font-mono text-white">${escapeHtml(g.density || "—")}</span>
        </div>
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <span class="text-slate-400 block mb-1">Nhiệt độ nóng chảy</span>
          <span class="text-base font-bold font-mono text-cyan-300">${escapeHtml(g.meltingPoint || "—")}</span>
        </div>
        <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <span class="text-slate-400 block mb-1">Nhiệt độ sôi</span>
          <span class="text-base font-bold font-mono text-rose-300">${escapeHtml(g.boilingPoint || "—")}</span>
        </div>
      </div>

      <!-- Physical Properties -->
      ${data.physical ? `
        <div class="de-glass-card rounded-xl p-5 border border-slate-800 space-y-2">
          <h3 class="text-base font-bold text-cyan-400 flex items-center gap-2">
            <i class="fa-solid fa-temperature-three-quarters"></i>
            <span>Tính chất vật lý</span>
          </h3>
          <div class="text-sm leading-relaxed text-slate-300">${sanitizeHtml(data.physical)}</div>
        </div>
      ` : ""}

      <!-- Chemical Properties -->
      ${data.chemical ? `
        <div class="de-glass-card rounded-xl p-5 border border-slate-800 space-y-2">
          <h3 class="text-base font-bold text-emerald-400 flex items-center gap-2">
            <i class="fa-solid fa-flask-vial"></i>
            <span>Tính chất hóa học</span>
          </h3>
          <div class="text-sm leading-relaxed text-slate-300">${sanitizeHtml(data.chemical)}</div>
        </div>
      ` : ""}

      <!-- Reactions -->
      ${reactions.length > 0 ? `
        <div class="de-glass-card rounded-xl p-5 border border-slate-800 space-y-3">
          <h3 class="text-base font-bold text-yellow-400 flex items-center gap-2">
            <i class="fa-solid fa-bolt"></i>
            <span>Phản ứng hóa học tiêu biểu (${reactions.length})</span>
          </h3>
          <div class="grid grid-cols-1 gap-3">
            ${reactions.map((rxn, i) => `
              <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1.5">
                <div class="flex items-center justify-between text-xs text-slate-400">
                  <span class="font-bold text-yellow-300">${escapeHtml(rxn.type || `Phản ứng ${i + 1}`)}</span>
                </div>
                <div class="text-base font-mono font-bold text-cyan-300 py-1">${escapeHtml(rxn.equation || "")}</div>
                ${rxn.desc ? `<p class="text-xs text-slate-400">${escapeHtml(rxn.desc)}</p>` : ""}
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}

      <!-- Applications -->
      ${apps.length > 0 ? `
        <div class="de-glass-card rounded-xl p-5 border border-slate-800 space-y-3">
          <h3 class="text-base font-bold text-sky-400 flex items-center gap-2">
            <i class="fa-solid fa-briefcase"></i>
            <span>Ứng dụng thực tế (${apps.length})</span>
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${apps.map((app) => `
              <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
                <h4 class="font-bold text-white text-sm">${escapeHtml(app.title || "")}</h4>
                <p class="text-xs text-slate-400 leading-relaxed">${escapeHtml(app.desc || "")}</p>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}
    `;

    this.container.appendChild(wrapper);
  }
}
