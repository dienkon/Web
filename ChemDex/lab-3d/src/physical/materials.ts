import type { MaterialPropertyModel, ValidationRecord } from './types';

export const SOURCES = {
  water: 'https://iapws.org/documents/release',
  glass: 'https://www.schott.com/en-us/products/borofloat/technical-details',
  silicone: 'https://www.dow.com/en-us/pdp.xiameter-pmx-200-silicone-fluid-100-cst.01013190z.html',
  fusion: 'https://nvlpubs.nist.gov/nistpubs/jres/23/jresv23n6p643_A1b.pdf',
  glycerol: 'https://webbook.nist.gov/cgi/cbook.cgi?ID=C56815',
  aluminum: 'https://webbook.nist.gov/cgi/cbook.cgi?ID=C7429905',
  calibration: 'https://nvlpubs.nist.gov/nistpubs/ir/2019/NIST.IR.7383-2019.pdf',
};
export function estimatedRecord(id: string, sources: string[] = []): ValidationRecord {
  return { id, status: 'estimated', sourceUrls: sources, domain: 'Reference conditions near 293.15 K, 101325 Pa; not a fitted apparatus model',
    scenarios: ['mass', 'geometry', 'contact', 'thermal'],
    limitations: ['Friction, restitution and generic material grades are estimates.', 'Source properties do not certify an apparatus or a dynamic experiment.'] };
}
const material = (id: string, name: string, density: number, cp: number, conductivity: number,
  color: string, sourceUrls: string[] = [], extra: Partial<MaterialPropertyModel> = {}): MaterialPropertyModel => ({
  id, name, density_kg_m3: density, heatCapacity_J_kgK: cp, conductivity_W_mK: conductivity,
  friction: 0.45, restitution: 0.08, color, validation: estimatedRecord(`material:${id}`, sourceUrls), ...extra,
});
export const MATERIALS: Readonly<Record<string, MaterialPropertyModel>> = {
  borosilicate: material('borosilicate', 'Thủy tinh borosilicate', 2230, 830, 1.2, '#cee7ef', [SOURCES.glass], { expansion_K1: 3.25e-6 }),
  steel: material('steel', 'Thép — cấp vật liệu tham chiếu', 7850, 470, 45, '#84939d'),
  aluminum: material('aluminum', 'Nhôm', 2700, 900, 237, '#c6cbd1', [SOURCES.aluminum]),
  polyethylene: material('polyethylene', 'Polyethylene — cấp tham chiếu', 950, 1900, 0.4, '#f0eee4'),
  porcelain: material('porcelain', 'Sứ — cấp tham chiếu', 2400, 850, 1.5, '#f3eddf'),
  rubber: material('rubber', 'Cao su — cấp tham chiếu', 1100, 1800, 0.15, '#475569', [], { friction: 0.8, restitution: 0.2 }),
  cork: material('cork', 'Bần — cấp tham chiếu', 240, 1800, 0.04, '#ad8455'),
  sponge: material('sponge', 'Vật liệu xốp — khối lượng khô', 40, 1400, 0.04, '#f0c541'),
  bench: material('bench', 'Mặt bàn lab', 1800, 900, 0.3, '#cbd5e1', [], { friction: 0.65 }),
  water: material('water', 'Nước', 998.2, 4184, 0.6, '#9bcbd9', [SOURCES.water], { viscosity_Pas: 1.002e-3, surfaceTension_N_m: 0.0728 }),
  glycerol: material('glycerol', 'Glycerol nguyên chất — 20 °C', 1261, 2400, 0.285, '#d2dfd9', [SOURCES.glycerol], { viscosity_Pas: 1.412, surfaceTension_N_m: 0.0634 }),
  silicone_oil: material('silicone_oil', 'Dầu silicone 100 cSt — 25 °C', 965, 1500, 0.15, '#dfd5ac', [SOURCES.silicone], { viscosity_Pas: 0.0965, surfaceTension_N_m: 0.0209 }),
  ice: material('ice', 'Băng nước', 916.7, 2100, 2.2, '#bfe6f6', [SOURCES.fusion, SOURCES.water], { melting_K: 273.15, latentFusion_J_kg: 333500 }),
};

export function materialProperties(id: string): MaterialPropertyModel {
  const model = MATERIALS[id];
  if (!model) throw new Error(`Unknown physical material: ${id}`);
  return model;
}
