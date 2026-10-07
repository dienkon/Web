# CHANGELOG — CHEMDEX LAB PHYSICALLY-BASED REALISM OVERHAUL

## [2.0.0] - 2026-10-04

### Overview
Complete transformation of the virtual chemistry lab from scripted/heuristic visual approximations into a physically grounded, interactive computational chemistry and graphics simulation. Every visual and acoustic phenomenon now emerges deterministically from fundamental thermodynamic, kinetic, and fluid dynamic state equations.

---

### Milestones Summary

#### M0: Audit & Scaffolding
- Produced comprehensive `AUDIT.md` (10 sections) evaluating rendering stack (Three.js r185 + R3F 9 + WebGL2), Zustand state architecture, and interaction event flow.
- Established backwards-compatible legacy adapter layer (`src/adapters/legacy.ts`) with feature flag `?engine=v2` (default) vs `?engine=v1`.
- Built core infrastructure: `SimClock` (fixed $\Delta t = 1/120\text{ s}$ substep, timescale $1\times-30\times$), `PRNG` (`sfc32` seedable via `?seed=`), and typed event bus (`SimEventBus`).

#### M1: Physical Databases & Chemical Solvers
- Authored 56+ substance physical database (`src/chem/substances.ts`) and 30+ reaction database (`src/chem/reactions.ts`) with validation suite verifying atom and charge conservation.
- Built equilibrium solvers (`src/chem/equilibrium.ts`): $K_{\text{sp}}$ with Debye-Hückel / Davies activity corrections ($\log \gamma$), common-ion effect, polyprotic acid-base charge balance in pH space, and Henry's law gas solubility.
- Implemented Arrhenius kinetics ODE integrator (`src/chem/kinetics.ts`) with operator splitting and limiting reagent protection.
- Built Beer-Lambert spectral transmission model (`src/chem/optics.ts`) using CIE 1931 $2^\circ$ Color Matching Functions and D65 illuminant, plus continuous Henderson-Hasselbalch indicator transitions (`src/chem/indicators.ts`).

#### M2: Vessel Geometry, Optics & Free-Surface Dynamics
- Numerical quadrature LUT (256 samples) for volume $\leftrightarrow$ height inversion across 6 vessel geometries (`src/sim/vessel.ts`).
- Linearized shallow-water wave equation solver (`src/sim/surface.ts`) with wetting meniscus ($h_c \exp(-d/\ell_c)$) and Rankine combined stirring vortex depression.
- Physical borosilicate glass shader (`src/render/glass.ts`) with Schlick Fresnel double-refraction and soda-lime edge highlights.
- Liquid material (`src/render/liquid.ts`) integrating path-length-dependent volume absorption and Tyndall scattering.

#### M3: 2D Stable Fluids Solver & Species Transport
- Bounded 2D Navier-Stokes solver (`src/sim/fluidGrid.ts`) with MacCormack advection, min/max clamping, vorticity confinement, thermal buoyancy, and Red-Black Gauss-Seidel pressure projection.
- Coupled multi-species concentration field advection.

#### M4: Particles & Bubble Dynamics
- Zero per-frame allocation Structure-of-Arrays (SoA) particle engine (`src/sim/particles.ts`) with free-list pool.
- Bubble manager (`src/sim/bubbles.ts`) implementing Fritz departure diameter ($D_d \approx 2-4\text{ mm}$), Mendelson terminal rise velocity, subcooled condensation collapse, surface burst Worthington jet droplets, and Minnaert frequency synthesis.

#### M5: Pool Boiling, Evaporation, Steam & Condensation
- 5-regime pool boiling engine (`src/sim/boiling.ts`) with latent heat sink temperature plateau ($100.0^\circ\text{C}$ at 1 atm) and superheating bumping.
- Boundary-layer mass transfer evaporation (`src/sim/evaporation.ts`) with Antoine saturation vapor pressure and visible steam fog with transparent gap directly above liquid surface.
- Glass wall condensation engine (`src/sim/condensation.ts`) with fog film, discrete droplets, and gravity sliding above pinning threshold.

#### M6: Precipitation Pipeline
- Classical nucleation rate $J(S) = A_n \exp(-B_n / \ln^2 S)$ (`src/sim/precipitation.ts`).
- 6 morphology presets (Curdy, Fine crystalline, Gelatinous, Flocculent, Crystalline dense, Colloidal).
- Richardson-Zaki hindered settling and sediment bed height-field with angle of repose thermal relaxation and shear resuspension.
- Thermal recrystallization of lead iodide ($\text{PbI}_2$) "golden rain".

#### M7: Dissolution, Metals & Solid-Liquid Interactions
- Noyes-Whitney dissolution (`src/sim/solids.ts`) with shrinking particles and dense sinking plumes.
- Metal-acid reactions ($\text{Mg}, \text{Zn}, \text{Fe} + \text{HCl}$) with surface $\text{H}_2$ bubble nucleation and copper displacement dendrites.
- Alkali metal ($\text{Na}$) surface skating and spherical droplet melting.

#### M8: Heating Equipment & Combustion
- First-order thermal lag hotplate, Bunsen burner (premixed blue vs luminous yellow), and ice bath (`src/sim/heater.ts`).
- Blackbody Planck radiation, atomic flame tests ($\text{Li}, \text{Na}, \text{K}, \text{Ca}, \text{Cu}$), cobalt-glass optical filter, and blinding white magnesium pyrotechnics (`src/sim/combustion.ts`).

#### M9: Hydraulic Pouring & Droppers
- Francis/Poleni weir law volumetric flow rate (`src/sim/pour.ts`).
- Ballistic stream parabola with continuous thinning and Rayleigh-Plateau droplet breakup.
- Tate's law dropper detachment ($V \approx 0.05\text{ mL}$) and air entrainment bubbles upon plunging jet impact.

#### M10: Procedural Audio Engine
- Synthesizer (`src/audio/procedural.ts`) driving Minnaert bubble chirps, continuous boiling rumble, fizz hiss, glassware modal clinks, and air-column filling pitch rise without pre-recorded sound samples.

#### M11: Post-Processing & Look-Dev Polish
- WebGL capability detection and adaptive performance controller (`src/render/gl.ts`).
- Volumetric steam/gas plume shaders (`src/render/volumeSmoke.ts`), combustion flame shaders (`src/render/flame.ts`), and heat-haze screen distortion (`src/render/post.ts`).

#### M12: Performance QA & Test Suite
- 50 headless automated unit tests across 4 test suites (`tests/chem.test.ts`, `tests/physics_sim.test.ts`, `src/pour/physics/__tests__/physics.test.ts`, `src/simulation/__tests__/simulation.test.ts`) passing with 100% success rate.
- TypeScript compiler `tsc --noEmit` and Vite production build verified with 0 errors.

#### M13: Documentation & Manuals
- Authored `docs/PHYSICS.md`, `docs/EFFECTS.md`, and `AUDIT.md`.

---

### Phase 2: Scientific Realism, Laboratory Tools & Procedure-Driven Experiment Engine (October 2026)

#### M14: Authentic Precipitate Morphologies & Non-Spherical Geometry
- Replaced generic glowing sphere particles with 8 distinct, authentic crystalline and amorphous morphologies:
  - `FINE_POWDER`: Sub-micron faceted micro-crystals with high optical turbidity and Brownian agitation (e.g. $\text{BaSO}_4$).
  - `FLOC`: Coalescing irregular agglomerates with stochastic collision clustering (e.g. $\text{Fe(OH)}_3$).
  - `CURD`: Dense, chunky cottage-cheese curd aggregates that flocculate rapidly (e.g. $\text{AgCl}$).
  - `GEL`: Translucent, deformable hydrated amorphous gel matrices (e.g. $\text{Cu(OH)}_2$).
  - `CRYSTAL_PLATE`: Hexagonal prism platelets with specular surface facet glints and twinkling highlights for PbI2 Golden Rain.
  - `CRYSTAL_ROD`: Acicular prismatic needles aligning with vertical convection currents (e.g. $\text{CaSO}_4$).
  - `IRREGULAR_GRAIN`: Coarse polyhedral mineral crystals that sink promptly (e.g. $\text{CaCO}_3$).
  - `METALLIC_DEPOSIT`: Rough dendritic specular clusters nucleating on solid substrates (e.g. $\text{Cu}$ from $\text{Fe} + \text{CuSO}_4$).

#### M15: Extreme Realism for Sodium on Water ($\text{2Na} + \text{2H}_2\text{O} \to \text{2NaOH} + \text{H}_2$)
- Implemented `<FloatingSodiumPellet>`:
  - Eliminates gravel chunks; spawns authentic low-profile metallic sodium block on the liquid meniscus.
  - Directional hydrogen jet propulsion: random recoil impulses driving rapid skittering across the surface with boundary reflection.
  - Endothermic/exothermic thermal transition: irregular solid block softens and collapses into a silvery molten bead as $T \ge 97.8^\circ\text{C}$.
  - Surface meniscus indentation ring dynamically tracking the floating bead position.
  - Localized 589 nm yellow sodium atomic emission flame cone during ignition.
  - Progressive volume consumption ($100\% \to 0\%$) leaving a vibrant alkaline pink phenolphthalein trail.
  - Reactive sizzling audio and hydrogen pop effect.

#### M16: Rayleigh-Taylor Convective Reaction Fronts
- Liquid shader updated with dynamic convective reaction front uniforms (`uHasActiveReaction`, `uReactionProgress`, `uReactionInitialColor`, `uReactionTargetColor`, `uBaseY`).
- Procedural 3D Simplex noise creates Rayleigh-Taylor fingering and downward plume dispersion as reagents mix.
- Continuous hex color interpolation smoothly transitions liquid bulk during kinetic progression.

#### M17: Interactive Laboratory Micro-Spatula Tool
- Added `InteractiveSpatula.tsx` with high-polygon stainless steel handle, knurled anti-slip sleeve, and curved dished scoop tip.
- Supports scooping solid chemicals ($\text{Na}, \text{KI}, \text{NaCl}, \text{CaCO}_3, \text{Fe}, \text{CuSO}_4$) from reagent bottles onto the blade.
- Renders 3D granular crystal mounds on the spatula tip.
- Tilt-to-dispense animation drops falling particle cascades into target vessels with procedural powder drop audio.

#### M18: Procedural Experiment State Machine & Multi-Tier Difficulty Engine
- Created `src/engine/experimentEngine.ts` supporting full procedural actions (`MEASURE_VOLUME`, `MEASURE_MASS`, `POUR`, `ADD_SOLID`, `STIR`, `HEAT`, `OBSERVE`, `MEASURE_TEMPERATURE`, `MEASURE_PH`, `CLEAN_TOOL`).
- 4 comprehensive difficulty modes: `Guided`, `Standard`, `Practical`, `Exam`.
- Equipment contamination tracker: flags cross-contamination when tools are switched without rinsing in distilled water; provides quick decontamination rinse button.
- Real-time sensor tolerance feedback: compares actual measured volume/mass/temperature against target thresholds with acceptable deviations ($\pm 1.0\text{ mL}$, $\pm 0.1\text{ g}$, $\pm 2^\circ\text{C}$).
- Exam Report Card: calculates final score out of 100, assigns letter grade (`A+` to `F`), and outputs pedagogical feedback.
- Added 2 new authentic curriculum experiments: `agcl_curdy_precipitation` and `exothermic_neutralization`.

#### M19: Developer VFX Studio Morphology Inspector & Test Suite Expansion
- Added dedicated `Morphology` tab in `src/vfx/dev/VfxGallery.tsx` for live testing and inspection of all 8 precipitate types with Stokes settling velocities and liquid agitation.
- Expanded test suite to 61/61 passing unit tests including `tests/experiment_engine.test.ts`.
- Verified production build (`vite build` + `esbuild`) and TypeScript lint with 0 errors.

#### M20: Dedicated Reaction Controllers, Fixed-Timestep Accumulator & Interactive Telemetry Scrubber
- **Reaction Simulation Engine (`ReactionSimulationEngine.ts`):**
  - Deterministic fixed-timestep sub-stepping accumulator ($\Delta t = 1/60\text{ s}$) decoupling visual physics from display refresh rate.
  - Multi-vessel runtime management and active state routing directly to dedicated controllers.
  - Coupled surface wave impulses, procedural audio triggers, and bidirectional timeline scrubbing.
- **Dedicated Reaction Controllers for All 30 Reactions (`src/vfx/reactions/controllers/*`):**
  - Implemented 30 dedicated reaction visual controller classes with zero generic fallback animations.
  - Neutralization (`HclNaohNeutralizationController`, `H2so4NaohNeutralizationController`).
  - Precipitations (`BaSO4PrecipitationController`, `AgClCurdyPrecipitationController`, `PbI2GoldenRainController`, `CuOH2GelPrecipitationController`, `ColloidalSulfurController`, `CuSo4Nh3MultiStageController`, `Al2So43NaOhAmphotericController`).
  - Gas Evolution (`CaCo3HclGasController`, `ZnHclGasController`, `MgHclGasController`, `H2o2Mno2CatalyticController`, `Nh3HclFumesController`, `Na2Co3HclGasController`, `CuHno3ConcController`, `CuConcH2so4HeatedController`).
  - Redox & Complexes (`FeCuSo4DisplacementController`, `CuOh2ThermalDecompositionController`, `IodineSublimationController`, `WaterIntoConcH2so4ExplosionController`, `FeCl3KscnComplexController`, `Kmno4OxalicRedoxController`, `K2Cr2O7NaOhEquilibriumController`, `IodineClockController`).
  - Combustion & Flame Tests (`BurnMagnesiumController`, `FlameTestCopperController`, `FlameTestSodiumController`, `FlameTestPotassiumController`).
- **Interactive Developer VFX Studio Upgrades (`VfxGallery.tsx`):**
  - Interactive Timeline Scrubber (0% to 100%) with bidirectional scrubbing, play/pause, $\pm 10\%$ step buttons, and real-time elapsed time counter.
  - Speed multipliers: `0.25x`, `0.5x`, `1x`, `2x`, `4x`.
  - Live Reaction Dynamics Telemetry HUD: Reaction ID, progress, reaction rate ($r$), gas evolution rate ($\text{mL/s}$), precipitate mass ($g$), turbidity ($\tau$), surface activity ($E_{\text{surf}}$), bubble & solid particle counts, and real-time measured FPS counter.
  - Comprehensive catalog of all 30 reactions with single-click execution.
- **Automated Test Suite Expansion (`tests/reaction_controllers.test.ts`):**
  - 18 new automated unit tests validating all 30 reaction controllers, Stokes settling, reaction zones, induction lags, autocatalytic transitions, and fixed-timestep accumulator scrubbing.
  - Total test count: 79/79 passing vitest tests across 6 suites with zero errors.

---

### Phase 3: "Real Lab" Physical Handling, Breakage, Apparatus & Multi-Device Control (October 2026)

#### M21: Unified Hand Model & Uncapped Pouring Range (`0 -> 180°`)
- **`HeldObjectController` & `HandRig`:**
  - Critically-damped spring position/orientation integrator ($\omega = 18\text{ rad/s}$) maintaining smooth hand inertia without tunneling.
  - Grip anchor pivots (`body`, `neck`, `rim`, `handle`, `base`) dynamically aligning physical rotation centers.
  - Thermal reflex rules: bare-hand manipulation of vessels $> 60^\circ\text{C}$ drops the object; tongs or heat-resistant gloves required.
- **Uncapped Tilt & Inversion:**
  - Removed artificial $\sim 112^\circ$ limits; unified $0 \to \pi$ rad ($0 \to 180^\circ$) pouring across all open glassware in `src/handling/limits.ts`.
  - Inverted weir & gravity orifice draining: complete fluid emptying ($\text{volume} < 1\text{ mL}$) at $180^\circ$ with exact mass conservation.
  - Glug-glug air ingestion: periodic pulsing ($\sim 3.5\text{ Hz}$) for narrow-necked vessels (Erlenmeyers, volumetric flasks) tilted past $48^\circ$.
  - Free-surface world horizontal alignment and hydrostatic meniscus clipping across full $180^\circ$ inversion.

#### M22: Multi-Device Control & Input Router
- **Mouse Wheel Router (`WheelRouter.ts`):**
  - Held vessel: tilt ($\pm 1.5^\circ$/notch; $\pm 0.25^\circ$ with Alt), Shift+Wheel for vertical lift, Alt+Wheel for yaw rotation.
  - Empty bench: passes through to OrbitControls camera zoom.
  - HUD Control Ring (`ControlRing.tsx`): circular live parameter gauge with color-coded safety margins.
- **Touch & Keyboard Parity:**
  - Touch gestures: two-finger twist (yaw), vertical two-finger drag (tilt), pinch (lift), long-press (grab), double-tap (radial menu).
  - Keyboard mappings: `Q/E` (tilt), `R/F` (lift), `Z/X` (yaw), `G` (grab/release), `T` (tongs), `M` (meniscus eye-level reading mode), `Space` (pour assist), `?` (cheat-sheet).

#### M23: Breakage Physics, Voronoi Shards, Puddles & Cleanup
- **Damage Model (`DamageModel.ts`):**
  - Kinetic energy impact $E = \frac{1}{2}mv^2$ assessing drop height and surface hardness (stone floor vs wood bench).
  - Thermal shock threshold $\Delta T_{\text{crit}}$ (borosilicate $\sim 160\text{ K}$ vs soda-lime $\sim 50\text{ K}$).
- **Procedural Voronoi Shards & 3D Renderer (`ShardsRenderer.tsx`):**
  - High-performance instanced glass shard rendering capped at $\le 600$ instances.
  - Hazard handling: touching broken shards bare-handed causes injury; cleanup requires brush, dustpan, or tweezers into sharps bin.
- **Liquid Puddle Viscous Spreading (`Puddle.ts`):**
  - Radial gravity spreading, bench-edge dripping, and puddle-puddle reactive mixing.

#### M24: Apparatus Assembly & Delivery Tubing
- **Snap-Assembly System (`snapping.ts`):**
  - Support stands, bosshead clamps, rings, tripods, wire gauze, stoppers, and pneumatic water troughs.
- **Pneumatic Tubing Network & Suck-Back (`Tubing.ts`):**
  - Gas displacement bubbling in submerged troughs for gas evolution reactions ($\text{CaCO}_3 + \text{HCl}$).
  - Cooling suck-back: rapid cooling draws water back into the hot reaction flask, triggering thermal shock breakage warnings.

#### M25: Canary Scenarios K1–K5 & Test Suite
- 16 test suites with 156 passing unit tests, including comprehensive Canary suite `tests/canaries_k1_to_k5.test.ts`.
- Zero TypeScript lint errors (`npx tsc --noEmit`) and verified production build.
