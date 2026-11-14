# ChemDex 2D — Scientifically Accurate Virtual Chemistry Laboratory

> A complete, interactive, scientifically defensible, production-quality 2D virtual chemistry laboratory built with React 19, TypeScript, Vite, Tailwind CSS, Zustand, and pure SVG glassware rendering.

---

## 🌟 Key Features

- **Pristine White Scientific Workspace**: Clean, modern, minimalist laboratory interface optimized for student usability and intuitive manipulation.
- **Pure Scientific Chemistry Engine**:
  - Strict conservation of elements ($\le 10^{-9}\text{ mol}$) and mass ($\le 10^{-6}\text{ g}$) enforced across `REACTION_DATABASE`, 131 compiled THPT curriculum reactions, and 1,300 lazy-loaded shared catalog reactions (1,431 compiled entries total).
  - Iterative charge-balance aqueous equilibrium pH solver (`src/chemistry/equilibrium/aqueous/`) with Debye-Hückel activity corrections, temperature-dependent $K_w(T)$, carbonate/phosphate speciation, and salt hydrolysis.
  - Indicator color transitions (Phenolphthalein, Methyl Orange, Bromothymol Blue, Thymolphthalein, Litmus, Universal indicator).
  - Reaction thermodynamics & calorimetry ($\Delta H^\circ$, adiabatic temperature evolution, latent-heat ice melting, boiling cap).
  - Gas evolution ($\text{CO}_2$, $\text{H}_2$, $\text{SO}_2$, $\text{H}_2\text{S}$, $\text{NH}_3$, $\text{NO}_2$) with open-vessel mass accounting.
  - Precipitation reactions with realistic particle sediment morphology, Stokes settling, and buoyancy.
  - Safety-gated optional Gemini AI reaction helper: rejects unbalanced/malformed proposals or hallucinated reactants absent from the vessel, defaults missing enthalpy to $0\text{ kJ/mol}$, and labels accepted reactions as unverified (`ai-unverified`).
- **Interactive SVG Glassware & Apparatus**:
  - Beakers, Erlenmeyer flasks, test tubes, graduated cylinders, burette on stand with dropwise dispensing, condenser, and separatory funnel.
  - Analytical balance with digital LCD display and tare functionality.
  - Bunsen burner & hot plate with alignment snap guides.
  - Filter funnel, pipette, stirring rod, spatula, litmus strip, pH meter, thermometer, and wash bottle.
- **Two Experiment Modes**:
  - **Free Laboratory Mode**: Open exploration with pointer drag-and-drop, keyboard navigation (`Arrow`/`Shift+Arrow`, `Enter`/`Space`, `Delete`, `Escape`), pouring, measuring, and heating.
  - **Guided Experiment Mode**: 20 step-by-step experiments (14 core + 6 advanced) validated by live simulation state.
- **Resilience & Performance**:
  - React `ErrorBoundary` wrapping workbench and modals with IndexedDB autosave recovery, workspace reset, and page reload options.
  - Lazy-loaded 1,300-reaction shared catalog, lazy modal code-splitting, vendor bundle splitting, and Zustand slice architecture with pure `stepLabWorld`.
- **Bilingual Support**: Full Vietnamese (default) and English localization throughout all controls, chemicals, and explanations.
- **Laboratory Notebook & Export**: Automated activity log, observations, CSV measurement export, JSON state export, and print-ready PDF reporting.
- **Full History**: 50-snapshot Undo / Redo with exact physical state restoration.

---

## 🔬 Initial 10 Verified Experiments

1. **Strong Acid-Base Neutralization**: $\text{HCl} + \text{NaOH} \rightarrow \text{NaCl} + \text{H}_2\text{O}$
2. **Acid-Base Titration with Burette**: Dropwise $\text{NaOH}$ into $\text{HCl}$ with phenolphthalein endpoint transition.
3. **Silver Chloride Precipitation**: $\text{AgNO}_3 + \text{NaCl} \rightarrow \text{AgCl}\downarrow + \text{NaNO}_3$
4. **Copper(II) Hydroxide Precipitation & Dehydration**: $\text{CuSO}_4 + 2\text{NaOH} \rightarrow \text{Cu(OH)}_2\downarrow \xrightarrow{\Delta} \text{CuO}\downarrow + \text{H}_2\text{O}$
5. **Carbonate Gas Evolution**: $\text{NaHCO}_3 + \text{HCl} \rightarrow \text{NaCl} + \text{CO}_2\uparrow + \text{H}_2\text{O}$
6. **Solution Dilution**: Verifying $C_1V_1 = C_2V_2$ and Beer-Lambert color attenuation with $\text{CuSO}_4$.
7. **Heat of Neutralization (Calorimetry)**: Measuring temperature rise $\Delta T$ from known reaction enthalpy $\Delta_r H^\circ$.
8. **Barium Sulfate Milky Precipitation**: $\text{BaCl}_2 + \text{Na}_2\text{SO}_4 \rightarrow \text{BaSO}_4\downarrow + 2\text{NaCl}$
9. **Active Metal Displacement**: $\text{Zn} + 2\text{HCl} \rightarrow \text{ZnCl}_2 + \text{H}_2\uparrow$
10. **Multi-Indicator pH Investigation**: Mapping full spectrum color transitions across pH 1 to 14.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 22.x
- npm $\ge 9$

### Installation
```bash
npm install
```

### Run Automated Tests
```bash
npm run test
```

### Type Checking & Linting
```bash
npm run lint
```

### Production Build
```bash
npm run build
```

### Full Verification Check (`tsc` + `vitest` + `vite build`)
```bash
npm run check
```

### Local Development Server
```bash
npm run dev
```

Copy `.env.example` to `.env` if configuring `VITE_GEMINI_MODEL`; keep API keys out of `VITE_*` variables in production builds (enter temporary keys per session via the UI modal or use a server-side proxy).

---

## 📚 Documentation

- [Source Audit & Reverse Engineering Report](docs/SOURCE_AUDIT.md)
- [Scientific Validation & Benchmark Cases](docs/SCIENTIFIC_VALIDATION.md)
- [System Architecture](docs/ARCHITECTURE.md)
- [Known Limitations & Physical Bounds](docs/KNOWN_LIMITATIONS.md)
- [Implementation Progress Dashboard](IMPLEMENTATION_PROGRESS.md)

## Platform upgrade

The React lab ships at `/lab-2d/` through the main ChemDex pipeline. It includes 20 guided experiments (14 core + 6 advanced), 115 chemical catalog entries, a shared 118-element periodic table, structure lookup, IndexedDB sessions, paused restoration, print reports, and local study progress. New advanced lesson content is currently Vietnamese; the core UI retains VI/EN controls. See [platform documentation](../docs/PLATFORM_UPGRADE.md).
