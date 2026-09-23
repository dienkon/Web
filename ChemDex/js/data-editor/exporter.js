/**
 * ChemDex Data Editor - Exporter & Importer Module
 */
import { state } from "./state.js";
import { ensureElementData } from "./firebase.js";
import { showToast } from "./utils.js";

function pad3(num) {
  return String(num).padStart(3, "0");
}

function getElementFileName(number, symbol) {
  return `${pad3(number)}_${symbol}.json`;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Loads JSZip library dynamically if not present
 */
async function ensureJSZip() {
  if (window.JSZip) return window.JSZip;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    script.onload = () => resolve(window.JSZip);
    script.onerror = () => reject(new Error("Không thể tải thư viện JSZip từ CDN"));
    document.head.appendChild(script);
  });
}

/**
 * Generates the updated manifest.json based on current state
 */
export function generateManifestJson() {
  const manifest = state.elements.map((el) => {
    const sym = el.symbol.toUpperCase();
    const working = state.getWorkingCopy(sym);
    const hasData = working ? (working.hasData !== false) : el.hasData;

    return {
      number: el.number,
      symbol: el.symbol,
      nameVi: working?.nameVi || el.nameVi || "",
      nameEn: working?.nameEn || working?.general?.englishName || el.nameEn || "",
      category: working?.category || el.category || "unknown",
      hasData: Boolean(hasData),
      file: `elements/${getElementFileName(el.number, el.symbol)}`,
    };
  });

  return JSON.stringify(manifest, null, 2);
}

/**
 * Exports currently selected element as a single JSON file (e.g. 001_H.json)
 */
export async function exportSelectedElement(symbol) {
  if (!symbol) {
    showToast("Vui lòng chọn một nguyên tố để xuất", "warning");
    return;
  }

  const data = await ensureElementData(symbol);
  const meta = state.getElementMeta(symbol);
  if (!data || !meta) {
    showToast(`Không có dữ liệu cho ${symbol}`, "error");
    return;
  }

  const filename = getElementFileName(meta.number, meta.symbol);
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });

  triggerDownload(blob, filename);
  showToast(`Đã xuất file ${filename}`, "success");
}

/**
 * Exports only dirty elements
 */
export async function exportDirtyElements() {
  const dirtyList = state.getDirtyList();
  if (dirtyList.length === 0) {
    showToast("Không có nguyên tố nào bị thay đổi để xuất", "info");
    return;
  }

  showToast(`Đang đóng gói ${dirtyList.length} nguyên tố đã thay đổi...`, "info");
  const JSZip = await ensureJSZip();
  const zip = new JSZip();

  for (const sym of dirtyList) {
    const meta = state.getElementMeta(sym);
    const data = state.getWorkingCopy(sym);
    if (meta && data) {
      const filename = getElementFileName(meta.number, meta.symbol);
      zip.file(filename, JSON.stringify(data, null, 2));
    }
  }

  const content = await zip.generateAsync({ type: "blob" });
  triggerDownload(content, "ChemDex-changed-elements.zip");
  showToast(`Đã xuất ${dirtyList.length} nguyên tố đã chỉnh sửa`, "success");
}

/**
 * Exports all 118 elements and manifest.json
 * Uses File System Access API if supported; otherwise JSZip.
 */
export async function exportAllData() {
  showToast("Đang chuẩn bị dữ liệu xuất cho toàn bộ 118 nguyên tố...", "info");

  // Gather all element JSONs
  const elementFiles = [];
  for (const el of state.elements) {
    const sym = el.symbol.toUpperCase();
    const data = await ensureElementData(sym);
    if (data) {
      const filename = getElementFileName(el.number, el.symbol);
      elementFiles.push({
        filename,
        content: JSON.stringify(data, null, 2),
      });
    }
  }

  const manifestContent = generateManifestJson();

  // Try File System Access API
  if (window.showDirectoryPicker) {
    try {
      showToast("Vui lòng chọn thư mục đích (ví dụ thư mục dự án hoặc data)...", "info");
      const dirHandle = await window.showDirectoryPicker({
        mode: "readwrite",
      });

      // Write data/manifest.json and data/elements/*.json
      let dataDir = dirHandle;
      if (dirHandle.name !== "data") {
        dataDir = await dirHandle.getDirectoryHandle("data", { create: true });
      }

      // Write manifest.json
      const manifestFileHandle = await dataDir.getFileHandle("manifest.json", { create: true });
      const writableManifest = await manifestFileHandle.createWritable();
      await writableManifest.write(manifestContent);
      await writableManifest.close();

      // Write elements directory
      const elementsDir = await dataDir.getDirectoryHandle("elements", { create: true });
      for (const item of elementFiles) {
        const fileHandle = await elementsDir.getFileHandle(item.filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(item.content);
        await writable.close();
      }

      showToast(`Đã xuất thành công toàn bộ dữ liệu vào thư mục ${dirHandle.name}/`, "success");
      return;
    } catch (err) {
      if (err.name === "AbortError") {
        showToast("Đã hủy chọn thư mục", "info");
        return;
      }
      console.warn("showDirectoryPicker failed, falling back to ZIP:", err);
      showToast("Chuyển sang phương thức tải file nén ZIP...", "info");
    }
  }

  // Fallback to JSZip
  try {
    const JSZip = await ensureJSZip();
    const zip = new JSZip();

    // Folder structure: data/manifest.json & data/elements/*.json
    const dataFolder = zip.folder("data");
    dataFolder.file("manifest.json", manifestContent);

    const elementsFolder = dataFolder.folder("elements");
    for (const item of elementFiles) {
      elementsFolder.file(item.filename, item.content);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    triggerDownload(zipBlob, "ChemDex-data-export.zip");
    showToast("Đã tải về ChemDex-data-export.zip thành công!", "success");
  } catch (err) {
    console.error("ZIP export failed:", err);
    showToast("Lỗi khi xuất dữ liệu: " + err.message, "error");
  }
}

/**
 * Imports a JSON file for the active or detected element
 */
export function importJsonFile(file, onLoaded) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("File không chứa đối tượng JSON hợp lệ.");
      }

      const sym = (parsed.symbol || "").toUpperCase();
      if (!sym) {
        throw new Error("JSON thiếu trường 'symbol'.");
      }

      state.setWorkingCopyDirect(sym, parsed);
      state.selectElement(sym);
      showToast(`Đã nhập dữ liệu cho ${sym}`, "success");
      if (onLoaded) onLoaded(sym);
    } catch (err) {
      console.error("Import error:", err);
      showToast("Nhập file thất bại: " + err.message, "error");
    }
  };
  reader.readAsText(file);
}
