import { describe, expect, it } from 'vitest';
import { CHEMICAL_DATABASE, getSolidMorphology } from '../src/data/chemicals';

describe('Declared stock names agree with their phase and form', () => {
  it.each(CHEMICAL_DATABASE)('$formula — $name_vi', chemical => {
    const label = `${chemical.name_en} ${chemical.name_vi}`;
    if (/dung dịch|solution|aqueous/i.test(label)) expect(chemical.type).toBe('liquid');
    if (/\(gas\)|\(khí\)/i.test(label)) expect(chemical.type).toBe('gas');
    if (chemical.type !== 'solid') return;
    const form = getSolidMorphology(chemical.formula);
    if (/powder|dust|bột/i.test(label)) expect(form).toBe('POWDER');
    if (/nail|đinh/i.test(label)) expect(form).toBe('NAIL');
    if (/foil|lá nhôm|nhôm lá/i.test(label)) expect(form).toBe('FOIL');
    if (/ribbon|dải kim loại|magie dải/i.test(label)) expect(form).toBe('RIBBON');
    if (/filings|mạt sắt/i.test(label)) expect(form).toBe('FILINGS');
    if (/marble chips|đá marble/i.test(label)) expect(form).toBe('CHIPS');
  });
});
