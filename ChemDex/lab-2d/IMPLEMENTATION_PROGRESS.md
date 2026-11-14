# IMPLEMENTATION PROGRESS — 2D VIRTUAL CHEMISTRY LABORATORY

## Project Overview
- **Project Name**: ChemDex 2D Virtual Chemistry Laboratory (`lab-2d`)
- **Aesthetic**: Clean White Scientific Workspace, Vector SVG Glassware, Minimalist, Responsive
- **Scientific Foundation**: Conservation Ledger, Balanced Stoichiometry, Limiting Reagent Engine, Dilute Solution pH, Solubility Equilibrium, Calorimetry
- **Languages**: Vietnamese (default) & English

---

## Progress Dashboard

| Phase | Description | Status | Verification |
|---|---|---|---|
| **Phase 1** | Source Audit & Reverse Engineering | **COMPLETED** | `docs/SOURCE_AUDIT.md` produced and verified |
| **Phase 2** | System Architecture & Tooling Setup | **COMPLETED** | Vite, React 19, TypeScript, Tailwind CSS, Zustand, Vitest operational |
| **Phase 3** | Pure Scientific Chemistry Engine | **COMPLETED** | Ledger, Stoichiometry, Equilibrium, pH, Thermo unit tests (13/13 passing) |
| **Phase 4** | Interactive SVG Equipment Components | **COMPLETED** | Beaker, Flask, Test Tube, Cylinder, Burette, Balance, Burner, Funnel, Pipette |
| **Phase 5** | Workbench & Direct/Precision Interaction | **COMPLETED** | Pointer drag-and-drop, collision pouring, meniscus, bubbles, precipitate sediment |
| **Phase 6** | 10 Initial Educational Experiments | **COMPLETED** | All 10 experiments implemented and verified with integration tests |
| **Phase 7** | Free Lab & Guided Experiment Modes | **COMPLETED** | Real physical state step verification, hints, chemical theory |
| **Phase 8** | Measurement Instruments & Safety System | **COMPLETED** | Analytical balance with Tare, pH meter, Thermometer, GHS hazard alerts |
| **Phase 9** | Notebook, Reports & Export | **COMPLETED** | Automated experiment log, student conclusions, CSV/JSON export, print PDF layout |
| **Phase 10** | Persistence, Undo/Redo & Smoke Tests | **COMPLETED** | Full snapshot undo/redo, 26/26 tests passing, zero-error production build |
| **Phase 11** | Gemini Flash & Procedural Audio/VFX | **COMPLETED** | AI dynamic reactions, AI tutor dialog, parabolic stream VFX, Web Audio synthesis, fluid drag-and-drop |
| **Phase 12** | Hardening, Store Slices & Lazy Catalog | **COMPLETED** | 8 Zustand slices + pure `stepLabWorld`, vendor chunking, idle-deferred 1,300-reaction catalog |
| **Phase 13** | Scientific Rigor, Recovery & Accessibility | **COMPLETED** | Charge-balance pH solver, Gemini balance gate, strict conservation ledger, `ErrorBoundary`, keyboard/ARIA workbench controls |
| **Phase 14 (Upgrade 8–10)** | Slim Bundle, Dynamic Titration & Analytical Telemetry | **COMPLETED** | `curriculumCore.json` projection + `recharts` removed; equilibrium/conductometric `titrationEngine` + live burette trace; Kohlrausch conductivity & 380–720 nm UV-Vis telemetry |
| **Phase 15 (Upgrade 11–12)** | Exact-Rational Balancer, Normalized Lookups & Key Guards | **COMPLETED** | `BigInt` Gauss-Jordan RREF balancer + stoichiometry calculator; normalized catalog/curated reaction lookup in Inspector & Notebook; form/modal keyboard isolation |

---

## Recent Engineering Hardening Summary
1. **State Architecture & Render Isolation**:
   - Split monolithic `useLabStore` into 8 focused slices under `src/store/slices/` (`aiSlice`, `equipmentSlice`, `experimentSlice`, `historySlice`, `safetySlice`, `simulationSlice`, `transferSlice`, `uiSlice`) with shared helpers in `labStoreHelpers.ts`.
   - Extracted pure simulation tick stepping into `src/engine/labWorldStep.ts` (`stepLabWorld`).
   - Eliminated 60 Hz continuous store writes via `useShallow` selectors and pointer drag externalization (`usePointerDragStore`).
2. **Slim Startup Bundle & Lazy Shared Catalog**:
   - Projected the 131 Vietnamese curriculum entries into slim `src/data/curriculum/curriculumCore.json` via `src/chemistry/reactions/curriculumProjection.ts` while deferring full pedagogical metadata (`reactions.vi.json`) and `@shared/reaction-catalog.generated.json` (1,300 catalog entries) asynchronously via `ensureCatalogCompiled()`, surfacing a non-blocking `CatalogLoadingBadge` and re-evaluating idle vessels on completion (`catalogReady`).
   - Removed unused `recharts` dependency and kept `vendor` chunking in `vite.config.ts` alongside lazy-loaded modals.
3. **Scientific Solver, Analytical Telemetry & Exact Equation Balancer**:
   - Integrated iterative charge-balance aqueous equilibrium pH solver (`src/chemistry/equilibrium/aqueous/`) verified within $\pm 0.05$ pH across 9 benchmark solutions.
   - Added `src/chemistry/equilibrium/titrationEngine.ts` (charge-balance titration curves, `dpH/dV` equivalence detection, half-equivalence buffer telemetry, conductometric profiles, 5 interactive bench presets, and live `titrationTrace` recording).
   - Added `src/chemistry/equilibrium/analyticalTelemetry.ts` (Kohlrausch + Falkenhagen ionic conductivity $\kappa$, ionic strength $I$, electrolyte classification, and 380–720 nm Beer-Lambert UV-Vis spectra) wired into `VesselInspector.tsx`.
   - Added `src/chemistry/core/equationBalancer.ts` (`BigInt` RREF nullspace balancer + limiting-reagent/gas-volume stoichiometry calculator) surfaced in `EquationBalancerTab.tsx` inside `ReactionLibraryModal.tsx`.
   - Added strict pre-simulation `validateGeminiReactionPayload` gate checking parsed formulas, vessel reactant presence, and elemental balance before accepting AI reactions (tagged `ai-unverified`, missing $\Delta H$ defaults to `0`).
   - Enforced strict elemental ($\le 10^{-9}\text{ mol}$) and mass ($\le 10^{-6}\text{ g}$) conservation across all 1,431 compiled reactions and curated entries in `REACTION_DATABASE`.
4. **Crash Recovery, Unified Lookups, UX Accessibility & Cleanup**:
   - Added scoped `ErrorBoundary` (`src/components/layout/ErrorBoundary.tsx`) wrapping workbench and modals with IndexedDB autosave recovery, workbench reset, and page reload.
   - Unified reaction lookup and notebook ID resolution (`findMatchingVesselReactions`, `resolveReactionEquationById`) with normalized formulas/phase tags across curated, curriculum, and lazy catalog sources.
   - Added keyboard equipment navigation (`Arrow`/`Shift+Arrow`, `Enter`/`Space`, `Delete`/`Backspace`, `Escape`), informative `aria-label` descriptions, `aria-live="polite"` announcements, and `shouldIgnoreWorkbenchGlobalKey` guards preventing shortcut interception inside inputs, selects, and open modals.
   - Removed redundant legacy HTML copies (`index.legacy.html`, `thi-nghiem.html`, `thi-nghiem.legacy.html`), added `.env.example`, and added `npm run check`.

---

## Automated Verification Suite
Verified via `npm run check` (`tsc --noEmit && vitest run && vite build`):
- **20 test files (169 tests)** covering core stoichiometry, charge-balance pH benchmarks, Kohlrausch conductivity & 380–720 nm UV-Vis spectra, equilibrium/polyprotic titration & live burette tracing, exact-rational equation balancing & stoichiometry, Gemini validation gate, strict 1,431-reaction elemental/mass conservation, slim curriculum projection, pure `stepLabWorld`, store slices, lazy catalog evaluation, 20 guided experiments (14 core + 6 advanced), 115 chemicals, `ErrorBoundary` crash recovery, unified reaction lookups, and workbench accessibility/keyboard guards.
- Run `npm run check` to inspect live Vitest timings and Vite production chunk sizes.

---

## Verified Experiment Scenarios
1. **Strong Acid-Base Neutralization**: $50\text{ mL } 0.1\text{ M HCl} + 50\text{ mL } 0.1\text{ M NaOH} \rightarrow \text{pH } 7.00$, $\Delta T > 0$, full matter conservation.
2. **Acid-Base Titration with Burette**: Dropwise dispensing with phenolphthalein turning pink at equivalence.
3. **Silver Chloride Precipitation**: $\text{AgNO}_3 + \text{NaCl} \rightarrow \text{AgCl}\downarrow$ (curdy white precipitate, $0.143\text{ g}$).
4. **Copper(II) Hydroxide & Thermal Dehydration**: $\text{CuSO}_4 + 2\text{NaOH} \rightarrow \text{Cu(OH)}_2\downarrow$ (blue gel) $\xrightarrow{\Delta > 65^\circ\text{C}} \text{CuO}\downarrow$ (black powder).
5. **Carbonate Gas Evolution**: $\text{NaHCO}_3 + \text{HCl} \rightarrow \text{CO}_2\uparrow$ (vigorous effervescence, open-vessel mass loss).
6. **Solution Dilution**: $C_1V_1 = C_2V_2$ with $\text{CuSO}_4$ color attenuation via Beer-Lambert law.
7. **Heat of Neutralization (Calorimetry)**: Measures temperature rise $\Delta T$ from exothermic reaction enthalpy.
8. **Barium Sulfate Milky Precipitation**: $\text{BaCl}_2 + \text{Na}_2\text{SO}_4 \rightarrow \text{BaSO}_4\downarrow$ (milky white precipitate).
9. **Active Metal Displacement**: $\text{Zn} + 2\text{HCl} \rightarrow \text{H}_2\uparrow + \text{ZnCl}_2$ (steady hydrogen bubbling).
10. **Multi-Indicator pH Investigation**: Universal indicator mapping from red (pH 1) to violet (pH 13).
11. **Gemini 3.5 Flash Lite Dynamic Mixture Synthesis**: Dynamic reaction prediction and tutor dialogue for arbitrary chemical combinations.
