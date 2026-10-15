# Interactive laboratory update

## Scope

- Replace the floating long broom with a short brush in the left hand and a rimmed dustpan in the right hand. Grips share the hand transforms.
- Add three visible, named floor samples: clean paper, broken glass and contaminated absorbent paper. Collection requires PPE and the cleanup kit, three sweeping actions and the appropriate container. One sample may be carried at a time.
- Route learners to samples and then the disposal station. Waste disposal completes only after the spill bag and all three loose samples have been sorted correctly.
- Find the shortest reachable approach on a weighted 25 cm navigation grid with diagonal movement. Collision-test every edge, avoid stools as well as benches/cabinets, and smooth visible segments. The guide uses a dark outline, cyan core, white dashes and yellow turn markers.
- Make functional room objects discoverable by click, nearby E/touch interaction, and the searchable equipment directory. The directory can set a navigation destination without advancing story tasks.
- Provide hands-on balance/tare, graduated volume, titration, controlled heating, pH, fume hood, storage classification, handwashing and stopwatch exercises, plus ordered safety procedures for the remaining fixtures and equipment.
- Remove the accidental all-tasks-complete restriction from optional station proximity checks. Main story objectives and PASS training still keep their own requirements.

## Controls

Open **Sổ dụng cụ** to find an instrument, choose **Dẫn đường đến dụng cụ**, approach it and press **E** or click the object. Choose **Hủy** to return to the current story objective. A distant click sets navigation instead of using equipment remotely.

Loose samples are visible at X/Z (-6.7, 4.5), (-1.5, 2.7) and (6.4, 0.3). Use the cleanup kit before pickup; take each contained sample to the waste station and choose the appropriate bin.

## Verification

- `npm run lint`: TypeScript check.
- `npm run build`: production bundle.
- `node scripts/test-lab-expansion.mjs`: 24 routes, per-instance equipment operation, equipment directory/navigation, physical sample pickup through E, bin sorting and disposal completion. Requires the development server and a local Chromium CDP endpoint on port 9222.
- `node scripts/test-safety-interactions.mjs`: PASS gating, acid drag/reversed-pour rejection, pour/stir/cool cycles, sorting and modal cleanup.
- `node scripts/test-safety-visuals.mjs`: mirror updates, held tools, touch dragging and mobile modal layout.

Browser checks write their results to `docs/perf` and screenshots to `docs/screens`. Disable hot reload during long browser runs with the existing `DISABLE_HMR=true` environment option, so generated reports cannot reload the page mid-test. This does not change application or Codex settings.

Architecture surfaces such as walls, floor and structural trim remain architecture. Functional objects are represented at equipment level rather than treating each mesh, screw or label as a separate tool. Models and exercises are educational simulations; real chemical work follows the teacher and the specific laboratory procedure.
