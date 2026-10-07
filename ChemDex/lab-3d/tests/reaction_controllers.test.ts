/**
 * reaction_controllers.test.ts — Unit Test Suite for All 30 Reaction Visual Controllers
 * 
 * Verifies:
 * 1. Complete registry coverage of all 30 chemical reactions without generic fallbacks.
 * 2. Dedicated ReactionVisualController lifecycle: initialize -> update -> finalize.
 * 3. Physical behaviors: Stokes settling, reaction zones, induction lags, autocatalysis,
 *    multi-stage complexes, thermal breakdown, flame tests, and sodium recoil thrust.
 * 4. ReactionSimulationEngine fixed-timestep integration and timeline scrubbing.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getReactionController, getAllRegisteredReactionIds } from '../src/vfx/reactions/registry';
import { ReactionSimulationEngine } from '../src/vfx/reactions/ReactionSimulationEngine';
import { ReactionRuntime, ReactionContext } from '../src/vfx/reactions/types';
import { resolveMorphology } from '../src/vfx/particles/Precipitate';
import { PRECIPITATE_MORPHOLOGIES } from '../src/vfx/dev/VfxGallery';
import { getReactionVfxRecipe } from '../src/vfx/recipes/reactionVfx';
import { useAppStore } from '../src/store/useAppStore';
import { vfxBus } from '../src/vfx/bus';

describe('Reaction Controllers: Physical Chemistry & VFX Master Suite', () => {
  let mockVessel: any;
  let mockRuntime: ReactionRuntime;
  let mockContext: ReactionContext;
  let bursts: any[];
  let impulses: any[];
  let sounds: string[];

  beforeEach(() => {
    bursts = [];
    impulses = [];
    sounds = [];

    mockVessel = {
      id: 'beaker_1',
      name: 'Beaker 1',
      type: 'beaker',
      position: [0, 0, 0],
      capacity_ml: 100,
      volume_ml: 60,
      temperature_c: 25.0,
      liquidColor: '#38bdf8',
      ph: 7.0,
      hasPrecipitate: false,
      precipitateAmount_g: 0,
      hasGas: false,
      isBoiling: false,
    };

    mockRuntime = {
      reactionId: 'test_reaction',
      vesselId: 'beaker_1',
      progress: 0.0,
      reactionRate: 1.0,
      temperature: 25.0,
      reactantAvailability: {},
      productFormation: {},
      surfaceActivity: 0.0,
      gasGenerationRate: 0.0,
      precipitateRate: 0.0,
      mixingIntensity: 1.0,
      agitation: 0.0,
      heatReleaseRate: 0.0,
      currentColor: '#38bdf8',
      targetColor: '#38bdf8',
      turbidity: 0.0,
      elapsed: 0.0,
      duration: 5.0,
      customData: {},
    };

    mockContext = {
      vessel: mockVessel,
      runtime: mockRuntime,
      dt: 1 / 60,
      timeScale: 1.0,
      addSurfaceImpulse: (normX, normZ, amplitude, radiusSigma) => {
        impulses.push({ normX, normZ, amplitude, radiusSigma });
      },
      emitBurst: (pos, count, color, speed) => {
        bursts.push({ pos, count, color, speed });
      },
      emitSparks: (pos, count, color) => {
        bursts.push({ pos, count, color, type: 'sparks' });
      },
      playSound: (soundId) => {
        sounds.push(soundId);
      },
    };
  });

  describe('Registry Coverage (All 30 Reactions)', () => {
    const EXPECTED_30_REACTIONS = [
      // 01 & 02: Neutralization
      'hcl_naoh_neutralization',
      'h2so4_naoh_neutralization',
      // 03 - 06: Core Precipitates
      'BaCl2+Na2SO4',
      'AgNO3+NaCl',
      'golden_rain_pbi2',
      'cuso4_naoh_precipitate',
      // 07: Redox Plating
      'fe_cuso4_displacement',
      // 08 - 11: Gas Evolution
      'caco3_hcl_gas',
      'zn_hcl_gas',
      'mg_hcl_gas',
      'h2o2_mno2_decomposition',
      // 12 - 13: Vapor & Effervescence
      'nh3_hcl_fumes',
      'na2co3_hcl_gas',
      // 14 - 16: Thermal & Phase Change
      'cuoh2_thermal_decomposition',
      'iodine_sublimation',
      'water_into_conc_h2so4_explosion',
      // 17: Sodium Metal in Water
      'sodium_water_reaction',
      // 18 - 19: Copper with Acids
      'cu_hno3_conc',
      'cu_conc_h2so4_heated',
      // 20 - 23: Complexes & Equilibria
      'fecl3_kscn_complex',
      'kmno4_oxalic_redox',
      'k2cr2o7_naoh_equilibrium',
      'iodine_clock',
      // 24 - 26: Colloids & Amphoteric
      'na2s2o3_hcl_turbidity',
      'cuso4_nh3_complex',
      'al_naoh_amphoteric',
      // 27 - 30: Combustion & Flames
      'burn_magnesium',
      'flame_cu',
      'flame_na',
      'flame_k',
    ];

    it('registers all 30 expected reaction IDs with non-null dedicated controllers', () => {
      const allIds = getAllRegisteredReactionIds();
      expect(allIds.length).toBeGreaterThanOrEqual(30);

      for (const reactionId of EXPECTED_30_REACTIONS) {
        const controller = getReactionController(reactionId);
        expect(controller, `Controller for ${reactionId} must exist`).not.toBeNull();
        expect(controller?.id).toBeTruthy();
        expect(controller?.name).toBeTruthy();
        const zone = controller?.getReactionZone(mockContext);
        expect(zone).toBeDefined();
        expect(zone?.origin).toBeTruthy();
      }
    });

    it('resolves chemical formula strings and normalized variations correctly', () => {
      expect(getReactionController('Na+H2O')?.id).toBe('sodium_water_reaction');
      expect(getReactionController('na + h2o')?.id).toBe('sodium_water_reaction');
      expect(getReactionController('K+H2O')?.id).toBe('potassium_water_reaction');
      expect(getReactionController('Zn+HCl')?.id).toBe('zn_hcl_gas');
      expect(getReactionController('ZN + HCL')?.id).toBe('zn_hcl_gas');
      expect(getReactionController('HCl+NaOH')?.id).toBe('hcl_naoh_neutralization');
      expect(getReactionController('CuSO4+NaOH')?.id).toBe('cuso4_naoh_precipitate');
      expect(getReactionController('BaCl2+Na2SO4')?.id).toBe('bacl2_h2so4_precipitate');
      expect(getReactionController('Fe+CuSO4')?.id).toBe('fe_cuso4_displacement');
      expect(getReactionController('CaCO3+HCl')?.id).toBe('caco3_hcl_gas');
    });
  });

  describe('Precipitation & Crystal Controllers', () => {
    it('Reaction 03: BaSO4 exhibits fine micro-crystalline haze and slow settling', () => {
      const ctrl = getReactionController('BaCl2+Na2SO4')!;
      ctrl.initialize(mockContext);
      mockRuntime.elapsed = 0.5 * mockRuntime.duration;
      ctrl.update(mockContext);

      expect(mockRuntime.turbidity).toBeGreaterThan(0.5);
      expect(mockRuntime.precipitateRate).toBeGreaterThan(0);
      expect(ctrl.getReactionZone(mockContext).origin).toBe('liquidInterface');
    });

    it('Reaction 04: AgCl produces chunky curdy aggregates', () => {
      const ctrl = getReactionController('AgNO3+NaCl')!;
      ctrl.initialize(mockContext);
      mockRuntime.elapsed = 0.6 * mockRuntime.duration;
      ctrl.update(mockContext);

      expect(mockRuntime.turbidity).toBeGreaterThan(0.4);
      expect(mockRuntime.targetColor.toLowerCase()).toBe('#f8fafc');
    });

    it('Reaction 05: Golden Rain PbI2 forms shimmering crystal platelets', () => {
      const ctrl = getReactionController('golden_rain_pbi2')!;
      ctrl.initialize(mockContext);
      mockRuntime.elapsed = 0.7 * mockRuntime.duration;
      ctrl.update(mockContext);

      expect(mockRuntime.targetColor.toLowerCase()).toBe('#eab308');
      expect(mockRuntime.turbidity).toBeGreaterThan(0.3);
    });

    it('Reaction 06: Cu(OH)2 creates gelatinous azure blue flocs', () => {
      const ctrl = getReactionController('cuso4_naoh_precipitate')!;
      ctrl.initialize(mockContext);
      mockRuntime.elapsed = 0.5 * mockRuntime.duration;
      ctrl.update(mockContext);

      expect(mockRuntime.targetColor.toLowerCase()).toBe('#0284c7');
      expect(mockRuntime.precipitateRate).toBeGreaterThan(0);
    });

    it('Reaction 24: Colloidal sulfur has induction lag then sudden turbidity jump', () => {
      const ctrl = getReactionController('na2s2o3_hcl_turbidity')!;
      ctrl.initialize(mockContext);

      // Early phase (progress 0.1): clear induction lag
      mockRuntime.elapsed = 0.1 * mockRuntime.duration;
      ctrl.update(mockContext);
      expect(mockRuntime.turbidity).toBeLessThan(0.05);

      // Post-induction phase (progress 0.6): sudden milky-yellow clouding
      mockRuntime.elapsed = 0.6 * mockRuntime.duration;
      ctrl.update(mockContext);
      expect(mockRuntime.turbidity).toBeGreaterThan(0.4);
    });

    it('Reaction 25: CuSO4 + NH3 displays multi-stage transition from gel to crystal-clear deep royal blue', () => {
      const ctrl = getReactionController('cuso4_nh3_complex')!;
      ctrl.initialize(mockContext);

      // Stage 1 (0.2): pale blue precipitate forms
      mockRuntime.elapsed = 0.2 * mockRuntime.duration;
      ctrl.update(mockContext);
      expect(mockRuntime.precipitateRate).toBeGreaterThan(0);
      expect(mockRuntime.customData.stage).toBe(1);

      // Stage 2 (0.8): excess NH3 dissolves precipitate into transparent royal blue [Cu(NH3)4]2+
      mockRuntime.elapsed = 0.8 * mockRuntime.duration;
      ctrl.update(mockContext);
      expect(mockRuntime.customData.stage).toBe(2);
      expect(mockRuntime.targetColor.toLowerCase()).toBe('#1d4ed8');
    });

    it('Reaction 26: Al(OH)3 amphoteric dissolution clears up in excess NaOH', () => {
      const ctrl = getReactionController('al_naoh_amphoteric')!;
      ctrl.initialize(mockContext);

      // Phase 1 (0.25): white gel forms
      mockRuntime.elapsed = 0.25 * mockRuntime.duration;
      ctrl.update(mockContext);
      expect(mockRuntime.turbidity).toBeGreaterThan(0.3);

      // Phase 2 (0.85): redissolves as soluble [Al(OH)4]-
      mockRuntime.elapsed = 0.85 * mockRuntime.duration;
      ctrl.update(mockContext);
      expect(mockRuntime.turbidity).toBeLessThan(0.3);
    });
  });

  describe('Gas Evolution & Effervescence Controllers', () => {
    it('Reaction 08: CaCO3 + HCl evolves CO2 strictly from solid surface', () => {
      const ctrl = getReactionController('caco3_hcl_gas')!;
      expect(ctrl.getReactionZone(mockContext).origin).toBe('solidSurface');
      ctrl.initialize(mockContext);
      mockRuntime.elapsed = 0.4 * mockRuntime.duration;
      ctrl.update(mockContext);

      expect(mockRuntime.gasGenerationRate).toBeGreaterThan(0);
    });

    it('Reaction 09 & 10: Zn/Mg + HCl produces H2 microbubbles and exothermic rise', () => {
      const znCtrl = getReactionController('zn_hcl_gas')!;
      znCtrl.initialize(mockContext);
      mockRuntime.elapsed = 0.5 * mockRuntime.duration;
      znCtrl.update(mockContext);
      expect(mockRuntime.gasGenerationRate).toBeGreaterThan(0);

      const mgCtrl = getReactionController('mg_hcl_gas')!;
      mgCtrl.initialize(mockContext);
      mockRuntime.elapsed = 0.5 * mockRuntime.duration;
      mgCtrl.update(mockContext);
      expect(mockRuntime.temperature).toBeGreaterThan(25.0);
    });

    it('Reaction 12: NH3 + HCl produces dense white NH4Cl particulate aerosol fumes', () => {
      const ctrl = getReactionController('nh3_hcl_fumes')!;
      expect(ctrl.getReactionZone(mockContext).origin).toBe('airLiquidInterface');
      ctrl.initialize(mockContext);
      mockRuntime.elapsed = 0.5 * mockRuntime.duration;
      ctrl.update(mockContext);

      expect(mockRuntime.gasGenerationRate).toBeGreaterThan(0);
      expect(mockRuntime.customData.fumeDensity).toBeGreaterThan(0.4);
    });

    it('Reaction 18: Cu + conc HNO3 produces dense brown NO2 plume and green/blue solution', () => {
      const ctrl = getReactionController('cu_hno3_conc')!;
      ctrl.initialize(mockContext);
      mockRuntime.elapsed = 0.5 * mockRuntime.duration;
      ctrl.update(mockContext);

      expect(mockRuntime.customData.gasColor).toBe('#78350f'); // Dark brown NO2
      expect(mockRuntime.gasGenerationRate).toBeGreaterThan(0);
    });
  });

  describe('Alkali Metal, Redox, Clocks & Pyrotechnics', () => {
    it('Reaction 17: Sodium + Water floats, darts via recoil thrust, and undergoes molten transition', () => {
      const ctrl = getReactionController('sodium_water_reaction')!;
      expect(ctrl.getReactionZone(mockContext).origin).toBe('airLiquidInterface');
      ctrl.initialize(mockContext);

      // Start: cold solid metal piece
      expect(mockRuntime.customData.isMolten).toBe(false);

      // Exothermic heating melts sodium at 97.8 C
      mockRuntime.elapsed = 0.4 * mockRuntime.duration;
      ctrl.update(mockContext);
      expect(mockRuntime.customData.isMolten).toBe(true);
      expect(mockRuntime.surfaceActivity).toBeGreaterThan(0.4);

      // Surface recoil thrust creates wave impulses
      if (ctrl.updateSurface) ctrl.updateSurface(mockContext);
      expect(impulses.length).toBeGreaterThan(0);
    });

    it('Reaction 23: Landolt Iodine Clock remains colorless then triggers sudden midnight blue flip', () => {
      const ctrl = getReactionController('iodine_clock')!;
      ctrl.initialize(mockContext);

      // Before induction threshold (0.65): colorless
      mockRuntime.elapsed = 0.5 * mockRuntime.duration;
      ctrl.update(mockContext);
      expect(mockRuntime.currentColor).toBe('#f8fafc');

      // After threshold (0.75): sudden midnight blue flip
      mockRuntime.elapsed = 0.75 * mockRuntime.duration;
      ctrl.update(mockContext);
      expect(mockRuntime.currentColor).toBe('#0f172a');
      expect(mockRuntime.customData.hasFlipped).toBe(true);
    });

    it('Reaction 27: Magnesium combustion emits blinding white Planck radiation and sparks', () => {
      const ctrl = getReactionController('burn_magnesium')!;
      ctrl.initialize(mockContext);
      mockRuntime.elapsed = 0.5 * mockRuntime.duration;
      ctrl.update(mockContext);

      expect(mockRuntime.heatReleaseRate).toBeGreaterThan(100);
      expect(mockRuntime.customData.colorTemperature_K).toBeGreaterThanOrEqual(3000);
      expect(bursts.length).toBeGreaterThan(0);
    });

    it('Reactions 28-30: Flame test controllers emit characteristic atomic emission wavelengths', () => {
      const cuCtrl = getReactionController('flame_cu')!;
      cuCtrl.initialize(mockContext);
      expect(mockRuntime.currentColor).toBe('#10b981'); // Blue-green 510 nm

      const naCtrl = getReactionController('flame_na')!;
      naCtrl.initialize(mockContext);
      expect(mockRuntime.currentColor).toBe('#facc15'); // Yellow 589 nm doublet

      const kCtrl = getReactionController('flame_k')!;
      kCtrl.initialize(mockContext);
      expect(mockRuntime.currentColor).toBe('#c084fc'); // Lilac 766 nm
    });
  });

  describe('ReactionSimulationEngine Integration & Scrubbing', () => {
    let engine: ReactionSimulationEngine;

    beforeEach(() => {
      engine = ReactionSimulationEngine.getInstance();
      engine.resetAll();
    });

    it('initializes runtime and updates via fixed-timestep accumulator (1/60s)', () => {
      const runtime = engine.startReaction('beaker_1', 'caco3_hcl_gas', { duration: 4.0 });
      expect(runtime).not.toBeNull();
      expect(engine.getRuntime('beaker_1')).toBeDefined();

      // Step by 0.1 second (should trigger multiple 1/60s sub-steps)
      engine.update(0.1, 1.0);
      const updatedRuntime = engine.getRuntime('beaker_1');
      expect(updatedRuntime?.elapsed).toBeGreaterThan(0);
    });

    it('scrubs timeline forward and backward to any progress percentage', () => {
      engine.startReaction('beaker_1', 'golden_rain_pbi2', { duration: 5.0 });

      // Scrub to 35%
      engine.scrubReaction('beaker_1', 0.35);
      expect(engine.getRuntime('beaker_1')?.progress).toBeCloseTo(0.35, 2);

      // Scrub to 80%
      engine.scrubReaction('beaker_1', 0.80);
      expect(engine.getRuntime('beaker_1')?.progress).toBeCloseTo(0.80, 2);

      // Scrub back to 10%
      engine.scrubReaction('beaker_1', 0.10);
      expect(engine.getRuntime('beaker_1')?.progress).toBeCloseTo(0.10, 2);
    });
  });

  describe('VFX Studio Morphologies & Recipe Synchronization', () => {
    it('resolves all 8 non-spherical precipitate morphologies accurately', () => {
      expect(PRECIPITATE_MORPHOLOGIES.length).toBe(8);
      for (const morph of PRECIPITATE_MORPHOLOGIES) {
        expect(morph.substance).toBeTruthy();
        expect(resolveMorphology(morph.substance, morph.type as any)).toBe(morph.type);
        expect(resolveMorphology(morph.substance)).toBe(morph.type);
      }
    });

    it('provides valid VFX recipes for all 30 VFX Studio reaction keys', () => {
      const studioKeys = [
        'AgNO3+NaCl', 'golden_rain_pbi2', 'BaCl2+Na2SO4', 'cuso4_naoh_precipitate',
        'fecl3_naoh_precipitate', 'cacl2_na2co3_precipitate', 'cuso4_nh3_complex',
        'al_naoh', 'na2s2o3_hcl_turbidity', 'caco3_hcl_gas', 'zn_hcl_gas', 'mg_hcl_gas',
        'h2o2_mno2_decomposition', 'nh3_hcl_fumes', 'na2co3_hcl_gas', 'cu_hno3_conc',
        'cu_conc_h2so4_heated', 'hcl_naoh_neutralization', 'h2so4_naoh_neutralization',
        'k2cr2o7_naoh_equilibrium', 'fe_cuso4_displacement', 'fecl3_kscn_complex',
        'kmno4_oxalic_redox', 'iodine_clock', 'cuoh2_thermal_decomposition',
        'iodine_sublimation', 'water_into_conc_h2so4_explosion', 'sodium_water_reaction',
        'burn_magnesium', 'flame_cu', 'flame_na', 'flame_k'
      ];
      for (const key of studioKeys) {
        const recipe = getReactionVfxRecipe(key);
        expect(recipe, `VFX recipe for ${key} must exist`).not.toBeNull();
        expect(recipe?.duration).toBeGreaterThan(0);
      }
    });
  });

  describe('Realistic VFX Physics: Foam Suppression & Ballistic Acid Splatter', () => {
    it('ensures spills land precisely on the workbench table surface (Y <= -1.15)', () => {
      const store = useAppStore.getState();
      store.addSpill([1.5, 0, 1.0], 5.0, ['H2SO4'], '#fca5a5', 'Test Splatter');
      const spills = Object.values(useAppStore.getState().spills);
      expect(spills.length).toBeGreaterThan(0);
      const latestSpill = spills[spills.length - 1];
      expect(latestSpill.position[1]).toBeLessThanOrEqual(-1.15);
      expect(latestSpill.isHazard).toBe(true);
    });

    it('listens to acid:splatter event on vfxBus and validates projectile properties', () => {
      let received: any = null;
      const unsub = vfxBus.on('acid:splatter', (data) => {
        received = data;
      });

      vfxBus.emit('acid:splatter', {
        position: [0, 0.85, 0],
        count: 75,
        speed: 5.2,
        color: '#fca5a5',
        isAcid: true,
        substances: ['H2SO4'],
      });

      expect(received).not.toBeNull();
      expect(received.count).toBe(75);
      expect(received.isAcid).toBe(true);
      expect(received.position[1]).toBe(0.85);
      unsub();
    });
  });
});


