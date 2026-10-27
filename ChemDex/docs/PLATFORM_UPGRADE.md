# ChemDex platform upgrade

## Build and serve

Use Node.js 22 (`.nvmrc`) and npm lockfiles. From `ChemDex`:

```sh
npm ci
npm run build
npm run preview
```

The build installs missing child dependencies (always uses `npm ci` in CI), builds seven applications, and assembles **only public runtime files** into `dist`. Source HTML is never overwritten. `npm run build:static` packages existing child builds after changes to the static platform. `build.js` is a compatibility entry point for this packaging step.

Vercel uses the existing `chem-dex` project, repository `dienkon/Web`, Root Directory `ChemDex`, build command `npm run build`, output `dist`, Node 22. All server routes are dispatched by one `api/[...route].ts` function; implementations live outside the public output in `server/routes`. This also avoids publishing helper files as separate serverless endpoints. Configure `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) and optionally `GEMINI_MODEL` as **server variables**. No application key is embedded in the lab frontend. Optional personal keys are held only in sessionStorage and forwarded to the server in a request header.

| Public route | Purpose |
| --- | --- |
| `/` | Shared 118-element periodic table, filters, property maps, favorites, comparison |
| `/nguyen-to.html?element=O` | Existing detailed element content and atomic/crystal media |
| `/tien-ich/` | Tool directory; `/tien-ich/tat-ca.html` retains the full legacy directory |
| `/tien-ich/cau-truc-3d/` | Molecular/ion/crystal structure catalog and viewer |
| `/on-tap/` | 60-question study bank and local progress |
| `/lab-2d/` | React lab with 20 guided experiments, session storage and reports |
| `/thi-nghiem`, `/thi-nghiem.html` | Redirect to the React lab |
| `/lab/` | Compatibility redirect to `/lab-3d/` |

Other application roots are retained. Missing JS, image and model files return 404; there is no catch-all asset rewrite to HTML. The two existing center routes have explicit HTML fallbacks.

## Shared chemistry and structures

- `shared/elements.json` is the runtime source for the main table and lab-2d. The adapted numeric property subset is attributed to [Bowserinator and contributors](https://github.com/Bowserinator/Periodic-Table-JSON), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Radii are empirical, ionization energies are first ionization energies in kJ/mol, and melting points are converted to °C. Missing values remain null.
- `shared/compounds.json` contains 55 molecular/ion coordinate files and three ideal crystal cells. `shared/lab-structure-coverage.json` classifies all 95 lab chemicals as available, components or unavailable. Ionic stocks are not presented as isolated neutral salt molecules.
- Molecular coordinates were retrieved from [NCI/CADD](https://cactus.nci.nih.gov/chemical/structure_documentation). The audit checks SDF atom counts, elemental composition and finite coordinates. These checks **do not establish an experimental equilibrium geometry**; their provenance remains computational/illustrative.
- Water, ammonia, methane and carbon dioxide use experimental gas-phase coordinates from [NIST CCCBDB SRD 101](https://cccbdb.nist.gov/). Exact reference coordinates and source links are retained in `shared/nist-geometries.json`.
- NaCl, CsCl and CaF₂ CIF files are expanded ideal conventional cells, reconstructed from lattice parameters and crystal types published by the [University of Potsdam teaching database and its cited literature](https://www.uni-potsdam.de/en/crystallography/lehre/merge-cube-lehre-mit-erweiterter-realtitaet/strukturdatenbank/salze). They are labeled ideal cells, not deposited experimental CIF records.
- PubChem search uses names, CIDs or formula search. Formula results remain a selectable list of candidates. Charge and covalent-unit count distinguish ions and multiple-component records. The same-origin endpoints are `/api/chemistry/search` and `/api/chemistry/structure`; they cache successful upstream responses, enforce timeouts and handle throttling/2D-only records. The curated files remain usable when PubChem is unavailable.
- 3Dmol.js 2.5.5 is lazy-loaded. A checked build-time adapter adds lifecycle cleanup to the pinned source and caps rendering resolution; it does not modify `node_modules` or global event methods at runtime. Updating 3Dmol requires reviewing this adapter. Its BSD license is included in the public output.

Maintenance commands, in order when refreshing reference files:

```powershell
./scripts/fetch-nci-structures.ps1
./scripts/fetch-nist-geometries.ps1
node scripts/apply-reference-geometries.mjs
node scripts/prepare-catalog.mjs
node scripts/enrich-elements.mjs
node scripts/generate-study.mjs
```

Network retrieval is an explicit maintenance operation, not part of deployment. Rebuilds use committed datasets. CID references identify compounds; the structure's `source` identifies the actual coordinate provider.

## Lab sessions and scientific behavior

`LabSessionV1` contains `version`, `id`, `name`, `savedAt` and a state snapshot: equipment, quantities, selected equipment, guided mode/progress, history, spills and student notes. Sessions and coordinate caches share IndexedDB `chemdex-platform`, version 1. Small preferences, favorites, study answers and completed-experiment records use the `chemdex:` localStorage namespace.

Imports validate version, finite values, nonnegative quantities, supported equipment, capacities, experiment compatibility and size. Failed imports leave the current state intact. Restored sessions are paused. Quantity data and tool settings are preserved until the user resumes. Manual snapshots and the rolling autosave have separate IDs; report JSON and session JSON have separate purposes.

Undo/redo snapshots include history, guided progress, notes and spills. Aqueous stock additions split dissolved solute mass from solvent mass; reactions no longer discard the bulk water inventory. Gas leaving an open vessel is an explicit mass loss. AI proposals must be element-balanced before modifying inventories, and stale async responses cannot recreate a removed or changed vessel.

The six new guided experiments cover silver halides, amphoteric aluminium hydroxide, copper–ammonia complexation, limewater/CO₂ excess, iron/copper displacement and acetate buffers. Completion checks actual physical criteria, records local completion and opens the relevant quiz. The lab remains an educational deterministic model; the CO₂ experiment does not claim full gas–liquid equilibrium, and the ammine representation does not include all hydration ligands.

Reports include objectives, recorded equations, readings, a pH chart, activity history, notes and a reference conclusion. Print/PDF uses the browser print dialog. CSV and report JSON are available separately from session export.

## Verification and release

```sh
npm run lint:api
npm run test:platform
npm --prefix lab-2d run lint
npm --prefix lab-2d test
npm --prefix lab-3d run lint
npm --prefix lab-3d test -- --maxWorkers=2
npm --prefix lab-safety test
npm --prefix lab-safety run test:practical
npx playwright install --with-deps chromium firefox webkit
npm run test:browser
node scripts/measure-platform.mjs
```

The preview must be running for the Lighthouse command. Its output records three identically configured mobile runs per route and medians; targets are Performance 90 and Accessibility 95 for home/tool directory. Browser checks cover 360-px layouts, actual React hydration, session save/restore, structure rendering/fallback, measured NIST water geometry and release of global event handlers. Chrome/Edge-only inspections explicitly use DevTools; their skips in other engines are intentional.

The GitHub `ChemDex checks` workflow tests a clean checkout with Node 22 and all three browser engines on Ubuntu. Windows Firefox may fail before application startup with a local `mozglue` side-by-side assembly error; this is recorded as an environment failure, not counted as a passing browser check.

Release order: push the feature branch, verify the Vercel **chem-dex Preview** and clean CI, merge only ChemDex changes to production, then verify the production alias against the release commit. Record the previous successful chem-dex deployment before promotion. Rollback by promoting that recorded deployment in Vercel; do not force-push repository history. New snapshots are versioned to prevent silently importing incompatible data after a rollback.

The previous committed fallback credential is removed. A read-only Google check rejected it with HTTP 401 / `ACCESS_TOKEN_TYPE_UNSUPPORTED`. This proves it is not accepted by that endpoint; revocation in its issuing Google account cannot be inferred from that response and requires account access.
