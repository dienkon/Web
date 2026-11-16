# Sample lifecycle, small precipitates and Auto layout

Verified locally on 2026-11-16.

## Changes backed by observed failures

- Precipitate particles, settled beds and the manual effect mount gate previously
  required more than 0.2 mL, while solid fallback accepted only 0.05 mL or less.
  Real products in the intervening range had no visible owner. All three gates
  now agree with the existing 0.05 mL dry-residue handoff. Both manual and shared
  Auto rendering use the corrected particle/bed components.
- Static stock forms previously each drew the entire unresolved metal deposit.
  No-ID carriers now share only unresolved coating by surviving core mass;
  explicit carrier-bound deposits stay with their recorded grains. Powder uses
  the same allocation for its tint and pile volume. Actual drawn matrix volume
  matches finite deposit volume, including mixed posed/static stock.
- Inspector cleanup previously left 20 g of mass and foam on an empty specimen;
  a subsequent measured liquid transfer rejected that receiver. `emptyVessel`
  now collects contents and separate wall-water inventory into waste, resets
  specimen effects/stock/chemistry and advances the sample revision. The same
  glass keeps its position, temperature and lock. Busy transfers reject sample
  replacement. Undo/redo restores specimen and waste together. The UI now says
  “Làm rỗng” to distinguish collecting a sample from metered instrument rinsing.
  The arbitrary per-species delete control was removed because it only changed
  labels/nominal volume and left the chemical inventory behind.
- Fixed canvas bottom offsets let Auto captions overlap the 3D area by 3.5–208 px
  in the measured baseline. Header, scene and playback now occupy separate flex
  rows. Long captions scroll within a bounded area; short screens use compact
  padding. The canvas resizes without losing its experiment.

## Verification

- 222 tests passed across 16 affected/adjacent files, including actual render
  callbacks, the manual director render graph, finite coating matrix volumes,
  empty/undo/redo, transfer guards, rinsing and decanting.
- TypeScript passed after final source edits.
- Production build passed with 3,435 modules. The existing large-chunk warning
  remains.
- Real manual browser scene: 7/7 assertions passed. A 0.12 mL sample displayed
  128 representative BaSO4 particles accounting for 0.00001 g. Clicking the
  actual “Làm rỗng” button collected a 20.01 g specimen plus 0.01 g wall water,
  cleared particles/foam and preserved 60 °C glass temperature. Clicking again
  added no waste. The emptied vessel then accepted exactly 1 mL from a 5 mL
  source, leaving 4 g there and the waste unchanged. No page/shader errors.
- Auto browser layout: 8 scenarios passed, normal/long captions at 1440×960,
  390×844, 320×568 and 844×390. All controls stayed inside the viewport, no
  horizontal overflow occurred and the 3D area remained at least 153.5 px high.
  The caption starts 8 px below the scene in every case. Baseline and final
  reports/screenshots are under `../auto-layout/`.

Reproduce browser audits with a dev server on port 6767:

```powershell
node scripts/auditSampleLifecycleBrowser.mjs
node scripts/auditAutoLayoutBrowser.mjs
```
