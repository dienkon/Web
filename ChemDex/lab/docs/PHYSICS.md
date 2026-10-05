# CHEMDEX LAB — PHYSICAL & CHEMICAL SIMULATION MANUAL

> **Version:** 2.0.0-physically-based  
> **Standard:** International System of Units (SI: m, kg, s, K, mol, J, Pa) internally. Presentation units (°C, mL, g, mol/L) computed strictly at boundary.  
> **Determinism:** PRNG `sfc32` seedable via `?seed=`.

---

## 1. THERMODYNAMICS & PHASE EQUILIBRIA

### 1.1 Antoine Vapor Pressure Equation
Vapor pressures of pure liquids are computed using the empirical Antoine formulation:
$$\log_{10}(P_{\text{mmHg}}) = A - \frac{B}{C + T_{^\circ\text{C}}}$$
$$P_{\text{Pa}} = P_{\text{mmHg}} \times 133.322387415$$

For liquid water ($1^\circ\text{C} \le T \le 100^\circ\text{C}$):
- $A = 8.07131$
- $B = 1730.63$
- $C = 233.426$

At standard atmospheric pressure ($P_0 = 101325\text{ Pa} = 760\text{ mmHg}$), the saturation boiling temperature $T_{\text{sat}}$ is obtained by inverting the relation:
$$T_{\text{sat}}(P) = \frac{B}{A - \log_{10}(P_{\text{mmHg}})} - C + 273.15\text{ K}$$

### 1.2 Two-Node Lumped Thermal ODE
Heat exchange between the liquid bulk ($T_l$) and borosilicate glass vessel wall ($T_g$) is modeled as a coupled two-node thermal system:
$$C_{\text{total}} \frac{dT_l}{dt} = P_{\text{heater}} - h A_{\text{out}}(T_l - T_{\text{amb}}) - \dot{m}_{\text{evap}} L_v - \dot{m}_{\text{boil}} L_v + \sum_r (-\Delta H_r) \dot{\xi}_r - \dot{m}_{\text{dissolve}} \Delta H_{\text{sol}}$$
$$C_{\text{glass}} \frac{dT_g}{dt} = U A_{\text{in}} (T_l - T_g) - h A_{\text{out}} (T_g - T_{\text{amb}})$$

**Physical constants:**
- Liquid water heat capacity: $C_{p,l} \approx 4184\text{ J/(kg}\cdot\text{K)}$
- Borosilicate glass heat capacity: $C_{p,\text{glass}} \approx 830\text{ J/(kg}\cdot\text{K)}$
- Water latent heat of vaporization: $L_v = 2.257 \times 10^6\text{ J/kg}$
- Natural convective cooling coefficient: $h \approx 10\text{ W/(m}^2\cdot\text{K)}$ (still air), up to $25+\text{ W/(m}^2\cdot\text{K)}$ under agitation.

---

## 2. CHEMICAL EQUILIBRIUM & REACTION KINETICS

### 2.1 Ionic Strength & Activity Corrections
Activity coefficients $\gamma_i$ for dissolved ionic species are determined using the Debye-Hückel limiting law and extended Davies equation:
$$I = \frac{1}{2} \sum_i z_i^2 c_i$$
$$\log_{10} \gamma_i = -0.509 z_i^2 \left( \frac{\sqrt{I}}{1 + \sqrt{I}} - 0.30 I \right)$$
Ion activities: $a_i = \gamma_i c_i$.

### 2.2 Precipitation Equilibrium ($K_{\text{sp}}$)
For an arbitrary electrolyte $M_a X_b(s) \rightleftharpoons a M^{m+} + b X^{x-}$:
$$Q = a_{M}^{a} \cdot a_{X}^{b}$$
Supersaturation ratio:
$$S = \left(\frac{Q}{K_{\text{sp}}(T)}\right)^{1 / (a + b)}$$
If $S > 1$, precipitation occurs. For 1:1 electrolytes (e.g. $\text{AgCl}$), the exact equilibrium precipitated extent $x$ (mol/L) is given analytically by:
$$x = \frac{(c_A + c_B) - \sqrt{(c_A - c_B)^2 + 4 K_{\text{sp}}}}{2}$$
For general stoichiometric ratios, the solution is obtained by Newton-Raphson bracketed with bisection on $[0, \min(c_A/a, c_B/b)]$.

### 2.3 Temperature Dependence of $K_{\text{sp}}$ (van 't Hoff)
$$\ln \frac{K_{\text{sp}}(T_2)}{K_{\text{sp}}(T_1)} = -\frac{\Delta H_{\text{sol}}^\circ}{R} \left( \frac{1}{T_2} - \frac{1}{T_1} \right)$$
Used to model the sharp solubility curve of $\text{PbI}_2$ ("golden rain" thermal recrystallization) and $\text{KNO}_3$.

### 2.4 Polyprotic Acid-Base Equilibrium
Charge neutrality equation solved in $\text{pH}$ space ($0 \le \text{pH} \le 14$):
$$[H^+] + \sum \text{cations} = [OH^-] + \sum \text{anions}$$
where for any weak polyprotic acid $H_n A$:
$$[A^{n-}] = C_A \frac{\prod_{i=1}^n K_{a,i}}{[H^+]^n + [H^+]^{n-1} K_{a,1} + \dots + \prod K_{a,i}}$$

### 2.5 Arrhenius Kinetics
Rate laws:
$$r = k(T) \prod c_i^{\nu_i}$$
$$k(T) = A \exp\left(-\frac{E_a}{R T}\right)$$
Limiting reagent clamping:
$$\Delta \xi = \min\left(r \Delta t, \min_i\left(\frac{c_i}{\nu_i}\right)\right)$$

---

## 3. HYDRODYNAMICS & FLUID MIXING

### 3.1 2D Stable Fluids Navier-Stokes
Incompressible Navier-Stokes equations on bounded domain $\Omega$:
$$\frac{\partial \mathbf{u}}{\partial t} = -(\mathbf{u} \cdot \nabla)\mathbf{u} + \nu \nabla^2 \mathbf{u} - \frac{1}{\rho} \nabla p + \mathbf{f}_{\text{buoyancy}} + \mathbf{f}_{\text{ext}}$$
$$\nabla \cdot \mathbf{u} = 0$$

- **MacCormack Advection:**
  Forward step $\phi_f = \text{SL}(\phi_n, \mathbf{u}, \Delta t)$, backward step $\phi_b = \text{SL}(\phi_f, -\mathbf{u}, \Delta t)$.  
  Corrected value: $\phi^* = \phi_f + \frac{1}{2}(\phi_n - \phi_b)$, clamped to $\min/\max$ of the 4 cell-neighbors in $\phi_n$ to eliminate unphysical extrema.
- **Vorticity Confinement:**
  $$\omega = \nabla \times \mathbf{u}$$
  $$\mathbf{N} = \frac{\nabla |\omega|}{|\nabla |\omega|| + \epsilon}$$
  $$\mathbf{f}_{\text{vc}} = \epsilon_{\text{vc}} \Delta x (\mathbf{N} \times \omega)$$
- **Poisson Pressure Solve:**
  $$\nabla^2 p = \frac{\rho}{\Delta t} \nabla \cdot \mathbf{u}^*$$
  Solved via Red-Black Gauss-Seidel with warm-start pressure projection.

### 3.2 Free-Surface Height-Field Waves
Linearized shallow-water equation:
$$\frac{\partial^2 h}{\partial t^2} = c^2 \nabla^2 h - \gamma \frac{\partial h}{\partial t} + F_{\text{ext}}$$
- Meniscus profile: $h_m(d) = h_c \exp(-d / \ell_c)$, capillary length $\ell_c = \sqrt{\frac{\sigma}{\rho g}} \approx 2.7\text{ mm}$.
- Rankine combined stirring vortex:
  $$\Delta h(r) = \begin{cases}
  -\frac{\omega^2 (2 R_{\text{core}}^2 - r^2)}{2g}, & r \le R_{\text{core}} \\
  -\frac{\omega^2 R_{\text{core}}^4}{2g r^2}, & r > R_{\text{core}}
  \end{cases}$$

---

## 4. MULTIPHASE PHENOMENA & BUBBLE HYDRODYNAMICS

### 4.1 Bubble Formation, Rise & Oblate Spheroidal Deformation
- **Fritz Departure Diameter:**
  $$D_d = 0.0208 \cdot \theta \cdot \sqrt{\frac{\sigma}{g(\rho_l - \rho_v)}}$$
  where $\theta$ is contact angle (~50° for borosilicate glass).
- **Mendelson Bubble Rise Velocity:**
  $$U = \sqrt{\frac{2\sigma}{\rho_l d} + \frac{g d}{2}} \quad (0.15 \le U \le 0.35\text{ m/s})$$
- **Dimensionless Numbers:**
  - Eötvös number: $\text{Eo} = \frac{g (\rho_l - \rho_g) d^2}{\sigma}$
  - Weber number: $\text{We} = \frac{\rho_l U^2 d}{\sigma}$
- **Oblate Spheroidal Shape Deformation (Wellek Formulation):**
  Due to dynamic hydrodynamic pressure gradients ($p_{\text{front}} > p_{\text{side}}$), rising bubbles flatten horizontally into oblate spheroids with vertical-to-horizontal aspect ratio $\text{ar} = b/a < 1$:
  $$\text{ar} = \frac{1}{1 + 0.163\,\text{Eo}^{0.757}} \quad (0.65 \le \text{ar} \le 0.95)$$
  To preserve bubble volume ($V = \frac{4}{3}\pi R^3 = \frac{4}{3}\pi a^2 b$ where $b = a \cdot \text{ar}$):
  $$a = \frac{R}{\text{ar}^{1/3}}, \quad b = R \cdot \text{ar}^{2/3}$$
  In the vertex shader and instanced renderer, scale factors applied to the bubble sphere mesh are:
  $$\mathbf{S} = \left( \frac{1}{\text{ar}^{1/3}},\, \text{ar}^{2/3},\, \frac{1}{\text{ar}^{1/3}} \right)$$

### 4.2 Strouhal Vortex Shedding & Trajectory Wobble
When bubble Reynolds number $\text{Re} = \frac{\rho_l U d}{\mu} > 200$, periodic vortex loops shed into the bubble wake. The shedding frequency satisfies the constant Strouhal number:
$$\text{St} = \frac{f_{\text{wobble}} d}{U} \approx 0.22 \implies f_{\text{wobble}} = 0.22 \frac{U}{d} \approx 6 - 15\text{ Hz}$$
This induces periodic helical and zigzag lateral displacements:
$$\Delta x(t) = A_w \sin(2\pi f_{\text{wobble}} t), \quad \Delta z(t) = A_w \cos(2\pi f_{\text{wobble}} t)$$
where $A_w \approx 0.15 - 0.35 \times R$.

### 4.3 Surface Arrival Dome, Thin-Film Drainage & Worthington Micro-Jets
Upon reaching the free liquid surface, the bubble does not burst instantaneously:
1. **Hemispherical Dome Formation:** The bubble protrudes above the interface, capped by an ultra-thin liquid film of thickness $h_f(t)$.
2. **Capillary & Marangoni Drainage:** The thin film thins progressively due to capillary suction at the plateau border:
   $$-\frac{dh_f}{dt} = \frac{2 h_f^3 \sigma}{3 \mu R^2}$$
   Typical drainage lifetime before film rupture: $\tau_{\text{drain}} \approx 0.08 - 0.20\text{ s}$.
3. **Cavity Collapse & Worthington Jet:** Upon film rupture, surface tension drives rapid inward collapse of the submerged hemispherical cavity. The converging liquid inertia shoots a vertical micro-jet (Worthington jet) upward at velocity $v_y \approx 0.6 - 1.2\text{ m/s}$, breaking into 2-5 airborne micro-droplets.
4. **Capillary Surface Wave Impulse:** Cavity collapse injects a localized radial capillary wave packet into the free surface:
   $$\Delta h(r, t) = A_0 J_0(k_c r) \cos(\omega_c t) e^{-\gamma t}, \quad \omega_c^2 = g k_c + \frac{\sigma}{\rho} k_c^3$$

### 4.4 Acoustic Burst Resonance (Minnaert Frequency)
The audible "pop" or "bóp" when a bubble bursts or pinches off corresponds to the underdamped volumetric radial pulsation of the gas cavity, governed by Minnaert's equation:
$$f_{\text{Minnaert}} = \frac{1}{2\pi R} \sqrt{\frac{3\gamma P_0}{\rho_l}} \approx \frac{3260}{R_{\text{mm}}}\text{ Hz}$$
where:
- $\gamma = 1.40$ (polytropic index for diatomic gases $\text{N}_2, \text{O}_2, \text{H}_2$),
- $P_0 = 101325\text{ Pa}$,
- $\rho_l = 998\text{ kg/m}^3$.

In WebAudio procedural synthesis (`playMinnaertBubble` in `src/utils/audio.ts`):
- Center frequency: $f_0 = \frac{3260}{R_{\text{mm}}}$.
- Rapid upward chirp: $f(t) = f_0 \cdot (1 + 0.18 \frac{t}{\tau})$ as the gas cavity unloads into the atmosphere.
- Damping envelope: exponential decay time constant $\tau = \frac{1}{\pi \delta f_0}$ where acoustic damping factor $\delta \approx 0.08 - 0.12$.
- Rupture transient: a micro-click highpass spike ($t < 1.5\text{ ms}$) simulating the sudden release of internal Laplace overpressure $\Delta P = \frac{2\sigma}{R}$.

### 4.5 Sedimentation (Richardson-Zaki)
- Single-particle Stokes velocity:
  $$v_s = \frac{2}{9} \frac{(\rho_p - \rho_l) g r^2}{\mu}$$
- Hindered settling volume fraction $\phi$:
  $$v = v_s (1 - \phi)^{4.65}$$
- Shields criterion for shear resuspension:
  $$\tau_{\text{crit}} = 0.04 (\rho_p - \rho_l) g (2r)$$

### 4.6 Dissolution Kinetics (Noyes-Whitney & Ranz-Marshall)
$$\frac{dm}{dt} = -k_d A_s (C_s(T) - C_{\text{bulk}})$$
$$k_d = \frac{\text{Sh} \cdot D}{d_p}, \quad \text{Sh} = 2 + 0.6 \text{Re}^{1/2} \text{Sc}^{1/3}$$

### 4.7 Hydraulic Pouring & Droppers
- **Weir Law:** $Q = \frac{2}{3} C_d w \sqrt{2g} H^{3/2}$ ($C_d \approx 0.62$).
- **Rayleigh-Plateau Breakup:** $t_{\text{breakup}} \approx 2.9 \sqrt{\frac{\rho r^3}{\sigma}}$.
- **Tate's Law Droplet:** $V_{\text{drop}} = \left(\frac{2\pi r_{\text{tip}} \sigma}{\rho g}\right) \times 0.68 \approx 0.05\text{ mL}$.

---

## 5. OPTICS & SPECTRAL ABSORPTION

### 5.1 Beer-Lambert Volume Transmittance
$$A(\lambda) = \sum_k \epsilon_k(\lambda) \cdot c_k \cdot \ell$$
$$T(\lambda) = 10^{-A(\lambda)}$$
Optical path length $\ell = \frac{d}{\cos \theta}$ varies per ray across the vessel geometry:
- Thick center regions exhibit rich, deep absorption.
- Thin rim and meniscus edges exhibit bright, translucent transmission.

### 5.2 Indicator Dissociation (Henderson-Hasselbalch)
$$\alpha = \frac{1}{1 + 10^{\text{pK}_{\text{in}} - \text{pH}}}$$
$$\mathbf{A}_{\text{indicator}}(\lambda) = (1 - \alpha) \mathbf{A}_{\text{acid}}(\lambda) + \alpha \mathbf{A}_{\text{base}}(\lambda)$$

---

## 6. REACTION CONTROLLER ARCHITECTURE & ACCUMULATOR INTEGRATION

### 6.1 Fixed-Timestep Accumulator Scheme ($\Delta t = 1/60\text{ s}$)
To decouple reaction progression, Stokes particle physics, and hydrodynamics from volatile frame rendering times, the `ReactionSimulationEngine` integrates using a fixed sub-stepping accumulator:
```ts
public update(frameDelta: number, timeScale: number = 1.0): void {
  const clampedDelta = Math.min(frameDelta, 0.1) * timeScale;
  this.accumulator += clampedDelta;
  while (this.accumulator >= this.fixedDt && stepCount < maxSubSteps) {
    this.stepFixed(this.fixedDt, timeScale);
    this.accumulator -= this.fixedDt;
  }
}
```
This guarantees strictly deterministic behavior ($?seed=$) on 30 Hz mobile devices and 144 Hz desktop monitors alike.

### 6.2 Master Controller Mapping (Zero Generic Fallbacks)
Every chemical reaction defines its own dedicated controller class implementing `ReactionVisualController`:
- **Precipitations:** Micro-crystalline milky haze ($\text{BaSO}_4$), curdy cottage-cheese flocs ($\text{AgCl}$), shimmering hexagonal platelets ($\text{PbI}_2$), azure blue gelatinous mass ($\text{Cu(OH)}_2$), induction threshold colloid ($\text{S}$), multi-stage complexation ($\text{Cu}^{2+} + \text{NH}_3$), and amphoteric redissolution ($\text{Al(OH)}_3$).
- **Gas Evolution:** Solid-origin bubbles and pitting ($\text{CaCO}_3$, $\text{Zn}$, $\text{Mg}$), catalytic surface decomposition ($\text{H}_2\text{O}_2 + \text{MnO}_2$), vapor-phase white aerosol smoke ($\text{NH}_3 + \text{HCl}$), choking $\text{SO}_2$, and billowing red-brown $\text{NO}_2$ plumes.
- **Redox & Clocks:** Metallic surface displacement plating ($\text{Fe} + \text{CuSO}_4$), autocatalytic S-curve decolorization ($\text{KMnO}_4 + \text{oxalate}$), Landolt iodine clock sudden blue-black flip.
- **Pyrotechnics & Flames:** Sodium metal skating water dart with recoil jet thrust and melting at 97.8°C, magnesium ribbon 3100 K Planck white flare, and copper/sodium/potassium atomic flame emissions.

---

## 6. ALKALI METAL HYDRODYNAMICS & PYROTECHNICS: SODIUM ON WATER

The reaction of metallic sodium with water ($2\text{Na}(s) + 2\text{H}_2\text{O}(l) \to 2\text{NaOH}(aq) + \text{H}_2(g)\uparrow$, $\Delta H^\circ = -368.4\text{ kJ/mol}$) exhibits a complex succession of 6 coupled mechanical, thermal, optical, and acoustic regimes:

### 6.1 Regime 1: Meniscus Floatation & Capillary Depression
- **Buoyancy Condition:** Elemental sodium density $\rho_{\text{Na}} = 968\text{ kg/m}^3 < \rho_{\text{water}} = 998\text{ kg/m}^3$. The positive Archimedean buoyancy ($F_b = \rho_w V g > m g$) forces the solid piece to float at the free surface.
- **Surface Meniscus Indentation (Young-Laplace Curvature):**
  Due to low freeboard and contact angle $\theta_c$, the boundary creates a pronounced capillary surface depression ring:
  $$\Delta z_m = -\frac{m g}{2\pi R \sigma_{\text{water}}}$$
  surrounded by a localized capillary annular ripple ring of radius $r_{\text{meniscus}} \approx 1.8 R$.

### 6.2 Regime 2: Asymmetric Recoil Thrust & Leidenfrost Vapor Cushion
- **Recoil Jet Propulsion:**
  Reaction rate $r = k(T) A_{\text{wetted}} [\text{H}_2\text{O}]$. Because gas desorption is inhomogeneous across the faceted wetted boundary, directional hydrogen exhaust velocity $\mathbf{u}_{\text{exhaust}} \approx 12 - 25\text{ m/s}$ imparts a chaotic jet recoil force:
  $$m_{\text{pellet}} \frac{d\mathbf{v}}{dt} = -\frac{dm_{\text{gas}}}{dt} \mathbf{u}_{\text{exhaust}} - \gamma_{\text{eff}} \mathbf{v} + \mathbf{F}_{\text{wall}}$$
- **Microscopic Leidenfrost Vapor Layer:**
  Vaporized water and evolving hydrogen gas form a continuous microscopic gaseous film beneath the pellet (analogous to the Leidenfrost effect), isolating liquid contact and reducing effective hydrodynamic friction damping $\gamma_{\text{eff}}$ by $\sim 80\%$:
  $$\gamma_{\text{eff}} \approx 0.20 \times (6\pi \mu_{\text{water}} R_{\text{hydro}})$$
  This low drag coefficient enables rapid darting across the water surface with elastic container wall bounces.

### 6.3 Regime 3: Phase Transition & Spherical Rounding at 97.8°C
- **Thermal Energy ODE:**
  $$C_p \frac{dT}{dt} = r (-\Delta H_{\text{rxn}}) - h_{\text{eff}} A_{\text{pellet}} (T - T_{\text{water}})$$
  where sodium heat capacity $C_p = 28.2\text{ J/(mol}\cdot\text{K)}$.
- **Surface Tension Rounding:**
  As internal temperature reaches the melting point $T_{\text{mp}} = 97.8^\circ\text{C}$ ($370.95\text{ K}$), liquid sodium's extreme surface tension ($\sigma_{\text{liquid-Na}} \approx 0.19\text{ N/m} \approx 2.6 \times \sigma_{\text{water}}$) rapidly overcomes crystalline yield stress, morphing the faceted mesh into an ultra-smooth, mirror-like molten sphere.
- **Centrifugal Flattening:**
  Asymmetric jet moments induce spin $\omega_z \sim 40 - 120\text{ rad/s}$, producing centrifugal oblate flattening:
  $$a = \frac{R}{\text{ar}^{1/3}}, \quad b = R \cdot \text{ar}^{2/3} \quad (\text{ar} \approx 0.82)$$

### 6.4 Regime 4: Thermal Autoignition & 589 nm Yellow Flame Doublet
- When local temperature exceeds ignition threshold $T \ge 115^\circ\text{C}$, the evolved hydrogen gas mixed with ambient oxygen and vaporized sodium atoms ignites.
- **Spectral Emission:**
  Atomic sodium emission is dominated by the resonant D-line doublet ($3p \to 3s$ transition at $\lambda_1 = 589.0\text{ nm}$ and $\lambda_2 = 589.6\text{ nm}$).
- **Rendering Model:** A bright yellow conical flame geometry with a luminous white-hot core ($T > 1400\text{ K}$) is affixed to the pellet apex, accompanied by stochastic micro-spark ejections and a point light source ($I \sim 1.5\text{ cd}$, color `#f59e0b`).

### 6.5 Regime 5: Alkaline Wake Trail & Phenolphthalein Chromophore Ribbon
- Dissolved sodium hydroxide accumulates immediately in the skittering wake:
  $$\text{Na} + \text{H}_2\text{O} \to \text{Na}^+ + \text{OH}^- + \frac{1}{2}\text{H}_2$$
- Local hydroxide concentration $[\text{OH}^-] > 10^{-5.8}\text{ M}$ pushes $\text{pH} > 8.2$, instantly opening phenolphthalein's lactone ring into the dianion chromophore $\text{In}^{2-}$ ($R=244, G=63, B=94$).
- The wake is rendered as a Lagrangian buffer of expanding, fading circular discs lying coplanar with the water surface, advected by localized water vortices.

### 6.6 Regime 6: Terminal Micro-Pop & Complete Exhaustion
- As the pellet mass depletes below $0.01\text{ g}$, the Leidenfrost gas cushion becomes unstable. Water rushes in, causing rapid cavitation collapse and steam flash, producing a distinct acoustic Minnaert burst pop ($f \approx 3260 / R_{\text{mm}}\text{ Hz}$) before vanishing into a quiet, crystal-clear pink alkaline solution.

---

## 7. REACTION-SPECIFIC PHENOMENOLOGICAL REGIMES & MATHEMATICAL ALGORITHMS

Every reaction in the curriculum belongs to one of seven rigorous physical classes with deterministic algorithmic solvers:

| Category | Typical Reaction | Governing Equations & Regimes | Emergent Observable Phenomena |
|---|---|---|---|
| **Acid-Base Neutralization** | $\text{HCl} + \text{NaOH}$ | Charge neutrality $[H^+] - \frac{K_w}{[H^+]} + \Delta C = 0$; Henderson-Hasselbalch indicator deprotonation. | Colorless until steep inflection pH jump ($7 \to 8.5$); instantaneous permanent pink with zero effervescence; $\Delta T = \frac{-\Delta H n}{m C_p} \approx +13^\circ\text{C}$. |
| **Instantaneous Ionic Precipitation** | $\text{BaCl}_2 + \text{Na}_2\text{SO}_4$, $\text{AgNO}_3 + \text{NaCl}$ | Supersaturation ratio $S = \sqrt{Q/K_{\text{sp}}}$; DLVO coagulation rate $k_{\text{coag}} = 8\pi D R$; Stokes settling. | Dense milky suspension ($\text{BaSO}_4$) or thick cottage-cheese curd flocs ($\text{AgCl}$); mass delta on balance strictly $\Delta m = 0.00\text{ g}$. |
| **Recrystallization Precipitation** | $\text{Pb(NO}_3)_2 + \text{KI}$ (Golden Rain) | Van 't Hoff solubility $K_{\text{sp}}(T)$; classical nucleation rate $J(S)$; anisotropic plate growth. | Explosive canary-yellow cloud upon contact; recrystallizes into fluttering hexagonal golden flakes glittering with specular light reflections. |
| **Heterogeneous Effervescence** | $\text{CaCO}_3 + \text{HCl}$, $\text{Zn} + \text{HCl}$ | Dissolution flux $j = k A [H^+]$; Henry gas supersaturation $C > k_H P$; Rayleigh-Plesset detachment; Wellek oblate rise. | Dense streaming of micro-bubbles from solid surfaces; upward convective churn; audible fizzing; surface dome drainage and Minnaert acoustic pops. |
| **Strong Oxidative Redox Fuming** | $\text{Cu} + \text{HNO}_3\text{(conc)}$ | Heterogeneous rate $r = k [HNO_3]^2 [HNO_2]$; dimerization $2\text{NO}_2 \rightleftharpoons \text{N}_2\text{O}_4$; heavy gas convection $\rho_{\text{rel}} = 1.58$. | Autocatalytic foaming; solution darkens emerald green $\to$ blue; dense acrid red-brown fumes billow out and blanket the vessel. |
| **Multi-Stage Coordination Complexation** | $\text{Cu}^{2+} + \text{NH}_3$, $\text{Fe}^{3+} + \text{SCN}^-$, $\text{Al}^{3+} + \text{OH}^-$ | Stepwise stability constants $\beta_n$; amphoteric dual-equilibrium solver; Beer-Lambert spectrophotometry. | $\text{Cu}^{2+}$: sky-blue $\text{Cu(OH)}_2$ gel dissolves into crystal-clear deep royal blue $[\text{Cu(NH}_3)_4]^{2+}$. $\text{Fe}^{3+}$: amber transitions to blood-red $[\text{Fe(SCN)}]^{2+}$. $\text{Al}^{3+}$: white gel dissolves to clear $[\text{Al(OH)}_4]^-$. |
| **Kinetic Clocks & Autocatalysis** | Landolt Clock, $\text{KMnO}_4 + \text{oxalate}$, $\text{Na}_2\text{S}_2\text{O}_3 + \text{HCl}$ | Autocatalytic rate $r = (k_0 + k_{\text{cat}}[P]^\alpha)[R]$; Mie scattering turbidity $\tau(t) = \frac{\tau_{\text{max}}}{1 + e^{-k(t - t_{1/2})}}$. | Landolt: colorless induction lag then sudden step-function flip to midnight blue. $\text{KMnO}_4$: slow purple inertia followed by 80x exponential bleaching. Thiosulfate: clear induction lag then progressive opalescent yellow turbidity obscuring cross marker. |

---

## 8. REFERENCES
1. Atkins, P., & de Paula, J. *Atkins' Physical Chemistry*, 11th ed., Oxford University Press.
2. Perry, R. H., & Green, D. W. *Perry's Chemical Engineers' Handbook*, 9th ed., McGraw-Hill.
3. Stam, J. (1999). "Stable Fluids". *SIGGRAPH 99 Conference Proceedings*, pp. 121–128.
4. Bridson, R. (2015). *Fluid Simulation for Computer Graphics*, 2nd ed., CRC Press.
5. Fritz, W. (1935). "Berechnung des Maximalvolumens von Dampfblasen". *Physikalische Zeitschrift*, 36, 379–384.
6. Richardson, J. F., & Zaki, W. N. (1954). "Sedimentation and fluidisation: Part I". *Trans. Instn Chem. Engrs*, 32, 35–53.
7. Minnaert, M. (1933). "On musical air-bubbles and the sounds of running water". *The London, Edinburgh, and Dublin Philosophical Magazine and Journal of Science*, 16(104), 235–248.
8. Wellek, R. M., Agrawal, A. K., & Skelland, A. H. P. (1966). "Shape of liquid drops moving in liquid media". *AIChE Journal*, 12(5), 854–862.
9. Worthington, A. M. (1908). *A Study of Splashes*. Longmans, Green, and Co.
10. Peñas-Sanjuan, A. et al. (2015). "Coulomb explosion during the early stages of the reaction of alkali metals with water". *Nature Chemistry*, 7, 250–254.
