# Instrument and placement validation — 2026-11-16

Fixed reproducible failures:

- Explicit alignment, hot-plate placement and rack actions moved glass without moving its finite stock poses. Placement now transforms the same carrier IDs and poses, preserves inventory, and rejects stale worker branches. Locked children block linked relocation.
- Wash-bottle squeezes bypassed pause, Move and lock guards. Store calls, controls and 3D trigger feedback now share one validation function. Loading a preset clears stale rinse/view sessions immediately while retaining previously collected waste.
- The titration panel addressed the selected vessel while the 3D burette addressed the vessel under its nozzle. Both controls now use the physical receiver, name the receiver/graph, show the exact remaining drop, and explain rejected operations.
- A vertical burette ray could miss a tilted opening while the nozzle-local radius check accepted it. Targeting and presentation now share the actual mouth and first interior contact, including horizontal tilted-pool levels and upright vortex geometry.

Verification:

- `npx tsc --noEmit`: passed.
- Combined instrument, aperture, relocation, stock carry and rinse Vitest run: 12 files, 129 tests passed.
- Relocation agent's final focused run: 51 tests passed, followed by the final 7-test relocation file after the blocked-alignment assertion was added.
- `node --test tests/chemical-names.test.mjs` from ChemDex: 11 tests passed.
- `npm run build`: passed; existing bundle-size warnings remain.
- `node scripts/auditTitrationControlsBrowser.mjs`: all 7 assertions passed, no page errors. The audit clicked actual controls with receiverB selected and receiverA under the nozzle, checked a finite 0.02 mL dose, pause/missing-receiver feedback and the 390 px panel layout.

The browser fixture uses isolated temporary page state. It does not change the user's browser storage. Screenshots are `desktop.png` and `mobile.png`; structured assertions are in `report.json`.
