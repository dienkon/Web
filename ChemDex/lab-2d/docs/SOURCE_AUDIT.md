# SOURCE AUDIT & REVERSE ENGINEERING REPORT

## 1. Executive Summary

This document presents the detailed architectural and scientific audit of the reference ChemDex virtual chemistry laboratory (`ChemDex/lab-3d` at commit `e1a61b8da5cfd03360d0951c60e3f34282f75343`), conducted to establish the foundation for the new, high-performance, scientifically validated 2D Virtual Chemistry Laboratory (`ChemDex/lab-2d`).

---

## 2. Reference System Architecture

The reference application is built with React 19, TypeScript, Vite, Tailwind CSS, Zustand, and Three.js / React Three Fiber for 3D simulation.

### 2.1 Core Architectural Components
- **State Store (`src/store/useAppStore.ts`)**: Monolithic Zustand store tracking vessels, apparatus, tools, active selections, titration records, undo/redo history, and visual effects.
- **Chemistry Computation (`src/engine/chemistryEngine.ts`)**: Multi-step deterministic reaction engine executing limiting reagent calculations, enthalpy changes, precipitate formation, and pH changes.
- **Physical Ledger (`src/engine/ledger.ts`)**: Conservation ledger verifying elemental atom counts, IUPAC molar masses, charge neutrality, and Beer-Lambert optical transmittance.
- **Chemical Data (`src/chem/substances.ts`, `src/data/chemicals.ts`, `src/chem/reactions.ts`)**: Databases defining 65+ physical substances, thermodynamic parameters ($C_p$, $\Delta H^\circ$, $K_{sp}$, Antoine parameters), and 61+ balanced chemical reactions.
- **Experiment Engine (`src/engine/experimentEngine.ts`, `src/data/experiments.ts`)**: Guided laboratory curriculum containing 77 structured educational experiments with multi-step validation.
- **Safety Engine (`src/engine/safetyEngine.ts`)**: GHS hazard evaluation, PPE tracking, and dangerous combination warnings.

---

## 3. Module Classification & Migration Strategy

| Module | Location in `lab-3d` | Classification | Migration Strategy for `lab-2d` |
|---|---|---|---|
| Conservation Ledger | `src/engine/ledger.ts` | **REUSE & ENHANCE** | Direct migration of atomic weights, formula parser, molar mass calculation, mass & atom conservation checks. |
| Multi-Step Chemistry Engine | `src/engine/chemistryEngine.ts` | **REFACTOR** | Decouple from Three.js scene artifacts; enhance equilibrium and acid-base models; maintain pure functional execution. |
| Physical Substance Database | `src/chem/substances.ts` & `src/data/chemicals.ts` | **REUSE & CONSOLIDATE** | Merge into a canonical chemical catalog with bilingual (EN/VI) descriptions, GHS hazards, optical colors, and densities. |
| Reaction Library | `src/chem/reactions.ts` | **REUSE & VALIDATE** | Preserve stoichiometric coefficients, enthalpy $\Delta H$, $K_{sp}$, and visual indicators for all curriculum reactions. |
| Guided Experiment Engine | `src/engine/experimentEngine.ts` | **REFACTOR** | Adapt state matching to work with 2D vessel and tool coordinates and user interaction events. |
| Safety Engine | `src/engine/safetyEngine.ts` | **REUSE** | Keep GHS classification, incompatible combination checks, and PPE alerts. |
| Three.js Rendering & Shaders | `src/vfx/*`, `src/components/three/*` | **REPLACE** | Replace heavy WebGL/Three.js render pipeline with crisp, lightweight SVG glassware, realistic liquid meniscus, precipitates, and CSS/SVG particle effects. |
| User Interface & Interaction | `src/components/*` | **REPLACE & MODERNIZE** | Create a pristine, predominantly white scientific workspace layout with direct manipulation, precision transfer modals, analytical balance, burette, and responsive sidebars. |

---

## 4. Scientific Audit of Key Phenomena & Algorithms

### 4.1 Stoichiometry & Limiting Reagents
- **Implementation**: Computes reaction extent $\xi = \min_i(n_i / \nu_i)$ across all reactants. Correctly deducts reactants and increments products according to balanced stoichiometric coefficients $\nu_i$.
- **Verification**: Verified across precipitation ($\text{AgNO}_3 + \text{NaCl}$, $\text{BaCl}_2 + \text{Na}_2\text{SO}_4$, $\text{CuSO}_4 + 2\text{NaOH}$), acid-base neutralizations ($\text{HCl} + \text{NaOH}$, $\text{H}_2\text{SO}_4 + 2\text{NaOH}$), and gas evolution ($\text{NaHCO}_3 + \text{HCl}$).
- **Status**: **VERIFIED**

### 4.2 Acid-Base Equilibria & pH
- **Implementation in `lab-3d`**:
  - Net strong acid/base moles calculated from $[H^+]$ or $[OH^-]$.
  - Dilute solution model: $\text{pH} = -\log_{10}[H^+]$ or $14 + \log_{10}[OH^-]$.
  - Indicator color transitions:
    - Phenolphthalein: colorless at $\text{pH} < 8.2$, vivid magenta/pink at $\text{pH} \ge 8.2$.
    - Litmus: red at $\text{pH} < 5$, blue at $\text{pH} > 8$, purple neutral.
    - Universal indicator: spectrum from red (pH 1) to purple (pH 14).
- **Enhancement for `lab-2d`**:
  - Explicitly document dilute aqueous assumptions.
  - Add Henderson-Hasselbalch buffer calculations for weak acid/conjugate base systems (e.g., acetic acid / acetate buffer).
- **Status**: **VERIFIED WITH DOCUMENTED DILUTE APPROXIMATION**

### 4.3 Solubility & Precipitation
- **Implementation**: Checks ion concentration product $Q_{sp}$ against $K_{sp}$ for sparingly soluble salts ($\text{AgCl}$, $\text{BaSO}_4$, $\text{Cu(OH)}_2$, $\text{CaCO}_3$, $\text{Fe(OH)}_3$).
- **Visuals**: Precipitate appears with characteristic colors (AgCl: curdy white, $\text{Cu(OH)}_2$: gelatinous blue, $\text{Fe(OH)}_3$: reddish-brown, $\text{PbI}_2$: golden yellow) and forms settled sediment layers.
- **Status**: **VERIFIED**

### 4.4 Thermodynamics & Calorimetry
- **Implementation**: Simplified adiabatic model:
  $$q_{\text{reaction}} = \xi \cdot \Delta_r H^\circ$$
  $$\Delta T = \frac{-q_{\text{reaction}}}{m_{\text{soln}} \cdot c_p + C_{\text{calorimeter}}}$$
  where $c_p = 4.184\text{ J/(g}\cdot\text{K)}$ and $C_{\text{calorimeter}} \approx 33.2\text{ J/K}$.
- **Boiling Cap**: Constrained to $100^\circ\text{C}$ (or $102.5^\circ\text{C}$ elevation) with boiling indicator.
- **Status**: **VERIFIED (EDUCATIONAL ADIABATIC APPROXIMATION)**

### 4.5 Gas Generation & Conservation
- **Implementation**: For open vessels, evolved gas ($\text{CO}_2$, $\text{H}_2$, $\text{O}_2$) escapes into the environment, decreasing vessel mass while overall mass is tracked by the ledger sink (`escapedGas_g`).
- **Status**: **VERIFIED**

---

## 5. Architectural Blueprints for `lab-2d`

1. **Lightweight Pure SVG Glassware**:
   - High visual fidelity matching modern vector lab illustrations (as in user reference images).
   - Beakers, Erlenmeyer flasks, test tubes, graduated cylinders, burettes, pipettes, analytical balance, Bunsen burner, hot plate, funnel with filter paper.
   - Real volume-to-height transfer geometry.
   - Distinct liquid body, curved meniscus, sediment/precipitate layer, and rising bubble streams.

2. **Dual Manipulation Engine**:
   - **Direct Drag & Transfer**: Drag one vessel over another to trigger pouring with visual stream.
   - **Precision Transfer Modal**: Numeric volume/mass inputs with standard transfer buttons (e.g. 5 mL, 10 mL, 25 mL, 50 mL, or dropwise 0.05 mL).

3. **Bilingual Vietnamese/English Support**:
   - Complete localized chemical names, apparatus names, observations, safety warnings, and step-by-step experiment instructions.
