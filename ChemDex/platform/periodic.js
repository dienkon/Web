import elements from "../shared/elements.json";
import insights from "../shared/element-insights.json";
import weights from "../shared/atomic-weights.json";
import summary from "../shared/platform-summary.json";
import { shell, escape, display, read, write, toast, download } from "./common.js";
import { categories, properties, matchesElement, sortElements, comparisonCSV } from "./periodic-model.js";

shell("elements");
const $ = (id) => document.getElementById(id);
const validSymbols = (values) => [...new Set(values)].filter((s) => elements.some((e) => e.symbol === s));
const params = new URLSearchParams(location.search);
let selected = elements.find((e) => e.symbol === params.get("element")) ?? elements[0];
let favorites = validSymbols(read("favorite-elements", []));
let recent = validSymbols(read("recent-elements", []));
let compare = validSymbols(read("compare-elements", [])).slice(0, 3);
let list = params.has("view") ? params.get("view") === "list" : read("element-list-view", matchMedia("(max-width: 600px)").matches);
let listLimit = 24;
const day = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", day: "numeric" }).format(new Date()));
const featuredSymbol = Object.keys(insights.elements)[(day - 1) % Object.keys(insights.elements).length];
const featured = elements.find((e) => e.symbol === featuredSymbol);
const progress = read("study-progress", { answers: {} });
const done = summary.studyQuestionIds.filter((id) => progress.answers?.[id] && typeof progress.answers[id].correct === "boolean").length;
const options = (entries) => entries.map(([key, name]) => `<option value="${key}">${name}</option>`).join("");
const filters = ["category", "period", "group", "block", "phase"];

$("app").innerHTML = `
<section class="home-hero">
  <div class="home-intro"><div class="eyebrow">KHÔNG GIAN HỌC HÓA HỌC</div><h1>Hiểu từng nguyên tố.<br><span>Kết nối cả thế giới.</span></h1><p>Tra cứu, quan sát và tự mình khám phá. Bắt đầu từ một nguyên tử, đi xa hơn cùng ChemDex.</p><div class="hero-actions"><a class="button primary" href="#workspace">Khám phá bảng tuần hoàn ↓</a><button class="button" id="hero-search">Tìm kiếm nhanh <kbd>Ctrl K</kbd></button></div><div class="hero-facts"><span><strong>118</strong> nguyên tố</span><span><strong>${summary.compoundCount}</strong> cấu trúc 3D</span><span><strong>20</strong> thí nghiệm hướng dẫn</span></div></div>
  <button class="element-spotlight" id="spotlight" aria-label="Khám phá ${escape(featured.name_vi)}"><span class="spotlight-top"><span>NGUYÊN TỐ HÔM NAY</span><span aria-hidden="true">↗</span></span><span class="spotlight-body"><span class="spotlight-tile"><small>${featured.z}</small><strong>${featured.symbol}</strong><span>${escape(featured.name_vi)}</span><small>${featured.mass}</small></span><span><span class="badge">${categories[featured.category][0]}</span><span class="spotlight-title">${escape(insights.elements[featuredSymbol].headline)}</span><span class="spotlight-link">Cùng khám phá →</span></span></span><span class="spotlight-bottom"><span>Hóa học ở ngay quanh bạn</span><span>CHEMDEX / ${String(featured.z).padStart(3, "0")}</span></span></button>
</section>
<section class="explore-links" aria-label="Lối tắt học tập"><a href="/tien-ich/cau-truc-3d/" class="explore-card"><span class="explore-icon">⌬</span><span><strong>Nhìn thấy liên kết</strong><small>Xoay và khám phá cấu trúc 3D</small></span><span aria-hidden="true">↗</span></a><a href="/lab-2d/" class="explore-card"><span class="explore-icon">⚗</span><span><strong>Thử làm nhà hóa học</strong><small>Thực hành trong phòng lab ảo</small></span><span aria-hidden="true">↗</span></a><a href="/on-tap/" class="explore-card"><span class="explore-icon">◉</span><span><strong>${done ? "Tiếp tục hành trình học" : "Mỗi ngày, thêm một chút"}</strong><small>${done ? `Bạn đã hoàn thành ${done}/${summary.studyQuestionIds.length} câu hỏi` : "Luyện kiến thức qua câu hỏi có giải thích"}</small></span><span aria-hidden="true">↗</span></a></section>
<section id="workspace" aria-labelledby="table-title"><div class="workspace-heading"><div><div class="eyebrow">TRA CỨU & KHÁM PHÁ</div><h2 id="table-title">Bảng tuần hoàn nguyên tố</h2></div><span class="data-badge"><i></i> Nguyên tử khối · CIAAW 2024</span></div>
<div class="panel filter-panel"><div class="toolbar"><label class="search"><span class="sr-only">Tìm nguyên tố</span><input id="search" type="search" placeholder="Tên, ký hiệu hoặc số hiệu…" maxlength="100" autocomplete="off"></label><label><span class="sr-only">Phân nhóm</span><select id="category"><option value="">Tất cả phân nhóm</option>${options(Object.entries(categories).map(([key, [name]]) => [key, name]))}</select></label><button class="button" id="view"></button><button class="button" id="share">Chia sẻ ↗</button></div><details id="advanced-filters"><summary>Bộ lọc nâng cao <span>Chu kỳ, nhóm, khối & trạng thái</span></summary><div class="advanced-grid"><label>Chu kỳ<select id="period"><option value="">Tất cả chu kỳ</option>${options([1,2,3,4,5,6,7].map((n) => [n, n]))}</select></label><label>Nhóm<select id="group"><option value="">Tất cả nhóm</option>${options(Array.from({ length: 18 }, (_, i) => [i + 1, i + 1]))}</select></label><label>Khối electron<select id="block"><option value="">Tất cả khối</option>${options(["s","p","d","f"].map((s) => [s,s]))}</select></label><label>Trạng thái<select id="phase"><option value="">Tất cả trạng thái</option>${options([["solid","Rắn"],["liquid","Lỏng"],["gas","Khí"],["unknown","Chưa xác định"]])}</select></label></div></details></div>
<div class="results-meta"><span id="count" role="status"></span><label><input type="checkbox" id="favorites"> Chỉ yêu thích <span id="favorite-count"></span></label></div><div id="active-filters" class="active-filters"></div>
<div class="layout home-layout"><section class="panel periodic-panel" aria-label="Bảng nguyên tố"><div class="table-controls"><label>Hiển thị theo<select id="property">${options(Object.entries(properties).map(([key, [name, unit]]) => [key, `${name}${unit ? ` (${unit})` : ""}`]))}</select></label><label id="sort-label" hidden>Sắp xếp<select id="sort">${options([["z","Số hiệu tăng dần"],["name","Tên A–Z"],["mass","Nguyên tử khối tăng dần"],["electronegativity","Độ âm điện giảm dần"]])}</select></label><button class="text-button" id="random">Ngẫu nhiên ↝</button></div><div id="scale" class="property-scale"></div><p class="mobile-table-hint" id="table-hint">← Vuốt ngang để xem đủ 18 nhóm →</p><div id="no-results" hidden class="empty"><strong>Chưa tìm thấy nguyên tố phù hợp.</strong><p>Thử bỏ bớt điều kiện hoặc tìm bằng ký hiệu, ví dụ Cu.</p><button class="button" id="empty-reset">Xóa bộ lọc</button></div><div class="table-shell"><div id="grid" class="periodic-grid" aria-label="Bảng tuần hoàn 118 nguyên tố"></div></div><div class="legend" aria-label="Lọc theo phân nhóm">${Object.entries(categories).map(([key,[name,color]]) => `<button class="legend-filter" data-category="${key}" style="--color:${color}" aria-pressed="false"><i class="dot"></i>${name}</button>`).join("")}</div></section><aside class="panel detail" id="detail" aria-label="Chi tiết nguyên tố"></aside></div><div id="comparison"></div><div class="recent" id="recent"></div></section>
<section class="learning-banner"><div><div class="eyebrow">TỪ HIỂU ĐẾN VẬN DỤNG</div><h2>Một công thức. Nhiều cách khám phá.</h2><p>Tính toán lượng chất, tra bảng tính tan hay tìm lời giải cho phương trình tiếp theo.</p></div><a class="button primary" href="/tien-ich/">Mở bộ công cụ ↗</a></section>
<details class="data-notes"><summary>Về dữ liệu và cách đọc bảng tuần hoàn</summary><p>84 nguyên tố có nguyên tử khối chuẩn rút gọn theo <a href="${weights.source}" target="_blank" rel="noreferrer">CIAAW 2024</a>, tra cứu ngày ${weights.retrievedAt}. Độ không đảm bảo hiển thị trong hồ sơ nhanh; nguyên tử khối tương đối không có đơn vị. Các nguyên tố còn lại giữ giá trị tham khảo của bộ dữ liệu gốc, không phải nguyên tử khối chuẩn CIAAW.</p><p>Bản đồ tính chất kế thừa <a href="https://github.com/Bowserinator/Periodic-Table-JSON">Bowserinator & contributors</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>. Bán kính thực nghiệm (pm), năng lượng ion hóa thứ nhất (kJ/mol), nhiệt độ nóng chảy (°C). Xám biểu thị thiếu dữ liệu. Ứng dụng thực tế được tóm tắt từ Royal Society of Chemistry, có nguồn riêng ở từng nguyên tố.</p></details>`;

$("grid").closest(".table-shell").insertAdjacentHTML("afterend", '<div id="list-pagination" class="list-pagination" hidden></div>');
$("search").value = (params.get("q") ?? "").slice(0, 100);
for (const id of [...filters, "property", "sort"]) {
  if ([...$(id).options].some((o) => o.value === params.get(id))) $(id).value = params.get(id);
}
$("favorites").checked = params.get("favorites") === "1";
if (filters.slice(1).some((id) => $(id).value)) $("advanced-filters").open = true;

function filterState() {
  return { ...Object.fromEntries(filters.map((id) => [id, $(id).value])), q: $("search").value, favorites: $("favorites").checked, favoriteSymbols: favorites };
}
function syncURL() {
  const url = new URL(location.href), state = filterState();
  for (const id of ["q", ...filters, "property", "sort", "favorites", "view"]) url.searchParams.delete(id);
  for (const id of ["q", ...filters]) if (state[id]) url.searchParams.set(id, state[id]);
  if ($("property").value !== "category") url.searchParams.set("property", $("property").value);
  if ($("sort").value !== "z") url.searchParams.set("sort", $("sort").value);
  if (state.favorites) url.searchParams.set("favorites", "1");
  url.searchParams.set("view", list ? "list" : "table");
  url.searchParams.set("element", selected.symbol);
  history.replaceState(null, "", url);
}
function render() {
  const state = filterState(), property = $("property").value;
  const values = elements.map((e) => e[property]).filter(Number.isFinite), min = Math.min(...values), max = Math.max(...values);
  $("scale").innerHTML = property === "category" ? '<span>Chọn nguyên tố để xem hồ sơ · Bấm phân nhóm bên dưới để lọc</span>' : `<span>${properties[property][0]} (${properties[property][1]})</span><span class="gradient-scale"><i></i>${min} → ${max}<span> · Xám: chưa có dữ liệu</span></span>`;
  const filtered = sortElements(elements.filter((e) => matchesElement(e, state, elements)), $("sort").value);
  const visible = new Set(filtered.map((e) => e.symbol));
  const listed = list && matchMedia("(max-width: 600px)").matches ? filtered.slice(0, listLimit) : filtered;
  $("count").textContent = `${filtered.length} / 118 nguyên tố`;
  $("favorite-count").textContent = `(${favorites.length})`;
  $("view").textContent = list ? "▦ Bảng tuần hoàn" : "☷ Danh sách";
  $("view").setAttribute("aria-pressed", String(list));
  $("sort-label").hidden = !list;
  $("table-hint").hidden = list;
  $("no-results").hidden = filtered.length > 0;
  $("list-pagination").hidden = !list || listed.length >= filtered.length;
  $("list-pagination").innerHTML = `<span class="muted">Đang hiện ${listed.length}/${filtered.length} nguyên tố</span><button class="button" id="load-more-elements">Xem thêm ${Math.min(24, filtered.length - listed.length)} nguyên tố ↓</button>`;
  $("load-more-elements").onclick = () => { const previous = listed.length; listLimit += 24; render(); $("grid").querySelectorAll(".element")[previous]?.focus({ preventScroll: true }); };
  const active = [];
  if (state.q) active.push(["q", `Tìm: ${state.q}`]);
  for (const id of filters) if (state[id]) active.push([id, $(id).selectedOptions[0].textContent]);
  if (state.favorites) active.push(["favorites", "Yêu thích"]);
  $("active-filters").innerHTML = active.length ? active.map(([key, label]) => `<button class="filter-chip" data-remove="${key}" aria-label="Bỏ lọc ${escape(label)}">${escape(label)} <span aria-hidden="true">×</span></button>`).join("") + '<button class="text-button" id="reset-filters">Xóa tất cả</button>' : "";
  $("active-filters").querySelectorAll("[data-remove]").forEach((b) => b.onclick = () => {
    const id = b.dataset.remove;
    if (id === "favorites") $(id).checked = false;
    else $(id === "q" ? "search" : id).value = "";
    update();
  });
  if ($("reset-filters")) $("reset-filters").onclick = resetFilters;
  const grid = $("grid");
  grid.className = list ? "list-view" : "periodic-grid";
  let html = list ? "" : Array.from({ length: 18 }, (_, i) => `<span class="grid-label" style="grid-column:${i + 2};grid-row:1">${i + 1}</span>`).join("") + Array.from({ length: 7 }, (_, i) => `<span class="grid-label" style="grid-column:1;grid-row:${i + 2}">${i + 1}</span>`).join("");
  for (const e of list ? listed : elements) {
    const [category, color] = categories[e.category], value = e[property];
    const mapped = property === "category" ? color : Number.isFinite(value) ? `hsl(${190 - ((value - min) / (max - min || 1)) * 150} 65% 48%)` : "#94a3b8";
    html += `<button class="element ${visible.has(e.symbol) ? "" : "dim"}" data-symbol="${e.symbol}" ${visible.has(e.symbol) ? "" : "disabled"} aria-pressed="${selected.symbol === e.symbol}" aria-label="${e.z}, ${escape(e.name_vi)}, ${e.symbol}" title="${escape(e.name_vi)} · ${category}${property !== "category" ? ` · ${display(value)}` : ""}" style="--color:${mapped};${list ? "" : `grid-column:${e.xpos + 1};grid-row:${e.ypos + 1}`}"><span class="number">${e.z}${favorites.includes(e.symbol) ? ' <span aria-hidden="true">★</span>' : ""}</span><span class="symbol">${e.symbol}</span><span class="name">${escape(e.name_vi)}</span><span class="mass">${e.mass ?? "—"}</span></button>`;
  }
  if (!list) html += '<span class="series-label" style="grid-column:4;grid-row:7">57–71<br>↙</span><span class="series-label" style="grid-column:4;grid-row:8">89–103<br>↙</span><span class="series-label" style="grid-column:1/5;grid-row:10">57–71</span><span class="series-label" style="grid-column:1/5;grid-row:11">89–103</span>';
  grid.innerHTML = html;
  grid.querySelectorAll("[data-symbol]").forEach((b) => b.onclick = () => choose(b.dataset.symbol));
  document.querySelectorAll("[data-category]").forEach((b) => b.setAttribute("aria-pressed", String(state.category === b.dataset.category)));
  renderDetail();
  renderComparison();
}
function update() { render(); syncURL(); }
function resetFilters() {
  listLimit = 24;
  $("search").value = "";
  filters.forEach((id) => $(id).value = "");
  $("favorites").checked = false;
  update();
}
function choose(symbol, reveal = false) {
  const fromGrid = document.activeElement?.matches("#grid .element");
  selected = elements.find((e) => e.symbol === symbol) ?? selected;
  recent = [selected.symbol, ...recent.filter((s) => s !== selected.symbol)].slice(0, 12);
  write("recent-elements", recent);
  update();
  if (fromGrid) $("grid").querySelector(`[data-symbol="${selected.symbol}"]`)?.focus({ preventScroll: true });
  if (reveal || matchMedia("(max-width: 800px)").matches) $("detail").scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
}
function renderDetail() {
  const e = selected, insight = insights.elements[e.symbol], weight = weights.elements.find((w) => w.symbol === e.symbol);
  const phase = { solid: "Rắn", liquid: "Lỏng", gas: "Khí", unknown: "Chưa xác định" };
  const pairs = [["Số hiệu nguyên tử", e.z], [weight ? "Nguyên tử khối chuẩn" : "Nguyên tử khối tham khảo", weight?.text ?? e.mass], ["Nhóm / Chu kỳ", `${e.group ?? "—"} / ${e.period}`], ["Khối electron", e.block], ["Cấu hình electron", e.electronConfig], ["Độ âm điện (Pauling)", e.electronegativity], ["Trạng thái", e.stateNote || phase[e.phase_STP]], ["Số oxi hóa", e.oxidationText || e.oxidationStates.join(", ")]];
  $("detail").style.setProperty("--element-color", categories[e.category][1]);
  $("detail").innerHTML = `<div class="detail-heading"><span class="section-label">HỒ SƠ NGUYÊN TỐ</span><span class="detail-number">${String(e.z).padStart(3,"0")}</span></div><span class="badge">${categories[e.category][0]}</span><div class="element-identity"><div class="large-symbol">${e.symbol}</div><div><h2>${escape(e.name_vi)}</h2><span class="muted">${escape(e.name_en)}</span></div></div><div class="detail-quick-actions"><button class="button" id="favorite" aria-pressed="${favorites.includes(e.symbol)}">${favorites.includes(e.symbol) ? "★ Đã yêu thích" : "☆ Yêu thích"}</button><button class="button" id="compare" aria-pressed="${compare.includes(e.symbol)}">${compare.includes(e.symbol) ? "✓ Bỏ so sánh" : "+ So sánh"}</button></div><dl>${pairs.map(([label,value]) => `<div><dt>${label}</dt><dd>${escape(display(value))}</dd></div>`).join("")}</dl>${e.meltingPointNote ? `<p class="science-note">${escape(e.meltingPointNote)}</p>` : ""}${insight ? `<section class="element-applications"><h3>Gặp trong cuộc sống</h3><ul>${insight.applications.map((a) => `<li>${escape(a)}</li>`).join("")}</ul><a href="${insight.source}" target="_blank" rel="noreferrer">Nguồn: Royal Society of Chemistry ↗</a></section>` : ""}<div class="actions"><a class="button primary" href="/nguyen-to.html?element=${e.symbol}">Hồ sơ & mô hình nguyên tử ↗</a><a class="button" href="/tien-ich/cau-truc-3d/?element=${e.symbol}">Khám phá các chất liên quan ↗</a></div><details class="detail-sources"><summary>Nguồn dữ liệu</summary><p><a href="${e.sourceFile}">Dữ liệu gốc nguyên tố ↗</a>${weight ? `<br><a href="${weights.source}" target="_blank" rel="noreferrer">Nguyên tử khối: CIAAW 2024 ↗</a>` : "<br>Nguyên tố này không có nguyên tử khối chuẩn trong bảng CIAAW 2024."}</p><p>Nguyên tử khối tương đối không có đơn vị. ± biểu thị độ không đảm bảo của giá trị rút gọn.</p></details>`;
  if (e.meltingPointSource) $("detail").querySelector(".science-note")?.insertAdjacentHTML("beforeend", ` <a href="${escape(e.meltingPointSource)}" target="_blank" rel="noreferrer">Nguồn ↗</a>`);
  $("favorite").onclick = () => {
    favorites = favorites.includes(e.symbol) ? favorites.filter((s) => s !== e.symbol) : [...favorites, e.symbol];
    if (!write("favorite-elements", favorites)) toast("Không thể lưu yêu thích trên trình duyệt này.");
    render(); $("favorite").focus({ preventScroll: true });
  };
  $("compare").onclick = () => {
    if (compare.includes(e.symbol)) compare = compare.filter((s) => s !== e.symbol);
    else if (compare.length < 3) compare.push(e.symbol);
    else return toast("Bạn có thể so sánh tối đa 3 nguyên tố. Hãy bỏ một nguyên tố trước.");
    if (!write("compare-elements", compare)) toast("Không thể lưu danh sách so sánh trên trình duyệt này.");
    render(); $("compare").focus({ preventScroll: true });
  };
  $("recent").innerHTML = recent.length ? '<span class="muted">Vừa khám phá</span>' + recent.map((symbol) => `<button class="button" data-recent="${symbol}">${symbol}</button>`).join("") : "";
  $("recent").querySelectorAll("button").forEach((b) => b.onclick = () => choose(b.dataset.recent, true));
}
function renderComparison() {
  if (!compare.length) { $("comparison").innerHTML = ""; return; }
  const data = compare.map((s) => elements.find((e) => e.symbol === s));
  $("comparison").innerHTML = `<section class="panel compare"><div class="comparison-heading"><h2>So sánh nguyên tố <span class="badge">${compare.length}/3</span></h2><div class="viewer-toolbar"><button class="button" id="export-compare">Tải CSV ↓</button><button class="button" id="clear-compare">Xóa so sánh</button></div></div><table><caption class="sr-only">So sánh tính chất của ${data.map((e) => e.name_vi).join(", ")}</caption><thead><tr><th>Thuộc tính</th>${data.map((e) => `<th>${escape(e.name_vi)} · ${e.symbol} <button class="text-button" data-remove-compare="${e.symbol}" aria-label="Bỏ ${escape(e.name_vi)} khỏi so sánh">×</button></th>`).join("")}</tr></thead><tbody>${[["Số hiệu","z"],["Nguyên tử khối tham khảo","mass"],["Độ âm điện (Pauling)","electronegativity"],["Cấu hình electron","electronConfig"],["Nóng chảy (°C)","meltingPoint"],["Bán kính (pm)","atomicRadius"],["Ion hóa thứ nhất (kJ/mol)","ionizationEnergy"]].map(([name,key]) => `<tr><th>${name}</th>${data.map((e) => `<td>${escape(display(e[key]))}${key === "meltingPoint" && e.meltingPointNote ? `<small class="comparison-note">${escape(e.meltingPointNote)}</small>` : ""}</td>`).join("")}</tr>`).join("")}</tbody></table><p class="muted">Chọn nguyên tố rồi bấm “+ So sánh” để thêm. Danh sách được lưu trên trình duyệt này.</p></section>`;
  $("export-compare").onclick = () => download("chemdex-so-sanh.csv", comparisonCSV(data, weights), "text/csv;charset=utf-8");
  $("clear-compare").onclick = () => { compare = []; write("compare-elements", compare); render(); $("compare").focus({ preventScroll: true }); };
  $("comparison").querySelectorAll("[data-remove-compare]").forEach((b) => b.onclick = () => { compare = compare.filter((s) => s !== b.dataset.removeCompare); write("compare-elements", compare); render(); $("compare").focus({ preventScroll: true }); });
}
$("search").oninput = () => { listLimit = 24; update(); };
for (const id of [...filters, "property", "favorites", "sort"]) $(id).onchange = () => { listLimit = 24; update(); };
$("view").onclick = () => { list = !list; write("element-list-view", list); update(); };
$("empty-reset").onclick = resetFilters;
document.querySelectorAll("[data-category]").forEach((b) => b.onclick = () => { $("category").value = $("category").value === b.dataset.category ? "" : b.dataset.category; update(); });
$("hero-search").onclick = () => $("open-search").click();
$("spotlight").onclick = () => { resetFilters(); choose(featured.symbol, true); };
$("random").onclick = () => { const candidates = elements.filter((e) => matchesElement(e, filterState(), elements)); if (candidates.length) choose(candidates[Math.floor(Math.random() * candidates.length)].symbol, true); else toast("Hãy xóa bớt bộ lọc để khám phá nguyên tố."); };
$("share").onclick = async () => {
  syncURL();
  try { await navigator.clipboard.writeText(location.href); toast($("favorites").checked ? "Đã sao chép. Danh sách yêu thích chỉ lưu trên máy của bạn." : "Đã sao chép liên kết nguyên tố và bộ lọc."); }
  catch { toast("Bạn có thể sao chép liên kết hiện tại trên thanh địa chỉ."); }
};
render();
matchMedia("(max-width: 600px)").addEventListener("change", render);
