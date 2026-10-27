import elements from "../shared/elements.json";
import {
  shell,
  escape,
  normalize,
  display,
  read,
  write,
  toast,
} from "./common.js";
export const categories = {
  alkali: ["Kim loại kiềm", "#d16a62"],
  alkaline_earth: ["Kiềm thổ", "#ce983b"],
  transition_metal: ["Chuyển tiếp", "#c4a144"],
  post_transition: ["Kim loại khác", "#54a58a"],
  metalloid: ["Á kim", "#4b9c9c"],
  reactive_nonmetal: ["Phi kim", "#448fc0"],
  halogen: ["Halogen", "#9b7aca"],
  noble_gas: ["Khí hiếm", "#b685b9"],
  lanthanide: ["Lanthanide", "#cc8b6a"],
  actinide: ["Actinide", "#c77f99"],
};
shell("elements");
let selected =
  elements.find(
    (e) => e.symbol === new URLSearchParams(location.search).get("element"),
  ) ?? elements[0];
let favorites = read("favorite-elements", []),
  recent = read("recent-elements", []),
  compare = [],
  query = "",
  list = false;
document.querySelector("#app").innerHTML =
  `<section class="hero"><div><div class="eyebrow">Khám phá nền tảng của vật chất</div><h1>Một bảng tuần hoàn.<br>Vô vàn điều để khám phá.</h1><p>118 nguyên tố, những tính chất độc đáo và các mối liên hệ làm nên thế giới quanh ta.</p></div><div class="hero-stat"><strong>118</strong><span>NGUYÊN TỐ HÓA HỌC</span></div><div class="hero-stat"><strong>18 / 7</strong><span>NHÓM / CHU KỲ</span></div></section><div class="toolbar panel"><label class="search"><span class="sr-only">Tìm nguyên tố</span><input id="search" type="search" placeholder="Tên nguyên tố, ký hiệu hoặc số hiệu…" autocomplete="off"></label><label><span class="sr-only">Phân nhóm</span><select id="category"><option value="">Tất cả phân nhóm</option>${Object.entries(
    categories,
  )
    .map(([key, [name]]) => `<option value="${key}">${name}</option>`)
    .join(
      "",
    )}</select></label><label><span class="sr-only">Chu kỳ</span><select id="period"><option value="">Chu kỳ</option>${[1, 2, 3, 4, 5, 6, 7].map((n) => `<option>${n}</option>`).join("")}</select></label><label><span class="sr-only">Nhóm</span><select id="group"><option value="">Nhóm</option>${Array.from({ length: 18 }, (_, i) => `<option>${i + 1}</option>`).join("")}</select></label><label><span class="sr-only">Khối electron</span><select id="block"><option value="">Khối</option>${["s", "p", "d", "f"].map((s) => `<option>${s}</option>`).join("")}</select></label><label><span class="sr-only">Trạng thái</span><select id="phase"><option value="">Trạng thái</option><option value="solid">Rắn</option><option value="liquid">Lỏng</option><option value="gas">Khí</option><option value="unknown">Chưa xác định</option></select></label><button class="button" id="view">☷ Danh sách</button></div><div class="results-meta"><span id="count" role="status"></span><label><input type="checkbox" id="favorites"> Chỉ yêu thích</label></div><div class="layout"><section class="panel"><div class="toolbar" style="margin:0;border-bottom:1px solid var(--line)"><span class="section-label" style="margin:0">HIỂN THỊ THEO</span><label><span class="sr-only">Bản đồ tính chất</span><select id="property"><option value="category">Phân nhóm nguyên tố</option><option value="electronegativity">Độ âm điện</option><option value="atomicRadius">Bán kính nguyên tử (pm)</option><option value="ionizationEnergy">Năng lượng ion hóa (kJ/mol)</option><option value="meltingPoint">Nhiệt độ nóng chảy (°C)</option></select></label><span class="muted" id="scale">Màu sắc biểu thị phân nhóm</span></div><div class="table-shell"><div id="grid" class="periodic-grid" aria-label="Bảng tuần hoàn 118 nguyên tố"></div></div><div class="legend">${Object.entries(
    categories,
  )
    .map(
      ([key, [name, color]]) =>
        `<span style="--color:${color}"><i class="dot"></i>${name}</span>`,
    )
    .join(
      "",
    )}</div></section><aside class="panel detail" id="detail" aria-label="Chi tiết nguyên tố"></aside></div><div id="comparison"></div><section class="panel bottom-strip"><div><h2>Từ nguyên tố đến phân tử.</h2><p>Khám phá cách các nguyên tử kết nối, đo góc liên kết và quan sát cấu trúc trong không gian.</p></div><a class="button primary" href="/tien-ich/cau-truc-3d/">Khám phá cấu trúc 3D ↗</a></section><div class="recent" id="recent"></div>`;
const $ = (id) => document.getElementById(id);
function matches(e) {
  return (
    (!query ||
      [e.name_vi, e.name_en, e.symbol, String(e.z)].some((v) =>
        normalize(v).includes(query),
      )) &&
    (!$("category").value || e.category === $("category").value) &&
    (!$("period").value || e.period === Number($("period").value)) &&
    (!$("group").value || e.group === Number($("group").value)) &&
    (!$("block").value || e.block === $("block").value) &&
    (!$("phase").value || e.phase_STP === $("phase").value) &&
    (!$("favorites").checked || favorites.includes(e.symbol))
  );
}
function render() {
  const property = $("property").value,
    values = elements
      .map((e) => e[property])
      .filter((v) => typeof v === "number"),
    min = Math.min(...values),
    max = Math.max(...values);
  $("scale").textContent =
    property === "category"
      ? "Màu sắc biểu thị phân nhóm"
      : values.length
        ? `${min} → ${max} · Xám: chưa có dữ liệu`
        : "Chưa có dữ liệu cho thuộc tính này";
  const filtered = elements.filter(matches);
  $("count").textContent =
    `${filtered.length} / 118 nguyên tố · Chọn một ô để khám phá`;
  const grid = $("grid");
  grid.className = list ? "list-view" : "periodic-grid";
  let html = list
    ? ""
    : Array.from(
        { length: 18 },
        (_, i) =>
          `<span class="grid-label" style="grid-column:${i + 2};grid-row:1">${i + 1}</span>`,
      ).join("") +
      Array.from(
        { length: 7 },
        (_, i) =>
          `<span class="grid-label" style="grid-column:1;grid-row:${i + 2}">${i + 1}</span>`,
      ).join("");
  for (const e of list ? filtered : elements) {
    const [category, color] = categories[e.category];
    const value = e[property];
    const mapped =
      property === "category"
        ? color
        : typeof value === "number"
          ? `hsl(${190 - ((value - min) / (max - min || 1)) * 150} 65% 48%)`
          : "#94a3b8";
    html += `<button class="element ${matches(e) ? "" : "dim"}" data-symbol="${e.symbol}" aria-pressed="${selected.symbol === e.symbol}" aria-label="${e.z}, ${escape(e.name_vi)}, ${e.symbol}" title="${escape(e.name_vi)} · ${category}${property !== "category" ? ` · ${display(value)}` : ""}" style="--color:${mapped};${list ? "" : `grid-column:${e.xpos + 1};grid-row:${e.ypos + 1}`}"><span class="number">${e.z}</span><span class="symbol">${e.symbol}</span><span class="name">${escape(e.name_vi)}</span><span class="mass">${e.mass ?? "—"}</span></button>`;
  }
  if (!list)
    html +=
      '<span class="series-label" style="grid-column:4;grid-row:7">57–71<br>↙</span><span class="series-label" style="grid-column:4;grid-row:8">89–103<br>↙</span><span class="series-label" style="grid-column:1/5;grid-row:10">57–71</span><span class="series-label" style="grid-column:1/5;grid-row:11">89–103</span>';
  grid.innerHTML =
    html || '<p class="empty">Không tìm thấy nguyên tố phù hợp.</p>';
  grid
    .querySelectorAll("[data-symbol]")
    .forEach((b) => (b.onclick = () => choose(b.dataset.symbol)));
  renderDetail();
  renderComparison();
}
function choose(symbol) {
  selected = elements.find((e) => e.symbol === symbol) ?? selected;
  recent = [symbol, ...recent.filter((s) => s !== symbol)].slice(0, 12);
  write("recent-elements", recent);
  const url = new URL(location.href);
  url.searchParams.set("element", selected.symbol);
  history.replaceState(null, "", url);
  render();
}
function renderDetail() {
  const e = selected;
  const phase = {
    solid: "Rắn",
    liquid: "Lỏng",
    gas: "Khí",
    unknown: "Chưa xác định",
  };
  const pairs = [
    ["Số hiệu nguyên tử", e.z],
    ["Nguyên tử khối", e.mass],
    ["Nhóm / Chu kỳ", `${e.group ?? "—"} / ${e.period}`],
    ["Khối electron", e.block],
    ["Cấu hình electron", e.electronConfig],
    ["Độ âm điện", e.electronegativity],
    ["Trạng thái", e.stateNote || phase[e.phase_STP]],
    ["Số oxi hóa", e.oxidationText || e.oxidationStates.join(", ")],
  ];
  $("detail").innerHTML =
    `<div class="section-label">NGUYÊN TỐ ĐANG KHÁM PHÁ</div><span class="badge">${categories[e.category][0]}</span><div class="large-symbol">${e.symbol}</div><h2>${escape(e.name_vi)}</h2><div class="muted">${escape(e.name_en)}</div><dl>${pairs.map(([label, value]) => `<div><dt>${label}</dt><dd>${escape(display(value))}</dd></div>`).join("")}</dl><div class="actions"><button class="button" id="favorite">${favorites.includes(e.symbol) ? "★ Đã yêu thích" : "☆ Yêu thích"}</button><button class="button" id="compare">${compare.includes(e.symbol) ? "✓ Bỏ so sánh" : "+ So sánh"}</button><a class="button primary" href="/nguyen-to.html?element=${e.symbol}">Hồ sơ & mô hình nguyên tử ↗</a><a class="button" href="/tien-ich/cau-truc-3d/?element=${e.symbol}">Các chất liên quan ↗</a></div><p class="muted" style="font-size:10px">Mô hình nguyên tử mô tả cấu tạo nguyên tử. Cấu trúc phân tử và mạng tinh thể được xem riêng trong tiện ích 3D.</p><a class="muted" href="${e.sourceFile}">Nguồn dữ liệu nguyên tố ↗</a><p class="muted" style="font-size:10px">Bản đồ tính chất: <a href="https://github.com/Bowserinator/Periodic-Table-JSON">Bowserinator & contributors</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/">CC BY-SA 3.0</a>. Bán kính thực nghiệm; năng lượng ion hóa thứ nhất.</p>`;
  $("favorite").onclick = () => {
    favorites = favorites.includes(e.symbol)
      ? favorites.filter((s) => s !== e.symbol)
      : [...favorites, e.symbol];
    if (!write("favorite-elements", favorites))
      toast("Không thể lưu yêu thích: bộ nhớ trình duyệt không khả dụng.");
    render();
  };
  $("compare").onclick = () => {
    if (compare.includes(e.symbol))
      compare = compare.filter((s) => s !== e.symbol);
    else if (compare.length < 3) compare.push(e.symbol);
    else return toast("Bạn có thể so sánh tối đa 3 nguyên tố.");
    render();
  };
  $("recent").innerHTML = recent.length
    ? '<span class="muted">Vừa xem</span>' +
      recent
        .map(
          (symbol) =>
            `<button class="button" data-recent="${symbol}">${symbol}</button>`,
        )
        .join("")
    : "";
  $("recent")
    .querySelectorAll("button")
    .forEach((b) => (b.onclick = () => choose(b.dataset.recent)));
}
function renderComparison() {
  if (!compare.length) {
    $("comparison").innerHTML = "";
    return;
  }
  const data = compare.map((s) => elements.find((e) => e.symbol === s));
  $("comparison").innerHTML =
    `<section class="panel compare"><table><caption>So sánh nguyên tố (${compare.length}/3)</caption><thead><tr><th>Thuộc tính</th>${data.map((e) => `<th>${escape(e.name_vi)} · ${e.symbol}</th>`).join("")}</tr></thead><tbody>${[
      ["Số hiệu", "z"],
      ["Nguyên tử khối", "mass"],
      ["Độ âm điện", "electronegativity"],
      ["Cấu hình electron", "electronConfig"],
      ["Nóng chảy (°C)", "meltingPoint"],
      ["Bán kính (pm)", "atomicRadius"],
      ["Ion hóa (kJ/mol)", "ionizationEnergy"],
    ]
      .map(
        ([name, key]) =>
          `<tr><th>${name}</th>${data.map((e) => `<td>${escape(display(e[key]))}</td>`).join("")}</tr>`,
      )
      .join(
        "",
      )}</tbody></table><button class="button" id="clear-compare">Xóa so sánh</button></section>`;
  $("clear-compare").onclick = () => {
    compare = [];
    renderComparison();
  };
}
$("search").oninput = (e) => {
  query = normalize(e.target.value);
  render();
};
for (const id of [
  "category",
  "period",
  "group",
  "block",
  "phase",
  "property",
  "favorites",
])
  $(id).onchange = render;
$("view").onclick = () => {
  list = !list;
  $("view").textContent = list ? "▦ Bảng tuần hoàn" : "☷ Danh sách";
  render();
};
render();
