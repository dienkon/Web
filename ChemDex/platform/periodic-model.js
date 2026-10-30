import { normalize } from "./common.js";
export const categories = {
  alkali: ["Kim loại kiềm", "#c85d61"], alkaline_earth: ["Kiềm thổ", "#bd852e"],
  transition_metal: ["Chuyển tiếp", "#b39235"], post_transition: ["Kim loại khác", "#399778"],
  metalloid: ["Á kim", "#329393"], reactive_nonmetal: ["Phi kim", "#3989bc"],
  halogen: ["Halogen", "#8e6abc"], noble_gas: ["Khí hiếm", "#ac72a8"],
  lanthanide: ["Lanthanide", "#bf8054"], actinide: ["Actinide", "#ba6f91"],
};
export const properties = {
  category: ["Phân nhóm nguyên tố", ""], electronegativity: ["Độ âm điện", "Pauling"],
  atomicRadius: ["Bán kính nguyên tử", "pm"], ionizationEnergy: ["Năng lượng ion hóa", "kJ/mol"],
  meltingPoint: ["Nhiệt độ nóng chảy", "°C"],
};
export function matchesElement(e, filters, elements) {
  const q = normalize(filters.q), exact = elements.find((a) => normalize(a.symbol) === q);
  const text = normalize([e.name_vi, e.name_en, categories[e.category]?.[0]].join(" "));
  return (!q || (exact ? e.symbol === exact.symbol : /^\d+$/.test(q) ? e.z === Number(q) : q.split(/\s+/).every((word) => text.includes(word)))) &&
    (!filters.category || e.category === filters.category) && (!filters.period || e.period === Number(filters.period)) &&
    (!filters.group || e.group === Number(filters.group)) && (!filters.block || e.block === filters.block) &&
    (!filters.phase || e.phase_STP === filters.phase) && (!filters.favorites || filters.favoriteSymbols.includes(e.symbol));
}
export function sortElements(elements, sort) {
  return [...elements].sort((a, b) => {
    if (sort === "name") return a.name_vi.localeCompare(b.name_vi, "vi");
    if (sort === "mass") return (a.mass ?? Infinity) - (b.mass ?? Infinity);
    if (sort === "electronegativity") return (b.electronegativity ?? -Infinity) - (a.electronegativity ?? -Infinity);
    return a.z - b.z;
  });
}
export function comparisonCSV(elements, weights) {
  const cell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = [
    ["Ký hiệu", "Tên", "Số hiệu", "Nguyên tử khối tham khảo", "Nguồn nguyên tử khối", "Độ không đảm bảo CIAAW", "Độ âm điện (Pauling)", "Bán kính (pm)", "Ion hóa thứ nhất (kJ/mol)", "Nóng chảy (°C)", "Ghi chú nóng chảy"],
    ...elements.map((e) => [e.symbol, e.name_vi, e.z, e.mass, weights.elements.some((w) => w.symbol === e.symbol) ? weights.source : e.sourceFile, weights.elements.find((w) => w.symbol === e.symbol)?.uncertainty, e.electronegativity, e.atomicRadius, e.ionizationEnergy, e.meltingPoint, e.meltingPointNote]),
  ];
  return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}
