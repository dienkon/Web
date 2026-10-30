import { escape, focusDialog } from "./common.js";
import { searchRecords } from "./search-index.js";

let dialog;
export function openSearch(opener) {
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "quick-search";
    dialog.setAttribute("aria-labelledby", "quick-search-title");
    dialog.innerHTML = `<div class="card-top"><h2 id="quick-search-title">Bạn muốn khám phá gì?</h2><button class="icon-button" data-close aria-label="Đóng tìm kiếm">×</button></div><label class="search"><span class="sr-only">Tìm kiếm toàn web</span><input type="search" placeholder="Nguyên tố, số hiệu, công cụ…" maxlength="100" autocomplete="off"></label><p class="muted" id="quick-search-status" role="status"></p><div id="quick-search-results"></div><div class="search-hint"><span>↑ ↓ Di chuyển · Enter Mở</span><span>Esc Đóng</span></div>`;
    document.body.append(dialog);
    const input = dialog.querySelector("input");
    const render = () => {
      const results = searchRecords(input.value);
      dialog.querySelector("#quick-search-status").textContent = input.value.trim() ? `${results.length} kết quả phù hợp` : "Gợi ý để bắt đầu";
      dialog.querySelector("#quick-search-results").innerHTML = results.length ? results.map((r) => `<a class="search-result" href="${r.href}"><span class="result-mark">${escape(r.mark)}</span><span><strong>${escape(r.title)}</strong><small>${escape(r.detail)}</small></span><span class="result-kind">${r.kind} ↗</span></a>`).join("") : '<p class="empty">Chưa tìm thấy. Thử ký hiệu nguyên tố hoặc tên công cụ, ví dụ Cu, 29, tính pH.</p>';
    };
    input.addEventListener("input", render);
    dialog.querySelector("[data-close]").onclick = () => dialog.close();
    dialog.addEventListener("click", (event) => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") { event.preventDefault(); dialog.close(); return; }
      const links = [...dialog.querySelectorAll(".search-result")], index = links.indexOf(document.activeElement);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (event.key === "ArrowUp" && index <= 0) input.focus();
        else links[Math.min(links.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))]?.focus();
      } else if (event.key === "Enter" && event.target === input && links.length) { event.preventDefault(); links[0].click(); }
    });
    dialog.renderResults = render;
  }
  if (dialog.open) return;
  dialog.querySelector("input").value = "";
  dialog.renderResults();
  focusDialog(dialog, opener);
  dialog.querySelector("input").focus();
}
