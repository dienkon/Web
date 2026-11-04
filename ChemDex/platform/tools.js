import { shell, escape, normalize, read, write, toast } from "./common.js";
import { tools } from "./catalog.js";
import { balanceEquation } from "../shared/chemistry/formula.mjs";
import { icon } from "./sidebar.js";
shell("tools");
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const categories = [...new Set(tools.map((t) => t.category))];
let category = [...categories,...["Phương trình & Phản ứng","Bảng tra cứu","Tính toán nhanh","Mô hình 3D","Thực hành & Ôn tập"]].includes(params.get("category")) ? params.get("category") : "";
let favorites = [...new Set(read("favorite-tools", []))].filter((id) => tools.some((t) => t.id === id));
const groups = ['Phương trình & Phản ứng', 'Bảng tra cứu', 'Tính toán nhanh', 'Mô hình 3D'];
const toolGroup = (t) => t.id === 'structures' || t.id === 'lab3d' ? groups[3] : t.category === 'Phương trình' ? groups[0] : t.category === 'Tra cứu Lý thuyết' ? groups[1] : t.category === 'Khám phá & Thực hành' ? 'Thực hành & Ôn tập' : groups[2];
const priority = ['tinh-tan','day-dien-hoa','structures','chuyen-doi-luong-chat','mau-sac-nhan-biet','tinh-ph'];
$("app").innerHTML = `<section class="tools-heading"><span class="eyebrow">KHÁM PHÁ · TÍNH TOÁN · THỰC HÀNH</span><h1>Tiện Ích Học Tập Hóa Học</h1><p>Mọi công cụ cần thiết, trong một không gian.</p></section><div class="toolbar panel tools-toolbar"><label class="search">${icon('search')}<span class="sr-only">Tìm tiện ích</span><input id="tool-search" type="search" maxlength="100" placeholder="Tìm nhanh công cụ: Cân bằng PTHH, Bảng tính tan, Dãy điện hóa, Tính mol…" autocomplete="off"></label></div><div class="tool-categories" aria-label="Lọc nhóm tiện ích"><button class="button" data-tool-category="" aria-pressed="true">Tất cả (${tools.length})</button><label class="button favorite-filter"><input type="checkbox" id="tool-favorites"> ★ Đã ghim <span id="tool-favorite-count"></span></label>${[...groups,'Thực hành & Ôn tập'].map(c=>`<button class="button" data-tool-category="${escape(c)}" aria-pressed="false">${c}</button>`).join('')}</div><section class="quick-tools" aria-label="Công cụ nhanh"><form class="panel quick-tool" id="balance-form"><div class="quick-tool-icon">${icon('flask')}</div><h2>Cân Bằng Phương Trình Hóa Học</h2><label><span class="sr-only">Phương trình cần cân bằng</span><input id="balance-input" placeholder="Fe + HNO3 → Fe(NO3)3 + NO + H2O" value="Fe + HNO3 → Fe(NO3)3 + NO + H2O" maxlength="300" required></label><div class="quick-tool-actions"><button class="button primary" type="submit">Cân bằng ngay</button><a href="/tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh/">Nhận diện từ ảnh ↗</a></div><output id="balance-result" aria-live="polite"></output></form><form class="panel quick-tool" id="chain-form"><div class="quick-tool-icon">${icon('atom')}</div><h2>Giải Chuỗi Phản Ứng Thông Minh</h2><label><span class="sr-only">Chuỗi phản ứng</span><input id="chain-input" placeholder="Fe → FeCl3 → Fe(OH)3 → Fe2O3" value="Fe → FeCl3 → Fe(OH)3 → Fe2O3" maxlength="300" required></label><div class="quick-tool-actions"><span>Khám phá từng bước chuyển hóa</span><button class="button" type="submit">Giải ngay →</button></div></form></section><div class="results-meta"><span id="tool-count" role="status"></span><button class="text-button" id="tool-reset">Xóa bộ lọc</button></div><section class="tools-grid" id="tool-cards" aria-label="Danh sách tiện ích"></section>`;
$('balance-form').onsubmit = (event) => {
 event.preventDefault();
 try {
  const sides = $('balance-input').value.trim().split(/→|->|=|⇌/);
  if (sides.length !== 2) throw new Error('Nhập hai vế, ngăn bằng → hoặc =.');
  const parse = side => side.split('+').map(v=>v.trim().replace(/^\d+\s*/,''));
  const result = balanceEquation(parse(sides[0]), parse(sides[1]));
  const show = rows => rows.map(r=>(r.coefficient===1?'':r.coefficient)+r.formula).join(' + ');
  $('balance-result').textContent = show(result.reactants)+' → '+show(result.products);
 } catch { $('balance-result').textContent = 'Chưa cân bằng được. Kiểm tra công thức và chất ở hai vế; dùng công cụ đầy đủ để phân tích thêm.'; }
};
$('chain-form').onsubmit = (event) => { event.preventDefault(); location.href='/tien-ich/phuong-trinh/chuoi-phan-ung/?q='+encodeURIComponent($('chain-input').value); };
$("tool-search").value = (params.get("q") ?? "").slice(0, 100);
$("tool-favorites").checked = params.get("favorites") === "1";
function render() {
  const query = normalize($("tool-search").value), onlyFavorites = $("tool-favorites").checked;
  const filtered = tools.filter((t) => (!category || (t.category === category || toolGroup(t) === category)) && (!onlyFavorites || favorites.includes(t.id)) &&
    query.split(/\s+/).every((word) => normalize([t.title, t.description, ...t.keywords].join(" ")).includes(word)))
    .sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)) || (priority.includes(a.id) ? priority.indexOf(a.id) : 99) - (priority.includes(b.id) ? priority.indexOf(b.id) : 99));
  $("tool-count").textContent = `${filtered.length} / ${tools.length} công cụ`;
  $("tool-favorite-count").textContent = `(${favorites.length})`;
  $("tool-reset").hidden = !query && !category && !onlyFavorites;
  document.querySelectorAll("[data-tool-category]").forEach((b) => b.setAttribute("aria-pressed", String(category === b.dataset.toolCategory)));
  $("tool-cards").innerHTML = filtered.length ? filtered.map((t) => `<article class="panel tool-card" data-tool-group="${escape(toolGroup(t))}"><span class="tool-mark" aria-hidden="true">${t.mark}</span><button class="tool-star icon-button" data-favorite-tool="${t.id}" aria-label="${favorites.includes(t.id) ? "Bỏ yêu thích" : "Yêu thích"} ${escape(t.title)}" aria-pressed="${favorites.includes(t.id)}">${favorites.includes(t.id) ? "★" : "☆"}</button><a class="tool-main-link" href="${t.href}"><h2>${escape(t.title)}</h2><p>${escape(t.description)}</p><span class="tool-open">Mở công cụ <span aria-hidden="true">→</span></span></a></article>`).join("") : '<div class="panel empty"><h2>Chưa có công cụ phù hợp</h2><p>Thử từ khóa khác hoặc bỏ bớt bộ lọc. Bấm ☆ trên công cụ để lưu vào yêu thích.</p><button class="button" id="tool-empty-reset">Xóa bộ lọc</button></div>';
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
