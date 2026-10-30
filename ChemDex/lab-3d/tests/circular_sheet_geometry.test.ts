import { expect, it } from 'vitest';
import { CircularSheetGeometry, simplifySheetPoints, type CircularSheet } from '../src/pour/render/CircularSheetGeometry';
import { CENTIMETERS_PER_SCENE_UNIT } from '../src/science/sceneUnits';

function volumeAndEdges(g: CircularSheetGeometry) {
  const positions = g.attributes.position, index = g.index!, edges = new Map<string, number>();
  let volume = 0;
  const point = (i: number) => [positions.getX(i), positions.getY(i), positions.getZ(i)];
  const key = (p: number[]) => p.map(v => Math.round(v * 1e6)).join(',');
  const origin = point(0);
  for (let i = 0; i < g.drawRange.count; i += 3) {
    const raw = [0, 1, 2].map(k => point(index.getX(i + k))), [a, b, c] = raw.map(p => p.map((v, k) => v - origin[k]));
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    for (let j = 0; j < 3; j++) {
      const pair = [key(raw[j]), key(raw[(j + 1) % 3])].sort().join('|');
      edges.set(pair, (edges.get(pair) ?? 0) + 1);
    }
  }
  return { volume_ml: volume * CENTIMETERS_PER_SCENE_UNIT ** 3, edgeUses: [...edges.values()] };
}
const sheet = (volume_ml: number, long = false): CircularSheet => ({ center: [5, -3], color: '#67caff', volume_ml, supported: true,
  points: Array.from({ length: long ? 12 : 2 }, (_, i) => ({ y: 2 - i * 0.01, radius: 1 + i * 0.002, thickness: 0.02 + i * 0.001 })) });

it.each([0.01, 1, 20, 500])('is a closed, outward-wound annular surface containing exactly %s mL', volume => {
  const g = new CircularSheetGeometry(); g.update([sheet(volume, true)]);
  const result = volumeAndEdges(g);
  expect(result.volume_ml).toBeCloseTo(volume, volume < 1 ? 5 : 3);
  expect(result.edgeUses.every(n => n === 2)).toBe(true);
  const normals = g.attributes.normal;
  for (let i = 0; i < 12 * 2 * 49; i++) expect(Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i))).toBeCloseTo(1, 5);
  g.dispose();
});

it('does not retain old triangles/normals when a shorter sheet reuses larger buffers', () => {
  const reused = new CircularSheetGeometry(), fresh = new CircularSheetGeometry(), short = sheet(0.1);
  reused.update([sheet(20, true)]); reused.update([short]); fresh.update([short]);
  expect(reused.drawRange).toEqual(fresh.drawRange);
  for (let i = 0; i < fresh.drawRange.count; i++) {
    const a = reused.index!.getX(i), b = fresh.index!.getX(i);
    for (const attribute of ['position', 'normal']) for (let k = 0; k < 3; k++)
      expect(reused.attributes[attribute].getComponent(a, k)).toBe(fresh.attributes[attribute].getComponent(b, k));
  }
  reused.update([]); expect(reused.drawRange.count).toBe(0);
  reused.dispose(); fresh.dispose();
});

it('removes redundant knots while bounding errors on both sheet surfaces and retaining a glass corner', () => {
  const points = Array.from({ length: 101 }, (_, i) => ({ y: 1 - i / 100, radius: i < 50 ? 1 : 1 + (i - 50) / 100,
    thickness: 0.03 + 0.02 * Math.sin(i / 30) }));
  const tolerance = 0.001, simplified = simplifySheetPoints(points, tolerance);
  expect(simplified.length).toBeLessThan(points.length / 2);
  expect(simplified).toContain(points[50]);
  for (const p of points) {
    const end = Math.max(1, simplified.findIndex(q => q.y <= p.y));
    const a = simplified[end - 1], b = simplified[end], t = (a.y - p.y) / (a.y - b.y);
    expect(Math.abs(p.radius - a.radius - (b.radius - a.radius) * t)).toBeLessThanOrEqual(tolerance + 1e-12);
    expect(Math.abs(p.radius + p.thickness - a.radius - a.thickness
      - (b.radius + b.thickness - a.radius - a.thickness) * t)).toBeLessThanOrEqual(tolerance + 1e-12);
  }
});
