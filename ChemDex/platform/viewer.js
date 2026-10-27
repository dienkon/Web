import { escape, download, storage } from "./common.js";
let library;
async function loadLibrary() {
  library ??= import("3dmol/src/3Dmol.ts");
  return library;
}
export class ChemStructureViewer extends HTMLElement {
  connectedCallback() {
    if (this.ready) return;
    this.ready = true;
    this.innerHTML = `<div class="viewer-toolbar"><label><span class="sr-only">Kiểu mô hình</span><select data-style><option value="ball">Cầu–que</option><option value="stick">Que liên kết</option><option value="sphere">Cầu đặc</option></select></label><label class="muted"><input type="checkbox" data-hydrogen checked> Hydrogen</label><label class="muted"><input type="checkbox" data-light> Đồ họa nhẹ</label><label class="muted"><input type="checkbox" data-labels> Nhãn</label><button class="button" data-reset>Đặt lại</button><button class="button" data-fullscreen>Toàn màn hình</button><button class="button" data-png>PNG ↓</button><button class="button" data-file>SDF / CIF ↓</button></div><div class="canvas-shell" role="img" aria-label="Mô hình cấu trúc có thể xoay và phóng to"></div><div class="viewer-status" role="status">Chọn một chất để xem cấu trúc.</div><div class="atom-readout">Chọn 2 nguyên tử để đo khoảng cách, 3 nguyên tử để đo góc (trên cấu dạng đang xem).</div><div class="viewer-source"></div>`;
    this.querySelector("[data-light]").onchange = () => {
      if (this.record) this.open(this.record);
    };
    this.querySelector("[data-style]").onchange = () => this.applyStyle();
    this.querySelector("[data-hydrogen]").onchange = () => this.applyStyle();
    this.querySelector("[data-labels]").onchange = () => this.applyStyle();
    this.querySelector("[data-reset]").onclick = () => {
      this.selected = [];
      if (this.initialView) this.viewer?.setView(this.initialView);
      else this.viewer?.zoomTo();
      this.viewer?.render();
      this.querySelector(".atom-readout").textContent =
        "Đã đặt lại góc nhìn. Chọn nguyên tử để đo.";
    };
    this.querySelector("[data-fullscreen]").onclick = () => {
      const panel = this.closest(".viewer-panel") ?? this;
      if (document.fullscreenElement) document.exitFullscreen();
      else panel.requestFullscreen?.().catch(() => {});
    };
    this.querySelector("[data-png]").onclick = () => {
      if (!this.viewer) return;
      const a = Object.assign(document.createElement("a"), {
        href: this.viewer.pngURI(),
        download: `${this.record?.id ?? "structure"}.png`,
      });
      a.click();
    };
    this.querySelector("[data-file]").onclick = () => {
      if (this.raw)
        download(
          `${this.record.id}.${this.record.structure.format}`,
          this.raw,
          "chemical/x-mdl-sdfile",
        );
    };
    this.observer = new ResizeObserver(() => {
      this.viewer?.resize();
      this.viewer?.render();
    });
    this.observer.observe(this.querySelector(".canvas-shell"));
    this.visibility = () => {
      this.viewer?.spin(false);
    };
    document.addEventListener("visibilitychange", this.visibility);
  }
  disconnectedCallback() {
    this.controller?.abort();
    this.observer?.disconnect();
    document.removeEventListener("visibilitychange", this.visibility);
    this.dispose();
    this.ready = false;
  }
  dispose() {
    this.viewer?.destroy();
    this.querySelector(".canvas-shell")?.replaceChildren();
    this.viewer = null;
    this.initialView = null;
  }
  status(text, error = false) {
    this.querySelector(".viewer-status").textContent = text;
    this.querySelector(".viewer-status").classList.toggle("error", error);
  }
  async open(record) {
    if (!this.ready) this.connectedCallback();
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.dispose();
    this.record = record;
    this.querySelector("[data-style]").value =
      record.kind === "crystal" ? "sphere" : "ball";
    this.selected = [];
    this.raw = null;
    this.status("Đang tải cấu trúc…");
    this.querySelector(".viewer-source").innerHTML = "";
    try {
      if (!record.structure)
        throw new Error("Chất này chưa có dữ liệu cấu trúc phù hợp.");
      if (record.structure.dimension !== "3d")
        throw new Error(
          "Nguồn hiện chỉ có cấu trúc 2D; không có cấu dạng 3D để hiển thị.",
        );
      let raw;
      try {
        raw = await storage("structures", "get", record.id);
      } catch {}
      if (!raw) {
        const response = await fetch(record.structure.url, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(`Không tải được cấu trúc (${response.status}).`);
        if (record.structure.remote) {
          const result = await response.json();
          raw = result.data;
          record.structure.dimension = result.dimension;
          if (result.dimension !== "3d")
            throw new Error("Chất này chỉ có dữ liệu cấu trúc 2D.");
        } else raw = await response.text();
        if (typeof raw !== "string" || raw.includes("<html"))
          throw new Error("Dữ liệu cấu trúc không hợp lệ.");
        try {
          await storage("structures", "put", raw, record.id);
        } catch {}
      }
      if (controller.signal.aborted) return;
      const mol = await loadLibrary();
      if (controller.signal.aborted || !this.isConnected) return;
      this.raw = raw;
      const shell = this.querySelector(".canvas-shell");
      this.viewer = mol.createViewer(shell, {
        backgroundColor:
          document.documentElement.dataset.theme === "dark"
            ? "#172734"
            : "#f4f8fa",
        antialias: !this.querySelector("[data-light]").checked,
        upscale: false,
        minimumZoomToDistance: 2,
      });
      this.viewer.getRenderer().maxPixelRatio = this.querySelector(
        "[data-light]",
      ).checked
        ? 1
        : 2;
      this.viewer.resize();
      this.viewer.addModel(raw, record.structure.format, { keepH: true });
      this.viewer.setClickable({}, true, (atom) => this.pick(atom));
      this.applyStyle();
      if (record.kind === "crystal") this.viewer.addUnitCell();
      this.viewer.zoomTo();
      // Axis-aligned reference geometries can otherwise open edge-on (water
      // would look linear). Rotate only the view, never the source coordinates.
      const atoms = this.viewer.getModel().selectedAtoms({});
      const extents = ["x", "y", "z"].map(axis =>
        Math.max(...atoms.map(atom => atom[axis])) - Math.min(...atoms.map(atom => atom[axis])));
      if (extents[0] < 1e-5 && Math.max(...extents) > 0) this.viewer.rotate(90, "y");
      else if (extents[1] < 1e-5 && Math.max(...extents) > 0) this.viewer.rotate(90, "x");
      this.initialView = this.viewer.getView();
      this.viewer.render();
      this.status(
        record.kind === "crystal"
          ? "Ô mạng tinh thể lý tưởng — không phải một phân tử riêng lẻ."
          : "Kéo để xoay · Cuộn/chụm để thu phóng · Chọn nguyên tử để đo",
      );
      this.querySelector(".viewer-source").innerHTML =
        `${escape(record.structure.provenance)} · <a href="${escape(record.structure.source)}" target="_blank" rel="noopener noreferrer">Nguồn dữ liệu ↗</a><br>Tọa độ là một cấu dạng tĩnh; không mô tả chuyển động phân tử theo thời gian thực.`;
    } catch (error) {
      if (controller.signal.aborted) return;
      this.status(
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Thiết bị không khởi tạo được WebGL. Bạn vẫn có thể xem công thức và thông tin chất.",
        true,
      );
      const shell = this.querySelector(".canvas-shell");
      shell.innerHTML = `<div class="empty"><strong>${escape(record.name_vi ?? record.name_en)}</strong><p>${escape(record.formula)}</p><p>Thông tin chất vẫn khả dụng. Có thể xem nguồn hoặc thử lại sau.</p></div>`;
    }
  }
  applyStyle() {
    if (!this.viewer) return;
    const style = this.querySelector("[data-style]").value;
    const atoms = this.querySelector("[data-hydrogen]").checked
      ? {}
      : { not: { elem: "H" } };
    this.viewer.setStyle({}, {});
    this.viewer.setStyle(
      atoms,
      style === "sphere"
        ? { sphere: { scale: 0.8 } }
        : style === "stick"
          ? { stick: { radius: 0.16 } }
          : { sphere: { scale: 0.27 }, stick: { radius: 0.1 } },
    );
    this.viewer.removeAllLabels();
    if (this.querySelector("[data-labels]").checked)
      this.viewer.addPropertyLabels("elem", atoms, {
        fontSize: 12,
        showBackground: false,
        fontColor: "#18394d",
      });
    this.viewer.render();
  }
  pick(atom) {
    if (this.selected.length === 3) this.selected = [];
    this.selected.push(atom);
    const atoms = this.selected;
    let text = `${atom.elem} · #${atom.index + 1}${atom.properties?.charge !== undefined ? ` · điện tích ${atom.properties.charge}` : ""}`;
    if (atoms.length === 2)
      text += ` · Khoảng cách: ${Math.hypot(atoms[0].x - atoms[1].x, atoms[0].y - atoms[1].y, atoms[0].z - atoms[1].z).toFixed(3)} Å`;
    if (atoms.length === 3) {
      const [a, b, c] = atoms,
        u = [a.x - b.x, a.y - b.y, a.z - b.z],
        v = [c.x - b.x, c.y - b.y, c.z - b.z],
        den = Math.hypot(...u) * Math.hypot(...v);
      text += den
        ? ` · Góc ${a.elem}–${b.elem}–${c.elem}: ${((Math.acos(Math.max(-1, Math.min(1, u.reduce((n, k, i) => n + k * v[i], 0) / den))) * 180) / Math.PI).toFixed(2)}°`
        : " · Chọn ba nguyên tử khác nhau để đo góc.";
    }
    this.querySelector(".atom-readout").textContent = text;
  }
}
if (!customElements.get("chem-structure-viewer"))
  customElements.define("chem-structure-viewer", ChemStructureViewer);
