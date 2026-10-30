import { mkdirSync, writeFileSync } from 'node:fs';
import { ALL_HANDCRAFTED_PROGRAMS } from '../src/vfx/programs/library';
import { PRECIPITATE_PROFILES, getPrecipitateProfile } from '../src/simulation/core/SimulationConfig';
import { sameMolecularFormula } from '../src/science/speciesIdentity';
import { getReactionReview, SCIENCE_REFERENCES } from '../src/science/reviewCatalog';

// Inventory of implementation gaps, not a certificate of experimental accuracy.
const rows = ALL_HANDCRAFTED_PROGRAMS.flatMap(program => {
  const precipitate = program.visual.after.precipitate;
  if (!precipitate) return [];
  const known = Object.values(PRECIPITATE_PROFILES).find(profile => sameMolecularFormula(profile.id, precipitate.substance));
  const resolved = getPrecipitateProfile(precipitate.substance);
  const review = getReactionReview(program.id);
  const metalSubstrates = program.chemistry.species.filter(term => term.role === 'reactant'
    && term.phase === 's' && ['Li', 'Na', 'K', 'Ca', 'Mg', 'Al', 'Zn', 'Fe', 'Co', 'Ni', 'Sn', 'Pb', 'Cu']
      .some(metal => sameMolecularFormula(term.formula, metal))).map(term => term.formula);
  const surfaceDeposition = ['Ag', 'Cu'].some(metal => sameMolecularFormula(precipitate.substance, metal))
    && metalSubstrates.length > 0;
  return [{
    reaction: program.id,
    equation: program.chemistry.equation,
    substance: precipitate.substance,
    declaredMorphology: precipitate.morphology,
    physicalProfile: resolved.id,
    physicalMorphology: resolved.morphology,
    dedicatedProfile: !!known,
    transportBasis: resolved.modelBasis ?? 'profile_parameters_not_experimentally_calibrated',
    formationRoute: surfaceDeposition ? 'metal_surface_displacement' : 'unclassified_solid_formation',
    requiredSubstrates: surfaceDeposition ? metalSubstrates : [],
    surfaceAttachmentVerified: surfaceDeposition ? false : null,
    identityMismatch: !sameMolecularFormula(resolved.id, precipitate.substance),
    hasMatchingSolidProduct: program.chemistry.species.some(term => term.role === 'product'
      && term.phase === 's' && sameMolecularFormula(term.formula, precipitate.substance)),
    evidence: review?.evidence ?? 'unreviewed',
    quantitativeCalibration: review?.quantitativeCalibration ?? 'unknown',
    references: review?.references.map(key => SCIENCE_REFERENCES[key]) ?? [],
    outstanding: [
      ...(!known ? ['Missing dedicated physical profile; fallback is not chemical identity.'] : []),
      ...(resolved.modelBasis === 'uncalibrated_transport' ? ['Dedicated appearance exists, but transport uses an explicitly unvalidated material/density proxy.'] : []),
      ...(surfaceDeposition ? ['Requires finite metal coating/dendrites attached to the reacting solid; a bulk particle profile alone is insufficient.'] : []),
      'Nucleation, growth, aggregation and particle-size distribution need reaction-specific validation.',
      'GPU appearance has not been verified in this continuation.',
    ],
  }];
});
const summary = {
  declaredPrecipitationPrograms: rows.length,
  dedicatedProfilePrograms: rows.filter(row => row.dedicatedProfile).length,
  wrongIdentityFallbacks: rows.filter(row => row.identityMismatch).length,
  missingSpecies: [...new Set(rows.filter(row => !row.dedicatedProfile).map(row => row.substance))].sort(),
  unsupportedSolidDeclarations: rows.filter(row => !row.hasMatchingSolidProduct).map(row => row.reaction),
  unverifiedSurfaceDeposition: rows.filter(row => row.surfaceAttachmentVerified === false).map(row => row.reaction),
  explicitTransportProxies: rows.filter(row => row.transportBasis === 'uncalibrated_transport').map(row => row.reaction),
};
mkdirSync('artifacts/science-audit', { recursive: true });
writeFileSync('artifacts/science-audit/precipitate-coverage.json', JSON.stringify({ summary, rows }, null, 2) + '\n');
const lines = ['# Độ phủ hiệu ứng kết tủa theo từng phản ứng', '',
  'Đây là kiểm kê đường chạy và dữ liệu nguồn; có profile không đồng nghĩa đã khớp thực nghiệm.', '',
  `Có ${summary.declaredPrecipitationPrograms} chương trình khai báo kết tủa; ${summary.dedicatedProfilePrograms} có profile riêng; ${summary.wrongIdentityFallbacks} đang rơi về profile sai danh tính.`, '',
  '| Phản ứng | Chất rắn | Dạng khai báo | Profile vật lý | Cần bổ sung profile | Vị trí tạo chất rắn cần kiểm chứng |',
  '|---|---|---|---|---|---|',
  ...rows.map(row => `| ${row.reaction} | ${row.substance} | ${row.declaredMorphology} | ${row.physicalProfile} / ${row.physicalMorphology} | ${row.dedicatedProfile ? 'Không' : 'Có'} | ${row.formationRoute === 'metal_surface_displacement' ? `Bám trên ${row.requiredSubstrates.join(', ')}` : 'Chưa phân loại vị trí'} |`), '',
  'Nguồn và giới hạn kiểm chứng từng chương trình nằm trong JSON đi kèm. Tất cả vẫn cần xác minh hình ảnh GPU và cơ chế định lượng riêng.', ''];
writeFileSync('artifacts/science-audit/precipitate-coverage.vi.md', lines.join('\n'));
console.log(JSON.stringify(summary, null, 2));
