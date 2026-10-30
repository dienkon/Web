export const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("đ", "d")
    .replaceAll("Đ", "D")
    .toLowerCase()
    .trim();
export const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const display = (value) =>
  value === null || value === undefined || value === ""
    ? "Chưa có dữ liệu"
    : String(value);
export function read(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(`chemdex:${key}`));
    if (
      value === null ||
      typeof value !== typeof fallback ||
      (Array.isArray(fallback) && !Array.isArray(value))
    )
      return fallback;
    return Array.isArray(fallback)
      ? value.filter((item) => typeof item === "string")
      : value;
  } catch {
    return fallback;
  }
}
export function write(key, value) {
  try {
    localStorage.setItem(`chemdex:${key}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function download(name, data, type = "application/json") {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: name,
  });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("chemdex-platform", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("sessions", { keyPath: "id" });
      request.result.createObjectStore("structures");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function storage(store, method, ...args) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(
        store,
        method === "get" || method === "getAll" ? "readonly" : "readwrite",
      );
      const request = transaction.objectStore(store)[method](...args);
      let value;
      request.onsuccess = () => (value = request.result);
      transaction.oncomplete = () => resolve(value);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Storage aborted"));
    });
  } finally {
    db.close();
  }
}
export function toast(message) {
  let el = document.querySelector("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.setAttribute("role", "status");
    document.body.append(el);
  }
  el.textContent = message;
  el.classList.add("visible");
  setTimeout(() => el.classList.remove("visible"), 4000);
}
export function shell(active) {
  const theme = read("theme", "light");
  document.documentElement.dataset.theme = theme;
  document.querySelector("#site-header").innerHTML =
    `<a class="brand" href="/" aria-label="ChemDex trang chủ"><span class="brand-mark">⌬</span>ChemDex<span class="brand-tag">CHEMISTRY, CONNECTED</span></a><nav aria-label="Điều hướng chính">${[
      ["/", "Nguyên tố", "elements"],
      ["/tien-ich/cau-truc-3d/", "Cấu trúc 3D", "structures"],
      ["/lab-2d/", "Lab 2D", "lab"],
      ["/lab-3d/", "Lab 3D", "lab3d"],
      ["/on-tap/", "Ôn tập", "study"],
      ["/tien-ich/", "Tiện ích", "tools"],
    ]
      .map(
        ([href, label, key]) =>
          `<a href="${href}" ${key === active ? 'aria-current="page"' : ""}>${label}</a>`,
      )
      .join(
        "",
      )}</nav><button id="open-search" class="button global-search" aria-label="Tìm kiếm nhanh toàn web" title="Tìm kiếm nhanh (Ctrl+K)"><span aria-hidden="true">⌕</span><span>Tìm nhanh</span><kbd>Ctrl K</kbd></button><button id="theme" class="icon-button" aria-label="Đổi chế độ sáng tối" title="Đổi chế độ sáng tối" aria-pressed="${theme === "dark"}">◐</button>`;
  const openSearch = async (event) => {
    const opener = event?.currentTarget instanceof HTMLElement ? event.currentTarget : document.activeElement;
    try { (await import("./search.js")).openSearch(opener); }
    catch { toast("Chưa tải được tìm kiếm. Vui lòng thử lại."); }
  };
  document.querySelector("#open-search").onclick = openSearch;
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openSearch();
    }
  });
  document.querySelector("#theme").onclick = () => {
    const value =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = value;
    document.querySelector("#theme").setAttribute("aria-pressed", String(value === "dark"));
    write("theme", value);
  };
}
export function focusDialog(dialog, previous = document.activeElement) {
  dialog.showModal();
  const handler = (event) => {
    if (event.key !== "Tab") return;
    const items = [
      ...dialog.querySelectorAll(
        'button,a[href],input,select,textarea,[tabindex="0"]',
      ),
    ].filter((e) => !e.disabled && e.getClientRects().length);
    const first = items[0],
      last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  dialog.addEventListener("keydown", handler);
  dialog.addEventListener(
    "close",
    () => {
      dialog.removeEventListener("keydown", handler);
      previous?.focus();
    },
    { once: true },
  );
}
