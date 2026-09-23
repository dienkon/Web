/**
 * URL and string matching utilities
 */

export const slugify = (text) =>
  String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const normalizeDocKeywords = (doc) => {
  if (!doc) return [];
  if (Array.isArray(doc.keywords)) {
    return doc.keywords
      .map((k) => String(k || "").trim())
      .filter(Boolean);
  }
  if (typeof doc.keywords === "string") {
    return String(doc.keywords)
      .split(/[,;\n]+/)
      .map((k) => k.trim())
      .filter(Boolean);
  }
  if (typeof doc.keyword === "string" && doc.keyword.trim()) {
    return [doc.keyword.trim()];
  }
  return [];
};

export const normalizeVietnameseText = (text) =>
  String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export const matchesSearch = (text, query) => {
  const normText = normalizeVietnameseText(text);
  const normQuery = normalizeVietnameseText(query);
  return normText.includes(normQuery);
};
