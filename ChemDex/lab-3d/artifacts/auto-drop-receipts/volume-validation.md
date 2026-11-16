# Accepted delivery volume and receiver motion

Verified locally on 2026-11-16.

Auto previously rebuilt the entire resident liquid volume from its mass and the
initial specimen density on every dosing frame. For a 1.41 g/mL donor, the first
0.05 mL packet became 0.0705 mL on the next frame without another arrival. Auto
now retains the volume owned by accepted packets and thermal/chemical updates.

An active stock receiver now stays in place through delivery and outstanding
contact transactions. Direct dragging, linked rack/tongs/funnel/burner pickup,
rotation and placement cannot move it away from an already released drop. Starting
a stock or spatula dose into a carried receiver is also rejected. The gesture
displays a short explanation; unrelated vessels can still move.

The visible mortar pestle now uses accepted simulation time for its path and
grinding duration. Pausing freezes it, resuming introduces no wall-clock jump,
and 1x/4x at 30/60/120 FPS produce the same path and duration.

## Validation

- 69 distinct focused tests passed across the 10 affected and adjacent test files.
  The initial combined run passed 68 and exceeded the old 90-second limit for
  golden rain. That complete natural-cooling case passed separately with a
  180-second limit; it integrates up to 2,400 simulated seconds. No scientific
  assertions were removed or relaxed.
- TypeScript passed after the final source edits.
- Production build passed (3,434 modules); the existing large-chunk warning remains.
- The browser audit passed 15/15 checks for each of two fixtures: water and a
  water-free acid packet with configured density 1.41 g/mL. Both delivered
  0.05 + 0.05 + 0.02 mL, conserved source/flight/receiver mass, froze while paused,
  matched the actual outlet and moved receiver, and retained the final impact
  during withdrawal. Shared Lab 3D renderers remained mounted. No page or shader
  errors occurred. Reports record unchanged source fingerprints for each run.
- The acid fixture retained 0.05 mL between its first two arrival frames and
  finished at 0.12 mL. Water finished at 0.1198035542 mL with 0.0001964458 mL
  recorded evaporation. The audit credits measured evaporation/condensate returns
  when comparing delivered inventories.

The browser fixtures use a red tracer tint solely to make droplets easy to
inspect. This tint does not change the production chemical appearance.

Browser reports and screenshots are in `dense-acid/` and `water-volume/`.
Reproduce with PowerShell:

```powershell
$env:LAB_AUTO_DROP_FLUID = 'acid' # or 'water'
$env:LAB_AUTO_DROP_OUTPUT = 'artifacts/auto-drop-receipts/dense-acid'
node scripts/auditAutoDropReceiptsBrowser.mjs
```
