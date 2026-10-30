# ChemDex platform upgrade — 2026-10-27

This release publishes the React Lab-2D at `/lab-2d/`, replaces the home page with a shared 118-element periodic table, and adds the molecular structure utility at `/tien-ich/cau-truc-3d/`.

- Scientific light/dark interface, accent-insensitive element search, filters, property maps, favorites, history and three-item comparison.
- 58 attributed structure records: molecules, ions and ideal crystal cells. PubChem searches expose candidate identities; salts and mixtures are classified separately. Models support display styles, atom labels, distances/angles, PNG and structure-file export.
- 20 guided Lab-2D experiments, explicit reagent quantities, native 3D dialogs, local named sessions/autosave, versioned JSON import/export, consistent undo/redo and printable/CSV reports.
- 60 review questions with explanations, saved progress and wrong-answer review.
- All seven child applications are built into a separate public output; legacy lab URLs remain compatible. Server-only AI credentials, same-origin PubChem APIs, input/rate limits, lazy 3D loading, renderer-aware quality and suspension of hidden lab renders are included.

Verification before release: Lab-2D 88 tests; Lab-3D 1,911 tests; safety audits and platform/API checks; clean Node 22 Linux CI with Chromium, Firefox and WebKit. The authenticated Vercel Preview passed 28 Windows browser checks across Chromium, Edge and WebKit, with 2 intentional DevTools-specific skips. Lighthouse mobile local medians: home 98 Performance / 96 Accessibility; tools 99 / 100. Sustained default-scene 3D benchmarks reached about 60 FPS on Intel UHD Graphics; software renderers are slower.

The applications are educational models. Coordinate provenance and limitations are shown per structure; four small reference molecules use NIST experimental gas-phase geometries. AI replies still require scientific judgment and cannot bypass the lab's elemental-conservation gate.

See [release validation and rollback](RELEASE_VALIDATION.md) and [deployment/data maintenance](PLATFORM_UPGRADE.md). Account-level revocation of the old removed AI fallback credential remains an external verification item; its rejection by an API is not proof of account revocation.
