# CHEMDEX LAB — EFFECT LIBRARY EXPANSION, PHYSICAL STATE CONSERVATION & AI EFFECT-DIRECTOR
### Master implementation prompt for the autonomous coding agent (Antigravity)
**Target repo:** `dienkon/Web` → `ChemDex/lab` (React 19 · R3F 9 · Three r185 · Zustand 5 · Vite 6 · Vitest · Express + Gemini)
**Companion docs already in the repo (read them, do not duplicate them):** `AUDIT.md`, `chemlab_pouring_prompt.md`, `chemlab_overnight_agent_plan.md`, `agent/REPORT.md`.
**This prompt covers four things:**
1. Make every visual effect *physically faithful, detailed and state-conserving* (what pours, what is consumed, what escapes, what stays behind).
2. Expand the effect library from ~30 hand-built reactions to a **composable atom catalog + 100+ reaction programs**.
3. Make the in-app AI able to **understand the catalog and compose the correct effects for reactions that have no hand-made controller**.
4. Prove it with tests, a gallery, and a morning report.

Write all code comments, identifiers and this plan's artifacts in English. All user-facing strings stay bilingual (vi/en) using the pattern the repo already uses.

---

## PART 0 — OPERATING RULES (non-negotiable)

**0.1 Loop per task:** read the code → write a 5-line plan → implement → `npm run lint` (`tsc --noEmit`) → `npm test` (`vitest run`) → open the VFX gallery and scrub the timeline → commit with a message that names the atom/reaction. Never leave the tree red. Existing tests in `tests/` (especially `reaction_controllers.test.ts`, `realism_engine.test.ts`, `multi_step_stoichiometry.test.ts`, `damage_and_physics.test.ts`) must keep passing; if one encodes a behavior that is physically wrong, fix the test *and* record why in `agent/REPORT.md`.

**0.2 Evidence before claims.** Before you change any subsystem, grep for who imports it. The repo contains **two simulation trees** (`src/sim/*` and `src/simulation/*`) and **two reaction-visual systems** (`vfx/recipes/*` and `vfx/reactions/*`). Determine which are live, document it in `agent/EFFECTS_AUDIT.md`, and extend the live one. **Do not create a third.** Dead code you prove unused may be deleted in a separate commit.

**0.3 Determinism.** All randomness goes through `src/core/rng.ts` (`PRNG`, seedable by `?seed=`). Fixed timestep (`1/60 s`, already in `ReactionSimulationEngine`). Same seed + same inputs ⇒ same frames. Required for tests and for the gallery scrubber.

**0.4 Performance contract.** Measure first with `PerformanceHUD`. Budgets (adjust only with measurements in the report): desktop ≥ 60 fps with 3 active reactions; mobile tier ≥ 30 fps; **zero per-frame allocations** in hot loops (use `ParticlePool`, pre-allocated typed arrays); all effects honor `vfx/quality.ts` tiers (`low/medium/high`) by scaling particle counts, shader octaves and post-FX — never by silently disabling the *information* the effect conveys (e.g. a precipitate must still visibly form on `low`).

**0.5 Safety framing.** This is a visual simulation for education. Dangerous combinations (acid+bleach → Cl₂, water into conc. H₂SO₄, heavy-metal salts, cyanide/sulfide gases, energetic decompositions) are shown with **hazard overlays and warnings**, never with step-by-step real-world instructions, quantities or optimization tips. Hazard flags feed the existing `safetyEngine.ts`/PPE system. The AI prompt in Part 7 contains the same guard.

**0.6 Scope discipline.** No heavy new dependencies. Allowed: nothing beyond what `package.json` already has, unless a measured need is written up in the report. Everything procedural (shaders, audio via WebAudio, textures generated at boot).

---

## PART 1 — VERIFIED AUDIT FINDINGS (these are facts read from the uploaded source — fix them first)

Each finding lists the evidence location. Re-verify each one yourself before fixing (line numbers may drift).

**F1 — The AI `effects[]` array is dead data.** `src/shared/schemas.ts` defines `effects: [{type: COLOR_CHANGE|PRECIPITATE|GAS|BOIL|EXPLOSION|CLEAR, duration, color}]`, `server/ai.ts` asks Gemini for it, `chemistryEngine.ts:~1296` produces it — but a repo-wide grep finds **no consumer**. The store copies only booleans (`has_gas`, `has_precipitate`, `is_boiling`, `is_explosion`) from `new_vessel_state`. The AI can currently express nothing beyond six coarse flags.

**F2 — AI-resolved reactions are "teleported", not simulated.** In `useAppStore.ts` both AI fallbacks (`/api/experiment/mix`, ~L3479 add-chemical path and ~L3783 pour path) set `liquidColor`, `hasGas`, `hasPrecipitate`… and store `contents: combinedContents` — the *unreacted* mixture. Consequences: (a) no `reaction_id`, so `getReactionController()` returns `null` and nothing runs in `ReactionSimulationEngine`; (b) **no `activeKinetics` entry**, so there is no progress/timeline — the color jumps; (c) **no mass/mole conservation**: reactants are never consumed, products never appear in `contents`, precipitate mass is not computed from stoichiometry, gas mass is never removed from the vessel. The deterministic path (`evaluateLocalChemistry` → `executeMultiStepReactions`) does conserve moles; the AI path silently breaks the physics the rest of the app promises.

**F3 — Two parallel reaction-visual systems with string-sniffing glue.** `vfx/recipes/reactionVfx.ts` (`REACTION_VFX_RECIPES`, layer DSL: `colorFront|bubbles|gasPlume|precipitate|turbidity|foam|steam|flash|burst|shake|slowmo|solidDissolve|light|sound`) and `vfx/reactions/*` (30 imperative `ReactionVisualController`s). `director.tsx` stitches them together with heuristics such as `kinetics?.reactionId?.includes('sodium') || includes('Na') || includes('Mg')` to decide whether to mount `<Sparks>`. This cannot scale to 100+ reactions and cannot be driven by an AI.

**F4 — Registry alias collisions (physically wrong mappings).** In `vfx/reactions/registry.ts`:
- `'cacl2_na2co3_precipitate'` → AgCl curdy controller (should be CaCO₃ fine white powder).
- `'CaCl2+Na2CO3'` → Na₂CO₃+HCl **gas** controller (CaCl₂+Na₂CO₃ evolves no gas; it precipitates CaCO₃).
- `'AgNO3+KI'` → PbI₂ "golden rain" (AgI is a *pale yellow curdy* precipitate, not golden hexagonal flakes).
- `'FeCl3+NaOH'` → Cu(OH)₂ blue gel controller (Fe(OH)₃ is a rust-brown floc).
- `'Zn+CuSO4'` → Fe+CuSO₄ controller; `'K+H2O'` → sodium controller (K is lilac-flamed, ignites almost immediately, more violent).
- `'NaHCO3+HCl'` → Na₂CO₃ controller (acceptable visually but gas yield per mole differs: 1 CO₂ per NaHCO₃ vs 1 per Na₂CO₃ with 2 HCl).
Fix by giving each its own program (Part 6), add a **regression test that fails if two distinct reaction keys with different product sets resolve to the same controller id**.

**F5 — `ReactionContext` helpers are stubs.** In `ReactionSimulationEngine.createContext`: `addSurfaceImpulse` just emits `particle:burst` with `count: 1` (no ripple is created); `emitBurst` and `emitSparks` both map to the same bus event (sparks are indistinguishable from droplets); `playSound` only understands six ids (`fizz|boil|pop|ignite|alarm|pour`) although `utils/audio.ts` already has ~20 procedural sounds (`playSodiumSizzlePop`, `playMinnaertBubble`, `playBumpingSurge`, `playGlassShatter`, `playExplosion`, `playSpongeWipe`, …). The bus has an unused `surface:ripple` event. Wire these properly.

**F6 — Generic fallback is too thin.** `vfx/recipes/generic.ts` derives everything from four booleans, always uses `style:'curdy'` precipitate and `morphology:'curd'`, ignores gas density, color evolution, heat, state of the reactants, and anything the AI could say about morphology.

**F7 — Vocabulary mismatch between three layers.** Precipitate morphology is spelled four different ways: `PrecipitateMorphologyType` (`CRYSTAL_PLATE|CRYSTAL_ROD|GEL|FLOC|CURD|FINE_POWDER|METALLIC_DEPOSIT`, in `Precipitate.tsx`), `PrecipitationMorphology` (`fine_powder|crystalline|flocculent|granular|gel_like`, in `simulation/core/SimulationTypes.ts`), recipe `style` (`milky|curdy|flake-gold|gel|powder-black|metal-copper`) and `VisualOutcome.precipitate.morphology` (`curdy|milky|gel|floc|plates|powder`, in `chem/reactions.ts`). Gas species/color likewise. Unify into **one enum per concept** (Part 2.3) with adapter functions; keep old names working via `adapters/legacy.ts`.

**F8 — Coverage.** 30 controllers + ~39 entries in `chem/reactions.ts` + `DETERMINISTIC_REACTIONS` in `chemistryEngine.ts`. Anything else goes to Gemini (F1/F2). Typical student combinations (Na₂S, K₂CrO₄, Zn(NO₃)₂, FeSO₄ oxidation, Cu+AgNO₃, NH₄ salts + base, limewater, indicators on every acid/base, etc.) are missing or generic.

**F9 — Time honesty is not modeled.** Real BaSO₄ micro-crystals take hours to settle (Stokes, r≈0.5 µm ⇒ v≈2×10⁻⁶ m/s); ionic diffusion over 1 cm takes ~10⁴–10⁵ s. The app compresses these silently. Part 2.6 introduces explicit *physical time vs display time* so the compression is deliberate, bounded and visible ("⏩ time-lapse ×N" chip) instead of accidental.

**F10 — Visual state is not derived from a ledger.** Effects read `ReactionRuntime.progress` (a scripted 0→1 ramp), not actual moles consumed. So a half-limiting-reagent mix animates like a full one. Part 3 fixes this: *the ledger is the truth, effects are a view of it*.

---

## PART 2 — TARGET ARCHITECTURE: "REACTION PROGRAMS" OVER A CLOSED EFFECT-ATOM CATALOG

### 2.1 Principle
> **Rule-first for *what happens*, catalog-first for *how it looks*, AI only fills the gaps and never emits code.**

- *What happens* (which species are consumed/produced, their phases, ΔH, limiting reagent, whether a precipitate/gas forms) is decided by deterministic chemistry whenever possible (solubility rules + Ksp table, activity series, acid/base/carbonate/sulfite/sulfide gas rules, redox potentials table, known-reaction DB). The AI is consulted only when the rule engine returns `unknown`, or to *refine* style.
- *How it looks* is expressed as a **ReactionProgram**: a JSON document that composes **Effect Atoms** from a closed, versioned catalog. A program is pure data ⇒ validatable, cacheable, serializable, diffable, testable, and safe to accept from an LLM.
- The 30 existing controllers are **kept** as `bespoke` programs (a program may declare `controller: '<existingId>'`), but every new reaction is data-only.

### 2.2 Resolution pipeline (single entry point: `resolveReactionProgram(substances, contents, env)`)
Priority, first hit wins; each result carries `provenance`:
1. `handcrafted` — exact match in the program library (`src/vfx/programs/library/*.ts`) incl. the 30 legacy controllers.
2. `rule-derived` — rule engine classifies the mixture (e.g. "soluble Pb²⁺ + soluble I⁻ ⇒ PbI₂↓") and a **template program** for that class is parameterized (color, morphology, density, mass from stoichiometry). This alone must cover most school-level combinations.
3. `cache` — a previously AI-resolved and *validated* program for the canonical key (`chemistryCache`, persisted; see 7.6).
4. `ai` — Gemini composes a program (Part 7), validated and repaired.
5. `fallback` — conservative generic program derived from the ledger (mixing swirl + whatever the ledger says exists). Never a fake dramatic effect.
Latency rule: the UI must never wait on the network to start moving — Part 7.8 defines the "pending" visual.

### 2.3 Canonical vocabularies (put in `src/vfx/catalog/vocab.ts`, one source of truth, exported to the AI prompt automatically)
- `Phase`: `s|l|g|aq`.
- `PrecipMorphology`: `fine_powder` (BaSO₄, milky) · `curd` (AgCl) · `floc` (Fe(OH)₃) · `gel` (Cu(OH)₂, Al(OH)₃) · `crystal_plate` (PbI₂, hexagonal glints) · `crystal_needle` · `crystal_cubic` · `granular` (CaCO₃ grit, MnO₂) · `dendrite` (Ag/Pb/Cu trees) · `metallic_film` / `mirror` (Ag mirror) · `colloid` (S, Prussian blue, Fe(OH)₃ sol) · `amorphous_black` (CuS, PbS, carbon).
- `GasSpecies` with properties table (M, density vs air = M/28.96, color, odor tag, toxicity, solubility, buoyancy class): H₂, O₂, N₂, CO₂, Cl₂, NO, NO₂, SO₂, H₂S, NH₃, HCl, Br₂ vapor, I₂ vapor, CH₄, H₂O vapor, ‘unknown’.
- `HeatClass`: `endo_strong|endo|neutral|exo|exo_strong|runaway`.
- `Anchor`: `pourPoint | stream | bottom | surface | meniscus | wall | wallLower | wallUpper | rim | headspace | outside | bulk | solid:<formula> | electrode:<id> | flame | thermometer`.

### 2.4 Program schema (TypeScript; mirror as Zod in `src/shared/programSchema.ts`, and as JSON-Schema for Gemini `responseSchema`)
```ts
export interface ReactionProgram {
  schema: 'chemdex.program/1';
  id: string;                         // canonical key, e.g. "zn+pb(no3)2" (sorted, lowercase, normalized)
  provenance: 'handcrafted' | 'rule-derived' | 'ai' | 'fallback';
  controller?: string;                // optional legacy bespoke controller id
  chemistry: {
    equation: string;                 // balanced, with states: "Zn(s) + Pb(NO3)2(aq) -> Zn(NO3)2(aq) + Pb(s)"
    ionic?: string;
    species: SpeciesRole[];           // role, coeff, phase, M, color, density, hazard tags
    deltaH_kJ_per_mol?: number | null;  // per mole of reaction as written; null if unknown
    kinetics: Kinetics;
    conditions?: { minTemp_c?: number; catalyst?: string; light?: boolean; medium?: string; sealed?: boolean };
    hazards: GhsTag[]; warning_vi?: string; warning_en?: string;
  };
  visual: {
    duration_s: number;               // *display* duration at 1× speed
    timeWarp?: { physical_s: number; note_vi?: string; note_en?: string }; // honesty (2.6)
    timeline: AtomInstance[];         // ≤ 24
    after: AfterState;                // persistent result: what remains once effects end
  };
  explain: { observation_vi: string; observation_en: string; why_vi: string; why_en: string };
  confidence: number;                 // 0..1 — rule-derived/handcrafted = 1.0
}

export interface Kinetics {
  model: 'instant' | 'first_order' | 'second_order' | 'autocatalytic' | 'induction_then_fast'
       | 'oscillatory' | 'diffusion_limited' | 'surface_limited' | 'heat_activated';
  halfTime_s: number;                 // at 25 °C, nominal stir
  induction_s?: number;
  q10?: number;                       // rate multiplier per +10 K (default 2)
  stirSensitivity?: number;           // 0..1: how much stirring accelerates (surface/diffusion limited ≈ high)
  period_s?: number;                  // for oscillatory
}

export interface AtomInstance {
  id: string;                         // unique inside the program
  atom: AtomName;                     // MUST exist in the catalog (2.5)
  anchor: Anchor;
  window: [number, number];           // normalized 0..1 of visual.duration_s, or use `startOn` below
  startOn?: { species: string; moleFractionConsumed: number } | { event: 'pourImpact'|'heat>T'|'stir'|'shake'|'tilt'|'seal'|'open' };
  intensity: number | { bind: LedgerBinding; gain?: number; curve?: Curve };  // bind to ledger rates => truthful scaling
  params: Record<string, number | string | boolean | number[]>;   // validated against the atom's own schema
  fallbackAtom?: AtomName;            // used if quality tier or capability disables this atom
}
export type LedgerBinding =
  | `rate:${string}`        // mol/s of a species being produced(+)/consumed(-)
  | `amount:${string}`      // mol present
  | `heatRate`              // W
  | `turbidity` | `temperature` | `pressure` | `gasHoldup` | `supersaturation:${string}`;
export interface AfterState {
  liquidColor: string; liquidOpacity: number; turbidity: number;
  precipitate?: { substance: string; morphology: PrecipMorphology; color: string; mass_g: 'fromLedger' };
  residues?: Array<{ where: 'wall'|'bottom'|'rim'|'outside'|'stopper'|'filter'; kind: string; color: string; amount: number }>;
  solidsRemaining?: Array<{ formula: string; mass_g: 'fromLedger'; morphologyChange?: string }>;
  gasesOffgassed: Array<{ species: string; mol: 'fromLedger'; escaped: boolean }>;
}
```
**Hard validator rules** (`validateProgram()`, see 7.4): every `atom` ∈ catalog; every `bind` refers to a species in `chemistry.species`; every numeric param within the atom's declared `[min,max]`; hex colors match `/^#[0-9a-f]{6}$/i`; ≤ 24 atoms; sum of declared particle budgets ≤ tier budget; no string is ever evaluated or used as a path/selector.

### 2.5 Atom contract (`src/vfx/catalog/types.ts`)
Every atom is a module exporting:
```ts
export interface EffectAtom<P> {
  name: AtomName;                          // camelCase, unique
  version: number;
  category: 'liquidOptics'|'gas'|'solidPhase'|'thermal'|'interface'|'combustion'|'light'|'metal'|'camera'|'audio'|'wall';
  summary_en: string;                      // used verbatim in the LLM catalog digest
  useWhen: string[];                       // physical triggers, e.g. "a gas product denser than air"
  avoidWhen: string[];                     // negative guidance, e.g. "never for aqueous ion color change only"
  params: ParamSpec<P>;                    // name, type, min, max, default, unit, description
  budget: { particles?: number; drawCalls?: number; shaderCost: 1|2|3 };
  anchorsAllowed: Anchor[];
  ledgerInputs?: LedgerBinding[];          // which ledger quantities it can follow
  mount(ctx: AtomCtx, p: P): AtomHandle;   // allocate from pools
  update(h: AtomHandle, dt: number, s: LedgerView): void;
  writeBack?(h: AtomHandle, vessel: VesselPatch): void;   // persistent consequences (stain, residue, sediment)
  dispose(h: AtomHandle): void;
  gallery: GalleryEntry[];                 // ≥ 2 presets shown in VfxGallery with a scrubber
  tests: string[];                         // names of vitest cases covering it
}
```
A script `npm run catalog:digest` emits `server/generated/catalog.digest.json` (name, category, summary, useWhen, avoidWhen, param ranges, anchors, 1 example) — **this file is the only thing the AI ever sees of the catalog**, so adding an atom automatically teaches the AI about it.

### 2.6 Time honesty
Every phenomenon declares `physical_s` (real-world timescale) and the program declares `display_s`. The ratio is the **time-lapse factor**. Rules: factor ≤ 20 without a HUD chip; 20–200 shows "⏩ time-lapse ×N" on the vessel's `MeasurementHUD`; > 200 (e.g. hours-long sedimentation, crystal growth overnight) is only reachable through an explicit "Skip time / Wait" control and renders as a cross-fade between two states, never as fake fast motion. Fast phenomena (gas pop, flash, splash) are never slowed except by the existing `slowmo` camera layer.

---

## PART 3 — THE CONSERVATION LEDGER ("bảo toàn, mất đi, còn lại")

### 3.1 Purpose
One authoritative per-vessel accounting object that every system reads and writes. **Visuals follow the ledger; the ledger never follows visuals.** Implement in `src/engine/ledger.ts` (pure functions + a small class), integrate with `VesselState.contents` (`SubstanceContent{formula, moles, mass_g, volume_ml, concentration_M}`) so existing UI keeps working.

```ts
interface Ledger {
  inventory: Record<SpeciesId, { moles: number; phase: 'aq'|'s'|'l'|'g'; location: 'bulk'|'bottom'|'surface'|'wall'|'headspace'|'filter'|'stopper'|'electrode'; mass_g: number }>;
  sinks: { escapedGas_g: Record<SpeciesId, number>; evaporated_g: number; spilled_g: number; overflow_g: number;
           retainedOnSource_g: number; filterCake_g: number; condensedOnWalls_g: number; stainDeposit_g: number };
  energy: { heatReleased_J: number; heatToSurroundings_J: number; latent_J: number };
  fields: { T_c: number; pH: number; ionicStrength: number; turbidity: number; gasHoldup: number; foam_ml: number; headspacePressure_atm: number };
  rates: Record<`rate:${SpeciesId}`, number>;    // mol/s, signed
  audit: () => { massError_g: number; atomError: Record<Element, number>; chargeError: number };
}
```

### 3.2 Invariants (assert every fixed step in dev; run as property tests in CI)
1. **Mass:** `Σ mass(inventory) + Σ sinks = Σ mass(initial inputs)` within `1e-6 g` (document the *one* allowed leak: dissolved O₂/CO₂ from air, if modeled, enters as an explicit source).
2. **Atoms:** per element, Σ moles×count conserved in closed vessel (tolerance `1e-9 mol`). Use formula parsing already present in `chemistryEngine` (`normalizeFormulaToken`/`chemicalFormulaMatches`); extend with a real formula parser (parentheses, hydrates like `CuSO4·5H2O`).
3. **Charge:** electroneutrality of the aqueous phase within tolerance (needed for pH and for ion-color logic).
4. **Energy:** `ΔT = Q / (Σ mᵢ cᵢ)` with `c_water = 4.18 J/(g·K)`, solids by table; heat of dissolution and phase change tracked; losses to surroundings by Newton cooling, faster for thin glass, boiling, stirring.
5. **Volume is not always additive:** ethanol+water contracts (~3–4 % at 50 vol %), conc. H₂SO₄+water contracts; implement a small non-ideal-mixing table; precipitates and undissolved solids occupy no *solution* volume but raise the apparent level when settled (bed volume = mass / (ρ·packing 0.3–0.64)).
6. **Gas:** gas formed leaves as `escapedGas_g` when the vessel is open (rate limited by bubble rise + headspace exchange); in a **sealed** vessel it stays, `P = nRT/V_head` (`isSealed`, `internalPressure_atm`, burst > 2.5 atm already exist) and stopper pop / shatter fires from the ledger value. Dissolved gas follows Henry’s law (CO₂ k_H≈0.034 mol/(L·atm) at 25 °C; NH₃ and HCl extremely soluble, so they often do **not** bubble out of cold dilute solutions).
7. **Never negative:** moles ≥ 0; limiting reagent honored (`stoichiometry` in `DeterministicReaction`); excess reagent remains and colors the result (e.g. excess MnO₄⁻ purple, excess I₂ brown, excess OH⁻ re-dissolving amphoteric hydroxides).

### 3.3 "Thing X disappears / appears" — mandatory visual bindings
| Real change | Required visual consequence (driven by the ledger) |
|---|---|
| Solid reagent consumed (Mg ribbon, Zn granules, Fe nail, CaCO₃ chips) | `SolidContentsRenderer` scales/erodes geometry ∝ remaining moles; ribbon shortens from the burning end; granules thin out; chips get rounded; **a half-limiting mix ends with solid left over** |
| Solute consumed (colored ion) | liquid color from **Beer–Lambert** per-species absorbance `A = Σ εᵢ cᵢ l`, not a scripted lerp; color fades exactly as `rate:` dictates |
| Product dissolves (aq) | color/turbidity/pH change; no solid |
| Product insoluble (s) | precipitate mass = `n × M` from ledger → `Precipitate` count, bed height, supernatant clarity |
| Gas produced | bubble count ∝ `rate:<gas>`; mass leaves vessel; level in sealed/gas-collection setups changes (pneumatic trough, balloon, syringe) |
| Water produced/consumed | volume and concentration update (matters for conc. acid dilution, deliquescence) |
| Evaporation | meniscus lowers, concentration rises, salt crust at the edge, balance reading drops |
| Pouring | source loses volume/mass; **film retained on source walls** (`pour/physics/retained.ts`); target gains; drops that fall short become `SpillState` with their own substances and hazard |
| Heating | `T` follows energy balance; thermometer lags (time constant ~3–8 s for glass bulb); glass stress rises with ΔT/Δt (hook into `damage/DamageModel.ts`) |
| Filtration | cake mass on paper (`filterPaperResidue_g`), filtrate loses turbidity, wet cake darkens |
| Mass on balance | Fe wool **gains** mass on burning (O₂ taken from air); a sealed flask with CO₂ evolution keeps constant mass, an open one **loses** it — the balance must show both |

### 3.4 AI path must go through the ledger (fixes F2)
When a program comes from `ai`/`rule-derived`, `applyProgramToLedger(program, vessel)` converts `chemistry.species` + stoichiometry into ledger transitions (consume reactants limited by the limiting reagent; create products with phases), then **writes the result back into `VesselState.contents`, `precipitateAmount_g`, `foam_ml`, `hasGas`, etc.** and starts an `activeKinetics` entry whose `reactionId` is the program id, so `VfxDirector` and `ReactionSimulationEngine` treat it exactly like a handcrafted reaction. If the AI’s equation is not balanced (checked by the atom-count solver) the program is rejected → repair loop (7.4).

---

## PART 4 — THE EFFECT-ATOM CATALOG (≥ 110 atoms, each concrete)

Implement every atom below as a module under `src/vfx/catalog/atoms/<category>/<atomName>.ts` following the contract in Part 2.5. Each atom row gives: **name — physical basis → visual spec → ledger binding → typical uses**. Parameter ranges are guidance; finalize them in the atom's `ParamSpec` and in `catalog.digest.json`. Reuse existing renderers first (`Bubbles`, `Steam`, `GasPlume`, `Precipitate`, `Foam`, `Splash`, `AcidSplatter`, `Sparks`, `liquid.tsx`, `glass.ts`, `flame.tsx`, `volumeSmoke.ts`, `PhysicalSimulationRenderer`); extend them with the new parameters rather than cloning them.

### 4.0 Vapor, fume and smoke — the physics every gas/aerosol atom must obey
A "gas effect" is **one of five physically different things**. Never render them the same way.
1. **Truly invisible gas** (H₂, O₂, N₂, CO₂, SO₂, NH₃, H₂S, CH₄, CO, water vapor above ~1 cm from a hot surface, HCl gas in dry air). Show it **only through its consequences**: bubbles in liquid, a *schlieren* refraction shimmer (density gradient), moving candle/flame/smoke tracers, indicator papers, pressure (balloon, syringe, stopper), odor tag in the info panel. Do not draw fake white fog for an invisible gas.
2. **Colored gas** (Cl₂ yellow‑green, Br₂ red‑brown, I₂ violet, NO₂ red‑brown, ClO₂ yellow, O₃ faint blue). Rendered as a *volumetric absorber*: transmitted color = `exp(−σ_λ · ρ · path)`, so thin = pale, thick = deep, and the **same plume looks darker at the center and paler at the edges**. Color depends on temperature where equilibria exist (NO₂ ⇌ N₂O₄: hot = darker brown, cold = paler/colorless).
3. **Condensed aerosol / "steam" / fog** (visible steam is *liquid droplets*, not gas; HCl and HNO₃ fumes in humid air; NH₄Cl smoke; dry-ice fog). White (Mie scattering), opaque where dense, with a **clear gap** just above a hot surface where it is still vapor; droplets evaporate again in dry/warm air so wisps vanish.
4. **Particulate smoke** (MgO, Na₂O/NaOH, Fe₃O₄ sparks' smoke, soot, ZnO "philosopher's wool"). Bright white (metal oxides) or black (soot), carried upward by thermal buoyancy, settling as fine fall‑out onto the table (writes a faint `SpillState`-like dust stain).
5. **Spray / mist from bursting bubbles** (acid mist above vigorously gassing liquid, aerosolized droplets). Tiny droplet bursts above the surface; hazard-tagged if the liquid is corrosive.

**Dynamics (all plumes):** density ratio to air `ρ_g/ρ_air = (M/28.96)·(298.15/T_K)·(P/1 atm)` decides rise/sink. Reference values at 25 °C: H₂ 0.07 · CH₄ 0.55 · NH₃ 0.59 · H₂O(v) 0.62 · N₂ 0.97 · O₂ 1.10 · H₂S 1.18 · HCl 1.26 · CO₂ 1.52 · NO₂ 1.59 · SO₂ 2.21 · Cl₂ 2.45 · Br₂(v) 5.52 · I₂(v) 8.76. **Heavier-than-air gases pour over the rim like a liquid, flow along the table, pool in low spots, and cascade down into a lower vessel;** lighter gases rise and spread under the ceiling/hood. Add turbulence (curl-noise, strength ∝ Reynolds estimate), molecular diffusion (slow, only matters in still air), thermal buoyancy for hot plumes (`ΔT` expands gas), entrainment of ambient air (plume widens with height), and **fume-hood extraction** (existing PPE/fume_hood item) that pulls the plume toward the hood face. Lighting: plumes are lit by the scene lights and by flame/flare lights (a red‑brown NO₂ cloud glows orange when a flame is nearby; fog scatters forward light).

**Fume color table (authoritative; put in `src/vfx/catalog/gasTable.ts` and feed to the AI digest):**

| Species | Visible? | Color (sRGB) | Opacity model | Behavior | Notes shown to user |
|---|---|---|---|---|---|
| H₂ | no | – | schlieren only | rises fast, spreads | squeaky pop with flame |
| O₂ | no | – | – | slightly heavier | relights glowing splint |
| CO₂ | no (cold fog if from dry ice) | – / `#e8f0f5` fog | – / aerosol | sinks, pools, extinguishes flame | limewater turns milky |
| Cl₂ | yes | `#c6d84a`→`#9fb52a` | absorber σ≈0.9 | heavy, hugs table | toxic, bleaches litmus |
| Br₂ vapor | yes | `#a8321c`→`#6e1d10` | absorber σ≈1.3 | very heavy, drips down | corrosive, liquid Br₂ layer below |
| I₂ vapor | yes | `#7a3fa8`→`#4b1f73` | absorber σ≈1.1 | heavy, deposits dark crystals on cold glass | sublimation/deposition |
| NO₂ | yes | `#b8501a`→`#7a2f0a` | absorber σ≈1.0 (T‑dependent) | heavy, drifts | from Cu + conc. HNO₃; NO is colorless but turns brown on meeting air |
| NO | no → brown at air contact | – → `#b8501a` | – | forms NO₂ at the mouth | |
| SO₂ | no (haze if moist) | – / `#f1f5f9` haze | – | heavy | pungent; acidifies litmus |
| H₂S | no | – | – | slightly heavy | blackens lead-acetate paper, rotten-egg tag |
| NH₃ | no | – | schlieren | rises | turns damp red litmus blue |
| HCl gas | no (white fog in humid air) | `#f8fafc` | aerosol α≈0.5 | heavy-ish | white smoke ring with NH₃ |
| NH₄Cl smoke | yes | `#f8fafc` | aerosol α≈0.8 | rises with warm air, settles slowly | forms where NH₃ and HCl meet |
| SO₃/oleum fume | yes | `#ffffff` | aerosol α≈0.9 | dense white | reacts violently with water |
| Steam (water droplets) | yes (above gap) | `#ffffff` | aerosol, gap 1–3 cm | rises, curls, vanishes | |
| MgO smoke | yes | `#ffffff` | particulate α≈0.9 | rises in flare convection | |
| Soot | yes | `#111418` | particulate α≈0.95 | rises, deposits on cold glass | incomplete combustion |
| Dry-ice fog | yes | `#e8f0f5` | aerosol | sinks (cold), cascades | |

**Graham's law demo (NH₃ + HCl):** the white ring forms where gases meet: `d_NH3 / d_HCl = √(M_HCl/M_NH₃) = √(36.46/17.03) = 1.46`. The ring therefore forms **closer to the HCl end** (NH₃, lighter, travels 1.46× farther). Implement as a 1‑D diffusion tube so the ring position emerges from the simulation (and the test asserts 1.46 ± 0.1).

### 4.A Liquid optics & color (18)
1. **colorFrontDiffusive** — molecular diffusion layer; sharp boundary fuzzing over time (D≈1e‑9 m²/s ⇒ millimetres in minutes) → thin interface that thickens with `√t` → `amount:<species>` of the two sides.
2. **colorFrontAdvective** — pour-driven plume; denser fluid sinks as a "waterfall" along the wall, lighter floats as a layer → streak/ribbon with shear; density from ledger.
3. **beerLambertBlend** — per-species absorbance `A=Σεᵢcᵢl` per RGB channel → true color mixing (blue + yellow ≠ naive average) → drives *every* liquid color. Table of ε (RGB-effective) per colored ion in `data/optics.ts` (Cu²⁺ aq, Cu(NH₃)₄²⁺, Fe³⁺, Fe(SCN)²⁺, MnO₄⁻, MnO₄²⁻, CrO₄²⁻, Cr₂O₇²⁻, Cr³⁺, Co²⁺, Ni²⁺, I₃⁻, Br₂(aq), Cl₂(aq)).
4. **indicatorTransition** — Henderson–Hasselbalch fraction of In⁻ vs HIn, sharp over ≈2 pH units around pKa (phenolphthalein 8.2–10 colorless→magenta, methyl orange 3.1–4.4 red→yellow, bromothymol blue 6.0–7.6 yellow→blue, litmus, universal indicator multi-hue) → continuous color, never a switch.
5. **fadeAbsorbance** — species consumed ⇒ color intensity decays exactly with `amount:<species>` (permanganate decolorizing in oxalate, Fe³⁺ thiocyanate fading with Ag⁺ added).
6. **multiStageColorLadder** — ordered color states with thresholds on ledger variables (KMnO₄ purple → green MnO₄²⁻ → brown MnO₂ in alkaline glucose "chameleon"; Cr₂O₇²⁻ orange → Cr³⁺ green with reductant; Cu²⁺ pale-blue gel → deep-blue [Cu(NH₃)₄]²⁺).
7. **schlierenStreaks** — refractive-index differences from mixing sugar/salt/acid with water → wavy transparent streaks that fade as mixing completes (visible when dense solution is poured into water *before* any color change).
8. **turbidityRise** — Rayleigh/Mie scattering from growing particles → liquid goes from clear → faint haze (blue-white, Tyndall) → milky → opaque; clarity restores as particles settle.
9. **tyndallBeam** — a thin light beam (laser pointer prop) becomes visible inside colloids (S sol, Fe(OH)₃ sol, starch, milk) but not in true solutions → classic colloid-vs-solution test.
10. **opalescenceNearCritical** — blue-white shimmer in very fine precipitates (AgCl at very low conc.) → saturation `S≈1–3`.
11. **thermochromicShift** — equilibrium shifted by T (CoCl₂ pink ⇌ blue with Cl⁻/heat; [Cu(H₂O)₆]²⁺ ⇌ CuCl₄²⁻ blue→green→yellow with HCl) → color follows `K(T)`.
12. **equilibriumShiftLeChatelier** — Fe(SCN)²⁺, CrO₄²⁻/Cr₂O₇²⁻, NO₂/N₂O₄: add reagent/heat/cool → smooth, reversible color migration with relaxation time.
13. **pHGradientLayers** — universal indicator layering when acid is poured onto base (colors stacked red→orange→yellow→green→blue→violet) → pH field in 1-D along depth.
14. **fluorescenceUV** — only when a UV lamp prop is on: fluorescein (green), quinine in tonic (blue), rhodamine (orange) → emissive color, rest of scene dimmed.
15. **chemiluminescence** — luminol/K₃Fe(CN)₆ blue glow, lightstick → emissive, decays ~ exponential; scene lights dim to make it visible.
16. **oscillatingColor** — BZ (red↔blue), Briggs–Rauscher (colorless→amber→blue-black, repeating), "blue bottle" (blue on shaking, colorless on rest) → limit-cycle ODE driven; period from kinetics (Part 5.6).
17. **liesegangRings** — periodic precipitation bands in a gel (AgNO₃ diffusing into K₂Cr₂O₇ gel → red-brown Ag₂Cr₂O₇ rings; Mg(OH)₂ bands) → spacing follows Jabłczyński law `x_{n+1}/x_n ≈ 1+p`.
18. **liquidLayerStratification** — immiscible/dense layers (oil/water, CH₂Cl₂/water, conc. H₂SO₄/water, hot/cold) with distinct menisci, a visible interface, droplet emulsification on shaking, coalescence after rest (separatory funnel hook).

### 4.B Gas & bubble phenomena (20)
19. **nucleationSiteBubbleStream** — bubbles form at scratches/solid surface sites and rise as *chains* with growth-by-diffusion → Minnaert pop sound on burst (already in `audio.ts`).
20. **fineEffervescenceCloud** — thousands of micro bubbles (carbonate + acid) giving a milky, fizzy look and "champagne" columns → rate from `rate:CO2`.
21. **vigorousBoilBubbles** — vapor bubbles from heated wall, collapse in sub-cooled liquid ("singing"), then full rolling boil (stage machine already in `PhaseEngine`).
22. **bumpingSurge** — superheat then sudden violent nucleation, liquid lifts and can overflow; prevented by boiling chips/stirring (hook `bumpingSurge`).
23. **bubblesClingToSolid** — H₂ on Zn/Mg/Al, CO₂ on marble chips: bubbles stick, grow, detach; light solids (granules) get buoyed up and sink again → solid jitter physics.
24. **solidFlotationByGas** — carbonate powder rises as foam raft; metal turnings hover.
25. **foamHead** — CO₂/surfactant foam: Plateau borders, drainage, collapse time by liquid viscosity/soap (`Foam.tsx`, `foam_ml`).
26. **foamClimbRunaway** — H₂O₂ + KI + dish soap "elephant toothpaste": pressure of O₂ extrudes dense foam in a rope, hot (exothermic), steam on top → `foam_ml` follows O₂ ledger, color from added dye stripes.
27. **viscousFoamRope** — high-viscosity extrusion with coiling (rope-coil instability) for the above and sugar–acid carbon foam.
28. **burstAerosolSpray** — bubble burst jets (Worthington) eject droplets; corrosive liquids create hazardous mist above the vessel.
29. **gasBalloonInflate** — balloon on flask neck inflates ∝ cumulative gas mol (V=nRT/P); lighter-than-air gas lifts it when released; thin rubber may burst with too much gas.
30. **gasSyringeCollect** — plunger rises as gas accumulates, force-limited by friction.
31. **pneumaticTroughCollection** — inverted graduated cylinder; water level pushed down by gas volume; bubble stream rises through the water bath; soluble gases (NH₃, HCl, SO₂) cannot be collected this way (show gas dissolving instead).
32. **gasJarFillByDisplacement** — heavy gas fills jar from the bottom with a visible rising fill-line; upward or downward delivery.
33. **splintTestSet** — glowing splint relights (O₂), burning splint pops (H₂), extinguishes (CO₂/N₂) → flame response atom binds to local gas fractions at the splint.
34. **limewaterClouding** — Ca(OH)₂ + CO₂ → CaCO₃ milky; with excess CO₂ → clears again (Ca(HCO₃)₂ soluble) → two-stage turbidity.
35. **indicatorPaperTests** — damp litmus (red by acids, blue by bases), starch‑iodide (blue-black by Cl₂/oxidants), lead acetate (black PbS by H₂S), CoCl₂ paper (blue→pink by water) → paper color from local gas concentration × exposure time.
36. **gasDissolutionHenry** — gas evolution suppressed while the liquid is under-saturated (NH₃, HCl, SO₂, CO₂ in cold water); bubbling begins only past solubility; heating degasses → bubbles appear on warming (like soda).
37. **suckBackReverseFlow** — cooling a gas-delivery tube sucks liquid back into the hot flask (the real reason to remove the tube first) → hazard + glass thermal-shock hook.
38. **pressureBuildup** — sealed vessel `P=nRT/V`; bulging stopper, hiss on loosening, stopper launch, glass burst > 2.5 atm (existing thresholds).

### 4.C Vapor, smoke, fume atoms (22) — physics in 4.0
39. **hotSteamPlume** — water-droplet fog with clear gap, wisp curl, wind dispersion (`Steam.tsx` + gap param).
40. **condensationFogOnWalls** — cool wall above hot liquid fogs, droplets coalesce, run down in streaks, return to liquid (reflux ring in condensers).
41. **dryIceFogCascade** — CO₂(s) sublimation, dense cold fog sinks, spills over the lip and flows along the table; bubbling with warm water.
42. **ammoniumChlorideSmoke** — NH₃ + HCl → NH₄Cl particles: white wisps at the meeting point, drift, slowly deposit white crust on glass (tube demo uses Graham ratio).
43. **hclFumingInHumidAir** — conc. HCl fumes white at mouth; stops in dry air; stronger near open bottle neck, rolls over the rim.
44. **hno3FumingRed** — conc./fuming HNO₃ with NO₂: yellow-brown liquid, red-brown fumes, brown tint rising; darker in light.
45. **heavyYellowGreenChlorine** — Cl₂ plume pooling at the bottom of a flask, visible layer line, bleaches damp litmus on contact, hazard overlay.
46. **bromineVaporLayer** — red-brown dense vapor above liquid Br₂; condensed droplets on the neck; "drips" of dense vapor down.
47. **iodineVioletVapor** — I₂ solid warmed: violet vapor; on cold surface (cold finger/watch glass) dark crystals deposit (sublimation/deposition) → `after.residues` on wall.
48. **no2BrownPlume** — Cu + conc. HNO₃: brown plume, solution green→turquoise→blue as it dilutes; T-dependent darkness.
49. **noToNo2AtMouth** — colorless NO bubbling, turns brown the instant it exits into air (O₂) at the vessel mouth.
50. **so2HazeMoist** — sulfur burning, Cu + hot conc. H₂SO₄: colorless pungent gas, faint haze in humid air; litmus turns red; hazard overlay.
51. **sulfurBlueFlameSmoke** — S burning: pale blue flame in dark, white SO₂/SO₃ haze, molten amber S melt pool.
52. **magnesiumOxideSmoke** — blinding white flare + dense white MgO smoke, ash left (white, brittle), sparks.
53. **sodiumOxideSmoke** — dense white NaOH/Na₂O fume, yellow flame, fog of caustic aerosol.
54. **steelWoolSparkShower** — iron glowing orange, sparks fly in parabolic arcs, burning bits fall and char the table (burn marks hook), mass **increases** (O₂ gained).
55. **sootBlackSmoke** — incomplete combustion (rich flame, long chain fuels): black plume, soot deposits on cold glass held in flame, soot ring on wall.
56. **sugarCarbonSnake** — sugar + conc. H₂SO₄: darkening amber→brown→black, violent steam + SO₂/CO₂ gas, carbon column rises as porous black foam (hazard).
57. **ammoniumDichromateVolcano** — orange crystals ignite, glowing sparks spurt, dark-green Cr₂O₃ "ash" fluffy mound grows, N₂ + steam smoke; volume increase of ash ≈ ×5–10; Cr(VI) hazard overlay.
58. **hydrogenPopFlash** — H₂/air mixture ignites with pale-blue flash + whoosh/bang scaled by the explosive volume (not by fiat), test-tube glass may crack if sealed.
59. **candleBurnPlume** — hot gas plume with soot particles, wax melting pool, flame dependence on O₂ in jar (extinguishes in sealed jar as O₂ drops, mass of CO₂/H₂O formed).
60. **heatHazeShimmer** — refraction distortion above a burner/hot plate; screen-space warp scaled by `ΔT`.

### 4.D Solid phases: precipitates, crystals, deposits (28) — physics in Part 5
61. **fineMilkyPowder** — µm-sized crystallites (BaSO₄, CaCO₃ fine), long-lived haze, slow settle, thin white bed.
62. **curdyClumps** — AgCl, flocculated cheesy clumps that cluster, then tumble down as aggregates; photodarkening after light exposure.
63. **rustFloc** — Fe(OH)₃: voluminous brown flocs, hollow aggregates, very slow compaction; bed height ≫ mass-based estimate (porosity 0.9).
64. **blueGel** — Cu(OH)₂ gelatinous sheets, hanging in the liquid as translucent veils; shrinks (syneresis) over minutes; turns black CuO when heated.
65. **whiteGelatinousAmphoteric** — Al(OH)₃/Zn(OH)₂: white gel that dissolves in excess OH⁻ (or acid) → `precipitateRedissolving`.
66. **goldenHexPlates** — PbI₂: glittering hexagonal platelets flutter down (fluttering fall, glints from random plate normals), often *dissolve in hot water and re-crystallize on cooling* ("golden rain"); the main signature.
67. **blackFineColloid** — CuS, PbS, Ag₂S: very dark, near-opaque suspension, hard to settle; black stain on dips.
68. **yellowDensePowder** — PbCrO₄/AgI/S: bright/pale yellow granular precipitate, fast settle (hazard tagging for Pb/Cr).
69. **colloidalSulfurHaze** — Na₂S₂O₃ + acid: induction time (clear) → faint blue-white opalescence → yellow-white milky cloud, no sediment for minutes (disappearing-cross timing).
70. **needleCrystalGrowth** — cooling crystallization of KNO₃/thiourea/benzoic acid: needles nucleate at wall/rod, grow in length with `dL/dt = G(S)`, radial bundles, fall as shimmering needles.
71. **cubicCrystalGrowth** — NaCl: hopper (stair-stepped) cubes on evaporation at the surface, floating "rafts" that sink.
72. **octahedralCrystalGrowth** — alum: clear, glassy octahedra on bottom, grow under slow cooling; seeded growth on a thread.
73. **hydrateBlueCrystals** — CuSO₄·5H₂O: blue triclinic crystals; on heating lose water → white anhydrous CuSO₄ powder (and re-blue with drops of water, exothermic).
74. **crystalFernFrost** — NH₄Cl/ammonium salts dendritic fern growth on glass on evaporation (fractal DLA pattern).
75. **dendriticMetalTree** — Ag on Cu wire in AgNO₃, Pb tree on Zn in lead(II) salt, Cu on Zn/Fe: fractal metal crystals grow outward from the surface, needle/leaf-like, shiny, often detaching and dropping.
76. **silverMirrorWall** — Tollens: uniform silver film on inner glass wall (needs clean glass, mild warming), mirror reflects environment map; gray-black powder if impure/overheated.
77. **copperPlatingCoat** — Fe in CuSO₄: pink-red, porous copper coat on the nail, flakes of copper fall; blue fades to pale green Fe²⁺ per ledger.
78. **crystalSpikeBloom** — seeded supersaturated solution (sodium acetate "hot ice"): a crystallization front sweeps through in seconds, releasing heat (solution warms ≈ +5–10 K), solid fully crystalline white tower when poured.
79. **evaporationRimCrust** — on heating to dryness: salt crust at the contact line, creeping crystals over the rim, "coffee ring"; spattering near dryness (hazard: splashes).
80. **ringStainOnWall** — concentration ring left where the meniscus used to be (existing `stainColor`).
81. **sedimentBedCompaction** — bed height `H = m/(ρ_p·φ·A)` with `φ` packing (powder 0.3–0.5, floc 0.05–0.15, dense crystals 0.6); compacts under its own weight over time; rough surface, ripples from pour impact.
82. **sedimentAvalanche** — when the vessel is tilted past the angle of repose (25–40°) the bed slumps/avalanches, and a cloudy plume forms from the stirred-up fines.
83. **resuspensionCloud** — stirring/shaking/pouring lifts fines; cloud density ∝ stir energy and 1/settling velocity; resettles per Stokes.
84. **settlingFrontInterface** — a sharp horizontal interface between cloudy and clearing liquid moving down (hindered settling, Richardson–Zaki exponent `n=4.65` for Re≪1) with clear supernatant above.
85. **floatingPrecipitate** — particles lighter than the liquid or carried by bubbles form a scum/cap (flotation); lighter organic solids.
86. **precipitateRedissolving** — excess reagent dissolves it (Al(OH)₃/OH⁻, Zn(OH)₂/NH₃, AgCl/NH₃, Cu(OH)₂/NH₃ deep blue, PbI₂/hot water): particles shrink, edges round off, solution color appears.
87. **precipitateAgeing** — color/phase evolve in time (Fe(OH)₂ white → green → brown in air; AgCl white → purple-gray in light; Cu(OH)₂ → CuO black on heating or in hot alkaline; Mn(OH)₂ white → brown).
88. **filterCakeFormation** — on a filter: cake thickness `∝ mass/area`, filtrate flow slows as the cake grows (Darcy), cake darkens when wet, residue left on paper (existing `filterPaperResidue_g`).

### 4.E Metal & solid-surface reactions (14)
89. **metalDissolveWithBubbles** — Zn/Mg/Al in acid: surface shrinks, smoothness lost, bubble coat, dull-gray fines; Mg ribbon curls and shortens from both ends; mass loss bound to `amount:M(s)`.
90. **pittingAndEtching** — surface roughening, dark spots (Zn/HCl, steel in acid), edge rounding.
91. **sodiumDartRun** — Na (ρ=0.97) floats, melts to a bright silver sphere (mp 98 °C, because ΔH heats it), skitters on H₂ cushion, hisses/crackles, ends with a small yellow flame pop if confined, solution turns phenolphthalein magenta around it.
92. **potassiumLilacFlame** — K ignites at once, lilac flame, violent, more spray; (Li slow crimson fizz, Rb/Cs omitted unless added to inventory).
93. **calciumSlowGasMilky** — Ca in water: steady bubbles, milky Ca(OH)₂ suspension, warm.
94. **aluminumFoilInNaOH** — induction while oxide dissolves, then vigorous H₂, heating, foil pitted and torn into pieces; clear aluminate solution.
95. **aluminumCopperChlorideDisplacement** — Al in CuCl₂: oxide breakdown induction, red-brown Cu deposit, bubbles, warming, color fade blue-green → pale.
96. **coppernitricMetalConsume** — Cu in conc. HNO₃: wire shrinks, solution green → blue, brown NO₂ (atom 48).
97. **passivation** — Fe/Al in conc. HNO₃: brief fizz then **nothing**; a student sees "no reaction" — must be modeled.
98. **tarnishAndPatina** — Ag + H₂S → black Ag₂S film; Cu → green verdigris in humid CO₂; slow, via time-skip only.
99. **rustFormation** — Fe + O₂ + H₂O: orange-brown, salt accelerates; mass gain; time-skip only.
100. **steelWoolBurn** — see 54; combination with balance shows mass gain.
101. **magnesiumRibbonBurn** — see 52; ribbon white-hot, product MgO white ash and some Mg₃N₂ yellow tint at edges.
102. **zincGranuleConsumption** — granules thin and round, H₂ bubbles evolve more slowly as surface area drops (`A ∝ n^{2/3}`).
103. **coupledGalvanicCell** — Zn/Cu electrodes with salt bridge: needle voltmeter moves, Zn rod erodes, Cu rod thickens (electrode:<id> anchor).

### 4.F Thermal & phase (12)
104. **exothermicGlowOverlay** — optional thermal-camera overlay (false color) + subtle warm refraction; vessel temperature visible on thermometer with lag.
105. **endothermicFrost** — NH₄NO₃/urea dissolving or Ba(OH)₂·8H₂O + NH₄SCN: wall chills, **frost forms outside** from humidity, wet board freezes to flask bottom; thermometer drops by computed ΔT.
106. **boilingStages** — warming convection → micro-bubbles → onset → active → rolling (existing `BoilingStage`), bound to wall superheat.
107. **superheatBurst** — see 22; plus glass thermal stress path (`damage`).
108. **iceMeltShrink** — ice cubes melt, shrink, float, drop T of liquid (latent heat 334 J/g), grow a cold film at the surface.
109. **meltingSolid** — wax/naphthalene/Na/Ga: shape slumps, turns clear/liquid after mp, pools, re-freezes on cooling with crystal pattern.
110. **dissolutionHeat** — NaOH/CaCl₂ exothermic, NH₄NO₃/KNO₃ endothermic; ΔT computed from ledger (`ΔT = n·ΔH_sol/(mc)`).
111. **dilutionHeatConcAcid** — adding water into conc. H₂SO₄ locally boils and spits (hazard); adding acid to water is safe (mixing-front heating).
112. **thermalShockCrack** — hot glass on cold wet surface → crack spreads from rim/base, leak, shatter at threshold (`DamageModel`).
113. **sublimation** — I₂, dry ice, naphthalene, camphor: solid shrinks, vapor plume (colored per 4.0), deposit elsewhere.
114. **calorimetryCup** — cup + stirrer + thermometer; T curve plotted in the existing `TitrationPanel` style; heat capacity of cup included.
115. **hotPlateGlow** — heating element glow, convection rolls visible via tracer particles.

### 4.G Combustion, flames & light (14)
116. **flameColorByElement** — Li crimson (671 nm), Na intense yellow (589 nm; masks others, removable with cobalt glass), K lilac, Ca brick-red/orange, Sr crimson, Ba apple-green, Cu blue-green, B green (all color from emission-line table, not a hex guess); color persists seconds, brighter at hotter zone.
117. **burnerFlameZones** — blue inner cone/air-hole open (≈1500 °C), yellow luminous when closed (soot), height ∝ gas flow, flicker from drafts (`flameShader.ts`).
118. **ethanolBurnerFlame** — pale blue, nearly invisible in daylight, visible shimmer; spirit-lamp wick glow.
119. **hydrogenFlameFaint** — almost invisible pale blue; visible only via condensation on a cold glass (water droplets) and heat shimmer.
120. **flareLightCast** — dynamic colored light cast by Mg/Na/K/Cu flames onto vessels/table (existing `flashLight`, make color-aware, add inverse-square falloff).
121. **afterimageBloom** — bright flare triggers bloom + brief exposure adaptation (post-FX).
122. **ember/glowingSolid** — red/orange/white incandescence by blackbody color-temperature map; cools in stages.
123. **sparkLauncher** — ballistic spark particles with drag and short-lived trails, bounce on table, ignite flammables (paper).
124. **flashFireEthanolSpill** — spilled ethanol burns with a blue-ish front across the puddle, not an explosion; hazard (burn mark, glassware crack).
125. **splintFlameResponse** — see 33.
126. **combustionProducts** — water droplets/CO₂ production counted; limewater turns milky when burning organic fuel in a closed jar.
127. **luminolAndGlowstick** — see 15 (emissive + UV).
*(Out of scope by design: fireworks/pyrotechnic and explosive-mixture content. Flame tests only.)*

### 4.H Kinetic/clock/oscillating (10)
128. **iodineClockSwitch** — induction period then sudden blue-black (starch–I₃⁻); time ∝ 1/([reagent]) so doubling concentration halves the delay; temperature ↓ lengthens it (Q₁₀≈2).
129. **thiosulfateCrossDisappear** — "X" under the flask disappears when turbidity crosses threshold; `t∝1/[H⁺]` in the limiting regime.
130. **landoltReactionFlash** — colorless → sudden dark blue then stays.
131. **bzOscillator** — periodic red↔blue waves with spiral wave patterns in a thin Petri film (reaction–diffusion shader).
132. **blueBottleShake** — shaking introduces O₂: blue; stand still: colorless (glucose reduces methylene blue); fades from the bottom upward.
133. **chameleonMnO4** — see 6.
134. **catalyticDecomposition** — MnO₂/KI/Fe³⁺ catalyst triggers H₂O₂ bubbles; rate × catalyst surface area; unchanged catalyst mass at end (ledger proves it).
135. **autocatalysisFront** — Mn²⁺ autocatalysis in KMnO₄/oxalate: slow start then sudden decolorization; moving front in unstirred tube.
136. **enzymeFoam** — catalase (yeast/liver) + H₂O₂: foam; denatures when hot (no foam).
137. **reactionDiffusionFront** — gel/Petri 2-D reaction front shaders for BZ, precipitation fronts (Liesegang), acid–base fronts with indicator.

### 4.I Camera, audio, tactile (10)
138. **proceduralSoundBank** — extend `utils/audio.ts` / `audio/procedural.ts` with: pour glug (Helmholtz resonance of neck: `f=(c/2π)√(A/(V·L))`), drip patter, sizzle (noise-band), crackle (random impulses), foam hiss, pop (H₂), whoosh (flash), boil rumble (low-pass noise + bubble pops), glass ting by volume (pitch rises as the vessel fills — real!), stirring rod click, stopper thunk, crack/shatter, sponge, balance beep, hot-plate relay click.
139. **cameraTraumaShake** — existing `shake` + ground-contact rumble for violent events; clamp for accessibility ("reduce motion").
140. **slowMoLayer** — time-scale on cosmetic effects only; physics ledger unaffected.
141. **hapticPulses** — navigator.vibrate on mobile for pops/explosions/hazards.
142. **hudObservationToasts** — short real-lab style notes ("white precipitate forms at the interface", "brown gas, pungent") bilingual, derived from the atoms that fired.
143. **dangerOverlay** — hazard chips (toxic gas, corrosive splash, hot glass, flammable) from `hazards`; PPE missing ⇒ injury/penalty path in `safetyEngine`.

> **Count check (acceptance):** the catalog must contain **≥ 110 distinct, tested atoms**. `npm run catalog:digest` prints the count and fails CI if < 110, if any atom lacks `summary_en`, `useWhen`, `avoidWhen`, ≥ 2 gallery presets, and ≥ 1 unit test.

---

## PART 5 — REACTIONS THAT RUN, PEAK AND *END* ACCORDING TO THE AMOUNTS ADDED

### 5.1 Extent of reaction is the single source of truth
For each reaction in a vessel keep **ξ(t)** (mol of reaction advanced). Species amounts: `nᵢ(t) = nᵢ(0) + νᵢ·ξ(t)`. The reaction **ends when** `ξ ≥ ξ_max = min_i(nᵢ(0)/|νᵢ|)` over reactants (limiting reagent) **or** when equilibrium is reached (`Q=K`), **or** when a required condition is lost (temperature falls below threshold, catalyst removed). Effect intensity is bound to `dξ/dt`, not to a fixed ramp. Therefore:
- **Double the amount ⇒ double the product and roughly the same peak rate (if concentration is kept) but twice as long; double the concentration at fixed volume ⇒ faster and shorter-lived peak, more heat per second.**
- **Excess reagent stays** and keeps its own color/pH/smell; effects driven by the excess continue (e.g., after Zn is consumed, HCl remains and the liquid stays acidic).
- Nothing animates after `ξ_max`; the *after* state is rendered (clear supernatant, settled bed, leftover solid pieces).

### 5.2 From grams/millilitres to moles to visuals (mandatory pipeline)
`m (g) → n = m/M`; `V (mL) × c (mol/L) → n`; density tables for neat liquids; purity factor optional (reagent grade 0.97–0.995, default 1 unless the item says otherwise). Hydrates must use the hydrate molar mass (CuSO₄·5H₂O = 249.68 g/mol). Then: limiting reagent → ξ_max → products' moles → masses → renderer budgets.

### 5.3 Kinetic models (pick per reaction; `Kinetics.model` in the program)
- **instant (ionic)** `rate = ∞`, but *visibility is gated by mixing*: `ξ_available(t) = Σ over cells where both ions coexist`. Pouring into a stirred vs unstirred vessel therefore looks different (interface cloud vs instant uniform haze). Mixing time: unstirred/diffusive `t ≈ L²/(2D)` (1 cm, D=1e‑9 ⇒ ~5·10⁴ s, i.e., never in practice ⇒ rely on pour convection), stirred `t ≈ 5–30 s`.
- **first_order** `dξ/dt = k·(ξ_max−ξ)` (decompositions, e.g., H₂O₂ with MnO₂ at fixed catalyst: k ∝ catalyst surface area).
- **second_order** `dξ/dt = k·[A][B]·V`.
- **surface_limited (shrinking core)** `dn/dt = −k·A_s·f(c)`; `A_s ∝ n^{2/3}` for equal pieces, `∝ n` for a ribbon of constant width (it *shortens*); powders have 10²–10³× more area ⇒ near-instant; chips last minutes. **This is why 5 g of marble chips and 5 g of marble powder behave differently — implement it.**
- **induction_then_fast / autocatalytic** `dξ/dt = k·ξ·(ξ_max−ξ)+k₀` (Mn²⁺ in permanganate; Al oxide induction).
- **heat_activated** `k = A·exp(−Ea/RT)`; Q₁₀ default 2 (≈ Ea 50 kJ/mol), temperature from the energy balance (so exothermic reactions *accelerate themselves* until reagent is depleted, and cooling slows them).
- **diffusion_limited** (precipitate shells, gels): rate ∝ `√t` early.
- **oscillatory** (BZ, Briggs–Rauscher): limit cycle ODE (Oregonator reduced form) with period set by the program.

### 5.4 Worked examples the tests must reproduce (±2 %; compute in vitest from the ledger)
1. **CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂**, 5.00 g CaCO₃ (0.0500 mol) + 50.0 mL 1.00 M HCl (0.0500 mol; needs 0.100 mol). *HCl limiting* ⇒ ξ_max = 0.0250 mol ⇒ CO₂ = 0.0250 mol = **1.10 g = 0.612 L** at 25 °C (24.47 L/mol); CaCO₃ left = 0.0250 mol = **2.50 g** (visible marble chips remain); fizz stops when HCl ends; open vessel balance reading falls by 1.10 g; sealed flask keeps mass but P rises (`P=nRT/V_head`).
2. **Zn + 2HCl → ZnCl₂ + H₂**, 1.00 g Zn (0.0153 mol) + 50 mL 1.0 M HCl (0.050 mol): Zn limiting ⇒ H₂ 0.0153 mol = **0.0308 g = 0.374 L**; HCl left 0.0194 mol ⇒ remaining solution still acidic (pH ≈ 0.4). Zn shrinks to zero, bubbling decays smoothly as `A_s` falls.
3. **AgNO₃ + NaCl → AgCl↓ + NaNO₃**, 20.0 mL 0.100 M + 20.0 mL 0.100 M (0.00200 mol each) ⇒ **AgCl 0.287 g** (143.32 g/mol); residual [Ag⁺]=√Ksp=1.3·10⁻⁵ M (invisible) ⇒ supernatant clears.
4. **Pb(NO₃)₂ + 2KI → PbI₂↓ + 2KNO₃**, 10.0 mL 0.100 M + 20.0 mL 0.100 M ⇒ PbI₂ **0.461 g** (461.0 g/mol), of which ≈0.02 g stays dissolved at 20 °C in 30 mL (Ksp≈9.8·10⁻⁹ ⇒ ≈0.76 g/L); heating dissolves it, **cooling re-nucleates golden plates** (random positions, seeded).
5. **BaCl₂ + Na₂SO₄ → BaSO₄↓ + 2NaCl**, 25.0 mL 0.100 M each ⇒ BaSO₄ **0.583 g** (233.39 g/mol); settles over *hours* (Stokes, r=0.5 µm ⇒ v≈1.9·10⁻⁶ m/s ⇒ 5 cm in ≈7 h) ⇒ the program declares `timeWarp` and the UI offers "wait 1 h / overnight".
6. **2Mg + O₂ → 2MgO**, 0.240 g Mg (0.0100 mol): **MgO 0.403 g** (mass gain 0.163 g of O₂ from air), ΔH≈−601.6 kJ/mol MgO ⇒ **6.0 kJ**, ribbon shortens as it burns; lasts ~2–4 s for a 3 cm ribbon.
7. **2Na + 2H₂O → 2NaOH + H₂**, 0.230 g Na (0.0100 mol) in 100 mL: **H₂ 0.00500 mol = 0.0101 g = 122 mL**; NaOH 0.400 g ⇒ 0.100 M, pH ≈ 13; ΔH≈−184 kJ/mol Na ⇒ ≈ **1.8 kJ** (≈ +4 K in 100 mL); the sphere melts, runs ≈5–15 s, ends when Na is gone (a bigger piece ignites and spits; smaller one just fizzes).
8. **HCl + NaOH**, 50 mL 1.0 M each ⇒ **0.0500 mol**, ΔH=−57.3 kJ/mol ⇒ 2.87 kJ ⇒ **ΔT ≈ +6.9 K** (100 g, c=4.18); with phenolphthalein, color vanishes exactly at ξ_max (drop-wise titration shows the end-point).
9. **NH₄NO₃ dissolving**, 10.0 g (0.125 mol) in 50 mL: ΔH_sol=+25.7 kJ/mol ⇒ **ΔT ≈ −13 K**; frost forms on the outer wall if the vessel is thin and humid.
10. **NaOH dissolving**, 4.00 g (0.100 mol) in 100 mL: ΔH_sol=−44.5 kJ/mol ⇒ **ΔT ≈ +10 K**; hot glass warning if > 60 °C.

### 5.5 Lifetime budget
Define `visualDuration_s` per program as a function of amounts: `T_visual = clamp(T_ref·(ξ_max/ξ_ref)^α·(k_ref/k)^β, T_min, T_max)`. Chemistry advances in physical time; visuals use `timeWarp` (Part 2.6). **No reaction may loop forever**; infinite fizz is a bug. Every program has a test that integrates until `ξ=ξ_max` and asserts effects are off.

### 5.6 Oscillators & clocks
Use ODE integrators (RK4, fixed dt) inside `KineticsEngine`; seed noise for realism (period jitter ≈ 1–3 %).

### 5.7 Energy & temperature coupling (every step)
`dT/dt = (−ΔH·dξ/dt − hA(T−T_amb) − Q_evap − Q_boil)/(Σ mᵢcᵢ)`; `T` feeds back into rates, solubilities (Ksp(T) via `SOLUBILITY_DATABASE`), gas solubility, vapor pressure (Antoine), density, viscosity. Boiling clamps `T` at the (concentration-elevated) boiling point and converts heat into mass loss (steam) — mass leaves the ledger as `evaporated_g`.

---

## PART 6 — PRECIPITATION, CRYSTALLIZATION & DEPOSITION: FULL PHYSICAL REALISM WITH EXACT MASS BOOKKEEPING

### 6.1 Mass is sacred
`Σ particle_mass = ledger.precipitate_mass` **every frame**. Rendering uses *representative particles* with weights: draw `N` sprites/instances (N set by quality tier) and assign each a weight `wᵢ` so `Σ wᵢ = m_total`; size distribution is sampled randomly, then **renormalized** so the sum is exact. Settled bed volume `V_bed = m/(ρ·φ)`, height `H=V_bed/A_base`. Precipitate that goes into filtrate/pipette/other vessel is *subtracted from the source* and *added to the target* proportionally to suspended mass fraction. Dissolving precipitate returns its moles to the aqueous inventory (exactly reversible). Test: mix → pour half into another beaker → filter → dry: total mass of cake₁ + cake₂ + dissolved + sediment = initial theoretical within 1 mg.

### 6.2 Supersaturation-driven stages (all stochastic but seeded)
1. **Supersaturation** `S = (IAP/Ksp)^{1/ν}` locally (grid cells from the mixing field). `S<1`: nothing. `1<S<S_crit`: *metastable* — solution stays clear until a trigger (scratch with rod, seed crystal, dust, wall roughness).
2. **Nucleation** (Poisson) `J = A·exp(−B/ln²S)`: homogeneous at very high S ⇒ burst of tiny particles (milky instantly, BaSO₄, AgCl, S=10³–10⁶); heterogeneous at low S ⇒ few nuclei **on surfaces** (wall, rod scratch, bottom, floating dust, seed) ⇒ few large crystals (PbI₂ on cooling, KNO₃, alum). **Induction time** `t_ind ~ 1/(J·V)` random (exponentially distributed) ⇒ the *same* mix can start crystallizing at 3 s or 40 s (seeded).
3. **Growth** `dL/dt = k_g·(S−1)^g` (surface-integration limited) or `∝ D·(c−c*)/δ` (diffusion limited, shows depleted halo around big crystals); **habit** depends on S and impurities: needles at high S, blocky at low S; dendrites at very high S in a gel/unstirred.
4. **Aggregation/flocculation** (curd/floc/gel): clusters merge ⇒ settling velocity jumps (sudden collapse of the cloudy zone), settled volume *larger* than compact crystals.
5. **Ostwald ripening / ageing** (hours): fines dissolve, big grow; color/phase change (6.6); bed compacts.
6. **Settling** Stokes `v = 2(ρp−ρf)g r²/(9μ)` for spheres; plates/needles: multiply by shape factor 0.1–0.5 (flutter, tumble); **hindered settling** `v = v₀(1−φ)^n` (n≈4.65, Richardson–Zaki), sharp front.
7. **Deposition** on walls/rods/solids (not only falling): crystals *grow on surfaces*, hang, form crusts and bridge gaps.

### 6.3 Where precipitates appear (not just "from the top")
- **At the pour impact / contact interface** (ribbon or cloud right where drops enter); streams of cloud drawn down by the denser mixed plume ("snakes"); in the **unstirred two-layer** case, a **white disk at the interface** forms and sinks (BaSO₄, AgCl at the liquid–liquid boundary).
- **Throughout the bulk when stirred** (uniform haze, appears everywhere in seconds).
- **On the bottom/at the wall** (heterogeneous) with cooling or evaporation.
- **On the solid surface** (metal plating, gypsum scale on a heated element, Ag on Cu).
- **At the free surface** (evaporative rafts, floating crystals, films).
- **In gels** (Liesegang rings).
- **Gradually after a delay** (induction clocks, supersaturated solutions).

### 6.4 Randomness that *looks* real but is reproducible
All through `PRNG`: nucleation positions, induction times (exponential), particle sizes (lognormal, `σ_g` by morphology: powder 1.4, floc 1.8, crystals 1.3), orientations (plates), growth-rate scatter ±15 %, habit mix, glint phase. Two runs with different seeds differ visibly (never identical-looking), the **total mass and the final bed height are identical**. Provide `?seed=` and a "Re-roll" button in dev gallery.

### 6.5 Morphology table (authoritative; put in `data/precipitates.ts`, drive renderer + AI vocabulary)
| Product | Ksp (25 °C, verify vs SOLUBILITY_DATABASE) | Color | Habit / morphology | r (µm) | ρ (g/cm³) | φ packing | Special |
|---|---|---|---|---|---|---|---|
| BaSO₄ | 1.1·10⁻¹⁰ | white | fine_powder | 0.3–1 | 4.50 | 0.35 | settles for hours, no re-dissolution |
| AgCl | 1.8·10⁻¹⁰ | white | curd | 1–5 (aggr. 100–1000) | 5.56 | 0.15 | photodarkens; dissolves in NH₃ |
| AgBr / AgI | 5.4·10⁻¹³ / 8.5·10⁻¹⁷ | pale cream / pale yellow | curd | 1–5 | 6.47 / 5.68 | 0.15 | AgI not soluble in dilute NH₃ |
| PbI₂ | 9.8·10⁻⁹ | bright yellow | crystal_plate (hexagonal) | 20–200 | 6.16 | 0.30 | hot dissolves, cooling spangles |
| PbSO₄ / PbCl₂ | 2.5·10⁻⁸ / 1.7·10⁻⁵ | white | fine_powder / needles | 1–10 | 6.29 / 5.85 | 0.3 | PbCl₂ dissolves in hot water |
| CaCO₃ | 3.4·10⁻⁹ | white | granular / fine | 1–20 | 2.71 | 0.4 | CO₂ dissolves it again (excess) |
| Cu(OH)₂ | 2.2·10⁻²⁰ | pale/sky blue | gel | aggr. 100–500 | 3.37 | 0.05–0.1 | →CuO black on heating; + NH₃ deep blue |
| Fe(OH)₃ | ~10⁻³⁸ | rust brown | floc | aggr. 50–300 | 3.4 | 0.05 | extremely slow compaction |
| Fe(OH)₂ | 8·10⁻¹⁶ | white→green→brown | gel/floc | – | 3.4 | 0.1 | oxidizes in air |
| Al(OH)₃ / Zn(OH)₂ | ~10⁻³³ / 3·10⁻¹⁷ | white | gel | – | 2.4 / 3.05 | 0.08 | amphoteric (excess OH⁻) |
| Mg(OH)₂ | 5.6·10⁻¹² | white | gel/granular | – | 2.34 | 0.1 | dissolves in NH₄⁺ |
| CuS / PbS / Ag₂S | ≪10⁻²⁰ | black | amorphous_black colloid | 0.01–0.1 | 4.6 / 7.6 / 7.2 | 0.2 | stays suspended; H₂S needed |
| S (colloid) | – | white-yellow | colloid | 0.1–1 | 2.07 | 0.2 | opalescence then milk |
| Ag⁰ / Cu⁰ / Pb⁰ | – | metallic | dendrite / film / powder | 5–500 | 10.5 / 8.96 / 11.3 | 0.3 | grows on solids |
| KNO₃ / NH₄Cl / alum / CuSO₄·5H₂O / NaCl | solubility curves | white / white / clear / blue / white | needle / fern / octahedron / triclinic / cube | cm-scale | 2.11/1.53/1.76/2.29/2.16 | 0.5–0.6 | cooling or evaporation |

### 6.6 Precipitate colour/phase ageing and the "after" state
Implement `precipitateAgeing` and `precipitateRedissolving` (4.D 86–87) as rules `after(t)`: e.g., Fe(OH)₂ in air: white→dirty green (minutes) → brown (tens of minutes); AgCl in room light: purple-gray over minutes (accelerated by a UV lamp). All reversible/irreversible flags in the data table.

### 6.7 Everyday verifications required in tests
- Mass: sum of particle weights equals ledger within 1e‑9 g after 10 000 steps and after pour/filter/dissolve cycles.
- Randomness: two seeds ⇒ different positions (Hamming distance > 0.9) but identical `m_total`, `H_bed` (±1 %).
- Timescales: BaSO₄ 5 cm settle ≈ 7 h (±20 %), PbI₂ plates ≈ 1–3 cm/s, Fe(OH)₃ floc collapse ≈ minutes.
- Excess redissolution: Al(OH)₃ mass → 0 as `n_OH ≥ 4 n_Al` (to Al(OH)₄⁻).

---

## PART 7 — THE AI EFFECT-DIRECTOR (how the in-app AI understands the catalog and composes the right effects)

### 7.1 Division of labour (fixes F1, F2, F3, F6)
1. **Rule engine decides the chemistry** (solubility rules + Ksp, activity series, acid/base/carbonate/sulfite/sulfide gas rules, redox table, amphoterism list, complexation list, known-reaction DB). It outputs a *ChemistryVerdict*: `{kind: 'no_reaction'|'known'|'rule_class'|'unknown', species, phases, limiting reagent, ΔH estimate}`.
2. **AI is called only for `unknown` or to refine style** of `rule_class`. It returns a **ReactionProgram** (Part 2.4) — *data only*, no code, no free-form effect names.
3. **The validator** (7.4) is the gatekeeper; nothing from the AI touches the store unvalidated.
4. **The Ledger applies the chemistry** (Part 3.4) and the **ProgramPlayer** runs atoms. If the AI program disagrees with the rule engine on *what is produced*, **the rule engine wins**; the AI may only change *appearance parameters*.

### 7.2 Server contract (`server/ai.ts`, `server.ts`)
- New endpoint `POST /api/experiment/program` (keep `/mix` as a thin wrapper that calls it and maps the result to `MixResult` for old UI). Request: `{ species:[{formula, phase, moles, mass_g, volume_ml, conc_M}], vessel:{type, capacity_ml, T_c, sealed, stirred, heated, atmosphere}, orderOfAddition:[…], verdict:ChemistryVerdict, lang }`.
- Use Gemini **structured output**: pass the JSON-Schema generated from the Zod `ProgramSchema` as `responseSchema` (`responseMimeType:'application/json'`, `temperature: 0.2`, `topP: 0.8`). Keep the existing `safeParseJson` fallback. Two-pass option (flag `AI_TWO_PASS=1`): pass 1 = classify + stoichiometry (small), pass 2 = compose visual timeline from the digest.
- Put the **catalog digest** (generated JSON, ~8–12 k tokens) in `systemInstruction`, cached by catalog version hash; the user message contains only the situation.
- Timeouts: 8 s; on timeout/invalid → `fallback` program (7.8). Never block the UI.
- Replace the stale `CURRENT_GEMINI_MODEL` default only through env; keep fallback model.
- Log every AI program (anonymized) to `server/logs/ai_programs.jsonl` with validator verdict for later promotion to `handcrafted` (7.6).

### 7.3 What the AI sees — `catalog.digest.json` (auto-generated; never hand-edited)
Per atom: `{name, category, summary_en, useWhen[], avoidWhen[], params:{name:{min,max,default,unit}}, anchorsAllowed[], ledgerInputs[], budget, example:{…a valid AtomInstance…}}`. Plus: `vocab` (Part 2.3), `gasTable` (4.0), `precipitateTable` (6.5), `opticsTable` (ε values), `kineticModels`, `hazardTags`, and **10 verified exemplar programs** (handcrafted, diverse: precipitation, displacement, gas evolution, colored vapor, crystallization, no-reaction).

### 7.4 Validation & repair (`src/vfx/programs/validate.ts`) — all rules must be unit-tested
1. **Schema** (Zod) incl. enum membership: atom ∈ catalog, anchor ∈ allowed, morphology/gas ∈ vocab.
2. **Chemistry sanity** (reject or repair): equation parses; **atoms balance** (formula parser with parentheses/hydrates); **charge balances** for ionic form; phases consistent with `SOLUBILITY_DATABASE` (if AI says `s` for a very soluble salt or `aq` for Ksp<10⁻¹² product with ≥ 1 mM ions ⇒ conflict ⇒ rule engine overrides); gas species ∈ `GasSpecies` with correct M; colors plausible against optics table (Cu²⁺ solutions cannot be red); ΔH sign consistent with temperature trend; stoichiometric coefficients positive integers ≤ 12.
3. **Visual sanity**: ≤ 24 atoms; no atom with `intensity>1` unless it's flagged `violent`; `startOn` references exist; windows within [0,1]; **no gas-visible atom for invisible gases** (e.g., AI tries a white plume for H₂ ⇒ replaced by `nucleationSiteBubbleStream` + `hydrogenPop` test hint); hot steam requires `T>~45 °C` or exothermic; **colored fume atoms must match the gas table color within ΔE<20**; foam atoms require surfactant or very viscous medium (else `foamHead` small).
4. **Conservation**: run `applyProgramToLedger` on a scratch copy; mass error < 1e‑6 g, no negative moles, products ≤ limiting-reagent yield.
5. **Repair loop:** on failure send back `{errors:[…], program}` to the model once or twice (`maxRepairs=2`); otherwise construct a repaired program programmatically by dropping offending atoms and filling the `after` state from the ledger; set `provenance:'ai'`, `confidence` reduced, and flag `needsReview:true`.
6. **Never trust AI numbers over tables:** M, ρ, Ksp, ΔH, ε, bp/mp come from local data tables when available; AI values are only used for species *not in the tables* and are clamped to plausible ranges and marked `estimated:true` (HUD shows "~" and a tooltip).

### 7.5 Safety guard (also in the prompt below)
- The AI describes **observations, hazards and general lab-safety**, never procurement, synthesis routes, quantities optimized for harm, or instructions for weapons/explosives/toxic gas production. Combinations that create toxic gas (acid + bleach/hypochlorite, acid + cyanide/sulfide, acid + nitrite/azide) produce a **hazard overlay, warning and conservative visuals** (invisible toxic gas shown only as hazard icon + sensor/indicator effects; no "how to maximize").
- Energetic compounds (e.g. peroxides/azides/fulminates/nitro-explosives) are marked `out_of_scope`: the program returns a generic `refusal` card ("not simulated") instead of a spectacle.
- `hazards` and `warning_*` flow to `safetyEngine.ts` and PPE penalties exactly as for handcrafted reactions.

### 7.6 Cache & promotion
Canonical key = sorted species + phases + coarse concentration buckets + temperature bucket + heated/sealed flags + **catalog version**. Store validated programs (IndexedDB client + server file cache). When a program is requested ≥ 3 times with the same hash and validator confidence ≥ 0.9, queue it in `agent/promotion_queue.md` for a human to freeze as `handcrafted`. Keep a **"Report wrong effect"** button that stores the vessel snapshot + program for review (Firestore collection already configured).

### 7.7 Client integration (store + director)
- Replace both `fetch('/api/experiment/mix')` fallbacks in `useAppStore.ts` (add-chemical path ~L3479 and pour path ~L3783) with `await resolveReactionProgram(...)` (Part 2.2). The old behavior of copying booleans is removed.
- `applyProgramToLedger` writes products into `contents`, sets `precipitateAmount_g`, `foam_ml`, gas sinks, heat, `lastReactionId = program.id`, and **creates the `activeKinetics` entry** with `reactionId=program.id` so `VfxDirector` and `ReactionSimulationEngine` treat it exactly like a handcrafted reaction. Register the program at runtime: `registerProgram(program)` ⇒ `getReactionController(id)` returns a `ProgramController` adapter that implements `ReactionVisualController` from the `timeline` (so legacy plumbing, gallery scrubber and tests keep working).
- Delete all `reactionId.includes('sodium'|'Na'|'Mg')` heuristics in `director.tsx`; every atom mounts by declaration. `VfxDirector` becomes a thin host of `ProgramPlayer`.
- Wire `ReactionContext` stubs (F5): `addSurfaceImpulse` → `vfxBus.emit('surface:ripple',…)` with `intensity`, `emitSparks` → dedicated `Sparks` pool, `playSound(id, opts)` → full sound bank (4.I 139) with id validation.
- Hot reload: when the catalog version bumps, re-validate cached programs; invalid ones are evicted.

### 7.8 "Pending" visual while waiting for the AI
Immediately show only what is **certain**: the liquid mixing swirl and color blend by Beer–Lambert of the *unreacted* species and a small label "analyzing reaction…" (no guessed bubbles/precipitate). When the program arrives, atoms start with their normal `startOn` conditions, and the color transitions smoothly from the current state (no teleport).

### 7.9 Ready-to-paste system prompt for the effect-director
```
You are the Effect Director of a physically faithful virtual chemistry lab (ChemDex).
Your job: given the chemistry verdict and the experimental situation, output ONE JSON object
conforming exactly to the supplied ReactionProgram schema. You output DATA ONLY.

HARD RULES
1. Use ONLY effect atoms that appear in the provided catalog digest, with parameters inside the stated ranges. Never invent atom names, anchors, gases, morphologies or fields. If you need something the catalog lacks, add it to "missing_atoms" (name + 1 sentence of physics) and approximate with the closest existing atom.
2. Chemistry first. Provide a balanced equation with states (s,l,g,aq), the limiting-reagent logic, and realistic products. If nothing happens under the given conditions, return provenance "ai", kind "no_reaction", a mixing-only timeline, and explain why (e.g. all ions remain soluble). Do NOT invent a reaction to be interesting.
3. Be quantitative: use the given moles/volumes; decide the limiting reagent; state product moles; never produce more than the limiting reagent allows. Conservation of mass, atoms and charge is mandatory.
4. Physical appearance must match real observations: colors from known ion colors; precipitate morphology, color and settling behavior; gas identity, color, density relative to air, odor tag; heat sign and rough magnitude; speed (instant / seconds / minutes / needs heating / needs catalyst); induction periods and stochastic crystallization where real.
5. Invisible gases (H2, O2, CO2, SO2, NH3, H2S, CH4...) are NEVER drawn as colored smoke. Show them through bubbles, indicator tests, balloon/pressure effects. Visible "steam"/fog is condensed droplets and appears only when cooling or humid conditions justify it.
6. Heavy gases sink and pool; light gases rise. Choose atoms and anchors accordingly.
7. Ledger binding: prefer binding intensities to species rates/amounts ("rate:CO2", "amount:Zn(s)") over fixed numbers so effects stop when reagents are used up.
8. Time honesty: set visual.duration_s for display and timeWarp.physical_s when the real process is much slower (e.g. fine BaSO4 settling takes hours).
9. Safety: never provide synthesis or misuse guidance. For toxic-gas-forming or energetic combinations return conservative visuals, hazards[], and a clear warning; for out-of-scope energetic compounds return kind "out_of_scope".
10. Language: all *_vi fields in Vietnamese, *_en in English; short, observational, like a lab notebook.
11. Output JSON only, no markdown, no comments. Maximum 24 atoms. Colors as #rrggbb.

THINK BEFORE YOU WRITE (do not output this): identify species and phases -> check solubility/Ksp -> activity series/redox/acid-base/gas rules -> limiting reagent -> products' moles and masses -> thermal sign -> kinetics model and time scale -> what is visible (liquid color, turbidity, solid morphology, gas visibility, fume) -> map each visible thing to the best catalog atoms -> bind to ledger -> verify conservation.
```
**Few-shot exemplars appended to the prompt** (each a complete valid program; author them as fixtures in `src/vfx/programs/exemplars/`): (a) Zn + Pb(NO₃)₂(aq) ⇒ lead dendrite tree (`dendriticMetalTree` bound to `rate:Pb(s)`, solution stays colorless, Zn dulls); (b) Na₂S + CuSO₄ ⇒ black CuS colloid (`blackFineColloid`, color blue fades via `fadeAbsorbance`, H₂S smell only if acidic, so no gas atom at neutral pH); (c) NaCl + KNO₃ ⇒ **no reaction** (only `beerLambertBlend`, `schlierenStreaks` briefly); (d) CaCl₂ + Na₂CO₃ ⇒ fine white CaCO₃, no gas; (e) Cu + conc. HNO₃ ⇒ brown NO₂ heavy plume, green→blue solution; (f) NH₃(g) + HCl(g) ⇒ Graham ring; (g) supersaturated sodium acetate + seed ⇒ front crystallization with heat.

### 7.10 The learning loop
`missing_atoms` suggestions accumulate in `agent/atom_requests.json` (name, physics sentence, frequency). The nightly agent task reads it, implements the top requests as new atoms (Part 4 contract), regenerates the digest — the AI automatically gains the new capability. Add a CI check that ensures every exemplar still validates after catalog changes.

### 7.11 AI quality tests (mocked LLM + recorded fixtures)
Table-driven test over ≥ 60 combinations (Part 9 list + 20 "no reaction" pairs + 10 dangerous pairs): verdict from rules must equal the program's `chemistry` for *known* cases; for forced "AI" cases use recorded model outputs and assert the validator accepts/repairs; fuzz: random invalid JSON, wrong atom names, unbalanced equations, absurd colors ⇒ must fall back gracefully without throwing and without changing mass.

---

## PART 8 — POURING & SOLIDS HANDLING: LIQUID VISIBLY ENTERS THE OTHER VESSEL; SOLIDS OBEY GRAVITY AND TILT

Existing assets to build on: `src/pour/physics/{ballistics,flow,mixing,retained,solids,step,profiles}.ts`, `pour/render/{PourStream,PhysicalStreamRenderer}.tsx`, `pour/controller/*`, `components/three/{PouringBottle,VesselTiltGizmo}.tsx`, `ContinuousLiquidStream.tsx`, `vfx/particles/Splash.tsx`, `pour/audio/PourAudio.ts`. Read `chemlab_pouring_prompt.md` first; this section only adds/overrides.

### 8.1 Acceptance statement
*"If I tilt bottle A over beaker B, a continuous, correctly shaped stream leaves the lip, falls along a true parabola, **visibly lands inside B** (if aligned), forms a cavity/ripples/bubbles on B's liquid, B's level and color rise **in step with the volume that actually arrived**, A's level drops, A's wall keeps a wet film, and drips fall afterwards. If I miss, the liquid lands on the table or the wall, and it becomes a puddle with the right substances."*

### 8.2 Liquid stream — physics and geometry
1. **Lip flow (weir/Francis)** exists: `Q=1.84·L·h^{3/2}` (SI). Keep, but add **neck‑flow regimes**: for narrow necks (flask/bottle) air must enter while liquid leaves ⇒ **glug-glug oscillation** (period ≈ `t≈V_burp/Q`, frequency of the sound from Helmholtz resonance of the neck, 4.I 139); for wide beakers a smooth sheet. At low tilt just beyond the pouring threshold the liquid **clings to the lip** (Coanda/"teapot effect") and can dribble down the *outside* wall of the vessel before the jet detaches (wetting by contact angle; speed dependent).
2. **Trajectory** (`calculateStreamBallistics` exists): exit velocity from head `v=√(2g h_eff)` plus lip tangential component; free fall `x(t), y(t)` under g; compute *time of flight* to the **nearest intersection** among: target liquid surface, target inner wall, target rim, funnel, table, other vessels. Currently landing kinds are `inside|rim|table`; extend to `wall_inner`, `liquid`, `funnel`, `other_vessel`, `hand/tool` and clip the stream **exactly** at the first intersection (no stream passing through glass or floor).
3. **Jet shape:** continuity `A·v=Q` ⇒ radius `r(z)=r₀·√(v₀/v(z))`, `v(z)=√(v₀²+2gz)` (the jet **thins as it falls**). Rayleigh–Plateau: most unstable wavelength `λ≈9.0·r`, growth rate `ω≈0.343·√(σ/(ρ r³))` ⇒ for r≈2 mm water `ω≈33 s⁻¹`; streams < ~2 mm radius at fall > few cm show **varicose waves and break into droplets** (a "string of pearls" before impact), thick fast streams stay continuous with surface ripples. Use σ and viscosity from substance tables (water 0.072 N/m / 1.0 mPa·s; ethanol 0.022 / 1.1; glycerol 0.063 / ~1200; conc. H₂SO₄ 0.055 / ~24; Hg etc. only if in inventory).
4. **Viscous liquids** (glycerol, syrup, conc. H₂SO₄ at low T): thick ropey stream, **rope coiling** when falling onto a surface, slow level equalization, long drip threads (necking), lots of residue on the walls.
5. **Flow rate control:** tilt angle, hold time, source volume (head decays: Torricelli), and viscosity define Q; a *sudden* tilt back stops the jet with a **final drip train** (drop mass from Tate's law `m g = 2π r_tip σ f`, f≈0.6; ~0.05 mL for 1.5 mm tip).
6. **Beyond 90°:** pouring with tilt up to ~180° must work (inverting a bottle of conc. liquid to drain, last drops). The lip and the *stream origin point* move with true rotation; the bottle's cap/neck orientation matters; remaining liquid pools toward the lip as angle increases; the liquid surface inside the source stays **horizontal in world space** (wave/slosh dynamics with damping, not a rigid rotated plane), so the visible liquid shape inside the bottle is correct at every angle.
7. **Pouring through a funnel / down a glass rod / via pipette/burette/wash bottle:** funnel: laminar cone, slower, with a vortex at the stem; glass rod: stream adheres to the rod (surface tension) and falls *without splashing* (real technique) — gives a smaller splash score; pipette/dropper: discrete drops; burette: steady thin jet or drop-by-drop with volume reading precision ±0.02 mL; wash bottle: pressurized thin jet at a chosen angle.
8. **Aim assist (accessibility, optional, default ON):** highlight the target mouth ring and show the predicted landing point (parabola preview) while tilting; optional "magnetic" correction within 1.5 cm for novice mode only. The *physics is unchanged*; only the player's input is nudged. With assist off, misses happen.

### 8.3 Impact in the target vessel
- **Cavity + crown:** Weber `We=ρ v² d/σ`. Low We: gentle dimple & ripple rings (`surface:ripple`), mid: cavity and rebound jet (Worthington), high: crown splash and satellite droplets that can land on rim/table. Entrained **air bubbles** appear when impact speed ≳ 0.8–1 m/s for a smooth jet (plume of bubbles dragged downward, then rising with chain pops); smaller for gentle pours.
- **Mixing front:** pour-driven turbulent plume carrying the incoming liquid color/density down; **denser liquid dives and spreads along the bottom** (gravity current), lighter floats and spreads as a layer; miscible fluids blend with `mixing.ts` (existing) — add shear-driven diffusion of color so you see *swirls and streaks* before uniformity (time depends on volumes and stirring).
- **Level and mass:** target volume rises *continuously* by `Q·dt`; the liquid meniscus rises with a stationary-surface *rolling* motion; overflow occurs exactly at capacity (excess runs down outside, spreads on table, hazard-tagged). Volume displacement by solids included.
- **Reactions start at the impact zone** (interface-based), the **reaction program anchors to `pourPoint`/`stream`** at first, then to `bulk` after mixing.
- **Heat & sound:** exothermic mixing warms locally (plume visible with thermal overlay), pour sound pitch rises as the target fills (resonance of the air column).

### 8.4 Spills, residue and drips
- **Wetting film on the source** (existing `retained.ts`): film thickness ~0.05–0.5 mm by viscosity; contributes real residue (`retainedOnSource_g`) and a **drip-line/hanging drop** at the lip after each pour; a second pour of a different chemical **contaminates** (ledger shows the traces; reaction may appear at trace scale with weak effects).
- **Misses:** liquid hitting the table forms an expanding puddle (`WorkbenchSpills`) with radius from volume/contact angle (puddle height 1–3 mm), flows, stains the table (acid etches/darkens wood, base slippery), hazard icon; clean-up needs sponge/neutralizer (ties to `Cleanup.ts`).
- **Splash fallout:** droplets landing on gloves/goggles/skin create PPE events.

### 8.5 Solids: pouring, sliding, piles and tilt
1. **Granular flow from a bottle/spatula:** mass flow through an opening `Q = C·ρ_b·√g·(D−k d)^{5/2}` (Beverloo; C≈0.58, k≈1.4; D = opening, d = grain size); **no flow below a critical opening/tilt** (arching/jamming for cohesive powders), intermittent bursts for damp powders; fine powders **billow dust** (aerosol atom, hazard for irritants), coarse crystals rattle and bounce (restitution in `solids.ts`).
2. **Pile formation** on the target bottom: heap with **angle of repose** (dry sand-like 30–35°, wet 45°+, fine cohesive powders can hold steep slopes, spheres ~25°); pile mass = poured mass (ledger); height `h` from volume and repose cone/ridge; avalanches when overloaded or when the vessel is tilted/vibrated/stirred.
3. **Solids inside a tilted vessel obey physics:** a *rigid-lite* particle/heightfield model: grains stay until the tilt exceeds the **angle of internal friction/repose**; above it the surface *slumps* and the whole pile **slides** toward the low side with creeping avalanche waves, **chunks (marble, Zn granules, pellets) roll or slide** with friction μ (steel 0.15–0.3 on glass, rubbery 0.6, powder cohesion), accumulate at the lip, and **fall out** in discrete events when tilt is large enough — **liquid leaves first (decanting), heavy solids stay unless tilt/lip geometry allows**. Floating solids (Na, Li, wax, foam, ice) move with the liquid; sinking solids stay at the bottom and shift sideways with tilt; wet powders clump and slide as blobs.
4. **Entering liquid:** displacement raises the level (`ΔV=m/ρ`); sinking speed from Newton/Stokes drag; **air entrainment** (bubbles clinging to powder), wetting delay for hydrophobic powders (float as rafts then wet and sink in clumps), **dissolution** shrinking-core `dm/dt = k·A·(c_s−c)` (Noyes–Whitney) with **visible dense dissolution plumes/streaks** (KMnO₄ purple streaks, sugar schlieren) sinking because the solution is denser, and undissolved bottom layer when saturated; stirring accelerates; heating raises `c_s`.
5. **Metals/solid pieces** (Mg ribbon, Zn granules, Cu wire, Fe nail, Na pieces): proper dropping, bouncing on glass (sound), sliding on the wall, resting on the bottom at a rest orientation (tilted against walls), held by tongs/tweezers, cut with scissors (ribbon length is a ledger quantity), forceps handling. Wire/ribbon use a simple rope/chain model.
6. **Weighing & transfer** with spatula/weigh boat/balance: tare, ± readings to 0.01 g with drift and air-draft sensitivity; static cling of fine powders to spatula; loss to the walls counted in the ledger.
7. **Decanting a mixture:** precipitate remains if the vessel is tilted slowly (bed stays), but **a fast or large tilt resuspends fines** (`resuspensionCloud`), and the rod-guided stream is how a pro decants; part of the precipitate leaves with the liquid proportional to suspended fraction (ledger-accurate).
8. **Sieving/filtering/pipetting** moves defined fractions between vessels; every transfer is accounted for in `sinks`/`inventory`.

### 8.6 Rendering rules for pours (so it *looks* like real liquid)
Stream: ribbon/tube mesh with refraction + subtle fresnel (reuse `liquid.tsx` material), screen-space thickness edges, subtle ripples along its length, bubbles trapped inside for aerated flows, color = Beer–Lambert of the *source* liquid; at impact: instanced droplets (pooled), meniscus-aware ripple normal map; inside the target the incoming plume as a **volumetric tinted noise** advected by a coarse velocity grid (`sim/fluidGrid.ts` exists). Stream and target liquid share one continuous visual (no seam). Frame-time budget < 1.5 ms for the stream + splash on desktop.

---

## PART 9 — REACTION PROGRAM LIBRARY (≥ 80 concrete programs to hand-author; AI/rules handle the long tail)

Format: **Reaction (conditions) — key effect atoms — realism detail the test must verify.** Hazard-flagged items show warnings/PPE and conservative visuals only.

**A. Precipitation (24)**
1. BaCl₂+Na₂SO₄ — fineMilkyPowder, turbidityRise, settlingFrontInterface — hours-long settle, `timeWarp`.
2. AgNO₃+NaCl — curdyClumps, photodarkening — mass 0.287 g per 2 mmol; dissolves in NH₃.
3. AgNO₃+KBr/KI — curdyClumps (cream/yellow) — AgI insoluble in dilute NH₃ (separate from #2!).
4. Pb(NO₃)₂+KI — goldenHexPlates — hot dissolve/cold re-crystallize; **not** shared with AgI (F4).
5. Pb(NO₃)₂+Na₂SO₄ — fineMilkyPowder (white) — PbSO₄ dissolves in conc. acetate/NaOH (extra).
6. Pb(NO₃)₂+NaCl — needle-like PbCl₂ on cooling — dissolves in hot water.
7. CuSO₄+NaOH — blueGel, syneresis — heating → black CuO (precipitateAgeing).
8. FeCl₃+NaOH — rustFloc — separate from Cu(OH)₂ (F4).
9. FeSO₄+NaOH — white→green→brown ageing (Fe(OH)₂) — O₂ dependence.
10. Al₂(SO₄)₃+NaOH — whiteGelatinous, redissolves in excess (aluminate).
11. ZnSO₄+NaOH — white gel redissolves (zincate) + redissolves in NH₃.
12. MgCl₂+NaOH(NH₃) — white granular Mg(OH)₂ — dissolves in NH₄Cl.
13. CaCl₂+Na₂CO₃ — fine white CaCO₃, **no gas** (F4) — dissolves in excess CO₂/HCl with fizz.
14. Ca(OH)₂+CO₂ — limewaterClouding two-stage.
15. CuSO₄+Na₂S (H₂S/Na₂S) — blackFineColloid — H₂S only if acidic.
16. Pb(NO₃)₂+Na₂S — black PbS; filter paper blackening test.
17. K₂CrO₄+Pb(NO₃)₂ — bright yellow dense PbCrO₄ — hazard Pb/Cr.
18. K₂CrO₄+AgNO₃ — brick-red Ag₂CrO₄ — Mohr titration end-point (red after AgCl).
19. Na₂S₂O₃+HCl — colloidalSulfurHaze + SO₂ smell tag — disappearing cross.
20. CuSO₄+NH₃ (excess) — pale gel then deep-blue complex.
21. AgNO₃+NH₃ (excess) — brown Ag₂O then clear [Ag(NH₃)₂]⁺ (Tollens reagent base).
22. FeCl₃+KSCN — blood-red complex, equilibrium shifts (no precipitate; Le Chatelier).
23. Ba(OH)₂+H₂SO₄ — white BaSO₄, conductivity drops to minimum at equivalence (meter hook).
24. Seeded supersaturation: sodium acetate / KNO₃ cooling / alum growth — crystalSpikeBloom/needle/octahedral.

**B. Gas evolution (14)**
25. CaCO₃+HCl — fineEffervescence, bubblesClingToSolid, solid shrinks (Part 5.4 ex. 1) — CO₂ heavy, candle extinguish, limewater.
26. Na₂CO₃/NaHCO₃+HCl — fizz, foamHead; NaHCO₃ is *endothermic* (cools ≈ −4 K for strong mixes); 1 mol CO₂ per mol NaHCO₃ vs 1 per Na₂CO₃ (needs 2 HCl).
27. NaHCO₃+CH₃COOH ("vinegar volcano" with soap) — foamClimbRunaway.
28. Zn+HCl/H₂SO₄ — metalDissolveWithBubbles; H₂ pop test (Part 5.4 ex. 2).
29. Mg+HCl — very vigorous, warm, ribbon dances from bubbles.
30. Fe+H₂SO₄(dil) — slow, green Fe²⁺ — hot speeds it.
31. Al+NaOH — induction then vigorous (4.E 94).
32. H₂O₂+MnO₂ / KI / catalase — catalyticDecomposition; glowing splint relights.
33. KMnO₄+conc. HCl — Cl₂ yellow-green heavy gas + hazard (conservative visuals).
34. Cu+conc. HNO₃ — brown NO₂, solution green→blue (hazard).
35. Cu+hot conc. H₂SO₄ — SO₂ haze/tag, blue solution, black CuS/Cu₂S specks (hazard).
36. Na₂SO₃/NaHSO₃+HCl — SO₂ (pungent, litmus red) — hazard.
37. NH₄Cl+NaOH (heated) — NH₃ (damp red litmus turns blue; rises) — NH₃+HCl ring (Graham).
38. Dry ice+water — dryIceFogCascade (not a chemical reaction; physical sublimation).

**C. Neutralization, titration & indicators (10)**
39. HCl+NaOH — Part 5.4 ex. 8; indicatorTransition, titration curve, equivalence at pH 7.
40. H₂SO₄+NaOH — stronger heating; two-step dissociation shown in pH curve.
41. CH₃COOH+NaOH — buffer region, equivalence pH ≈ 8.7 (phenolphthalein right, methyl orange wrong).
42. NH₃+HCl — equivalence pH ≈ 5.3 (methyl red right).
43. Universal indicator across acids/bases — full spectrum.
44. Red cabbage extract — pH rainbow.
45. Buffer addition demo (acetate) — pH barely moves.
46. Acid on carbonate rock chips — fizz test.
47. HCl+Mg(OH)₂ (milk of magnesia) — turbid → clear.
48. Antacid (CaCO₃) tablet in vinegar — fizz tablet dissolves (surface-limited).

**D. Redox & displacement (14)**
49. Fe+CuSO₄ — copperPlatingCoat; solution blue→pale green; nail mass change.
50. Zn+CuSO₄ — black spongy copper, warms, solution fades blue→colorless (**not** the Fe controller, F4).
51. Cu+AgNO₃ — dendriticMetalTree (silver), solution turns pale blue.
52. Zn+Pb(NO₃)₂/Pb(CH₃COO)₂ — lead tree.
53. Mg+CuSO₄ — vigorous, hot, H₂ bubbles + Cu.
54. KMnO₄+H₂C₂O₄ (acidic) — autocatalysis, warm start (Mn²⁺ catalysis), purple→colorless.
55. KMnO₄+Fe²⁺ (acidic) — purple→pale yellow end-point (self-indicating titration).
56. K₂Cr₂O₇+Fe²⁺/ethanol (acidic) — orange→green Cr³⁺ — hazard.
57. KI+H₂O₂ (acid) — clear → yellow → brown I₃⁻ — starch blue-black.
58. KI+FeCl₃ — brown I₂/I₃⁻; chloroform extraction shows violet organic layer.
59. Fe³⁺+SCN⁻ and Ag⁺ effect — color fade by precipitating SCN⁻.
60. Chameleon (KMnO₄+glucose+NaOH) — multiStageColorLadder.
61. Blue bottle — blueBottleShake.
62. Galvanic Zn/Cu cell — coupledGalvanicCell.

**E. Combustion, flame tests, thermal decomposition (13)**
63. Mg burn — Part 5.4 ex. 6.
64. Steel wool burn on balance — mass **increases**.
65. S burn — blue flame + SO₂ (hazard).
66. Candle in jar — flame dies when O₂ depletes; limewater.
67. Ethanol burn / spill — pale flame; spill spreading.
68. H₂ pop — hydrogenPopFlash; sealed tube hazard.
69. Flame tests Li/Na/K/Ca/Sr/Ba/Cu (+ cobalt glass) — flameColorByElement.
70. Cu(OH)₂ heating → CuO black.
71. CuCO₃ (malachite) heating → black CuO + CO₂ (limewater).
72. NaHCO₃ heating → Na₂CO₃ + CO₂ + H₂O condensation.
73. KClO₃ heating decomposition → O₂ (glowing splint) — *hazard-conservative, no MnO₂ speed-up details beyond catalytic effect* (visual only).
74. Ammonium dichromate volcano (hazard).
75. Sugar + H₂SO₄ carbon snake (hazard) / sugar + NaHCO₃ heating "pharaoh's snake" (safer: carbon-foam spiral from caramelizing).

**F. Alkali metals & special (6)**
76. Na+H₂O — Part 5.4 ex. 7; with phenolphthalein magenta trails; ends with a pop only if confined.
77. K+H₂O — violent, lilac flame (**not** Na controller, F4).
78. Li+H₂O — slow fizz, crimson hint.
79. Ca+H₂O — steady H₂, milky.
80. Na in ethanol — slow, gentle bubbles (contrast).
81. Mg in hot water — slow, magenta with phenolphthalein.

**G. Physical/colloid/solution phenomena (12)**
82. Dissolving NH₄NO₃ (endothermic, frost) and NaOH/CaCl₂ (exothermic) — Part 5.4 ex. 9–10.
83. Conc. H₂SO₄ + water (dilution hazard) vs acid-into-water (safe).
84. Ethanol+water volume contraction.
85. Oil/water/dyed layers, emulsion & coalescence; separatory funnel extraction of I₂ into organic layer.
86. Ink chromatography (paper, capillary rise, spot separation Rf).
87. Crystal growing: alum/CuSO₄ on a thread.
88. Evaporation to dryness: NaCl/CuSO₄ crystals, spatter risk.
89. Filtration of CaCO₃/BaSO₄ suspension; wash; dry; mass conservation test.
90. Distillation of colored water/ethanol-water (condenser, reflux, boiling chips, temperature plateau).
91. Sublimation of I₂ and NH₄Cl.
92. Electrolysis of water/CuCl₂ (H₂ 2:1 O₂ by volume, Cu at cathode, Cl₂ at anode hazard) — electrode anchors.
93. Tyndall effect in starch/colloid vs salt solution.

**F4 regression fixes (must exist as separate programs):** `CaCl₂+Na₂CO₃` (no gas), `AgNO₃+KI` (pale yellow curd), `FeCl₃+NaOH` (rust floc), `Zn+CuSO₄` (not Fe), `K+H₂O` (not Na), `NaHCO₃+HCl` (1:1 CO₂). Test: *two reaction keys with different product sets can never resolve to the same program/controller id.*

**Tail (rules + AI):** any ionic double-displacement, any metal in activity series vs salt/acid, acid + carbonate/sulfite/sulfide/hydrogencarbonate, base + ammonium salt, redox pairs from the table.

---

## PART 10 — OTHER GAPS BETWEEN THE LAB AND REAL LIFE (implement the highest-value ones; list the rest in the report with reasons)

**Matter & measurement**
1. **Sizes & scales:** glassware dimensions to real ratios (beaker 100/250/400 mL real diameters/heights, graduations nonlinear in conical flasks), meniscus reading parallax at camera angle, graduation tolerance ±5 % (beakers) vs ±0.5 % (volumetric).
2. **Measurement error model:** balance resolution, drift, buoyancy/air-draft; thermometer lag and stem error; pH meter drift and need for calibration/rinse; pipette tip retention; burette air bubble in tip.
3. **Contamination & cross-talk:** rods, spatulas, pipettes, thermometers carry traces (existing `recordContamination` hook) — ledger tracks ppm-level residues; trace Na⁺ ruins flame tests (yellow flash from fingers/glass!).
4. **Water quality:** tap vs distilled (hardness: Ca²⁺/Mg²⁺, Cl⁻, carbonate) — tap water + AgNO₃ gives faint cloudiness; soap lathering; scale on heating.
5. **Concentration realism:** "conc." reagents with real %, densities, fuming, viscosity, heats of dilution; stock bottle labels with GHS pictograms, expiry/hygroscopic behavior (NaOH pellets deliquesce and turn into a puddle on the table over time; CaCl₂ too; P₂O₅ n/a).
6. **Hydrates & efflorescence:** CuSO₄·5H₂O crystals bleach in dry air; Na₂CO₃·10H₂O effloresces.

**Heat, time, environment**
7. **Heat transfer:** hot-plate / burner heating patterns (hot spot under flame, convection cells), wire gauze, glass thermal stress, Newton cooling to the table, hot glass looks identical to cold (**no visible cue; a heat-sensor or touch penalty**).
8. **Humidity/temperature/pressure** ambient sliders (fume formation, hygroscopic salts, boiling points with altitude), optional day-night lab lighting for chemiluminescence/UV.
9. **Time-skip tool:** "wait 10 s / 1 min / 1 h / overnight" computing ageing, settling, evaporation, rusting, crystal growth honestly; shows what a real student would see tomorrow (clear supernatant, crust, crystals, color changes).
10. **Evaporation & drying:** open vessels lose volume at `rate ∝ (P_sat−P_amb·RH)·A`; covered with watch glass fog and drip back.
11. **Light sensitivity:** AgX darken, H₂O₂ stored dark, photochemical rxn with lamp.

**Handling & mishaps**
12. **Glassware state:** chips/cracks (weakened glass fails sooner), dirty vs clean glass (affects silver mirror, wetting, bubble nucleation), labeled vs unlabeled, hot-glass marker, broken glass shards with pick-up procedure (existing `Shards.ts`).
13. **Order of addition matters** (acid into water; reagent into reductant; Tollens freshness), speed of addition changes local concentrations ⇒ different looks (precipitate morphology depends on mixing, S).
14. **Stirring/shaking/swirling:** rod scraping sound, rod nucleation, vortex shape depends on rpm, shaking test tube with a thumb is **not** allowed (hazard), proper swirl in a flask (liquid creeps up the wall), magnetic stirrer bar with spinning vortex and coupling loss.
15. **Safety systems:** fume hood airflow visuals, eyewash/shower, spill kit neutralizers (bicarbonate for acid, citric/vinegar for base) with fizz and heat, fire blanket, extinguisher; consequences scale with real hazard class.
16. **Waste & cleanup:** waste bins by category (heavy metals, organics, acids), improper disposal consequences (score only), washing glassware leaves film/drops, distilled-water rinse.
17. **Labeling & notebook:** auto notebook of observations in real-lab language, with times; measurement uncertainties; error-source quiz.
18. **Sensory fidelity (ethical):** odor *tags* (never an instruction to sniff), sound design for every action, subtle tactile haptics, screen-reader/captions for audio events ("fizzing, then pop").
19. **Failure modes that are instructive:** wrong stoichiometry → leftover solid; overshooting titration end-point; contaminated rod → odd tint; not cooling before adding indicator; leaving burner on → fuel exhausted.
20. **Parametric variety:** reagent lot variance (concentration ±2 %), sample purity, particle size, ambient T — small randomization (seeded) so the lab does not look "canned" while staying chemically correct.

---

## PART 11 — TEST PLAN, GALLERY, ACCEPTANCE & WORK ORDER

### 11.1 Automated tests (Vitest) — must exist and pass
- `ledger.invariants.test.ts`: mass/atom/charge/energy property tests over random mixes (≥ 1000 cases, seeded), including pours, filtration, evaporation, boil-off, gas escape vs sealed.
- `stoichiometry.examples.test.ts`: the 10 worked examples in 5.4 (±2 %).
- `precipitation.mass.test.ts`, `precipitation.stochastic.test.ts` (6.7).
- `gas.visuals.test.ts`: invisible gases never produce colored atoms; heavy gases flow downward; Graham ring ratio 1.46±0.1.
- `programs.validation.test.ts` + `ai.fuzz.test.ts` (7.11); `registry.collisions.test.ts` (F4).
- `pour.landing.test.ts`: for a grid of tilt angles and positions, stream terminates on the first intersection; volume arrived = ledger transfer; misses create spills; tilt up to 180° keeps a continuous stream until empty.
- `solids.tilt.test.ts`: angle-of-repose slump thresholds, sliding/rolling of chunks, floating solids follow liquid.
- `timeWarp.test.ts`: factor reporting; `finish.test.ts`: every program reaches `ξ_max` and turns effects off.
- Performance smoke: 3 simultaneous heavy reactions at `high` tier within budget in a headless benchmark (record in report).

### 11.2 Gallery (`vfx/dev/VfxGallery.tsx`)
Add: catalog browser (all atoms with presets), program browser with **timeline scrubber** showing ledger curves (ξ, T, rates, turbidity) and an **audit overlay** (mass error), seed re-roll, quality tier switch, thermal overlay toggle, "show invisible gas as schlieren" debug, and screenshot-capture buttons used by the report.

### 11.3 Acceptance checklist (all must be true)
1. ≥ 110 atoms registered & tested; ≥ 80 handcrafted programs (Part 9); AI tail path produces valid programs for ≥ 95 % of 60 benchmark pairs (mock) and falls back safely otherwise.
2. The AI path conserves mass; no more teleported colors (F2 closed); `effects[]` legacy array either consumed or removed (F1 closed).
3. No string-sniffing in `director.tsx` (F3 closed); alias collisions fixed (F4); context helpers real (F5); one vocabulary (F7).
4. Every reaction ends; leftovers/after-state correct; time-warp honest (F9); visuals follow the ledger (F10).
5. Precipitation shows interface formation, bulk haze, wall/rod nucleation, crystal growth, flocculation, settling, compaction and redissolution as real; random but reproducible; mass exact.
6. Fumes: colored gases absorb light, invisible gases are invisible, aerosols scatter; heavy gases pool/cascade; fume hood affects them.
7. Pouring: stream enters target, level/mass/color synchronized, spills/misses handled, tilt to 180°, solids slide/roll/avalanche/decant correctly.
8. Performance and quality-tier budgets met; `npm run lint`, `npm test`, `npm run build` green.

### 11.4 Work order for the agent (do in this order, commit per step)
1. **Audit & unify** (0.2, F7): write `agent/EFFECTS_AUDIT.md`; choose live system; vocab module + adapters.
2. **Ledger** (Part 3) + invariants tests; route deterministic path through it.
3. **Program schema, validator, ProgramPlayer, registry adapter** (2.4, 7.4, 7.7); migrate the 30 controllers to programs gradually (keep wrappers).
4. **Fix F4/F5 collisions and context stubs**; sound bank.
5. **Atoms by category** (Part 4): liquid optics → gas/bubbles → fumes (4.0 physics) → solids/precipitates → metals → thermal → flames → clocks → camera/audio. Gallery presets with each.
6. **Reaction lifetime & kinetics engine** (Part 5); worked-example tests.
7. **Precipitation/crystallization engine** (Part 6) on top of existing `PrecipitationSystem/SedimentationSystem`; mass tests.
8. **Pouring & solids upgrade** (Part 8).
9. **Programs library** (Part 9) with fixtures + rule engine for the tail.
10. **AI director** (Part 7): endpoint, digest generator, validator, repair loop, cache, pending visual; exemplars; fuzz tests.
11. **Gaps** (Part 10) highest-value first.
12. **Soak + report:** run the full catalog in a loop on `low/medium/high`, check memory growth, fix leaks; write `agent/REPORT.md` (what was done, measurements, screenshots from gallery, failures, remaining gaps, next steps).

### 11.5 Anti-patterns (reject your own work if you notice them)
Fake looping effects that never end · colors lerped by hex without absorbance · bubbles for invisible gases drawn as smoke · precipitate that only falls from the top in uniform rain · mass appearing/disappearing · one controller for chemically different reactions · AI-provided numbers trusted over tables · per-frame allocations · spectacle without a physical reason · hazard guidance that reads as instructions.
