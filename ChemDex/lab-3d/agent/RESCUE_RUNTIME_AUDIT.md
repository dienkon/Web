# CHEMDEX LAB — RESCUE RUNTIME AUDIT

## 1. Actual Entry Point
- **Web App Entry**: `index.html` -> `/src/main.tsx` -> mounts `<App />` from `src/App.tsx`.
- **Three.js Canvas**: `src/App.tsx` renders `<LabScene />` in `src/components/three/LabScene.tsx`.
- **Interactive Workbench Overlays**: `WorkbenchToolbar`, `MeasurementHUD`, `VesselInspector`, `DosageModal`, `PourHUD`, `PourInput`.
- **Central Store**: `src/store/useAppStore.ts` manages vessels, chemicals, active kinetics, spills, burner thermodynamics, and simulation loop.

---

## 2. Actual Call Graphs

### 2.1 Actual Pour Call Graph
1. **User Initiation**:
   - User drags Vessel A over Vessel B in `LabScene.tsx` (or presses Space/Q/E via `PourInput.tsx` / `KeyMap.ts` / `WheelRouter.ts` / `TouchGestures.ts`).
   - `nearestTarget` is detected -> calls `PourController.beginPour({ mode: 'ASSIST', sourceId, targetId })`.
2. **Controller Sub-step Loop**:
   - `PourController.tick(delta, vesselsMap)` runs in fixed 1/60s steps: `lifting` -> `tilting` -> `pouring` -> `dripping` -> `returning` -> `settling`.
   - In `tilting`/`pouring`, calls `stepPourSimulation(physSession, vesselsMap, dt, simTime)` in `src/pour/physics/step.ts`.
3. **Physics & Ballistics**:
   - `calculateWeirFlow()` in `src/pour/physics/flow.ts` computes flow rate from volume and tilt.
   - `calculateStreamBallistics()` in `src/pour/physics/ballistics.ts` computes exit velocity and parabolic landing.
   - **Bug / Failure Mode**: If `ballistics.landingKind === 'table'` (due to tilt angle or speed discrepancy), `landsInTarget` becomes `false`, dumping all fluid into `spilled_ml`!
   - In `stepPourSimulation`: artificial intake limit `maxIntakeRate` and `turbulentSplash_ml` discard liquid into spills even during controlled pours!
4. **Visual Stream**:
   - `PhysicalStreamRenderer.tsx` samples `PourController.getSession()`.
   - Draws a parametric cylinder stream and falling droplets.
   - **Bug**: Horizontal acceleration calculation `accelX` and vertical flight time formula `cy = lipY + v0y*t - 0.5*g*t^2` causes stream endpoints to penetrate through vessel bottoms or overshoot unless corrected. Droplets lack targeted attractor and scatter outside target mouth.
5. **Session Commit**:
   - At phase `settling`, `PourController.commitCurrentPour()` calls `storeBridge.commitVesselPour(sourceId, targetId, transferred_ml)`.
   - Calls `store.pourVessel(sourceId, targetId, transferred_ml)` in `useAppStore.ts`.

---

### 2.2 Actual Solid-Add Call Graph
1. **User Action**:
   - Drag solid chemical onto vessel -> `DosageModal.tsx` opens.
   - User selects grams (e.g. 2.0g) -> confirms.
2. **Store Dispatch**:
   - Calls `triggerPour(chemical, targetVesselId, amount)` in `useAppStore.ts`.
   - Sets `pouringChemical: { chemical, targetId, type: 'solid', amount }`.
   - Calls `mixSubstances(targetId, chemical, amt)`.
3. **Visual Representation**:
   - `LabScene.tsx` renders `<AddingAnimation />` (`src/components/three/PouringBottle.tsx`).
   - Renders spatula with falling solid particles into vessel mouth.
   - Unmounts at 1.7s -> calls `clearPour()`.
   - `<SolidContentsRenderer />` (`src/components/three/SolidContentsRenderer.tsx`) takes over rendering inside `<Vessels.tsx>`.
4. **Disappearance Bugs Identified**:
   - `mixSubstances` calculates `addedMoles` but never stores `initialMoles` on `vessel.contents`.
   - `SolidContentsRenderer.tsx` calculates `remainingMoleFraction = content.moles / (content.initialMoles || 0.04)`. If initial moles is < 0.04 mol, the solid appears shrunk immediately.
   - `extractDissolvingReactants(substances)` in `useAppStore.ts` indiscriminately categorizes ALL solid chemicals as dissolving reactants whenever any reaction begins, driving their dissolve progress to 1.0 (disappearance).
   - In `useAppStore.ts` (`pourVessel` line 3715 and `transferLiquidContinuous` line 2933), when liquid volume reaches <= 0.05 mL, `substances: []` and `contents: []` are set to empty arrays, deleting all resting solids.

---

### 2.3 Actual Reaction Call Graph
1. **Trigger**:
   - When substances mix in `mixSubstances` or `pourVessel`.
2. **Resolution**:
   - Checks `executeMultiStepReactions()` (`src/chem/reactions.ts`).
   - If no match, calls `resolveReactionProgram(substances, contents, env)` (`src/vfx/programs/resolver.ts`).
   - Hierarchy: Handcrafted -> Rule-derived -> Cache -> AI -> Fallback (`createFallbackProgram`).
3. **State Mutation**:
   - **TELEPORTATION BUG**: Calls `applyProgramToLedger(resolvedProgram, baseVessel, 1.0)` at $t=0$!
   - Products are generated and reactants consumed instantaneously at extent $\xi = 1.0$.
   - `updatedVessel` is applied to Zustand store immediately.
   - `ActiveKineticsState` is created with `progress = 0`, but chemistry has already finished.
4. **Kinetics Update**:
   - `useAppStore.ts` tick advances `kinetics.progress += effectiveDt / kinetics.duration`.
   - Does not update chemistry extent $\xi(t)$ step-by-step; the chemistry already reached final state.

---

### 2.4 Actual VFX Call Graph
1. **Director**:
   - `<VfxDirector />` (`src/vfx/director.tsx`) mounts in `LabScene.tsx`.
   - Watches `activeKinetics` from `useAppStore`.
   - Looks up `getReactionVfxRecipe(reactionId)` from `src/vfx/recipes/reactionVfx.ts`.
2. **Controllers**:
   - Mounts legacy controller components: `PrecipitationControllers.tsx`, `GasEvolutionControllers.tsx`, `SodiumWaterController.tsx`, `RedoxComplexControllers.tsx`.
3. **Missing Bridge**:
   - `ReactionProgram.visual.timeline` and `EffectAtoms` in `src/vfx/catalog/atoms/` are NEVER executed by `VfxDirector`.
   - Atoms exist as catalog schemas and metadata dictionaries with no live lifecycle player.

---

### 2.5 Actual Simulation Call Graph
- Primary live simulation runs inside `useAppStore.ts` `tick()`:
  - Thermal conduction with Bunsen burner.
  - Boiling point elevation and liquid evaporation.
  - Bumping surge and wall staining.
  - Foam generation and gas overpressure.
- `src/simulation/core/SimulationEngine.ts` contains parallel simulation routines, mostly exercised in unit tests or debug panel.

---

### 2.6 Actual Ledger Call Graph
- `src/engine/ledger.ts`:
  - `applyProgramToLedger(program, vessel, consumedExtent)` computes stoichiometric consumption, precipitation mass, gas moles, temperature changes, and enthalpy.
  - `computeStoichiometricExtent(program, vessel)` finds limiting reagent moles.
  - Currently called only with `consumedExtent = 1.0` during mixing.

---

## 3. Live vs Dead / Legacy Systems

| File / Subsystem | Status | Description |
|---|---|---|
| `src/pour/controller/PourController.ts` | **LIVE** | Primary pour state machine and transfer driver. |
| `src/pour/physics/step.ts` | **LIVE** | Weir flow, ballistics, and fluid increment calculation. |
| `src/pour/render/PhysicalStreamRenderer.tsx` | **LIVE** | 3D mesh cylinder & droplets renderer for pour streams. |
| `src/components/three/SolidContentsRenderer.tsx` | **LIVE** | Instanced mesh renderer for solids resting inside glassware. |
| `src/engine/ledger.ts` | **LIVE** | Stoichiometric ledger authority. |
| `src/vfx/director.tsx` | **LIVE (LEGACY BRIDGE)** | Renders reaction visuals via hardcoded recipes. |
| `src/vfx/catalog/atoms/*.ts` | **DEAD / METADATA ONLY** | 100+ effect atoms with no runtime execution player. |
| `src/vfx/programs/resolver.ts` | **LIVE** | 5-tier program resolver. |
| `src/components/three/PouringBottle.tsx` (`VesselPourAnimation`) | **LEGACY** | Secondary pour animation alternative to PourController. |

---

## 4. Exact Defect Locations

1. **State Teleportation**:
   - `src/store/useAppStore.ts` line 3507: `const ledgerResult = applyProgramToLedger(resolvedProgram, baseVessel, 1.0);`
   - `src/store/useAppStore.ts` line 3864: `const ledgerResult = applyProgramToLedger(resolvedProgram, baseTo, 1.0);`
   - Prematurely commits 100% reaction extent before animation progress begins.

2. **Liquid Loss in Pouring**:
   - `src/pour/physics/step.ts` lines 150-165: `intakeSurplus_ml` and `turbulentSplash_ml` convert liquid directly into spills even during controlled precision pouring.
   - `src/pour/physics/ballistics.ts` lines 106-121: Any trajectory falling outside `insideRadius` / `rimRadius` sets `landingKind = 'table'`, triggering 100% loss in `step.ts` line 196.
   - `src/pour/controller/PourController.ts` lines 153-168: Hover alignment offset does not adaptively ensure lip-to-mouth intersection for diverse vessel geometry.

3. **Solid Disappearance**:
   - `src/store/useAppStore.ts` line 155-161: `extractDissolvingReactants` marks any solid in the vessel as dissolving, even if it is completely inert or unreactive.
   - `src/store/useAppStore.ts` line 2933 & 3715: Emptied vessels set `substances: []` and `contents: []`, wiping solids when liquids pour out.
   - `src/components/three/SolidContentsRenderer.tsx` line 503: Divides by fallback `0.04` mol when `initialMoles` is undefined.

4. **Metadata-Only Atoms**:
   - `src/vfx/catalog/atoms/` contains atom specs (`turbidityRamp`, `nucleateBubbles`, `solidPrecipitationGrowth`, etc.) but lacks a runtime `ProgramPlayer` with `mount()`, `update()`, `writeBack()`, `dispose()`.

5. **Non-deterministic Random State**:
   - `Math.random()` used in `calculateStreamBallistics.ts`, `PhysicalStreamRenderer.tsx`, and `useAppStore.ts` bumping surges instead of seeded deterministic RNG.
