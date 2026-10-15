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
| **Phase 11** | Gemini 3.5 Flash Lite & Procedural Audio/VFX | **COMPLETED** | AI dynamic reactions, AI tutor dialog, parabolic stream VFX, Web Audio synthesis, fluid drag-and-drop |

---

## Phase 11 Details — Gemini 3.5 Flash Lite & Realistic 2D VFX
1. **Gemini 3.5 Flash Lite Integration**:
   - Model: `gemini-3.5-flash-lite` via Google Generative AI REST API (`src/services/geminiService.ts`).
   - Dynamic Reaction Synthesis: When arbitrary chemicals are mixed that are not in the predefined catalog, Gemini generates a scientifically balanced chemical equation, enthalpy $\Delta H$, precipitate information, gas evolution, and indicator color shifts, automatically registering it in the live reaction database.
   - Interactive AI Chemistry Tutor: Accessible via Header ("Trợ lý AI 3.5") or Vessel Inspector ("Hỏi AI Gemini về bình này"), providing instant context-aware molecular insights.
2. **Interactive Drag & Drop**:
   - HTML5 & Pointer Events drag-and-drop: Drag chemicals directly from the sidebar onto glassware vessels, or drop onto empty space on the workbench to automatically spawn a filled beaker.
   - Vessel-to-Vessel Pouring: Dragging a container over another container triggers an automatic direct pour with realistic glassware tilting (`rotate(32deg)`), animated parabolic stream, and droplet splashing.
3. **Realistic Procedural Audio & VFX**:
   - Zero-asset Web Audio API synthesis (`src/services/soundEngine.ts`) with zero latency and full offline support: liquid pouring noise, fizzing effervescence, bubbling boiling, flame ignition, and success chimes.
   - Visual Effects (`src/components/vfx/PourStreamVfx.tsx`): Parabolic SVG liquid stream with gradient coloring, falling droplets, and destination splash ripples.

---

## Automated Verification Test Results
```
 RUN  v5.0.4 D:/VsCode/Web/MyWeb/ChemDex/lab-2d

 ✓ src/chemistry/__tests__/chemistryEngine.test.ts (13 tests)
 ✓ src/__tests__/experimentsIntegration.test.ts (13 tests)

 Test Files  2 passed (2)
      Tests  26 passed (26)
   Duration  434ms
```

### Production Build Verification
```
✓ 1709 modules transformed.
dist/index.html                   1.24 kB │ gzip:   0.73 kB
dist/assets/index-Duh0AR6j.css   50.49 kB │ gzip:   8.74 kB
dist/assets/index-DCSAny8x.js   392.34 kB │ gzip: 114.08 kB
✓ built in 2.24s
```

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
