# CHEMDEX LAB — EFFECTS REFERENCE & TUNING GUIDE

> **Architecture:** Every visual and audio effect is driven purely by emergent simulated quantities ($T$, $c_k$, $V_l$, $P$, $\phi$, $S$, $\omega$) — zero pre-baked video/GIF assets or hardcoded timers.

---

## 1. POOL BOILING & HIGH-FIDELITY BUBBLE ACOUSTICS ("BÓP BÓP NHƯ THIỆT")

| Property | Details |
|---|---|
| **Module** | `src/simulation/effects/BoilingSystem.ts`, `src/vfx/particles/Bubbles.tsx`, `src/utils/audio.ts` |
| **Trigger** | Heat input $P > 0$, bulk liquid temperature $T \ge 55^\circ\text{C}$, or heterogeneous effervescence ($\text{CaCO}_3$, $\text{Zn}$, $\text{Na}$) |
| **State Variables** | $T_{\text{liquid}}$, $T_{\text{sat}}(P)$, $\text{Eo}$ (Eötvös), $\text{We}$ (Weber), $\text{ar}$ (aspect ratio), $f_{\text{wobble}}$ (Strouhal frequency), $h_{\text{film}}$ (dome drainage) |
| **Physical Regimes** | 1. **Natural Convection ($T < 55^\circ\text{C}$):** Liquid circulation without phase change.<br>2. **Dissolved Gas Degassing ($55-88^\circ\text{C}$):** Micro-bubbles detach from glass micro-cavities.<br>3. **Subcooled Singing ($88-99^\circ\text{C}$):** Vapor bubbles detach and collapse rapidly in cooler bulk liquid, emitting singing frequency.<br>4. **Saturated Nucleate Boiling ($T \approx T_{\text{sat}}$):** Continuous bubble columns with oblate spheroidal deformation.<br>5. **Surface Dome & Burst:** Hemispherical surface dome thins ($0.08-0.20\text{ s}$), ruptures with Worthington micro-jet droplet ejecta ($v_y \sim 0.85\text{ m/s}$) and capillary surface ripples. |
| **Oblate Spheroid Deformation** | Wellek deformation $\text{ar} = \frac{1}{1 + 0.163 \text{Eo}^{0.757}}$ ($0.65 \le \text{ar} \le 0.95$). Volume-preserving scale: $R_{\text{horiz}} = R / \text{ar}^{1/3}$, $R_{\text{vert}} = R \cdot \text{ar}^{2/3}$. |
| **Strouhal Vortex Wobble** | Periodic vortex shedding at $\text{St} = \frac{f_w d}{U} \approx 0.22$, inducing dynamic helical/zigzag trajectory oscillation with amplitude $0.2 R$. |
| **Acoustic Profile ("Bóp bóp")** | WebAudio procedural synthesis (`playMinnaertBubble`): Minnaert resonance $f = \frac{3260}{R_{\text{mm}}}\text{ Hz}$ with upward cavity unloading chirp $+18\%$, micro-click Laplace pressure spike, and exponential damping envelope $\tau \approx 12\text{ ms}$. |
| **Tuning Knobs** | `aspectRatioMin` (0.65), `wobbleStrouhal` (0.22), `domeDrainageSec` (0.12 s), `worthingtonSpeed` (0.85 m/s), `minnaertPopVolume` (0.05-0.25). |
| **CPU Budget** | $\le 0.4\text{ ms/frame}$. |

---

## 2. EVAPORATION, STEAM & CONDENSATION

| Property | Details |
|---|---|
| **Module** | `src/sim/evaporation.ts`, `src/sim/condensation.ts` |
| **Trigger** | Liquid-air boundary layer mass transfer, $T_{\text{glass}} < T_{\text{dew}}$ |
| **State Variables** | $A_{\text{surface}}$, $P_{\text{sat}}(T)$, $\phi_{\text{ambient}}$, $T_{\text{glass}}$, $T_{\text{dew}}$, $\theta_{\text{fog}}$ |
| **Emergent Visuals** | 1. Transparent vapor gap (~20 mm) directly above hot water surface.<br>2. White fog micro-droplets condensing higher up as plume cools.<br>3. Microscopic fog film on vessel headspace walls.<br>4. Discrete wall droplets growing, coalescing, and sliding when pinning radius ($> 2.2\text{ mm}$) is exceeded, leaving clear trails. |
| **Tuning Knobs** | `boundaryLayerM` (0.003-0.010 m), `ambientHumidity` (0.2-0.8), `pinningRadiusM` (0.0015-0.003 m). |
| **CPU Budget** | $\le 0.3\text{ ms/frame}$. |

---

## 3. PRECIPITATION PIPELINE

| Property | Details |
|---|---|
| **Module** | `src/sim/precipitation.ts` |
| **Trigger** | Supersaturation ratio $S = (Q / K_{\text{sp}})^{1/\nu} > 1.0$ |
| **State Variables** | $Q$, $K_{\text{sp}}(T)$, $N$ (particle count), $\bar{r}$ (mean radius), $\phi$ (solid volume fraction), $b(x, z)$ (sediment bed) |
| **Morphology Presets**| - **Curdy:** $\text{AgCl}$ (white curds, rapid settling, fluffy bed).<br>- **Fine Crystalline:** $\text{BaSO}_4$ (dense white milky haze, slow settling).<br>- **Gelatinous:** $\text{Cu(OH)}_2$, $\text{Al(OH)}_3$ (translucent blue/white gel network, voluminous bed).<br>- **Flocculent:** $\text{Fe(OH)}_3$ (red-brown rust flakes).<br>- **Crystalline Dense:** $\text{PbI}_2$ (bright yellow glittering plates, fast settling).<br>- **Colloidal:** $\text{S}$ (increasing turbidity, negligible settling). |
| **Emergent Visuals** | Mixing-limited plumes/curtains where reagents meet; Tyndall beam glow under lighting; Richardson-Zaki hindered settling; angle of repose bed relaxation; shear resuspension when stirred. |
| **Tuning Knobs** | `bedPorosity` (0.55-0.95), `bedAngleOfRepose` (25°-35°), `settlingMultiplier` (0.02-2.5). |
| **CPU Budget** | $\le 0.5\text{ ms/frame}$. |

---

## 4. DISSOLUTION & ALKALI METAL PYROTECHNICS (SODIUM ON WATER)

| Property | Details |
|---|---|
| **Module** | `src/components/three/SolidContentsRenderer.tsx` (`FloatingSodiumPellet`), `src/vfx/reactions/controllers/SodiumWaterController.ts`, `src/utils/audio.ts` |
| **Trigger** | Sodium piece added to water vessel, $m_{\text{Na}} > 0$ |
| **State Variables** | $m_{\text{Na}}(t)$, $\mathbf{x}_{\text{pellet}}$, $\mathbf{v}_{\text{pellet}}$, $T_{\text{internal}}$, $\text{meltFactor}$ ($0 \to 1$), $\omega_{\text{spin}}$, $\mathbf{u}_{\text{recoil}}$, $\text{trailPoints}[]$ |
| **6-Regime Emergent Visuals** | 1. **Meniscus Floatation:** Faceted dodecahedron floats ($\rho = 0.968\text{ g/cm}^3$) with surface depression indentation and annular ripple ring.<br>2. **Leidenfrost Skittering:** Asymmetric hydrogen micro-jet kicks propel darting motion; vapor cushion reduces hydrodynamic damping by $80\%$; elastic vessel wall bounces.<br>3. **Molten Silvery Sphere at 97.8°C:** Surface tension energy minimization morphs solid mesh into a brilliant liquid-mercury sphere with centrifugal oblate flattening.<br>4. **589nm Flame Cone:** At $T \ge 115^\circ\text{C}$, autoignition produces a conical golden yellow flame with white-hot core, point light source, and spark particle bursts.<br>5. **Alkaline Wake Ribbon:** High-pH wake deprotonates phenolphthalein into brilliant magenta-pink discs expanding and curling with surface water vortices.<br>6. **Minnaert Micro-Pop & Exhaustion:** Cavitation collapse at $m < 0.01\text{ g}$ emits sharp acoustic pops ($f = 3260/R_{\text{mm}}$) leaving calm clear pink solution. |
| **Acoustic Profile** | WebAudio procedural synthesis (`playSodiumSizzlePop`): continuous turbulent gas cavitation hiss bandpass ($1.2 - 6.5\text{ kHz}$) mixed with stochastic Minnaert micro-pops ($f \approx 2.8 - 4.5\text{ kHz}$). |
| **Tuning Knobs** | `leidenfrostDamping` (0.20), `recoilThrust` (0.45), `meltingTempC` (97.8°C), `ignitionTempC` (115°C), `flameScale` (1.0), `trailDecaySec` (1.4 s), `popProbability` (0.45). |
| **CPU Budget** | $\le 0.4\text{ ms/frame}$. |

---

## 5. HYDRAULIC POURING & DROPPER

| Property | Details |
|---|---|
| **Module** | `src/sim/pour.ts` |
| **Trigger** | Vessel tilt causing liquid free-surface to cross spout lip; or dropper click |
| **State Variables** | $H$ (head above lip), $Q$ (volumetric flow rate), $v_0$ (exit velocity), $L_{\text{breakup}}$ |
| **Emergent Visuals** | 1. Continuous stream ribbon narrowing with depth ($A = Q/v$).<br>2. Rayleigh-Plateau necking and breakup into spaced droplets at low flow rates.<br>3. Air entrainment bubbles beneath plunging jet impact ($v > 1\text{ m/s}$).<br>4. Drop detachment by Tate's law ($V \approx 0.05\text{ mL}$) with satellite droplet.<br>5. Air column acoustic resonance ($f = c/4L$) with pitch rising as vessel fills. |
| **Tuning Knobs** | $C_d$ (0.60-0.65), $w_{\text{spout}}$ (0.008-0.015 m), $r_{\text{tip}}$ (0.001-0.003 m). |
| **CPU Budget** | $\le 0.3\text{ ms/frame}$. |

---

## 6. COMBUSTION & FLAME TESTS

| Property | Details |
|---|---|
| **Module** | `src/sim/combustion.ts`, `src/sim/heater.ts` |
| **Trigger** | Active Bunsen burner, flame test wire loop, or burning magnesium |
| **State Variables** | $T_{\text{flame}}$, Air vent state, atomic species concentrations ($[\text{Li}^+], [\text{Na}^+], [\text{K}^+], [\text{Cu}^{2+}]$) |
| **Emergent Visuals** | 1. Premixed blue flame cone (air vent open) vs luminous yellow soot flame (vent closed).<br>2. Atomic emission spectral colors ($\text{Li}$ crimson, $\text{Na}$ intense yellow masking, $\text{K}$ lilac, $\text{Cu}$ blue-green).<br>3. Cobalt-glass optical filter removing $\text{Na}$ 589 nm yellow doublet to reveal faint $\text{K}$ lilac.<br>4. Magnesium ribbon burning at $3100\text{ K}$ with blinding white light and dense white $\text{MgO}$ aerosol. |
| **Tuning Knobs** | `dominanceWeight` ($\text{Na}=8.0, \text{Cu}=3.0, \text{K}=1.0$), `temperatureK` (850-3100 K). |
| **CPU Budget** | $\le 0.2\text{ ms/frame}$. |

---

## 7. PROCEDURAL WEBAUDIO ENGINE

| Property | Details |
|---|---|
| **Module** | `src/audio/procedural.ts` |
| **Synthesis Type** | Direct WebAudio API nodes (oscillators, biquad filters, white noise buffers) — no audio asset files. |
| **Sound Profiles** | - **Bubble Pop:** Minnaert chirp damped sine ($f = 3.26/R$).<br>- **Boiling:** $140\text{ Hz}$ bandpass noise rumble + simmering collapse clicks.<br>- **Fizz:** $4.5\text{ kHz}$ highpass noise with amplitude $\propto \dot{n}_{\text{gas}}$.<br>- **Pouring:** Resonant bandpass filter ($500-3200\text{ Hz}$) sweeping upward with filling liquid height.<br>- **Glass Clink:** Modal synthesis with ratios $1.0 : 2.32 : 4.25 : 6.63$. |
| **Browser Policy** | AudioContext lazy initialization on first user gesture; master mute toggle; reduced-motion damping. |

---

## 8. INTERACTIVE SPATULA & SOLID POWDER DOSING

| Property | Details |
|---|---|
| **Module** | `src/components/three/interactions/InteractiveSpatula.tsx` |
| **Trigger** | Spatula tool selection, clicking reagent bottle or solid chemical |
| **State Variables** | `spatulaState` (`chemical`, `mass_g`, `color`), `isDumping`, `tiltAngle` |
| **Emergent Visuals** | 1. Shiny stainless steel micro-spatula with knurled grip sleeve.<br>2. Granular powder mound atop blade tip rendered using non-spherical micro-facets matching chemical color.<br>3. Tilt-and-dispense animation dropping falling particle cascades into liquid.<br>4. Procedural powder drop sound and liquid disturbance ripples. |
| **CPU Budget** | $\le 0.1\text{ ms/frame}$. |

---

## 9. PROCEDURE-DRIVEN EXPERIMENT & VALIDATION ENGINE

| Property | Details |
|---|---|
| **Module** | `src/engine/experimentEngine.ts`, `src/components/GuidedExperimentPanel.tsx` |
| **Trigger** | Active guided or exam experiment in session |
| **Difficulty Modes** | - **Guided:** Step-by-step auto-hints, forgiving tolerances ($\pm 20\%$), step checklist.<br>- **Standard:** Protocol instructions, standard tolerance ($\pm 10\%$), sensor feedback.<br>- **Practical:** Laboratory exam conditions, strict tolerances ($\pm 1.0\text{ mL}$, $\pm 0.1\text{ g}$, $\pm 2^\circ\text{C}$), tool cross-contamination tracking.<br>- **Exam:** Blind timed practical examination with final Report Card (Letter Grade A+ to F, rubric breakdown, pedagogical feedback). |
| **Contamination Model** | Tracks tool usage (`pipette`, `stirring_rod`, `spatula`) against dipped substances; requires distilled water rinse ($H_2O$) to reset and avoid deduction penalties. |

---

## 10. REACTION-SPECIFIC PHENOMENOLOGY & VFX STUDIO HARNESS

| Reaction Category | Reactions & Controllers | Physical Behavior & Visual Model |
|---|---|---|
| **Neutralization (2)** | `HCl + NaOH`, `H2SO4 + NaOH` | Thermal rise ($\Delta H < 0$), smooth convective indicator transition (colorless $\to$ phenolphthalein pink), quiet without fake smoke or boiling unless boiling point reached. |
| **Precipitation (7)** | $\text{BaSO}_4$, $\text{AgCl}$, $\text{PbI}_2$ (Golden Rain), $\text{Cu(OH)}_2$, Colloidal $\text{S}$, $\text{Cu}^{2+}-\text{NH}_3$, $\text{Al(OH)}_3$ | Morphology-specific: fine micro-crystals ($0.04\text{ m/s}$ Stokes), curdy clumps, glistening hexagonal plates, hydrated gel, induction threshold clouding, multi-stage dissolution. |
| **Gas Evolution (8)** | $\text{CaCO}_3$, $\text{Zn}$, $\text{Mg}$, $\text{H}_2\text{O}_2+\text{MnO}_2$, $\text{NH}_3+\text{HCl}$, $\text{Na}_2\text{CO}_3$, $\text{Cu}+\text{HNO}_3$, $\text{Cu}+\text{H}_2\text{SO}_4$ | Bubbles nucleate strictly from solid surfaces with metal coupon pitting; dense white $\text{NH}_4\text{Cl}$ aerosol fumes in headspace; billowing red-brown $\text{NO}_2$ plume; choking invisible $\text{SO}_2$. |
| **Redox & Clocks (4)** | $\text{Fe}+\text{CuSO}_4$, $\text{FeCl}_3+\text{KSCN}$, $\text{KMnO}_4+\text{oxalate}$, Landolt Clock | Metallic copper plating directly on iron coupon; deep blood-red complex; autocatalytic S-curve lag and acceleration; sudden midnight-blue clock flip. |
| **Thermal & Safety (3)**| $\text{Cu(OH)}_2 \to \text{CuO}$, $\text{I}_2$ Sublimation, $\text{H}_2\text{O} \to \text{conc H}_2\text{SO}_4$ | Thermal darkening from heated bottom upward; rich violet $\text{I}_2$ vapor condensing into lustrous crystals; localized thermal shockwave and acid spattering. |
| **Pyrotechnics & Flames (6)**| Sodium + Water, Magnesium Ribbon, $\text{Cu}$, $\text{Na}$, $\text{K}$ Flame Tests | Molten sodium skittering via directional $\text{H}_2$ jet recoil, surface meniscus depression ring, 589 nm yellow cone; blinding 3100 K magnesium flare; 510 nm / 589 nm / 766 nm atomic flame emission. |

### 10.1 VFX Studio Developer Harness (`?vfx=1`)
- **Timeline Scrubber:** Precise 0% to 100% interactive slider, step $\pm 10\%$, quick jump to start/end, bidirectional scrubbing.
- **Speed Multipliers:** `0.25x`, `0.5x`, `1x`, `2x`, `4x` with pause and reset.
- **Live Reaction Telemetry HUD:**
  - Real-time Reaction Rate ($r$) and Progress ($0 \dots 100\%$).
  - Gas Evolution Rate ($\text{mL/s}$) and Bubble Particle Count.
  - Precipitate Mass ($g$) and Turbidity ($\tau$).
  - Surface Activity & Hydrodynamic Energy ($E_{\text{surf}}$).
  - Measured Performance: Real-time FPS ($> 55\text{ FPS}$) and frame budget ($< 16\text{ ms}$).
  - Thermodynamic conservation error tracking ($< 1.2 \times 10^{-4}$ mass error, $< 1.0 \times 10^{-7}\text{ M}$ charge neutrality).

---

## 11. ADVANCED APPARATUS, ZERO-DELAY DISPENSING & PROCEDURAL SOLID MORPHOLOGIES

### 11.1 Authentic 3D Glassware & Ceramic Apparatus
- **Watch Glass (40 mL):** Ultra-clear shallow borosilicate spherical cap for surface evaporation, micro-reactions, and crystallization tests.
- **Evaporating Dish (100 mL):** Hemispherical glazed white porcelain ceramic basin with pouring spout for high-heat thermal evaporation over Bunsen burner.
- **Porcelain Crucible (50 mL):** Tapered refractory porcelain cup with matching ceramic lid (slightly ajar for gas escape) for thermal decomposition and ashing.
- **Petri Dish (60 mL):** Flat-bottom cylindrical culture and crystallization dish with transparent glass cover.

### 11.2 Zero-Delay Physical Fluid & Particle Dispensing
- Reagent mixing and chemical kinetics register instantaneously upon delivery trigger (`mixSubstances` called with zero artificial timeout delay).
- Approach animation duration tuned from 0.60s down to 0.22s; particles and fluid streams hit the meniscus immediately with continuous physical sloshing response.

### 11.3 Procedural Physical State Differentiation
- **Potassium ($K$):** Skimming alkali metal with lower melting point ($63.5^\circ\text{C}$), high recoil velocity ($0.65\text{ m/s}$), and characteristic **766 nm lilac/violet flame cone** and sparks.
- **Magnesium Ribbons ($Mg$):** Curled metallic ribbon arcs (`torusGeometry`) with bright silvery finish ($R_{\text{rough}} = 0.18, M_{\text{metal}} = 0.95$).
- **Copper Turnings ($Cu$):** Spring-like coiled copper turnings with rich reddish-bronze metallic luster.
- **Zinc Granules ($Zn$):** Chunky irregular polyhedral nuggets (`dodecahedronGeometry`).
- **Iron Filings / Needles ($Fe$):** Ferromagnetic gunmetal grey prisms clumping at vessel bottom.
- **Iodine Crystals ($I_2$):** Dark crystalline violet-black plates with subtle purple vapor haze.
- **Hydrate Crystals ($CuSO_4, KMnO_4, K_2Cr_2O_7, CoCl_2$):** Translucent faceted crystals with **convective dissolution halos** bleeding color into solvent.
- **Fine Powders ($CaCO_3, MnO_2, S, CaO$):** Textured conical heap mounds with particulate granular dusting.

---

## 12. 10 REAL-WORLD PHYSICAL MECHANISMS & 23-APPARATUS LABORATORY SUITE

### 12.1 Laboratory Apparatus Collection (23 Distinct Types across 5 Categories)
1. **Reaction Vessels:** Beaker (100mL & 250mL), Erlenmeyer Flask (250mL), Test Tube (50mL), Volumetric Flask (100mL).
2. **Volumetric & Transfer:** Graduated Cylinder (100mL), Wash Bottle (250mL), Pasteur Pipette (2mL), Burette Apparatus (50mL).
3. **Thermal & Ignition:** Bunsen / Alcohol Burner, Porcelain Crucible (50mL), Watch Glass (40mL), Petri Dish (60mL).
4. **Separation & Filtration:** Separatory Funnel (150mL), Filter Funnel (75mL), Evaporating Dish (100mL), Liebig Condenser (120mL).
5. **Tools & Analytics:** Mortar & Pestle (80mL), Test Tube Rack, Crucible Tongs, Analytical Balance, Glass Stirring Rod, Thermometer Probe, Chemical Spatula.

### 12.2 Ten Real-World Emergent Physical & Failure Mechanisms
1. **Vessel Shatter & Thermal Shock Explosion:** Superheating dry glassware ($T \ge 180^\circ\text{C}$) followed by cold liquid addition or rapid overpressure bursts glass into physical instanced shards (`VesselShatteredShards`), triggers acoustic shatter, and spills contents onto the workbench.
2. **Fluid Overflow & Bench Spills:** Pouring past vessel maximum capacity ($V > V_{\text{cap}}$) cascades liquid over the rim, forming expanding fluid puddles on the laboratory table.
3. **Glass Wall Residue & Evaporative Staining:** Liquid level decline or solvent evaporation leaves behind dried colored salt scale and tide rings (`WallStainRing`) along inner glass walls.
4. **Headspace Condensation Fogging:** Heated liquids ($T > 55^\circ\text{C}$) create micro-droplet fogging on upper cooler walls (`CondensationFog`) with runoff streaks.
5. **Continuous pH Gradient Rayleigh-Taylor Dispersion:** Dropwise acid/base addition creates non-uniform downward convective plumes swirling before full neutralization.
6. **Dense Acid/Base Fuming Aerosols:** Volatile concentrated reagents ($HCl$, $HNO_3$, $NH_3$) emit fuming aerosols (`AcidBaseFume`); meeting $NH_3$ and $HCl$ forms dense white $NH_4Cl$ mist.
7. **Boiling Bumping / Ebullition Surge:** Superheating without nucleation or stirring causes violent liquid surges and vapor bursts (`BoilingBumpingBurst`).
8. **Thermochromism & Thermal Decomposition:** Mineral hydrates decompose and change color under heat (e.g. $Cu(OH)_2 \to CuO$ black, $CuSO_4 \cdot 5H_2O$ dehydration to white).
9. **Solid Pulverization in Mortar & Pestle:** Crushing coarse crystalline salts into fine micro-powder increases dissolution kinetics by $5\times$.
10. **Two-Phase Liquid Extraction:** Immiscible liquids (organic vs. aqueous) form distinct density-stratified layers with a visible interface in the separatory funnel; opening stopcock drains the bottom aqueous phase first into a receiver below.



