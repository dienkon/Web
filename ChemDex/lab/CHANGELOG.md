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
