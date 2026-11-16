# Filter recovery, sponge gestures and prepared reactions

Verified locally on 2026-11-16.

## Observed failures and changes

- Filter recovery previously merged solids solely by chemical formula. PbI2
  crystal plates could become the receiver's existing powder or macrostock, and
  released metal could lose its carrier history. Capture/recovery now resolves
  legacy origin/formation before changing locations and retains incoming rows.
  Actual transport populations preserve both powder and crystal plate masses.
- Sponge input was handled at both the native canvas and the 3D tabletop. A
  single press could collect two overlapping finite patches; right clicks could
  also collect. The native handler now owns the gesture once, accepts only the
  primary left pointer, uses the actual table plane, bounds the collector to the
  same center as the sponge and throttles continued scrubbing to 120 ms. Pointer
  positions outside the canvas or physical table do not collect material.
- A library sample that needed heat or ignition opened Inspector without a way
  to start it there. Inspector now shows the prepared reaction, unmet conditions
  and a run/ignition action for the same specimen. Physical ignition still needs
  a burning source at the mouth; rejected starts preserve pause and inventory.
- The scene budget still ignored precipitate samples between 0.05 and 0.2 mL
  after their renderer was enabled. Those active samples now share the same
  bounded particle budget as larger specimens. A regression failed with zero
  active vessels for 20 microdose specimens before the fix and passes with 20.

## Verification

- 131 tests passed across 12 related files. These exercise actual native/table
  callbacks with conservative spill collection, crystal/metal provenance,
  physical precipitation populations, the real recovery action, thermal and
  ignition activation, and per-scene particle budgets across quality tiers.
- TypeScript passed on the final source state.
- Production build passed (3,436 modules); the existing large-chunk warning
  remains.
- The real browser audit passed 8/8 assertions with no page errors. One primary
  click collected one patch and conserved the 100 g spill between remaining and
  waste inventories; a right click collected nothing. The recovery button kept
  0.02 g powder distinct from 0.03 g plates. The prepared Cu(OH)2 sample remained
  paused at insufficient temperature, then its Inspector button started the same
  vessel at 65 °C, preserving its initial mass in the reaction baseline.
- Browser fixtures use the mounted application's exact Vite modules and real UI
  buttons. The sponge fixture waits for its 3D mesh and camera before clicking.
  Its observer records the actual pointer ray/collection center in `report.json`.

Reproduce with a local dev server on port 6767:

```powershell
node scripts/auditLabOperationsBrowser.mjs
```
