import { describe, expect, it } from 'vitest';
import { AutoExperiment } from '../src/vfx/autoplay/AutoExperiment';
import { gasVolumeMl } from '../src/vfx/autoplay/gasDelivery';

function advanceUntil(e: AutoExperiment, predicate: () => boolean) {
  for (let frame = 0; frame < 12000 && !predicate() && !e.error; frame++) e.tick(1 / 60);
  expect(e.error).toBeNull();
  expect(predicate()).toBe(true);
}

function captionDose(caption: string, unit: 'g' | 'mL') {
  const match = caption.match(new RegExp(`· ([\\d.e+-]+) / ([\\d.e+-]+) ${unit} đã vào bình`));
  expect(match, caption).not.toBeNull();
  return [Number(match![1]), Number(match![2])];
}

describe('automatic instructions show material that has actually arrived', () => {
  it('keeps an airborne solid at zero grams, then counts only landed pieces', () => {
    const e = new AutoExperiment('cu_agno3', false);
    const donor = e.donors.find(d => d.row.phase === 's')!;
    advanceUntil(e, () => e.phase === 'dose' && e.donors[e.donorIndex] === donor
      && donor.solid!.released > 0 && donor.solid!.arrived === 0);
    expect(e.inFlightMass_g).toBeGreaterThan(0);
    expect(captionDose(e.caption, 'g')[0]).toBe(0);
    expect(e.caption).not.toContain('mL');
    advanceUntil(e, () => e.phase === 'dose' && donor.solid!.arrived > 0
      && donor.solid!.arrived < donor.solid!.pieces.length);
    const arrived_g = donor.solid!.flights.filter(flight => flight.arrived).reduce((sum, flight) => sum + flight.mass_g, 0);
    const [displayed_g, total_g] = captionDose(e.caption, 'g');
    expect(displayed_g).toBeGreaterThan(0);
    expect(displayed_g).toBeLessThan(total_g);
    expect(displayed_g).toBeCloseTo(arrived_g, 4);
    expect(total_g).toBeCloseTo(donor.row.mass_g, 4);
    expect(e.steps.some(step => step.includes(`Chuyển chất rắn ${donor.row.formula}`) && step.endsWith(' g'))).toBe(true);
    advanceUntil(e, () => e.phase === 'return' && e.donors[e.donorIndex] === donor);
    expect(donor.solid!.flights.every(flight => flight.arrived)).toBe(true);
    expect(e.caption).toMatch(/^Đã chuyển [\d.e+-]+ g Cu vào bình/);
  });

  it('shows finite gas volume while the valve is open and the remaining line drains', () => {
    const e = new AutoExperiment('nh3_hcl', false);
    advanceUntil(e, () => e.phase === 'dose' && e.gasValveOpen && e.donors[e.donorIndex].fraction > 0.1);
    const donor = e.donors[e.donorIndex];
    const [arrived_ml, stock_ml] = captionDose(e.caption, 'mL');
    expect(e.caption).toContain('Dẫn khí qua ống');
    expect(arrived_ml).toBeGreaterThan(0); expect(arrived_ml).toBeLessThan(stock_ml);
    expect(stock_ml).toBeCloseTo(gasVolumeMl(donor.row.moles), 0);
    expect(arrived_ml).toBeCloseTo(gasVolumeMl(donor.row.moles * donor.fraction), 1);
    expect(e.steps.some(step => step.startsWith(`Dẫn ${donor.row.formula} ·`) && step.endsWith(' mL'))).toBe(true);
    advanceUntil(e, () => e.phase === 'dose' && e.donors[e.donorIndex] === donor && !e.gasValveOpen && donor.fraction > 0.1);
    expect(e.caption).toContain('Đóng van, chờ khí còn trong ống');
    expect(captionDose(e.caption, 'mL')[0]).toBeLessThan(captionDose(e.caption, 'mL')[1]);
  });

  it('uses liquid volumes in transfer steps and names the actual Golden Rain electrical heater', () => {
    const e = new AutoExperiment('golden_rain', false);
    for (const donor of e.donors) {
      const instruction = e.steps.find(step => step.includes(` ${donor.row.formula} ·`))!;
      expect(instruction).toMatch(/Rót dung dịch .* · [\d.e+-]+ mL$/);
      expect(Number(instruction.match(/· ([\d.e+-]+) mL/)![1])).toBeGreaterThan(0);
    }
    expect(e.steps.some(step => step.startsWith('Tắt đế gia nhiệt điện'))).toBe(true);
    expect(e.steps.join(' ')).not.toContain('Tắt đèn');
    e.phase = 'cool';
    expect(e.caption).toMatch(/^Tắt đế gia nhiệt điện, để dung dịch nguội tự nhiên/);
  });
});
