# Tool and gameplay repair

## Result

Three slots hold the CO₂ extinguisher, Spill Kit, and collected waste. Click/tap a slot or use keys 1–3. Q puts the current tool away without deleting its inventory item.

The fire mission now takes place in the 3D room: collect the extinguisher, pull the pin, aim at the base, hold to spray, and sweep. Visible flames, smoke, and CO₂ spray react to the simulation. Only extinguishing the source completes the task. A depleted cylinder can be exchanged for a new training cylinder.

Spill Kit uses the same E/touch interaction path: isolate the spill, apply powder three times, collect the residue into a waste bag, and carry it to the chemical waste bin. The phase checks completion of this disposal rather than requiring three nonexistent loose trash objects.

The avatar uses continuous limbs, correctly placed eye protection, profile-based hair and colors, and equipment-aware clothing. The selected tool determines the held model. The first-person cylinder is scaled and placed to leave more of the scene visible.

Auto/low/medium/high use a lightweight teacher avatar. The 286,137-triangle GLB is loaded only for Ultra. Flame geometry is instanced, smoke and spray use small particle pools, spray vector data is reused, and progress UI samples at 10 Hz.

## Validation

- TypeScript and production build passed.
- Desktop E-to-pickup, pin guard, pointer-held suppression, fire completion, tool switching, complete Spill Kit flow, disposal, and new-game reset passed with zero runtime exceptions.
- Touch-held spray, modal cancellation, three-slot layout, and switching while owning both tools passed.
- Existing mobile movement/look, interaction priority/debounce, navigation/mirror/acid-modal checks passed.

The 1366 × 768 headless fire/spray sample measured 86.2 FPS, p95 14.0 ms, and 17,562 visible triangles at DPR 1. Before the teacher LOD change, the same fire/spray scenario measured 40.6 FPS and 298,787 triangles at DPR 0.85. These are short test-host samples; actual frame rate depends on the device and scene.

Raw evidence: `docs/perf/P3_GAMEPLAY_CHECK.json`, `docs/perf/P3_MOBILE_TOOLS_CHECK.json`. Screenshots: `docs/screens/p3-*.png`.
