import { shell, escape, normalize, read, write, toast } from "./common.js";
import { tools } from "./catalog.js";
shell("tools");
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const categories = [...new Set(tools.map((t) => t.category))];
let category = categories.includes(params.get("category")) ? params.get("category") : "";
let favorites = [...new Set(read("favorite-tools", []))].filter((id) => tools.some((t) => t.id === id));
$("app").innerHTML = `<section class="tools-hero"><div><div class="eyebrow">BỘ CÔNG CỤ HỌC TẬP</div><h1>Ý tưởng trong đầu.<br><span>Công cụ trong tay.</span></h1><p>Từ một phương trình đến cả phòng thí nghiệm. Tìm đúng công cụ và dành thời gian cho điều bạn muốn hiểu.</p></div><div class="tools-total"><strong>${tools.length}</strong><span>CÔNG CỤ & KHÔNG GIAN HỌC</span></div></section><div class="toolbar panel tools-toolbar"><label class="search"><span class="sr-only">Tìm tiện ích</span><input id="tool-search" type="search" maxlength="100" placeholder="Tìm công cụ, ví dụ: pH, tính tan, phương trình…" autocomplete="off"></label><label><input type="checkbox" id="tool-favorites"> Chỉ yêu thích <span id="tool-favorite-count"></span></label></div><div class="tool-categories" aria-label="Lọc nhóm tiện ích">${["", ...categories].map((c) => `<button class="button" data-tool-category="${escape(c)}" aria-pressed="false">${escape(c || "Tất cả")}</button>`).join("")}</div><div class="results-meta"><span id="tool-count" role="status"></span><button class="text-button" id="tool-reset">Xóa bộ lọc</button></div><section class="tools-grid" id="tool-cards" aria-label="Danh sách tiện ích"></section><div class="learning-banner"><div><h2>Chưa biết bắt đầu từ đâu?</h2><p>Khám phá bảng tuần hoàn, chọn một nguyên tố rồi tìm hiểu các chất liên quan.</p></div><a class="button primary" href="/">Về bảng tuần hoàn ↗</a></div>`;
$("tool-search").value = (params.get("q") ?? "").slice(0, 100);
$("tool-favorites").checked = params.get("favorites") === "1";
function render() {
  const query = normalize($("tool-search").value), onlyFavorites = $("tool-favorites").checked;
  const filtered = tools.filter((t) => (!category || t.category === category) && (!onlyFavorites || favorites.includes(t.id)) &&
    query.split(/\s+/).every((word) => normalize([t.title, t.description, ...t.keywords].join(" ")).includes(word)))
    .sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)));
  $("tool-count").textContent = `${filtered.length} / ${tools.length} công cụ`;
  $("tool-favorite-count").textContent = `(${favorites.length})`;
  $("tool-reset").hidden = !query && !category && !onlyFavorites;
  document.querySelectorAll("[data-tool-category]").forEach((b) => b.setAttribute("aria-pressed", String(category === b.dataset.toolCategory)));
  $("tool-cards").innerHTML = filtered.length ? filtered.map((t) => `<article class="panel tool-card"><div class="card-top"><span class="tool-mark" aria-hidden="true">${t.mark}</span><button class="tool-star icon-button" data-favorite-tool="${t.id}" aria-label="${favorites.includes(t.id) ? "Bỏ yêu thích" : "Yêu thích"} ${escape(t.title)}" aria-pressed="${favorites.includes(t.id)}">${favorites.includes(t.id) ? "★" : "☆"}</button></div><a class="tool-main-link" href="${t.href}"><span class="tool-category-label">${escape(t.category)}</span><h2>${escape(t.title)}</h2><p>${escape(t.description)}</p><span class="tool-open">Mở công cụ <span aria-hidden="true">↗</span></span></a></article>`).join("") : '<div class="panel empty"><h2>Chưa có công cụ phù hợp</h2><p>Thử từ khóa khác hoặc bỏ bớt bộ lọc. Bấm ☆ trên công cụ để lưu vào yêu thích.</p><button class="button" id="tool-empty-reset">Xóa bộ lọc</button></div>';
  $("tool-cards").querySelectorAll("[data-favorite-tool]").forEach((b) => b.onclick = () => {
    const id = b.dataset.favoriteTool, wasFavorite = favorites.includes(id);
    favorites = wasFavorite ? favorites.filter((v) => v !== id) : [...favorites, id];
    if (!write("favorite-tools", favorites)) toast("Không thể lưu yêu thích trên trình duyệt này.");
    render();
    const next = $("tool-cards").querySelector(`[data-favorite-tool="${id}"]`);
    (next ?? $("tool-favorites")).focus({ preventScroll: true });
  });
  if ($("tool-empty-reset")) $("tool-empty-reset").onclick = reset;
}
function update() {
  render();
  const url = new URL(location.href);
  for (const key of ["q", "category", "favorites"]) url.searchParams.delete(key);
  if ($("tool-search").value) url.searchParams.set("q", $("tool-search").value);
  if (category) url.searchParams.set("category", category);
  if ($("tool-favorites").checked) url.searchParams.set("favorites", "1");
  history.replaceState(null, "", url);
}
function reset() { category = ""; $("tool-search").value = ""; $("tool-favorites").checked = false; update(); }
$("tool-search").oninput = update;
$("tool-favorites").onchange = update;
$("tool-reset").onclick = reset;
document.querySelectorAll("[data-tool-category]").forEach((b) => b.onclick = () => { category = b.dataset.toolCategory; update(); });
render();
