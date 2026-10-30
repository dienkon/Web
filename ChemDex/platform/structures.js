import compounds from "../shared/compounds.json";
import coverage from "../shared/lab-structure-coverage.json";
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
  document.querySelector("#site-header").hidden = true;
  document.querySelector("footer").hidden = true;
  document.body.style.background = "var(--panel)";
}
let query = params.get("q") ?? "",
  selected = null,
  favorites = read("favorite-compounds", []),
  compare = [],
  request = null;
const records = [
  ...compounds,
  ...coverage.map((c) => ({
    ...c,
    ...(c.status === "available"
      ? compounds.find((p) => p.id === c.compoundId)
      : {}),
    id: c.chemicalId,
    kind:
      c.status === "components"
        ? "components"
        : c.status === "available"
          ? (compounds.find((p) => p.id === c.compoundId)?.kind ??
            "unavailable")
          : "unavailable",
    family: c.category === "organic" ? "organic" : "inorganic",
    lab: true,
  })),
];
document.querySelector("#app").innerHTML =
  `${embedded ? "" : `<section class="hero"><div><div class="eyebrow">Khám phá hóa học trong không gian</div><h1>Nhìn thấy những liên kết.</h1><p>Khám phá phân tử, ion và mạng tinh thể. Mỗi cấu trúc có nguồn, mỗi góc nhìn mở ra một cách hiểu mới.</p></div><div class="hero-stat"><strong>${compounds.length}</strong><span>CẤU TRÚC TRONG KHO</span></div></section>`}<div class="toolbar panel"><label class="search"><span class="sr-only">Tìm cấu trúc</span><input id="search" type="search" placeholder="Tên chất, công thức hoặc PubChem CID…" value="${escape(query)}"></label><label><span class="sr-only">Loại cấu trúc</span><select id="kind"><option value="">Tất cả cấu trúc</option value="molecule">Phân tử</option><option value="ion">Ion</option><option value="crystal">Tinh thể</option></select></label><label><span class="sr-only">Nhóm chất</span><select id="family"><option value="">Vô cơ & hữu cơ</option value="organic">Hữu cơ</option><option value="inorganic">Vô cơ</option></select></label><label><input type="checkbox" id="lab"> Trong lab</label><label><input type="checkbox" id="favorites"> Yêu thích</label><button class="button primary" id="remote">Tra PubChem ↗</button></div><div class="results-meta"><span id="count" role="status"></span><span>Chọn đúng chất/đồng phân trước khi xem</span></div><div class="catalog-layout"><section class="catalog-list"><div class="cards" id="cards"></div><div id="remote-results"></div></section><section class="panel viewer-panel" id="selected"><div class="empty">Chọn một chất trong thư viện để khám phá cấu trúc.</div></section></div><div id="comparison"></div>`;
const $ = (id) => document.getElementById(id);
function render() {
  const q = normalize(query),
    el = params.get("element");
  const filtered = records.filter((c) => {
    if (c.lab && !$("lab").checked) return false;
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
    `${filtered.length} kết quả trong kho · ${compounds.filter((c) => c.structure?.dimension === "3d").length} mô hình 3D`;
  $("cards").innerHTML =
    filtered
      .map(
        (c) =>
          `<button class="panel compound-card" data-id="${c.id}"><span class="card-top"><span class="badge">${{ molecule: "PHÂN TỬ", ion: "ION", crystal: "TINH THỂ", components: "CÁC THÀNH PHẦN", unavailable: "CHẤT TRONG LAB" }[c.kind]}</span><span class="muted">${favorites.includes(c.id) ? "★" : ""}</span></span><div class="formula">${escape(c.formula)}</div><h2>${escape(c.name_vi)}</h2><p>${escape(c.name_en ?? "")}</p><p>${c.cid ? `CID ${c.cid} · ` : ""}${c.structure?.dimension === "3d" ? "Có cấu trúc 3D" : c.status === "components" ? "Xem thành phần trong dung dịch" : "Xem thông tin"}</p></button>`,
      )
      .join("") ||
    '<div class="panel empty">Không có kết quả trong kho. Thử tên tiếng Anh hoặc tra PubChem.</div>';
  $("cards")
    .querySelectorAll("button")
    .forEach(
      (b) =>
        (b.onclick = () => open(records.find((c) => c.id === b.dataset.id))),
    );
}
async function open(record) {
  selected = record;
  const url = new URL(location.href);
  url.searchParams.delete("cid");
  url.searchParams.set("compound", record.id);
  if (record.id.startsWith("remote-") && record.cid) {
    url.searchParams.delete("compound");
    url.searchParams.set("cid", String(record.cid));
  }
  history.replaceState(null, "", url);
  const old = $("selected").querySelector("chem-structure-viewer");
  old?.remove();
  const lab = coverage.find(
    (c) => c.chemicalId === record.id || c.compoundId === record.id,
  );
  $("selected").innerHTML =
    `<div class="section-label">CẤU TRÚC ĐANG KHÁM PHÁ</div><h2>${escape(record.name_vi ?? record.name_en)}</h2><div class="muted">${escape(record.formula)} ${record.molarMass ? `· ${record.molarMass.toFixed(3)} g/mol` : ""} ${record.cid ? `· CID ${record.cid}` : ""}</div><div class="viewer-toolbar"><button class="button" id="favorite">${favorites.includes(record.id) ? "★ Đã yêu thích" : "☆ Yêu thích"}</button><button class="button" id="compare">+ So sánh</button>${lab ? `<a class="button primary" href="/lab-2d/?chemical=${encodeURIComponent(lab.chemicalId)}" target="${embedded ? "_top" : "_self"}">Mở trong lab ↗</a>` : ""}</div>${record.kind === "components" ? `<div class="atom-readout">${escape(record.note)}</div><p class="muted">Các thành phần: ${escape((record.components ?? []).join(", "))}. Đây là biểu diễn thành phần dung dịch; nồng độ, cân bằng và hydrat hóa chưa được mô hình hóa trong trình xem cấu trúc.</p><div id="components" class="viewer-toolbar"></div>` : record.kind === "unavailable" ? `<div class="empty">${escape(record.note ?? "Chưa có cấu trúc kiểm chứng cho chất này.")}<p>Có thể tra PubChem bằng tên chất hoặc chọn chất khác.</p></div>` : "<chem-structure-viewer></chem-structure-viewer>"}<p class="muted" style="font-size:11px">${record.kind === "ion" ? "Ion được hiển thị riêng; không mô tả đầy đủ lớp dung môi bao quanh." : record.kind === "molecule" ? (record.structure?.coordinateType === "experimental" ? "Cấu trúc thực nghiệm pha khí từ NIST; không đại diện trạng thái dung dịch." : "Cấu dạng tính toán minh họa từ nguồn dữ liệu; không phải phép đo thực nghiệm và không đại diện mọi trạng thái dung dịch.") : ""}</p>`;
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
          `<button class="button" data-id="${c.id}">${escape(c.name_vi)}</button>`,
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
  const viewer = $("selected").querySelector("chem-structure-viewer");
  if (viewer) await viewer.open(record);
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
    ? `<section class="panel compare"><table><caption>So sánh chất (${data.length}/3)</caption><thead><tr><th>Thuộc tính</th>${data.map((c) => `<th><button class="button" data-open="${c.id}">${escape(c.name_vi)}</button></th>`).join("")}</tr></thead><tbody>${[
        ["Công thức", "formula"],
        ["Khối lượng mol (g/mol)", "molarMass"],
        ["Loại cấu trúc", "kind"],
      ]
        .map(
          ([label, key]) =>
            `<tr><th>${label}</th>${data.map((c) => `<td>${escape(display(c[key]))}</td>`).join("")}</tr>`,
        )
        .join(
          "",
        )}</tbody></table><p class="muted">Chọn tên chất để xem mô hình; chỉ một mô hình được khởi tạo tại một thời điểm.</p><button class="button" id="clear-compare">Xóa so sánh</button></section>`
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
    // An exact CID has one identity; opening its shared URL restores that
    // structure. Formula/name searches continue to require explicit selection.
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
$("search").onkeydown = (e) => {
  if (e.key === "Enter") remote();
};
render();
const chemical = params.get("chemical"),
  id = params.get("compound"),
  cid = params.get("cid");
if (chemical) {
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
