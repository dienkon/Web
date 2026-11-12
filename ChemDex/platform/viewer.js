import { escape, download, storage } from "./common.js";
import { generateStructure, toSDF } from "../shared/chemistry/structure-generator.mjs";
import { CPK_COLORS, readSDF, readCIF } from "./viewer-canvas.js";
import { mountMolecularStudio } from './molecular-studio.js';
import { isomerGroupFor, resolveMolecularExample } from '../shared/chemistry/molecular-isomers.mjs';

let library;
async function loadLibrary() {
  library ??= import("3dmol/src/3Dmol.ts");
  return library;
}

export class ChemStructureViewer extends HTMLElement {
  connectedCallback() {
    if (this.ready) return;
    this.ready = true;
    this.spinning = false;
    this.innerHTML = `<div class="viewer-toolbar"><label><span class="sr-only">Kiểu mô hình</span><select data-style><option value="ball">Cầu–que (Ball & Stick)</option><option value="stick">Que liên kết (Stick)</option><option value="sphere">Cầu đặc (Van der Waals)</option></select></label><label class="muted"><input type="checkbox" data-hydrogen checked> Hydrogen</label><label class="muted"><input type="checkbox" data-light> Đồ họa nhẹ</label><label class="muted"><input type="checkbox" data-labels> Nhãn</label><button class="button" data-spin type="button">↻ Tự xoay</button><button class="button" data-reset type="button">Đặt lại</button><button class="button" data-fullscreen type="button">Toàn màn hình</button><button class="button" data-png type="button">PNG ↓</button><button class="button" data-file type="button">SDF / CIF ↓</button></div><div class="canvas-shell" role="img" aria-label="Mô hình cấu trúc có thể xoay và phóng to"></div><div class="viewer-bond-panel"></div><div class="viewer-status" role="status">Chọn một chất để xem cấu trúc.</div><div class="atom-readout">Chọn 2 nguyên tử để đo khoảng cách, 3 nguyên tử để đo góc (trên cấu dạng đang xem).</div><div class="viewer-source"></div>`;
    this.environmentEnabled = true;
    this.environmentUserSet = false;
    this.querySelector('.viewer-toolbar').insertAdjacentHTML('beforebegin','<div class="viewer-isomers" hidden></div>');
    this.querySelector('.viewer-toolbar').insertAdjacentHTML('beforeend','<button class="button" type="button" data-environment aria-pressed="true">Ẩn cảnh trưng bày</button>');
    this.querySelector('[data-environment]').onclick = () => {
      this.environmentUserSet=true;
      this.environmentEnabled = !this.environmentEnabled;
      const button=this.querySelector('[data-environment]');
      button.setAttribute('aria-pressed',String(this.environmentEnabled));
      button.textContent=this.environmentEnabled?'Ẩn cảnh trưng bày':'Hiện cảnh trưng bày';
      this.syncEnvironment();this.applyStyle();
    };
    this.querySelector("[data-light]").onchange = () => {
      if (this.record) this.open(this.record);
    };
    this.querySelector("[data-style]").onchange = () => this.applyStyle();
    this.querySelector("[data-hydrogen]").onchange = () => this.applyStyle();
    this.querySelector("[data-labels]").onchange = () => this.applyStyle();
    this.querySelector("[data-spin]").onclick = () => {
      this.spinning = !this.spinning;
      const btn = this.querySelector("[data-spin]");
      btn.classList.toggle("primary", this.spinning);
      btn.textContent = this.spinning ? "⏸ Dừng xoay" : "↻ Tự xoay";
      this.viewer?.spin(this.spinning ? "y" : false);
      this.fallback?.spin(this.spinning);
    };
    this.querySelector("[data-reset]").onclick = () => {
      this.spinning = false;
      const btn = this.querySelector("[data-spin]");
      if (btn) {
        btn.classList.remove("primary");
        btn.textContent = "↻ Tự xoay";
      }
      this.viewer?.spin(false);
      this.fallback?.spin(false);
      this.fallback?.reset();
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
      if (!this.viewer && !this.fallback) return;
      const a = Object.assign(document.createElement("a"), {
        href: this.fallback?.pngURI() ?? this.viewer.pngURI(),
        download: `${this.record?.id ?? "structure"}.png`,
      });
      a.click();
    };
    this.querySelector("[data-file]").onclick = () => {
      if (this.raw)
        download(
          `${this.record.isomerExampleId ?? this.record.id}${this.parsedModel?.componentLayout?'-thanh-phan':''}.${this.rawFormat ?? "sdf"}`,
          this.raw,
          "chemical/x-mdl-sdfile",
        );
    };
    this.observer = new ResizeObserver(() => {
      this.fallback?.resize();
      this.viewer?.resize();
      this.viewer?.render();
    });
    this.observer.observe(this.querySelector(".canvas-shell"));
    this.visibility = () => {
      this.viewer?.spin(false);
      this.fallback?.spin(false);
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
    this.environment?.destroy();this.environment=null;
    this.fallback?.destroy();
    this.fallback = null;
    this.viewer?.destroy();
    this.querySelector(".canvas-shell")?.replaceChildren();
    this.viewer = null;
    this.initialView = null;
  }
  status(text, error = false) {
    this.querySelector(".viewer-status").textContent = text;
    this.querySelector(".viewer-status").classList.toggle("error", error);
  }
  renderBondPanel(model) {
    const host = this.querySelector(".viewer-bond-panel");
    if (!host) return;
    if (!model?.atoms?.length) {
      host.innerHTML = "";
      return;
    }
    const elemCounts = {};
    for (const a of model.atoms) {
      elemCounts[a.elem] = (elemCounts[a.elem] ?? 0) + 1;
    }
    const cpkPills = Object.entries(elemCounts)
      .map(
        ([el, count]) =>
          `<span class="cpk-pill"><span class="cpk-dot" style="background:${CPK_COLORS[el] ?? "#a78bfa"}"></span><strong>${escape(el)}</strong><span>×${count}</span></span>`,
      )
      .join("");

    const bonds = model.bonds ?? [];
    let singleCount = 0,
      doubleCount = 0,
      tripleCount = 0;
    const pairStats = new Map();

    for (const b of bonds) {
      const a1 = model.atoms[b.a];
      const a2 = model.atoms[b.b];
      if (!a1 || !a2) continue;
      const order = b.order ?? 1;
      if (order === 3) tripleCount++;
      else if (order === 2) doubleCount++;
      else singleCount++;

      const [e1, e2] = [a1.elem, a2.elem].sort();
      const sym = order === 3 ? "≡" : order === 2 ? "=" : "—";
      const key = `${e1}${sym}${e2}`;
      const dist = Math.hypot(a1.x - a2.x, a1.y - a2.y, a1.z - a2.z);
      const entry = pairStats.get(key) ?? { key, count: 0, sumDist: 0, order };
      entry.count++;
      entry.sumDist += dist;
      pairStats.set(key, entry);
    }

    const pairBadges = [...pairStats.values()]
      .map(
        (p) =>
          `<span class="bond-pair-chip" data-order="${p.order}"><strong>${escape(p.key)}</strong> <span>×${p.count}</span> <small>${(p.sumDist / p.count).toFixed(2)} Å</small></span>`,
      )
      .join("");
    const componentCounts=new Map();
    for(const group of model.groups??[]){const key=`${group.formula}:${group.charge}`;const row=componentCounts.get(key)??{...group,count:0};row.count++;componentCounts.set(key,row);}
    const componentPills=[...componentCounts.values()].map(group=>`<span class="component-pill" data-component-formula="${escape(group.formula)}">${group.count>1?group.count+' × ':''}${escape(this.componentLabel(group))}${group.connectivity==='composition'?' · thành phần':''}</span>`).join('');

    host.innerHTML = `
      <div class="bond-inspector-grid">
        <div class="bond-inspector-block">
          <div class="bond-inspector-title">THÀNH PHẦN NGUYÊN TỬ (MÀU CPK)</div>
          <div class="cpk-pill-list">${cpkPills}</div>
          ${componentPills?`<div class="component-pill-list" aria-label="Các nhóm thành phần">${componentPills}</div>`:''}
        </div>
        <div class="bond-inspector-block">
          <div class="bond-inspector-title">${model.componentLayout?'LIÊN KẾT BÊN TRONG CÁC NHÓM':'LIÊN KẾT TRONG MÔ HÌNH'} (${bonds.length})</div>
          <div class="bond-order-summary">
            ${bonds.length === 0 ? `<span class="bond-stat-tag">${model.periodic ? "Không suy ra liên kết hóa học chỉ từ khoảng cách mạng" : model.componentLayout ? 'Các nhóm được tách để quan sát' : model.atoms.length===1 ? "Đơn nguyên tử" : 'Biểu diễn thành phần theo công thức'}</span>` : ""}
            ${singleCount > 0 ? `<span class="bond-stat-tag">Liên kết đơn (—): <strong>${singleCount}</strong></span>` : ""}
            ${doubleCount > 0 ? `<span class="bond-stat-tag double">Liên kết đôi (=): <strong>${doubleCount}</strong></span>` : ""}
            ${tripleCount > 0 ? `<span class="bond-stat-tag triple">Liên kết ba (≡): <strong>${tripleCount}</strong></span>` : ""}
          </div>
          ${pairBadges ? `<div class="bond-pair-list">${pairBadges}</div>` : ""}
        </div>
      </div>
    `;
  }
  renderIsomers(record) {
    const host=this.querySelector('.viewer-isomers'),group=isomerGroupFor(record);
    host.hidden=!group;
    if(!group){host.replaceChildren();return;}
    const example=group.examples.find(e=>e.id===record.isomerExampleId);
    const formula=group.formula.replace(/\d/g,n=>'₀₁₂₃₄₅₆₇₈₉'[Number(n)]);
    host.innerHTML=`<label><span>Chọn đồng phân của ${escape(formula)}</span><select aria-label="Đồng phân đang xem">${group.examples.map(e=>`<option value="${escape(e.id)}" ${e.id===example.id?'selected':''}>${escape(e.name)}</option>`).join('')}</select></label><p class="isomer-current"><strong>${escape(example.name)}</strong> · <span>${escape(example.condensed)}</span></p><p>${escape(example.feature)}</p><details><summary>Đồng phân là gì?</summary><p>Các chất có cùng công thức phân tử nhưng khác cách nối hoặc sắp xếp nguyên tử. Mỗi tên trong danh sách là một chất cụ thể; danh sách chỉ gồm một số ví dụ.</p></details>`;
    host.querySelector('select').onchange=event=>{
      const id=event.target.value;
      this.dispatchEvent(new CustomEvent('isomerchange',{detail:{id}}));
      this.open(record,{isomerId:id});
    };
  }
  async open(record, {isomerId}={}) {
    if (!this.ready) this.connectedCallback();
    record=resolveMolecularExample(record,isomerId);
    this.renderIsomers(record);
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.dispose();
    this.record = record;
    this.spinning = false;
    const spinBtn = this.querySelector("[data-spin]");
    if (spinBtn) {
      spinBtn.classList.remove("primary");
      spinBtn.textContent = "↻ Tự xoay";
    }
    this.querySelector("[data-style]").value =
      record.kind === "crystal" ? "ball" : "ball";
    this.selected = [];
    this.raw = null;
    this.parsedModel = null;
    this.renderBondPanel(null);
    this.querySelector('.atom-readout').textContent='Chọn 2 nguyên tử để đo khoảng cách, 3 nguyên tử để đo góc (trên cấu dạng đang xem).';
    this.status("Đang tải cấu trúc…");
    this.querySelector(".viewer-source").innerHTML = "";
    try {
      let raw,
        generated,
        source = record.structure;
      if (!source || source.dimension !== "3d") {
        generated = generateStructure(record);
        raw = toSDF(generated, record.name_vi ?? record.formula);
      }
      try {
        if (!raw)
          raw = await storage("structures", "get", `${record.id}:${source.url}`);
      } catch {}
      if (!raw) {
        try {
          const response = await fetch(source.url, {
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(15000),
            ]),
          });
          if (!response.ok)
            throw new Error(`Không tải được cấu trúc (${response.status}).`);
          if (source.remote) {
            const result = await response.json();
            raw = result.data;
            if (result.dimension !== "3d")
              throw new Error("Nguồn chỉ có tọa độ 2D.");
          } else raw = await response.text();
          if (typeof raw !== "string" || raw.includes("<html"))
            throw new Error("Dữ liệu cấu trúc không hợp lệ.");
          try {
            await storage("structures", "put", raw, `${record.id}:${source.url}`);
          } catch {}
        } catch (error) {
          if (controller.signal.aborted) return;
          // A formula-generated fallback can be a different isomer. Keep the
          // chosen identity honest if its published file cannot be loaded.
          if(record.isomerExampleId)throw new Error(`Chưa tải được mô hình ${record.name_vi}. Hãy thử lại hoặc chọn đồng phân khác.`);
          generated = generateStructure(record);
          generated.note =
            "Không tải được cấu trúc 3D có nguồn. " + generated.note;
          raw = toSDF(generated, record.name_vi ?? record.formula);
        }
      }
      if (controller.signal.aborted) return;
      const mol = await loadLibrary();
      if (controller.signal.aborted || !this.isConnected) return;
      this.raw = raw;
      this.rawFormat = generated ? "sdf" : source.format;

      // Parse coordinates & bonds so we can display accurate connectivity and ensure all bonds render
      try {
        this.parsedModel =
          generated ??
          (this.rawFormat === "sdf"
            ? readSDF(raw)
            : this.rawFormat === "cif"
              ? readCIF(raw)
              : generateStructure(record));
      } catch {
        this.parsedModel = generated ?? generateStructure(record);
      }
      this.renderBondPanel(this.parsedModel);
      if(!this.environmentUserSet){
        this.environmentEnabled=!this.parsedModel?.componentLayout;
        const button=this.querySelector('[data-environment]');
        button.setAttribute('aria-pressed',String(this.environmentEnabled));button.textContent=this.environmentEnabled?'Ẩn cảnh trưng bày':'Hiện cảnh trưng bày';
      }

      const shell = this.querySelector(".canvas-shell");
      try {
        this.viewer = mol.createViewer(shell, {
          backgroundColor:
            document.documentElement.dataset.theme === "light"
              ? "#f8fafc"
              : "#0f172a",
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
          this.viewer.addModel(raw, this.rawFormat, { keepH: true, ...(this.rawFormat === 'cif'||generated?.componentLayout ? {assignBonds: false} : {}) });

        // Ensure all bonds from parsedModel (including crystal coordination & ionic bonds) exist in 3Dmol model
        const glAtoms = this.viewer.getModel()?.selectedAtoms({}) ?? [];
        if (this.parsedModel?.bonds?.length && glAtoms.length === this.parsedModel.atoms.length) {
          for (const b of this.parsedModel.bonds) {
            const a1 = glAtoms[b.a];
            const a2 = glAtoms[b.b];
            if (!a1 || !a2) continue;
            a1.bonds ??= [];
            a1.bondOrder ??= [];
            a2.bonds ??= [];
            a2.bondOrder ??= [];
            if (!a1.bonds.includes(a2.index)) {
              a1.bonds.push(a2.index);
              a1.bondOrder.push(b.order ?? 1);
            }
            if (!a2.bonds.includes(a1.index)) {
              a2.bonds.push(a1.index);
              a2.bondOrder.push(b.order ?? 1);
            }
          }
        }

        this.viewer.setClickable({}, true, (atom) => this.pick(atom));
        this.applyStyle();
        if (record.kind === "crystal" && !generated) this.viewer.addUnitCell();
        this.viewer.zoomTo();
        const atoms = this.viewer.getModel().selectedAtoms({});
        const extents = ["x", "y", "z"].map(
          (axis) =>
            Math.max(...atoms.map((atom) => atom[axis])) -
            Math.min(...atoms.map((atom) => atom[axis])),
        );
        if (extents[0] < 1e-5 && Math.max(...extents) > 0)
          this.viewer.rotate(90, "y");
        else if (extents[1] < 1e-5 && Math.max(...extents) > 0)
          this.viewer.rotate(90, "x");
        if (this.environmentEnabled) { this.viewer.rotate(12, 'x'); this.viewer.zoom(.78); }
        this.initialView = this.viewer.getView();
        this.syncEnvironment();
        this.viewer.render();
      } catch (error) {
        this.environment?.destroy();this.environment=null;
        this.viewer?.destroy();
        this.viewer = null;
        shell.replaceChildren();
        const { createCanvasViewer } = await import("./viewer-canvas.js");
        if (controller.signal.aborted || !this.isConnected) return;
        const model = this.parsedModel ?? generateStructure(record);
        if (!generated && this.rawFormat !== "sdf") generated = model;
        this.fallback = createCanvasViewer(shell, model, (atom) =>
          this.pick(atom),
        );
        this.applyStyle();
      }
      const bondTotal = this.parsedModel?.bonds?.length ?? 0;
      this.status(
        generated
          ? `${generated.atoms.length} nguyên tử · ${bondTotal} liên kết${generated.componentLayout?' trong nhóm':''} · ${generated.mode === "ions" ? "Thành phần ion / phân tử" : generated.mode === "atom" ? "Nguyên tử 3D" : generated.mode === "idealized" ? "Hình học minh họa 3D" : "Thành phần minh họa 3D"} · Kéo để xoay`
          : record.kind === "crystal"
            ? `${this.parsedModel?.atoms?.length ?? ""} vị trí nguyên tử trong ô mạng · Kéo để xoay`
            : `${record.isomerExampleId ? record.name_vi+' · ' : ''}${this.parsedModel?.atoms?.length ?? ""} nguyên tử · ${bondTotal} liên kết · Kéo để xoay · Cuộn/chụm để thu phóng · Chọn nguyên tử để đo`,
      );
      this.querySelector(".viewer-source").innerHTML = generated
        ? `<span class="badge">MÔ HÌNH MINH HỌA</span><p>${escape(generated.note)}</p>`
        : `${escape(source.provenance)} · <a href="${escape(source.source)}" target="_blank" rel="noopener noreferrer">Nguồn dữ liệu ↗</a><br>Tọa độ là một cấu dạng tĩnh; không mô tả chuyển động phân tử theo thời gian thực.`;
      this.querySelector('.viewer-source').insertAdjacentHTML('beforeend','<details class="viewer-environment-note"><summary>Quy ước cảnh trưng bày</summary>Bệ và lọ mẫu là cảnh minh họa, tách khỏi tọa độ phân tử, phép đo và file tải xuống.</details>');
      if(this.parsedModel?.expansionWarnings?.length)this.querySelector('.viewer-source').insertAdjacentHTML('beforeend',`<details class="viewer-environment-note"><summary>Ghi chú đọc CIF</summary>${this.parsedModel.expansionWarnings.map(escape).join('<br>')}</details>`);
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
  syncEnvironment() {
    this.environment?.destroy();this.environment=null;
    if(this.viewer && this.parsedModel && this.environmentEnabled)this.environment=mountMolecularStudio(this.viewer,this.parsedModel);
    this.viewer?.render();
  }
  applyStyle() {
    if (this.fallback) {
      this.fallback.style({
        style: this.querySelector("[data-style]").value,
        hydrogen: this.querySelector("[data-hydrogen]").checked,
        labels: this.querySelector("[data-labels]").checked,
        environment: this.environmentEnabled,
      });
      return;
    }
    if (!this.viewer) return;
    const style = this.querySelector("[data-style]").value;
    const atoms = this.querySelector("[data-hydrogen]").checked
      ? {}
      : { not: { elem: "H" } };
    this.viewer.setStyle({}, {});
    this.viewer.setStyle(
      atoms,
      style === "sphere"
        ? { sphere: { scale: 0.8, colorfunc:a=>CPK_COLORS[a.elem]??'#a78bfa' } }
        : style === "stick"
          ? {
              ...(this.parsedModel?.componentLayout?{sphere:{scale:.28,colorfunc:a=>CPK_COLORS[a.elem]??'#a78bfa'}}:{}),
              stick: {
                radius: 0.16,
                doubleBondScaling: 0.42,
                tripleBondScaling: 0.3,
                colorfunc:a=>CPK_COLORS[a.elem]??'#a78bfa',
              },
            }
          : {
              sphere: { scale: 0.28, colorfunc:a=>CPK_COLORS[a.elem]??'#a78bfa' },
              stick: {
                radius: 0.11,
                doubleBondScaling: 0.42,
                tripleBondScaling: 0.3,
                colorfunc:a=>CPK_COLORS[a.elem]??'#a78bfa',
              },
            },
    );
    this.viewer.removeAllLabels();
    if (this.querySelector("[data-labels]").checked)
      this.viewer.addPropertyLabels("elem", atoms, {
        fontSize: 12,
        showBackground: false,
        fontColor: "#e2e8f0",
      });
    this.viewer.render();
  }
  componentLabel(group) {
    const formula=String(group.formula).replace(/\d/g,n=>'₀₁₂₃₄₅₆₇₈₉'[Number(n)]),charge=group.charge??0;
    return formula+(charge?(Math.abs(charge)===1?'':String(Math.abs(charge)).replace(/\d/g,n=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(n)]))+(charge>0?'⁺':'⁻'):'');
  }
  pick(atom) {
    if (this.selected.length === 3) this.selected = [];
    this.selected.push(atom);
    const atoms = this.selected;
    let text = `${atom.elem} · #${atom.index + 1}${atom.properties?.charge !== undefined ? ` · điện tích ${atom.properties.charge}` : ""}`;
    const groupIds=atoms.map(a=>this.parsedModel?.atoms[a.index]?.componentGroup),groups=this.parsedModel?.groups;
    if(groups){
      const group=groups[groupIds.at(-1)];if(group)text+=` · thuộc nhóm ${this.componentLabel(group)}`;
      if(groupIds.some(id=>id!==groupIds[0])){this.querySelector('.atom-readout').textContent=text+' · Các nhóm được tách để quan sát; khoảng cách giữa chúng không phải số đo cấu trúc.';return;}
    }
    if (atoms.length === 2)
      text += ` · Khoảng cách${groups?' minh họa':''}: ${Math.hypot(atoms[0].x - atoms[1].x, atoms[0].y - atoms[1].y, atoms[0].z - atoms[1].z).toFixed(3)} Å`;
    if (atoms.length === 3) {
      const [a, b, c] = atoms,
        u = [a.x - b.x, a.y - b.y, a.z - b.z],
        v = [c.x - b.x, c.y - b.y, c.z - b.z],
        den = Math.hypot(...u) * Math.hypot(...v);
      text += den
        ? ` · Góc${groups?' minh họa':''} ${a.elem}–${b.elem}–${c.elem}: ${((Math.acos(Math.max(-1, Math.min(1, u.reduce((n, k, i) => n + k * v[i], 0) / den))) * 180) / Math.PI).toFixed(2)}°`
        : " · Chọn ba nguyên tử khác nhau để đo góc.";
    }
    this.querySelector(".atom-readout").textContent = text;
  }
}

if (!customElements.get("chem-structure-viewer"))
  customElements.define("chem-structure-viewer", ChemStructureViewer);
