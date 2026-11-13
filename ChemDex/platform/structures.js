import libraryRoutes from '../shared/library-routes.generated.json';
import compounds from "../shared/compounds.json";
import coverage from "../shared/lab-structure-coverage.json";
import generatedCatalog from "../shared/structure-catalog.generated.json";
import libraryLinks from "../shared/library-links.generated.json";
import crystalLinks from '../shared/crystal-links.generated.json';
import {
  generateStructure,
  structureFormula,
} from "../shared/chemistry/structure-generator.mjs";
import "./viewer.js";
import {
  shell,
  normalize,
  escape,
  display,
  read,
  write,
  toast,
} from "./common.js";

shell("structures");

const params = new URLSearchParams(location.search),
  embedded = params.get("embed") === "1";
if (embedded) {
  if (params.get('modelOnly') === '1') document.body.classList.add('structure-embed-only');
  document.querySelector("#site-header").hidden = true;
  document.querySelector("footer").hidden = true;
  document.body.style.background = "var(--panel)";
}

let query = params.get("q") ?? "",
  selected = null,
  favorites = read("favorite-compounds", []),
  compare = [],
  request = null;

const records = [...compounds, ...generatedCatalog];
let crystalWidget;

const KIND_LABELS = {
  molecule: "PHÂN TỬ",
  ion: "ION ĐA NGUYÊN TỬ",
  crystal: "MẠNG TINH THỂ",
  components: "THÀNH PHẦN ION",
  composition: "THÀNH PHẦN MINH HỌA",
  atom: "ĐƠN NGUYÊN TỬ",
  unavailable: "CHẤT TRONG LAB",
};

const SHOWCASE_PRESETS = [
  { id: "cid-962", label: "H₂O · Nước" },
  { id: "cid-241", label: "C₆H₆ · Benzen" },
  { id: "chem-cuso4", label: "CuSO₄ · Đồng(II) sunfat" },
  { formula: "CuSO4·5H2O", label: "CuSO₄·5H₂O · Chất ngậm nước" },
  { id: "chem-k2cr2o7", label: "K₂Cr₂O₇ · Kali đicromat" },
  { id: "crystal-nacl", label: "NaCl · Tinh thể Halite" },
  { id: "cid-2519", label: "C₈H₁₀N₄O₂ · Caffeine" },
  { id: "chem-methyl-orange", label: "Metyl da cam · Azo 3D" },
];

document.querySelector("#app").innerHTML = `${
  embedded
    ? ""
    : `<section class="hero structure-hero">
        <div>
          <div class="eyebrow">PHÒNG QUAN SÁT CẤU TRÚC & LIÊN KẾT 3D</div>
          <h1>Khám phá cấu trúc hóa học trong không gian 3D.</h1>
          <p>Khám phá phân tử, thành phần ion và mạng tinh thể; nguồn tọa độ và mức mô phỏng được ghi theo từng chất.</p>
          <div class="showcase-strip" aria-label="Cấu trúc 3D tiêu biểu">
            <span class="showcase-label">Khám phá nhanh:</span>
            ${SHOWCASE_PRESETS.map(
              (p) =>
                `<button class="chip showcase-chip" type="button" data-showcase-id="${escape(p.id ?? "")}" data-showcase-formula="${escape(p.formula ?? "")}">${escape(p.label)}</button>`,
            ).join("")}
          </div>
        </div>
        <div class="hero-stat structure-hero-stat">
          <strong>${records.length}</strong>
          <span>MÔ HÌNH CẤU TRÚC 3D</span>
          <div class="hero-stat-sub">${records.filter(r=>r.structure?.dimension === '3d').length} bộ tọa độ có nguồn</div>
        </div>
      </section>`
}
<div class="toolbar panel structure-toolbar">
  <label class="search">
    <span class="sr-only">Tìm cấu trúc</span>
    <input id="search" type="search" placeholder="Tìm tên chất, công thức (VD: CuSO4, K2Cr2O7, C6H6) hoặc CID…" value="${escape(query)}">
  </label>
  <label>
    <span class="sr-only">Loại cấu trúc</span>
    <select id="kind">
      <option value="">Tất cả loại cấu trúc</option>
      <option value="molecule">Phân tử cộng hóa trị</option>
      <option value="ion">Ion đa nguyên tử</option>
      <option value="crystal">Mạng tinh thể</option>
      <option value="components">Thành phần ion & Phức chất</option>
      <option value="composition">Thành phần minh họa</option>
      <option value="atom">Đơn nguyên tử</option>
    </select>
  </label>
  <label>
    <span class="sr-only">Nhóm chất</span>
    <select id="family">
      <option value="">Vô cơ & Hữu cơ</option>
      <option value="organic">Hóa hữu cơ</option>
      <option value="inorganic">Hóa vô cơ</option>
    </select>
  </label>
  <label class="toolbar-check"><input type="checkbox" id="lab"> Có trong Lab</label>
  <label class="toolbar-check"><input type="checkbox" id="favorites"> ★ Yêu thích</label>
  <button class="button primary" id="remote" type="button">Tra PubChem ↗</button>
  <button class="button" id="generate" type="button">Tự tạo từ công thức</button>
</div>
<div class="results-meta">
  <span id="count" role="status"></span>
  <span>Xoay 3D, đo khoảng cách và góc trên cấu dạng đang xem</span>
</div>
<div class="catalog-layout">
  <section class="catalog-list">
    <div class="cards" id="cards"></div>
    <div id="remote-results"></div>
  </section>
  <section class="panel viewer-panel" id="selected">
    <div class="empty">Chọn một chất trong thư viện để khám phá cấu trúc.</div>
  </section>
</div>
<div id="comparison"></div>`;

const $ = (id) => document.getElementById(id);

document.querySelectorAll(".showcase-chip").forEach((btn) => {
  btn.onclick = () => {
    const targetId = btn.dataset.showcaseId;
    const targetFormula = btn.dataset.showcaseFormula;
    const rec = targetId
      ? records.find((c) => c.id === targetId)
      : records.find((c) => c.formula === targetFormula);
    if (rec) open(rec);
  };
});

function render() {
  const q = normalize(query),
    el = params.get("element");
  const filtered = records.filter((c) => {
    if (
      $("lab").checked &&
      !c.lab &&
      !coverage.some((l) => l.compoundId === c.id)
    )
      return false;
    return (
      (!q ||
        [
          c.name_vi,
          c.name_en,
          c.formula,
          String(c.cid ?? ""),
          ...(c.aliases ?? []),
        ].some((s) => normalize(s).includes(q))) &&
      (!$("kind").value || c.kind === $("kind").value) &&
      (!$("family").value || c.family === $("family").value) &&
      (!$("favorites").checked || favorites.includes(c.id)) &&
      (!el || new RegExp(`${el}(?![a-z])`).test(c.formula))
    );
  });
  $("count").textContent =
    `${filtered.length} kết quả · ${records.filter((c) => c.structure?.dimension === "3d").length} bản ghi có tọa độ nguồn · Các mô hình dựng từ công thức có nhãn minh họa`;
  $("cards").innerHTML =
    filtered
      .map((c) => {
        const isActive = selected?.id === c.id;
        const kindLabel = KIND_LABELS[c.kind] ?? "CẤU TRÚC 3D";
        const familyBadge = c.family === "organic" ? "Hữu cơ" : "Vô cơ";
        const subMeta = c.structure?.dimension === "3d"
          ? "Tọa độ 3D chuẩn (SDF/CIF)"
          : c.ions || c.kind === "components"
            ? "Thành phần ion 3D"
            : c.kind === "atom"
              ? "Nguyên tử đơn lẻ 3D"
              : "Mô hình minh họa 3D";
        return `<button class="panel compound-card ${isActive ? "active" : ""}" data-id="${c.id}" data-kind="${escape(c.kind ?? "molecule")}">
          <span class="card-top">
            <span class="badge kind-badge-${escape(c.kind ?? "molecule")}">${kindLabel}</span>
            <span class="card-top-right">
              <span class="family-pill">${familyBadge}</span>
              <span class="fav-star" aria-hidden="true">${favorites.includes(c.id) ? "★" : ""}</span>
            </span>
          </span>
          <div class="formula">${escape(c.formula)}</div>
          <h2>${escape(c.name_vi)}</h2>
          <p class="compound-en">${escape(c.name_en ?? "")}</p>
          <div class="compound-card-footer">
            <span>${c.atomCount ? `${c.atomCount} nguyên tử · ` : ""}${c.cid ? `CID ${c.cid} · ` : ""}${subMeta}</span>
          </div>
        </button>`;
      })
      .join("") ||
    '<div class="panel empty">Không có kết quả trong kho. Thử tên tiếng Anh, nhập công thức rồi bấm "Tự tạo từ công thức", hoặc tra PubChem.</div>';
  $("cards")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => open(records.find((c) => c.id === b.dataset.id))),
    );
}

async function open(record) {
  crystalWidget?.destroy();crystalWidget=null;
  selected = record;
  document.querySelectorAll("#cards .compound-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.id === record.id);
  });
  const url = new URL(location.href);
  const isomerId=url.searchParams.get('compound')===record.id?url.searchParams.get('isomer'):null;
  url.searchParams.delete('isomer');
  url.searchParams.delete("cid");
  url.searchParams.set("compound", record.id);
  if (record.id.startsWith("remote-") && record.cid) {
    url.searchParams.delete("compound");
    url.searchParams.set("cid", String(record.cid));
  }
  if (record.id.startsWith("generated-")) {
    url.searchParams.delete("compound");
    url.searchParams.set("formula", record.formula);
  } else url.searchParams.delete("formula");
  history.replaceState(null, "", url);

  const old = $("selected").querySelector("chem-structure-viewer");
  old?.remove();
  const lab = coverage.find(
    (c) => c.chemicalId === record.id || c.compoundId === record.id,
  );
  const kindLabel = KIND_LABELS[record.kind] ?? "CẤU TRÚC 3D";
  const familyLabel = record.family === "organic" ? "Hợp chất Hữu cơ" : "Hợp chất Vô cơ";

  $("selected").innerHTML = `
    <div class="viewer-header-card">
      <div class="viewer-header-top">
        <div class="section-label">CẤU TRÚC ĐANG KHÁM PHÁ · ${escape(kindLabel)}</div>
        <div class="viewer-meta-chips">
          <span class="meta-chip formula-chip">${escape(record.formula)}</span>
          ${record.molarMass ? `<span class="meta-chip">${record.molarMass.toFixed(2)} g/mol</span>` : ""}
          ${record.atomCount ? `<span class="meta-chip">${record.atomCount} nguyên tử</span>` : ""}
          <span class="meta-chip">${familyLabel}</span>
          ${record.cid ? `<span class="meta-chip">CID ${record.cid}</span>` : ""}
        </div>
      </div>
      <div class="viewer-header-main">
        <div class="viewer-title-stack">
          <h2>${escape(record.name_vi ?? record.name_en)}</h2>
          ${record.name_en && record.name_en !== record.name_vi ? `<span class="viewer-subtitle-en">${escape(record.name_en)}</span>` : ""}
        </div>
        <div class="viewer-toolbar viewer-actions-bar">
          <button class="button" id="favorite" type="button">${favorites.includes(record.id) ? "★ Đã yêu thích" : "☆ Yêu thích"}</button>
          <button class="button" id="compare" type="button">+ So sánh</button>
          ${libraryLinks[record.id] ? `<a class="button" href="/trung-tam/tai-lieu-so/${encodeURIComponent(libraryRoutes[libraryLinks[record.id]] ?? libraryLinks[record.id])}/" target="${embedded ? "_top" : "_self"}">Đọc hồ sơ chất ↗</a>` : ""}
          ${lab ? `<a class="button primary" href="/lab-2d/?chemical=${encodeURIComponent(lab.chemicalId)}" target="${embedded ? "_top" : "_self"}">Mở trong lab ↗</a>` : ""}
        </div>
      </div>
    </div>
    ${!embedded && crystalLinks[record.id]?.length ? `<div class="structure-view-tabs" role="group" aria-label="Cách biểu diễn cấu trúc"><button class="button" type="button" data-model-view="molecule" aria-pressed="true">${record.kind==='molecule'?'Phân tử':record.kind==='atom'?'Nguyên tử':'Thành phần'}</button><button class="button" type="button" data-model-view="crystal" aria-pressed="false">Tinh thể</button></div>` : ''}
    <div data-structure-molecular>
    ${record.modelNote ? `<div class="atom-readout">${escape(record.modelNote)}</div>` : ""}
    ${record.note && record.kind === "components" ? `<p class="muted">${escape(record.note)}</p>` : ""}
    <chem-structure-viewer></chem-structure-viewer>
    ${record.kind === "components" ? '<div id="components" class="viewer-toolbar"></div>' : ""}
    <p class="muted" style="font-size:11px">${record.kind === "ion" ? "Ion đa nguyên tử được hiển thị kèm khung liên kết minh họa." : record.kind === "molecule" ? (record.structure?.coordinateType === "experimental" ? "Cấu trúc thực nghiệm pha khí từ NIST CCCBDB; độ chính xác theo dữ liệu nguồn." : "Cấu dạng 3D có nguồn; thông tin tọa độ nằm dưới mô hình.") : "Nguyên tử, nhóm và liên kết được ghi theo cách biểu diễn đang chọn."}</p></div><div data-structure-crystal hidden></div>`;

  const viewer = $('selected').querySelector('chem-structure-viewer');
  let molecularLoad;
  const ensureMolecular=async()=>{
    if(!viewer)return;
    const componentRecord=record.kind==='crystal'&&record.structure?.format==='cif'?{...record,kind:'components',structure:undefined}:record;
    molecularLoad??=viewer.open(componentRecord,{isomerId});await molecularLoad;
    if(selected?.id===record.id && viewer.isConnected && viewer.record?.isomerExampleId){const link=new URL(location.href);link.searchParams.set('isomer',viewer.record.isomerExampleId);history.replaceState(null,'',link);}
  };
  viewer?.addEventListener('isomerchange',event=>{const link=new URL(location.href);link.searchParams.set('isomer',event.detail.id);history.replaceState(null,'',link);});
  for (const button of $('selected').querySelectorAll('[data-model-view]')) button.onclick = async () => {
    const crystal=button.dataset.modelView==='crystal';
    const moleculeHost=$('selected').querySelector('[data-structure-molecular]');
    const crystalHost=$('selected').querySelector('[data-structure-crystal]');
    moleculeHost.hidden=crystal;crystalHost.hidden=!crystal;
    $('selected').querySelectorAll('[data-model-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    if(crystal){
      moleculeHost.querySelector('chem-structure-viewer')?.visibility?.();
      if(!crystalWidget){
        crystalHost.textContent='Đang tải danh mục tinh thể…';
        try {
          const {mountStructureCrystalPanel}=await import('./crystal-panel.js');
          if(selected?.id===record.id && crystalHost.isConnected && !crystalWidget)crystalWidget=mountStructureCrystalPanel(crystalHost,crystalLinks[record.id]);
        }catch{if(crystalHost.isConnected)crystalHost.textContent='Chưa tải được bộ xem tinh thể. Có thể thử lại hoặc mở hồ sơ chất.';}
      }
    }else await ensureMolecular();
  };

  $("favorite").onclick = () => {
    favorites = favorites.includes(record.id)
      ? favorites.filter((id) => id !== record.id)
      : [...favorites, record.id];
    write("favorite-compounds", favorites);
    render();
    $("favorite").textContent = favorites.includes(record.id)
      ? "★ Đã yêu thích"
      : "☆ Yêu thích";
  };
  $("compare").onclick = () => {
    if (compare.includes(record.id))
      compare = compare.filter((id) => id !== record.id);
    else if (compare.length < 3) compare.push(record.id);
    else return toast("Tối đa 3 chất trong một bảng so sánh.");
    renderComparison();
  };
  if (record.kind === "components") {
    const buttons = compounds.filter((c) =>
      (record.componentIds ?? []).includes(c.id),
    );
    $("components").innerHTML = buttons
      .map(
        (c) =>
          `<button class="button" data-id="${c.id}" type="button">${escape(c.name_vi)}</button>`,
      )
      .join("");
    $("components")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () =>
            open(compounds.find((c) => c.id === b.dataset.id))),
      );
  }
  const crystalButton=$('selected').querySelector('[data-model-view="crystal"]');
  if(crystalButton&&['crystal','components','composition'].includes(record.kind)){
    await crystalButton.onclick();
    if(selected?.id===record.id)$('selected').querySelector('[data-crystal-start]')?.click();
  }else await ensureMolecular();
  if (innerWidth < 800 && !embedded)
    $("selected").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
}

function renderComparison() {
  const data = compare
    .map((id) => records.find((c) => c.id === id))
    .filter(Boolean);
  $("comparison").innerHTML = data.length
    ? `<section class="panel compare"><table><caption>So sánh chất (${data.length}/3)</caption><thead><tr><th>Thuộc tính</th>${data.map((c) => `<th><button class="button" data-open="${c.id}" type="button">${escape(c.name_vi)}</button></th>`).join("")}</tr></thead><tbody>${[
        ["Công thức", "formula"],
        ["Số nguyên tử", "atomCount"],
        ["Khối lượng mol (g/mol)", "molarMass"],
        ["Loại cấu trúc", "kind"],
      ]
        .map(
          ([label, key]) =>
            `<tr><th>${label}</th>${data.map((c) => `<td>${escape(display(c[key]))}</td>`).join("")}</tr>`,
        )
        .join(
          "",
        )}</tbody></table><p class="muted">Chọn tên chất để xem mô hình; chỉ một mô hình được khởi tạo tại một thời điểm.</p><button class="button" id="clear-compare" type="button">Xóa so sánh</button></section>`
    : "";
  $("comparison")
    .querySelectorAll("[data-open]")
    .forEach(
      (b) =>
        (b.onclick = () => open(records.find((c) => c.id === b.dataset.open))),
    );
  if ($("clear-compare"))
    $("clear-compare").onclick = () => {
      compare = [];
      renderComparison();
    };
}

async function remote() {
  request?.abort();
  const controller = new AbortController();
  request = controller;
  const value = query.trim();
  if (!value)
    return toast("Nhập tên tiếng Anh, công thức hoặc CID để tra PubChem.");
  $("remote-results").innerHTML =
    '<p class="muted" role="status">Đang tra cứu PubChem…</p>';
  try {
    const response = await fetch(
      `/api/chemistry/search?q=${encodeURIComponent(value)}`,
      { signal: controller.signal },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error ?? "Dịch vụ tra cứu đang không khả dụng.");
    $("remote-results").innerHTML =
      '<p class="muted">Kết quả PubChem — chọn đúng chất/đồng phân</p>' +
      data.results
        .map(
          (c) =>
            `<button class="panel compound-card" data-cid="${c.cid}" style="width:100%;margin:7px 0"><h2>${escape(c.name_en)}</h2><p>${escape(c.formula)} · CID ${c.cid}</p></button>`,
        )
        .join("");
    if (!data.results.length)
      $("remote-results").innerHTML =
        '<p class="empty">PubChem không có kết quả phù hợp.</p>';
    $("remote-results")
      .querySelectorAll("button")
      .forEach(
        (b) =>
          (b.onclick = () => {
            const c = data.results.find((c) => c.cid === Number(b.dataset.cid));
            const record = {
              ...c,
              id: `remote-${c.cid}`,
              name_vi: c.name_en,
              kind: c.kind ?? "molecule",
              structure: {
                format: "sdf",
                dimension: "3d",
                remote: true,
                url: `/api/chemistry/structure?cid=${c.cid}`,
                source: `https://pubchem.ncbi.nlm.nih.gov/compound/${c.cid}`,
                provenance: "PubChem computed conformer",
              },
            };
            records.push(record);
            open(record);
          }),
      );
    if (/^\d+$/.test(value) && data.results.length === 1)
      $("remote-results").querySelector("button")?.click();
  } catch (error) {
    if (controller.signal.aborted) return;
    $("remote-results").innerHTML =
      `<div class="error-box" role="alert">${escape(error.message)}<p>Kho cấu trúc sẵn vẫn có thể sử dụng.</p></div>`;
  }
}

$("search").oninput = (e) => {
  request?.abort();
  query = e.target.value;
  render();
};
for (const id of ["kind", "family", "lab", "favorites"])
  $(id).onchange = render;
$("remote").onclick = remote;

function createFromFormula(value) {
  try {
    const formula = structureFormula(value);
    const known = records.find((c) => c.formula === formula && !c.material);
    if (known) {
      open(known);
      return;
    }
    const record = {
      id: "generated-" + formula,
      formula,
      name_vi: formula,
      kind: "composition",
      family:
        /C(?![a-z])/.test(formula) && /H/.test(formula)
          ? "organic"
          : "inorganic",
    };
    const gen = generateStructure(record);
    record.atomCount = gen.atoms.length;
    if (!records.some((c) => c.id === record.id)) records.push(record);
    open(record);
  } catch (error) {
    toast("Không tạo được mô hình: " + error.message);
  }
}

$("generate").onclick = () => createFromFormula(query);
$("search").onkeydown = (e) => {
  if (e.key === "Enter") remote();
};

render();

const chemical = params.get("chemical"),
  id = params.get("compound"),
  cid = params.get("cid");
if (params.get("formula")) {
  createFromFormula(params.get("formula"));
} else if (chemical) {
  $("lab").checked = true;
  render();
  open(records.find((c) => c.id === chemical) ?? compounds[0]);
} else if (id) {
  open(records.find((c) => c.id === id) ?? compounds[0]);
} else if (cid) {
  const found = compounds.find((c) => c.cid === Number(cid));
  if (found) open(found);
  else {
    query = cid;
    $("search").value = cid;
    remote();
  }
} else if (!embedded && !query && !params.get("element")) open(compounds[0]);
