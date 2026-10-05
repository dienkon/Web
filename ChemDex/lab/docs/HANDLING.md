# CHEMDEX LAB — REAL LAB HANDLING & APPARATUS MANUAL

> **Version:** 2.1.0-handling-core  
> **Target:** Unified Hand Model, Full Tilt/Inversion Range, Damage Physics, Multi-Device Parity, and Apparatus Assembly  
> **Determinism:** Seeded PRNG and fixed-timestep clock; zero `Math.random()` or `Date.now()` in simulation loops.

---

## 1. UNIFIED OBJECT HANDLING (`src/handling/`)

### 1.1 State Machine & Critically-Damped Spring
Movable glassware and tools are governed by `HeldObjectController`:
- **Phases:** `idle → hover → grabbing → carrying → placing → released`
- **Spring Formulation:**
  $$\ddot{x} = -2\omega \dot{x} - \omega^2 (x - x_{\text{target}})$$
  Natural frequency $\omega = 18.0\text{ rad/s}$.
  Soft maximum hand speed capped at $1.5\text{ m/s}$ (scene scaled).
- **Collision Boundary:**
  Table top surface at $Y = -0.135\text{ m}$. Soft normal constraints guarantee zero tunneling under both 60 fps and low 20 fps execution.
- **Orientation:**
  Stored as unit quaternions $[x, y, z, w]$, slerped smoothly towards target Euler angles (yaw, tilt, pitch) and re-normalized to maintain $\|q\| \equiv 1.0$ across $10^4+$ steps.

### 1.2 Grip Anchors & Hand Rig (`HandRig.tsx`)
Each vessel profile defines physical grip anchors (`body`, `neck`, `rim`, `handle`, `base`) and preferred posture:
- Test tubes: gripped near the top neck ($Y \approx +0.8$).
- Beakers: body center.
- Flasks: cylindrical neck.
- Crucibles: tongs grip preferred.
- Visual glove / bare-hand indicator rendered at the grip pivot.

### 1.3 Thermal & Slip Rules
- **Hot Object:** Grabbing an object with $T > 60^\circ\text{C}$ bare-handed triggers a pain reflex drop and burn hazard. Gloves raise threshold to $85^\circ\text{C}$; tongs provide full thermal insulation.
- **Cryogenic:** $T < -20^\circ\text{C}$ bare-handed triggers frostbite warning and involuntary release.
- **Slippery Surface:** Wet/oily glass (stain intensity $> 0.6$) without gloves introduces deterministic slip probability based on seed.

---

## 2. TILT BEYOND 90° & FULL INVERSION (`src/pour/`)

### 2.1 Single Source of Truth (`src/handling/limits.ts`)
- $\theta_{\min} = 0$, $\theta_{\max} = \pi$ ($180^\circ$ = fully inverted).
- Bounded per vessel:
  - Burette: $\theta \in [0, 0]$ (fixed vertical clamp).
  - Wash bottle: $\theta \in [0, 150^\circ]$.
  - Open glassware: $\theta \in [0, 180^\circ]$.

### 2.2 Quadrature & Inverted Draining
- **Retained Volume:** Monotonically non-increasing curve. At $\theta = \pi$, retained volume for open glassware is identically $0\text{ mL}$.
- **Weir & Inverted Orifice Flow:** Francis formula applies for weir crest overflow ($\theta \le 117^\circ$); beyond $117^\circ$, gravity orifice drainage accelerates fluid exit, completely emptying the vessel within 1–2 seconds.
- **Glug-Glug Oscillation:** Narrow-necked vessels (mouth radius $< 0.4$, tilt $> 48^\circ$) exhibit periodic air-gulping pulsation at $\sim 3.5\text{ Hz}$.

---

## 3. MULTI-DEVICE CONTROLS & GESTURE ROUTER (`src/input/`)

### 3.1 Mouse Wheel Router (`WheelRouter.ts`)
- **Held Vessel:**
  - Wheel: Tilt angle ($\pm 1.5^\circ$ / notch; $\pm 0.25^\circ$ with Alt).
  - Shift + Wheel: Lift height.
  - Alt + Wheel: Yaw rotation about vertical.
- **Burner:** Flame intensity ($1 \dots 5$).
- **Empty Bench:** OrbitControls zoom (Ctrl forces zoom bypass).
- **HUD Ring:** Live parameter ring gauge with color-coded safety ranges (`safe`, `warning`, `danger`).

### 3.2 Touch & Keyboard Parity
- **Touch Gestures:** Two-finger twist (yaw), vertical two-finger drag (tilt), pinch (lift), long-press (grab/release), double-tap (radial context menu).
- **Keyboard Shortcuts:**
  - `Q / E`: Tilt $\mp$
  - `R / F`: Lift $\pm$
  - `Z / X`: Yaw $\mp$
  - `G`: Grab / release
  - `T`: Toggle tongs grip
  - `M`: Meniscus eye-level reading mode
  - `Space`: Hold to pour assist
  - `Esc`: Cancel / put down
  - `?`: Shortcuts cheat-sheet

---

## 4. DAMAGE, FRACTURE & CLEANUP (`src/damage/`)

### 4.1 Impact & Thermal Shock Physics (`DamageModel.ts`)
- **Kinetic Energy:** $E = \frac{1}{2} m v^2$, where $v = \sqrt{2 g h}$.
- **Surfaces:** Stone floor ($2.4\times$ impulse), bench ($1.0\times$), soft ($0.3\times$).
- **Thermal Shock Limit:**
  - Borosilicate glass: $\Delta T_{\text{crit}} \approx 160\text{ K}$.
  - Soda-lime glass: $\Delta T_{\text{crit}} \approx 50\text{ K}$.
  - Porcelain: $\Delta T_{\text{crit}} \approx 280\text{ K}$.
  - Plastic/Metal: Do not shatter on drop.

### 4.2 Shard Instances (`Shards.ts`)
- Procedural radial velocity dispersion on impact.
- Active instances strictly capped at $\le 600$ to maintain 60 fps budget.
- Bare-hand cleanup triggers cut injury; brush & dustpan or tweezers required.

### 4.3 Puddle Spreading & Edge Dripping (`Puddle.ts`)
- Viscous radial spreading: $r(t)$ approaches $r_{\max} = 0.2 + 0.08\sqrt{V}$.
- Edge dripping: Puddles touching bench perimeter ($|X| \ge 15.8\text{ m}$ or $|Z| \ge 6.55\text{ m}$) drip onto the floor.
- Overlapping puddles trigger kernel chemical reactions.

---

## 5. APPARATUS ASSEMBLY & PNEUMATIC TUBING (`src/apparatus/`)

### 5.1 Tubing Network & Suck-Back (`Tubing.ts`)
- Connects reaction vessels to receiving vessels or pneumatic water troughs.
- Internal gas generation ($P > 1.05\text{ atm}$) generates bubbling in submerged water troughs.
- **Cooling Suck-Back:** When heat is removed and the source vessel cools rapidly ($\dot{T} > 1.5\text{ K/s}$), contracting gas draws liquid back from the trough into the reaction flask, triggering thermal shock crack risk if the flask is hot ($T > 80^\circ\text{C}$).

### 5.2 Tipping & Sliding (`Support.ts`, `RigidBodyLite.ts`)
- Tipping angle: $\theta_{\text{crit}} = \arctan(r_{\text{base}} / h_{\text{COM}})$.
- Tall 100 mL graduated cylinder (80% full) tips at $\sim 12.7^\circ$.
- Friction: Dry bench ($\mu \approx 0.65$), wet bench ($\mu \approx 0.15$).

---

## 6. CANARY TEST SUITE VERIFICATION RECORD

All 5 realism canaries verified green in `tests/canaries_k1_to_k5.test.ts`:
- **Canary K1:** 250 mL beaker (80 mL water) tilted 0→180° drains completely ($\text{volume} < 1\text{ mL}$) with exact mass conservation.
- **Canary K2:** Inverted Erlenmeyer flask exhibits glug-glug pulsation and zero NaNs across 90°, 135°, and 180°.
- **Canary K3:** Full tall cylinder tips at $\sim 12.7^\circ$, falls off bench edge, and shatters on stone floor (shards $\le 600$, deterministic seed).
- **Canary K4:** Soda-lime tube cracks from thermal shock ($\Delta T = 85\text{ K}$) while borosilicate survives intact.
- **Canary K5:** Stand + clamp + flask + stopper + delivery tube + trough assembly generates bubbles underwater and accurately triggers suck-back on cooling.
