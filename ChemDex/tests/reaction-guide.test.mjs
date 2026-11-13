import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reactionGuide, reactionGuideErrors } from '../shared/chemistry/reaction-guide.mjs';
const catalog = JSON.parse(fs.readFileSync(new URL('../shared/reaction-catalog.generated.json', import.meta.url), 'utf8'));

test('every one of the 1000+ equations has a phase-aware sequence and honest kinetics metadata', () => {
  assert.ok(catalog.entries.length >= 1000);
  for (const entry of catalog.entries) {
    assert.deepEqual(reactionGuideErrors(entry), [], entry.id);
    const guide = reactionGuide(entry);
    assert.deepEqual(guide.stages.map(s => s.id), ['conditions', 'initiation', 'conversion', 'completion']);
    assert.ok(guide.requirements.some(r => r === entry.conditions.description_vi));
    for (const reagent of entry.reactants) assert.ok(guide.requirements.some(r => r.includes(`${reagent.formula} ở pha ${reagent.phase}`)));
    for (const product of entry.products) assert.ok(guide.stoichiometry_vi.includes(`${product.coefficient} mol ${product.formula}`));
    assert.equal(guide.rate.duration_s, null); assert.equal(guide.rate.calibrated, false);
    for (const id of guide.rate.sourceIds) assert.ok(catalog.sources[id]?.url.startsWith('https://'));
  }
});
test('gas, precipitate and combustion explanations are not interchanged', () => {
  const pick = family => catalog.entries.find(e => e.family === family);
  assert.match(reactionGuide(pick('precipitation')).requirements.join(' '), /Q > Ksp/);
  assert.match(reactionGuide(pick('neutralization')).observations_vi.join(' '), /không có sản phẩm khí/);
  assert.match(reactionGuide(pick('combustion')).stages[1].explanation_vi, /mồi hợp lệ/);
  const nh3 = catalog.entries.find(e => e.family === 'ammonium_base');
  assert.match(reactionGuide(nh3).stages[2].explanation_vi, /không tự tạo khói trắng/);
  const peroxide = catalog.entries.find(e => e.family === 'catalytic_decomposition');
  assert.match(reactionGuide(peroxide).rate.explanation_vi, /Bọt bền cần thêm chất giữ bọt/);
  assert.ok(reactionGuideErrors({ ...nh3, family: 'invented' }).length > 0);
});
