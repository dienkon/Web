# CHEMDEX LAB — EFFECTS & SIMULATION SUBSYSTEM AUDIT
**Date:** October 2026  
**Scope:** Verification of simulation trees (`src/sim/*` vs `src/simulation/*`), visual effect systems (`vfx/recipes/*` vs `vfx/reactions/*`), and findings F1–F10.

---

## 1. SIMULATION SUBTREES: `src/sim/*` vs `src/simulation/*`

### Evidence
- **`src/simulation/*` (LIVE ENGINE):**
  - Imported by `src/App.tsx` (`SimulationDebugPanel`), `src/components/three/LabScene.tsx` (`SimulationDebugGizmos`), `src/vfx/materials/liquid.tsx` (`SimulationEngine`), `src/pour/controller/PourController.ts` (`kineticsEngine`), `src/vfx/director.tsx` (`PhysicalSimulationRenderer`), and `tests/realism_engine.test.ts`.
  - Actively executes per-frame thermodynamics, multi-stage nucleate/film boiling, Stokes precipitation settling, Richardson-Zaki sediment bed accumulation, and Clausius-Clapeyron evaporation in R3F `useFrame` passes.
- **`src/sim/*` (PARALLEL COMPUTATION LIBRARY):**
  - Contains headless 2D MacCormack fluid grid, 1D shallow water waves, and empirical weir formulas.
  - Imported only by `tests/physics_sim.test.ts`, `tests/apparatus_and_mechanisms.test.ts`, `src/adapters/legacy.ts`, and `src/render/particlesRender.ts`.
  - Not directly mounted in the primary R3F rendering scene graph.

### Architectural Decision
- **Primary simulation standard:** `src/simulation/*`.
- We preserve `src/sim/*` as an underlying analytical reference library to prevent breaking existing mechanism unit tests, but all visual and reactive effect couplings must target `src/simulation/*` and `src/vfx/*`.
- Zero third simulation trees will be created.

---

## 2. REACTION-VISUAL SYSTEMS: `vfx/recipes/*` vs `vfx/reactions/*`

### Evidence
- **`src/vfx/reactions/*`:**
  - 30 hand-built imperative `ReactionVisualController` classes executing within `ReactionSimulationEngine` at a fixed 60 Hz timestep.
  - Controls granular kinematics (e.g. sodium skittering physics, molten sphere deformation, wake phenolphthalein trails).
- **`src/vfx/recipes/*`:**
  - Timeline-based layer DSL (`REACTION_VFX_RECIPES` and `generic.ts`) sampled by `VfxDirector` in `src/vfx/director.tsx`.
  - Glued together using fragile substring matching (e.g. `reactionId.includes('sodium') || includes('Na') || includes('Mg')`).
- **Collisions & Discrepancies in `src/vfx/reactions/registry.ts`:**
  - `'cacl2_na2co3_precipitate'` mistakenly mapped to `AgClCurdyPrecipitationController` (curdy AgCl vs chalky CaCO₃ fine powder).
  - `'CaCl2+Na2CO3'` mistakenly mapped to `Na2Co3HclGasController` (CaCl₂ + Na₂CO₃ produces NO gas!).
  - `'AgNO3+KI'` mistakenly mapped to `PbI2GoldenRainController` (AgI is pale yellow curdy precipitate, not glittering gold flakes).
  - `'FeCl3+NaOH'` mistakenly mapped to `CuOH2GelPrecipitationController` (Fe(OH)₃ is rust-brown floc, not copper-cyan gel).
  - `'Zn+CuSO4'` mistakenly mapped to `FeCuSo4DisplacementController`.
  - `'K+H2O'` aliased to `SodiumWaterController` without potassium lilac flame coloration.
  - `'NaHCO3+HCl'` aliased to `Na2Co3HclGasController` without stoichiometric gas ratio distinction.

### Architectural Decision
- **Unified Standard: `ReactionProgram` over Effect-Atom Catalog.**
- Handcrafted bespoke controllers are retained under `provenance: 'handcrafted'` with explicit `controller` bindings.
- New and expanded reactions (100+ reaction programs) are purely declarative data documents composing Effect Atoms.
- Disambiguate every mismatched controller alias with dedicated programs and controllers.

---

## 3. AUDIT FINDINGS SUMMARY (F1–F10)

| Finding | Description | Root Cause | Resolution Strategy |
|---|---|---|---|
| **F1** | AI `effects[]` array is dead data | `src/shared/schemas.ts` and `server/ai.ts` output 6 coarse flags ignored by frontend | Replace AI output with `ReactionProgram` validated schema |
| **F2** | AI-resolved reactions teleport without kinetics or conservation | `useAppStore.ts` mutates state directly without `activeKinetics` or stoichiometry | AI path runs through `applyProgramToLedger` + `activeKinetics` |
| **F3** | String-sniffing heuristics in `director.tsx` | Imperative controllers and recipe layers lacked a unified schema | Driven declaratively by `ReactionProgram` atom timelines |
| **F4** | Registry alias collisions | Incorrect fuzzy alias registrations in `vfx/reactions/registry.ts` | Dedicated programs/controllers + automated collision test |
| **F5** | `ReactionContext` helpers are stubs | `addSurfaceImpulse`, `emitSparks`, `playSound` had limited implementations | Fully wire to `surface:ripple`, `sparks` bus, and procedural WebAudio |
| **F6** | Generic fallback is too thin | `vfx/recipes/generic.ts` hardcodes `curdy` morphology and ignores thermodynamics | Fallback generated from Conservation Ledger + stoichiometric rules |
| **F7** | Vocabulary mismatch across 4 layers | Four incompatible morphology enums | Unified into canonical enums in `src/vfx/catalog/vocab.ts` + legacy adapters |
| **F8** | Coverage limited to ~30 reactions | Rest falling back to un-simulated AI | Composable atom catalog + 100+ reaction programs covering textbook chemistry |
| **F9** | Time honesty unmodeled | Multi-hour settling compressed without notice | Explicit `physical_s` vs `display_s` with `⏩ time-lapse ×N` badge |
| **F10** | Visual state decoupled from mass ledger | Effects read scripted 0→1 progress rather than moles consumed | Reaction progression and visual intensity strictly bound to `Ledger` |
