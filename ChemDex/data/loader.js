const manifestUrl = new URL("./manifest.json", import.meta.url);
const cache = {
  manifest: null,
  element: new Map(),
  metaByNumber: new Map(),
  metaBySymbol: new Map(),
};
const NATURAL_STATE_IMAGE = "trang-thai-tu-nhien.png";

function normalizeKey(numberOrSymbol) {
  if (numberOrSymbol == null) return null;
  if (typeof numberOrSymbol === "number" && Number.isFinite(numberOrSymbol)) {
    return String(Math.trunc(numberOrSymbol));
  }
  const raw = String(numberOrSymbol).trim();
  if (!raw) return null;
  return /^\d+$/.test(raw) ? String(parseInt(raw, 10)) : raw.toUpperCase();
}

function getPlaceholderFromMeta(meta = {}) {
  return {
    number: meta.number ?? null,
    symbol: meta.symbol ?? "",
    nameVi: meta.nameVi ?? "",
    nameEn: meta.nameEn ?? "",
    mass: null,
    category: meta.category ?? "unknown",
    hasData: false,
  };
}

function slugifyAssetName(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getElementAssetFolder(element = {}, meta = {}) {
  if (element.assetFolder) return element.assetFolder;
  if (meta.assetFolder) return meta.assetFolder;

  const number = String(element.number ?? meta.number ?? "").padStart(3, "0");
  const name = slugifyAssetName(
    element.nameEn ||
      element.general?.englishName ||
      meta.nameEn ||
      element.nameVi ||
      meta.nameVi ||
      element.symbol ||
      meta.symbol,
  );

  return name ? `${number}_${name}` : number;
}

function applyAssetDefaults(element = {}, meta = {}) {
  const assetFolder = getElementAssetFolder(element, meta);
  const assetBase = `./assets/elements/${assetFolder}`;

  return {
    ...element,
    assetFolder,
    assets: {
      ...(element.assets || {}),
      base: assetBase,
      img: `${assetBase}/img`,
      model: `${assetBase}/model`,
    },
    naturalState: {
      ...(element.naturalState || {}),
      image: `${assetBase}/img/${NATURAL_STATE_IMAGE}`,
    },
  };
}

async function fetchJson(url, fallback = null) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return fallback;
  }
}

export async function loadManifest() {
  if (cache.manifest) return cache.manifest;
  const manifest = await fetchJson(manifestUrl, []);
  cache.manifest = Array.isArray(manifest) ? manifest : [];
  cache.metaByNumber.clear();
  cache.metaBySymbol.clear();
  for (const meta of cache.manifest) {
    if (!meta) continue;
    if (meta.number != null) cache.metaByNumber.set(Number(meta.number), meta);
    if (meta.symbol) cache.metaBySymbol.set(String(meta.symbol).toUpperCase(), meta);
  }
  return cache.manifest;
}

export function getElementMeta(numberOrSymbol) {
  const key = normalizeKey(numberOrSymbol);
  if (!key) return null;
  if (/^\d+$/.test(key)) return cache.metaByNumber.get(Number(key)) || null;
  return cache.metaBySymbol.get(key) || null;
}

export async function loadElementData(numberOrSymbol) {
  await loadManifest();
  const meta = getElementMeta(numberOrSymbol);
  if (!meta) return null;

  const cacheKey = meta.file || `${meta.number}`;
  if (cache.element.has(cacheKey)) return cache.element.get(cacheKey);

  let data = null;
  if (meta.hasData && meta.file) {
    const url = new URL(meta.file, manifestUrl);
    data = await fetchJson(url, null);
  }

  const merged = data
    ? {
        ...getPlaceholderFromMeta(meta),
        ...data,
        number: meta.number,
        symbol: meta.symbol,
        nameVi: data.nameVi ?? meta.nameVi ?? "",
        nameEn: data.nameEn ?? meta.nameEn ?? "",
        category: data.category ?? meta.category ?? "unknown",
        hasData: data.hasData ?? meta.hasData ?? false,
      }
    : getPlaceholderFromMeta(meta);

  const normalized = applyAssetDefaults(merged, meta);

  cache.element.set(cacheKey, normalized);
  return normalized;
}

export async function loadAllKnownElements() {
  const manifest = await loadManifest();
  const items = await Promise.all(
    manifest.map((meta) => loadElementData(meta.number)),
  );
  return items.filter(Boolean).sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
}

export function clearElementCache() {
  cache.element.clear();
}

export function __getLoaderCacheForDebug() {
  return cache;
}
