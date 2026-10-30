import { expect, it } from 'vitest';
import * as THREE from 'three';
import { vesselBodyTransform, vesselLocalToWorld, vesselWorldToLocal, vesselWorldDimensions } from '../src/science/vesselScale';
import { contourVolumeBelow, liquidLevelForVolume, vesselInterior } from '../src/science/vesselDimensions';
import { vesselOuterDimensions } from '../src/science/vesselContours';
import { CENTIMETERS_PER_SCENE_UNIT as cm, metersPerModelUnit } from '../src/science/sceneUnits';
import { getVesselProfile, getWorldVesselProfile } from '../src/pour/physics/profiles';
import { calculateStreamBallistics } from '../src/pour/physics/ballistics';
import { calculateWeirFlow } from '../src/pour/physics/flow';
import { vesselWorldLiquidSurfaceY } from '../src/science/vesselGeometry';
import type { VesselState } from '../src/types/chemistry';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { PRNG } from '../src/core/rng';
import { sphereSettlingSpeed } from '../src/science/particleSettling';

const types = ['beaker','flask','test_tube','cylinder','watch_glass','evaporating_dish','crucible','petri_dish',
  'volumetric_flask','separatory_funnel','filter_funnel','mortar_pestle','condenser','wash_bottle'] as const;
it.each(types)('uses one SI volume scale for the %s interior, contact profile and body transform', type => {
  for (const capacity_ml of [25, 100, 500]) {
    const vessel = { type, capacity_ml }, body = vesselBodyTransform(vessel), interior = vesselInterior(type);
    const profile = getWorldVesselProfile(type, capacity_ml);
    expect(interior.volume * body.scale ** 3 * cm ** 3).toBeCloseTo(capacity_ml, 8);
    expect(contourVolumeBelow(profile.contour!, profile.baseY + profile.H) * cm ** 3).toBeCloseTo(capacity_ml, 8);
    expect(profile.sceneScale).toBe(cm);
    expect(profile.baseY).toBeCloseTo(interior.floorY * body.scale + body.offsetY, 12);
    expect(vesselWorldDimensions(vessel).bottomY).toBe(vesselOuterDimensions(type).bottomY);
    for (const fraction of [0.1, 0.5, 0.9]) {
      const level = vesselWorldLiquidSurfaceY({ ...vessel, volume_ml: capacity_ml * fraction, contents: [] });
      expect(contourVolumeBelow(profile.contour!, level) * cm ** 3).toBeCloseTo(capacity_ml * fraction, 7);
      expect(level).toBeCloseTo(body.offsetY + body.scale * liquidLevelForVolume(type, capacity_ml * fraction, capacity_ml), 12);
    }
  }
});

it('matches the actual nested Three.js transform and its inverse under arbitrary pose', () => {
  const v = { type: 'beaker', capacity_ml: 100, position: [3, 2, -4], rotationY: 0.8, rotationZ: -1.2 } as VesselState;
  const body = vesselBodyTransform(v), parent = new THREE.Group(), child = new THREE.Group();
  parent.position.fromArray(v.position); parent.rotation.set(0, v.rotationY, v.rotationZ!);
  child.scale.setScalar(body.scale); child.position.y = body.offsetY; parent.add(child); parent.updateMatrixWorld(true);
  for (const point of [[0.2, 0.3, -0.1], [0, -1, 0], [1.04, 1, 0]] as [number, number, number][]) {
    const actual = new THREE.Vector3(...point).applyMatrix4(child.matrixWorld).toArray(), predicted = vesselLocalToWorld(v, point);
    for (let i = 0; i < 3; i++) expect(predicted[i]).toBeCloseTo(actual[i], 12);
    const restored = vesselWorldToLocal(v, actual as [number, number, number]);
    for (let i = 0; i < 3; i++) expect(restored[i]).toBeCloseTo(point[i], 12);
  }
});

it('launches exactly from the rendered, scaled lip including tilt, yaw and anchored-bottom offset', () => {
  const v = { type: 'beaker', capacity_ml: 100, position: [3, 2, -4], rotationY: 0.8, rotationZ: -1.2 } as VesselState;
  const local = getVesselProfile(v.type, v.capacity_ml), world = getWorldVesselProfile(v.type, v.capacity_ml);
  const expected = vesselLocalToWorld(v, local.lipLocal);
  const trajectory = calculateStreamBallistics(v.position, v.rotationZ!, world, 0.5, null, -1.175, v.rotationY);
  for (let i = 0; i < 3; i++) expect(trajectory.exitPos[i]).toBeCloseTo(expected[i], 12);
});

it('respects cubic volume, square area and discharge similarity when the capacity scales by eight', () => {
  const a = getWorldVesselProfile('beaker', 100), b = getWorldVesselProfile('beaker', 800);
  expect(b.mouthR / a.mouthR).toBeCloseTo(2, 12);
  expect(b.H / a.H).toBeCloseTo(2, 12);
  const qa = calculateWeirFlow(a, 80, 1.2), qb = calculateWeirFlow(b, 640, 1.2);
  expect(qa.flowRate_ml_s).toBeGreaterThan(0);
  expect(qb.head_cm / qa.head_cm).toBeCloseTo(2, 6);
  expect(qb.flowRate_ml_s / qa.flowRate_ml_s).toBeCloseTo(2 ** 2.5, 6);
  expect(metersPerModelUnit(getVesselProfile('beaker', 800)) / metersPerModelUnit(getVesselProfile('beaker', 100))).toBeCloseTo(2, 12);
});

it('preserves the physical settling law for seeded grains in different capacity models', () => {
  const systems = [100, 800].map(capacity_ml => {
    const vesselProfile = getVesselProfile('beaker', capacity_ml), unit = metersPerModelUnit(vesselProfile);
    const system = new PrecipitationSystem(12, 'CuS', new PRNG(73));
    system.update(0.2, { temp_c: 25, ambientTemp_c: 25, viscosity_mPa_s: 1, density_g_ml: 1,
      radius: 0.8, liquidBottomY: vesselProfile.baseY, surfaceY: 0.8, vesselProfile,
      precipitateAmount_g: 0.1, volume_ml: capacity_ml * 0.8, substance: 'CuS',
      aggregationEnabled: false, agitation: 0, heatPower_W: 0 });
    expect(system.particles.length).toBeGreaterThan(0);
    for (const particle of system.particles) {
      expect(particle.physicalRadius_m).toBeGreaterThan(0);
      const expected = sphereSettlingSpeed(particle.physicalRadius_m!, particle.density, 1000, 0.001);
      expect(particle.sedimentationSpeed * unit).toBeCloseTo(expected, 13);
    }
    return { system, unit };
  });
  expect(systems[1].unit / systems[0].unit).toBeCloseTo(2, 12);
  expect(systems[1].system.particles[0].sedimentationSpeed / systems[0].system.particles[0].sedimentationSpeed).toBeCloseTo(0.5, 12);
});
