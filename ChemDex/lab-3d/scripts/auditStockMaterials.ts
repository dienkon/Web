import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { CHEMICAL_DATABASE, getSolidMorphology } from '../src/data/chemicals';
import { stockPhase, stockSolidMaterial } from '../src/science/stockAppearance';
import { createStockSolidGeometry, geometryVolume } from '../src/components/three/stockSolidGeometry';
import { PRECIPITATE_PROFILES } from '../src/simulation/core/SimulationConfig';
import { precipitatePackingFraction } from '../src/science/precipitatePacking';

const output = new URL('../docs/research/stock-product-appearance-2026-10-28/', import.meta.url);
await mkdir(output, { recursive: true });
const stocks = CHEMICAL_DATABASE.map(chemical => {
  const form = chemical.type === 'solid' ? getSolidMorphology(chemical.formula) : null;
  const geometry = form ? createStockSolidGeometry(form, chemical.formula) : null;
  const result = { formula: chemical.formula, name: chemical.name_vi, stockPhase: stockPhase(chemical),
    molarMass_g_mol: chemical.molarMass, catalogDensity_g_ml: chemical.density,
    catalogConcentration_M: chemical.defaultConcentration ?? null, color_sRGB: chemical.color,
    form, material: form ? stockSolidMaterial(chemical, form) : null,
    unitMeshVolume: geometry ? geometryVolume(geometry) : null };
  geometry?.dispose(); return result;
});
const products = Object.values(PRECIPITATE_PROFILES).map(profile => ({
  formula: profile.id, morphology: profile.morphology, color_sRGB: profile.color,
  particleDensity_g_cm3: profile.particleDensity_g_cm3,
  illustrativePackingFraction: precipitatePackingFraction(profile),
  physicalRadiusInput_mm: profile.baseParticleRadius_mm, explicitGlyphRadius_scene: profile.displayRadius_scene ?? null,
  transportCalibration: 'illustrative; no species-specific measured size distribution or settling calibration',
}));
const report = { generatedAt: new Date().toISOString(), stockCount: stocks.length, productCount: products.length,
  scope: 'Current shelf stock definitions and renderer appearance profiles, not an assertion that all reference-catalog reactions run in 3D.',
  limitations: ['RGB and PBR coefficients are illustrative, not measured spectra.',
    'Crystal meshes represent macroscopic stock habit, not crystallographic unit cells.',
    'Density and molarity are existing catalog inputs; this audit does not independently certify every numeric value.',
    'Particle sizes, aggregate shapes, wet-bed packing and all-attached metal deposits remain explicit approximations.'], stocks, products };
await writeFile(new URL('material-inventory.json', output), JSON.stringify(report, null, 2) + '\n');
const phaseName = { s: 'rắn', l: 'lỏng', aq: 'dung dịch', g: 'khí' };
let markdown = '# Kiểm kê từng mẫu thuốc thử và profile chất rắn\n\n'
  + `Tạo từ mã nguồn hiện tại: ${stocks.length} mục thuốc thử, ${products.length} profile sản phẩm. Đây là bảng kiểm dữ liệu và renderer; xem giới hạn và nguồn trong [báo cáo chính](../stock-and-product-appearance.vi.md).\n\n`
  + '| Mẫu trong kho | Trạng thái khi cấp | Dạng model | Màu sRGB | M (g/mol) | ρ nhập (g/mL) | C nhập (mol/L) |\n|---|---|---|---|---:|---:|---:|\n';
for (const c of stocks) markdown += `| ${c.formula} | ${phaseName[c.stockPhase]} | ${c.form ?? 'thể tích chất lỏng'} | ${c.color_sRGB} | ${c.molarMass_g_mol} | ${c.catalogDensity_g_ml ?? 'chưa có'} | ${c.catalogConcentration_M ?? '—'} |\n`;
markdown += '\n| Sản phẩm | Hình thái mới sinh | Màu sRGB | ρ vật liệu (g/cm³) | φ lớp lắng (giả định) |\n|---|---|---|---:|---:|\n';
for (const p of products) markdown += `| ${p.formula} | ${p.morphology} | ${p.color_sRGB} | ${p.particleDensity_g_cm3} | ${p.illustrativePackingFraction} |\n`;
await writeFile(new URL('material-inventory.vi.md', output), markdown);
console.log(JSON.stringify({ stocks: stocks.length, products: products.length, output: fileURLToPath(output) }));
