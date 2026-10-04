# CHEMDEX LAB — EFFECTS REFERENCE & TUNING GUIDE

> **Architecture:** Every visual and audio effect is driven purely by emergent simulated quantities ($T$, $c_k$, $V_l$, $P$, $\phi$, $S$, $\omega$) — zero pre-baked video/GIF assets or hardcoded timers.

---

## 1. POOL BOILING & DEGASSING

| Property | Details |
|---|---|
| **Module** | `src/sim/boiling.ts`, `src/sim/bubbles.ts` |
| **Trigger** | Heat input $P > 0$, bulk liquid temperature $T \ge 55^\circ\text{C}$ |
| **State Variables** | $T_{\text{liquid}}$, $T_{\text{sat}}(P)$, $P_{\text{heater}}$, $\dot{m}_{\text{boil}}$, $Q_{\text{latent}}$ |
| **Physical Regimes** | 1. $T < 55^\circ\text{C}$: Natural convection.<br>2. $55-90^\circ\text{C}$: Degassing (micro-bubbles on glass defects).<br>3. $90-99^\circ\text{C}$: Subcooled singing (vapor collapse in cooler bulk).<br>4. $T \approx T_{\text{sat}}$: Nucleate boiling plateau ($Q \to \dot{m} L_v$).<br>5. Superheat bump (when boiling stones absent). |
| **Acoustic Profile** | Low rumble ($80-250\text{ Hz}$) + Minnaert acoustic pops ($f = 3.26/R$). |
| **Tuning Knobs** | `contactAngleDeg` (45°-60°), `superheatLimitK` (3-10 K), `latentHeatVap` ($2.257 \times 10^6\text{ J/kg}$). |
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

## 4. DISSOLUTION & METAL REACTIONS

| Property | Details |
|---|---|
| **Module** | `src/sim/solids.ts` |
| **Trigger** | Undersaturated solid ($C_{\text{bulk}} < C_s(T)$), or reactive metal coupon in acid |
| **State Variables** | $m_{\text{solid}}$, $A_s$, $C_s(T)$, $[\text{H}^+]$, $\Delta H_{\text{sol}}$ |
| **Emergent Visuals** | 1. Dense sinking plumes ("blue rivers" from $\text{CuSO}_4$, purple threads from $\text{KMnO}_4$).<br>2. Shrinking crystal grains with radius $r(t) \propto m^{1/3}$.<br>3. Metal ribbons ($\text{Mg}, \text{Zn}$) generating $\text{H}_2$ surface bubbles, thinning, and fragmenting.<br>4. Copper displacement dendrites coating zinc.<br>5. Alkali metal ($\text{Na}$) skating on water driven by asymmetric $\text{H}_2$ jet recoil, melting into a spherical droplet (mp 97.8°C), and leaving swirling magenta phenolphthalein indicator trails. |
| **Tuning Knobs** | `solubilityMolPerM3`, `densityKgPerM3`, `reactionRateCoeff`. |
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
