import * as THREE from 'three';
import type { SolidMorphology } from '../../types/chemistry';

export function stockSolidChunkCount(morphology: SolidMorphology): number {
  return morphology === 'NAIL' ? 1 : morphology === 'FOIL' ? 2 : morphology === 'RIBBON' ? 3
    : morphology === 'TURNINGS' ? 12 : morphology === 'FILINGS' ? 48 : morphology === 'PELLET' ? 5
    : morphology === 'POWDER' ? 28 : 22;
}

/** Signed tetrahedra of a closed surface. This is also used by the coverage
 * audit: every stock model must enclose a finite material volume. */
export function geometryVolume(geometry: THREE.BufferGeometry): number {
  const p = geometry.getAttribute('position'), index = geometry.index;
  let volume = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const count = index?.count ?? p.count;
  for (let i = 0; i < count; i += 3) {
    a.fromBufferAttribute(p, index ? index.getX(i) : i);
    b.fromBufferAttribute(p, index ? index.getX(i + 1) : i + 1);
    c.fromBufferAttribute(p, index ? index.getX(i + 2) : i + 2);
    volume += a.dot(b.cross(c)) / 6;
  }
  return Math.abs(volume);
}

/** A bent, rectangular strip, unlike the round wire used for copper turnings. */
function ribbonGeometry() {
  const strip = new THREE.Shape();
  strip.absarc(0, 0, 0.8, 0, Math.PI * 1.35, false);
  strip.lineTo(Math.cos(Math.PI * 1.35) * 0.73, Math.sin(Math.PI * 1.35) * 0.73);
  strip.absarc(0, 0, 0.73, Math.PI * 1.35, 0, true);
  strip.closePath();
  const g = new THREE.ExtrudeGeometry(strip, { depth: 0.32, bevelEnabled: false, curveSegments: 24 });
  g.center();
  return g;
}

/** Closed, faceted display models of macroscopic stock forms. Hydrates use
 * representative crystal habits, not a unit-cell or molecular structure. */
export function createStockSolidGeometry(morphology: SolidMorphology, formula = ''): THREE.BufferGeometry {
  let g: THREE.BufferGeometry;
  switch (morphology) {
    case 'NAIL':
      g = new THREE.LatheGeometry([
        new THREE.Vector2(0, -1.8), new THREE.Vector2(0.09, -1.5),
        new THREE.Vector2(0.09, 1.45), new THREE.Vector2(0.26, 1.45),
        new THREE.Vector2(0.26, 1.56), new THREE.Vector2(0, 1.56),
      ], 12); break;
    case 'FOIL': {
      // A folded thin sheet: rectangular section preserved through each fold.
      const shape = new THREE.Shape();
      shape.moveTo(-1, -0.18); shape.lineTo(-0.3, 0.05); shape.lineTo(0.4, -0.1); shape.lineTo(1, 0.2);
      shape.lineTo(1, 0.22); shape.lineTo(0.4, -0.08); shape.lineTo(-0.3, 0.07); shape.lineTo(-1, -0.16);
      shape.closePath();
      g = new THREE.ExtrudeGeometry(shape, { depth: 1.1, bevelEnabled: false }); g.center(); break;
    }
    case 'RIBBON': g = ribbonGeometry(); break;
    case 'TURNINGS': {
      const wire = new THREE.Shape(); wire.absarc(0, 0, 0.06, 0, Math.PI * 2, false);
      const path = new THREE.CatmullRomCurve3(Array.from({ length: 33 }, (_, i) => {
        const angle = i / 32 * Math.PI * 1.8;
        return new THREE.Vector3(Math.cos(angle) * 0.7, i / 32 * 0.25, Math.sin(angle) * 0.7);
      }));
      g = new THREE.ExtrudeGeometry(wire, { extrudePath: path, steps: 32, curveSegments: 8, bevelEnabled: false });
      g.center(); break;
    }
    case 'FILINGS': g = new THREE.BoxGeometry(0.06, 0.6, 0.035); break;
    case 'PELLET': g = new THREE.SphereGeometry(0.55, 12, 8); break;
    case 'CUBIC_CRYSTAL': g = new THREE.BoxGeometry(0.85, 0.85, 0.85); break;
    case 'PRISMATIC_CRYSTAL': g = new THREE.OctahedronGeometry(0.7); g.scale(0.42, 1.8, 0.65); break;
    case 'TABULAR_CRYSTAL': g = new THREE.BoxGeometry(0.85, 0.23, 1.1); g.rotateZ(0.15); break;
    case 'HYDRATE_CRYSTAL': {
      // Distinguish vitriol's oblique habit, hexahydrate prisms and green
      // heptahydrate plates. No claim that a display mesh is crystallography.
      const nickel = formula.startsWith('NiSO4');
      g = nickel ? new THREE.OctahedronGeometry(0.8) : new THREE.BoxGeometry(0.65, 0.95, 0.48);
      if (formula.startsWith('CuSO4')) {
        g.applyMatrix4(new THREE.Matrix4().makeShear(0.22, 0, 0, 0.18, 0, 0));
      } else if (formula.startsWith('FeSO4')) g.scale(1.3, 0.5, 1);
      else if (formula.startsWith('CoCl2')) g.scale(0.6, 1.6, 0.8);
      break;
    }
    case 'LUSTROUS_PLATES': g = new THREE.BoxGeometry(1, 0.11, 0.65); break;
    case 'CHIPS': g = new THREE.DodecahedronGeometry(0.7); g.scale(1, 0.7, 0.85); break;
    case 'GRANULES': g = new THREE.IcosahedronGeometry(0.65, 0); g.scale(1, 0.8, 0.9); break;
    default: g = new THREE.IcosahedronGeometry(0.6, 0); break;
  }
  const volume = geometryVolume(g);
  if (!(volume > 0)) { g.dispose(); throw new Error(`Invalid closed stock geometry: ${morphology}`); }
  g.scale(...Array(3).fill(Math.cbrt(1 / volume)) as [number, number, number]);
  g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}
