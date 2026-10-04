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

## 4. MULTIPHASE PHENOMENA

### 4.1 Bubble Dynamics (Fritz & Mendelson)
- **Fritz Departure Diameter:**
  $$D_d = 0.0208 \cdot \theta \cdot \sqrt{\frac{\sigma}{g(\rho_l - \rho_v)}}$$
  where $\theta$ is contact angle (~50° for borosilicate glass).
- **Mendelson Bubble Rise Velocity:**
  $$U = \sqrt{\frac{2\sigma}{\rho_l d} + \frac{g d}{2}} \quad (0.15 \le U \le 0.35\text{ m/s})$$
- **Minnaert Acoustic Bubble Resonance:**
  $$f_{\text{Minnaert}} = \frac{1}{2\pi R} \sqrt{\frac{3\gamma P_0}{\rho_l}} \approx \frac{3.26}{R}\text{ Hz} \quad (R \text{ in meters})$$

### 4.2 Sedimentation (Richardson-Zaki)
- Single-particle Stokes velocity:
  $$v_s = \frac{2}{9} \frac{(\rho_p - \rho_l) g r^2}{\mu}$$
- Hindered settling volume fraction $\phi$:
  $$v = v_s (1 - \phi)^{4.65}$$
- Shields criterion for shear resuspension:
  $$\tau_{\text{crit}} = 0.04 (\rho_p - \rho_l) g (2r)$$

### 4.3 Dissolution Kinetics (Noyes-Whitney & Ranz-Marshall)
$$\frac{dm}{dt} = -k_d A_s (C_s(T) - C_{\text{bulk}})$$
$$k_d = \frac{\text{Sh} \cdot D}{d_p}, \quad \text{Sh} = 2 + 0.6 \text{Re}^{1/2} \text{Sc}^{1/3}$$

### 4.4 Hydraulic Pouring & Droppers
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

## 6. REFERENCES
1. Atkins, P., & de Paula, J. *Atkins' Physical Chemistry*, 11th ed., Oxford University Press.
2. Perry, R. H., & Green, D. W. *Perry's Chemical Engineers' Handbook*, 9th ed., McGraw-Hill.
3. Stam, J. (1999). "Stable Fluids". *SIGGRAPH 99 Conference Proceedings*, pp. 121–128.
4. Bridson, R. (2015). *Fluid Simulation for Computer Graphics*, 2nd ed., CRC Press.
5. Fritz, W. (1935). "Berechnung des Maximalvolumens von Dampfblasen". *Physikalische Zeitschrift*, 36, 379–384.
6. Richardson, J. F., & Zaki, W. N. (1954). "Sedimentation and fluidisation: Part I". *Trans. Instn Chem. Engrs*, 32, 35–53.
7. Minnaert, M. (1933). "On musical air-bubbles and the sounds of running water". *The London, Edinburgh, and Dublin Philosophical Magazine and Journal of Science*, 16(104), 235–248.
