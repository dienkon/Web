import elements from "../shared/elements.json";
import compounds from "../shared/compounds.json";
import { tools } from "./catalog.js";
import { normalize } from "./common.js";

export const searchIndex = [
  ...elements.map((e) => ({ id: `element-${e.symbol}`, title: `${e.name_vi} · ${e.symbol}`, detail: `${e.name_en} · Số hiệu ${e.z}`, kind: "Nguyên tố", mark: e.symbol, href: `/?element=${e.symbol}`, exact: [e.symbol, String(e.z)], terms: [e.name_vi, e.name_en] })),
  ...compounds.map((c) => ({ id: c.id, title: `${c.name_vi} · ${c.formula}`, detail: `${c.name_en} · ${c.kind === "crystal" ? "Mạng tinh thể" : c.kind === "ion" ? "Ion" : "Phân tử"}`, kind: "Cấu trúc", mark: "⌬", href: `/tien-ich/cau-truc-3d/?compound=${c.id}`, exact: [c.formula], terms: [c.name_vi, c.name_en, c.formula, ...c.aliases] })),
  ...tools.map((t) => ({ ...t, detail: t.category, kind: "Tiện ích", exact: [], terms: [t.title, t.description, ...t.keywords] })),
];

export function searchRecords(query, records = searchIndex) {
  const q = normalize(query).slice(0, 100);
  if (!q) return records.filter((r) => r.kind === "Tiện ích").slice(0, 6);
  const terms = q.split(/\s+/);
  return records.map((record) => {
    const title = normalize(record.title), text = normalize(record.terms.join(" "));
    const exact = record.exact.some((value) => normalize(value) === q);
    const score = exact ? 100 : title === q ? 90 : title.startsWith(q) ? 70 : title.includes(q) ? 50 : terms.every((term) => text.includes(term)) ? 20 : 0;
    return { record, score };
  }).filter((r) => r.score).sort((a, b) => b.score - a.score).slice(0, 12).map((r) => r.record);
}
