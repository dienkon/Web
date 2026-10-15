# Existing 3D lab update

This change extends the original first-person lab. It adds no route, hub or separate game flow.

## Progression

- Existing phases 1 and 2 retain preparation, PASS, chemistry and first aid.
- Fire begins only after PASS training, during the NPC cutscene. The camera returns to the player's previous pose before practical suppression starts.
- In phase 3 the three loose samples are absent until `task_spill_wipe` is complete. Collected samples disappear individually, and all samples are absent outside the collection round.
- Reporting phase 3 to the teacher now unlocks phase 4 instead of the certificate.
- Phase 4 adds three ordered rounds at physical lab locations: electrical equipment near water, chemical vapors and the fume hood, and alarm/evacuation.
- Each added round has an NPC introduction and three checked decisions. Wrong answers give feedback and deduct the existing mistake penalty; they cannot complete a step. All three rounds are required before the teacher awards the certificate.
- Existing saves merge their completed task IDs into the current task list, retaining progress while adding the new rounds.

## Cinematics

`src/data/cinematics.ts` defines shot positions, look targets, speakers and Vietnamese captions. Fire has five 4.5-second shots; the other introductions have three each. These are live 3D cutscenes, not prerecorded video files.

`LabCinematic` moves the camera, poses Minh and Lan, tips a solvent bottle and ignites the existing fire simulation at nine seconds. NPCs withdraw as the story progresses. All gameplay buttons, HUD, crosshair and held-item models are hidden. Movement, aiming, interactions and spraying are blocked. The camera position, orientation and field of view are restored on exit. Hidden tabs do not advance the story. Reduced-motion settings use stationary shots.

The fire pin interaction is limited to an unfinished phase-2 fire task so it cannot consume E in later rounds.

## Model additions

- Open-rim graduated beaker with pouring lip, liquid and meniscus.
- Graduated cylinder with broad foot; graduation marks use instancing.
- Four capped sample tubes with rounded bottoms, colored contents and labels in a two-level rack.
- Three pipets with rubber bulbs in a tray, omitted on the potato preset.
- Wash bottle with curved dispensing tube.
- Curved gas tubing and burner fitting.
- Extinguisher valve, squeeze handles, pin ring, label and hose.
- Physical staged props for water near electricity, fume-hood working height, and evacuation arrows.

## Validation

- `npm run lint` — passed.
- `npm run build` — passed; existing bundle-size warning remains.
- `npm test` — passed, 15 academy core checks.
- `scripts/test-lab-cinematics.mjs` — passed on the local development server and Chrome CDP. Covers the actual four-answer PASS quiz, no premature fire/waste, zero visible buttons during film, blocked movement, restored controls, all three new rounds including wrong answers, certificate gating, save/resume, and zero browser runtime errors.
- `scripts/check-fire-after-cinematic.mjs` — passed: pin prevents early discharge, real aim/spray/sweep extinguishes the fire, sets the completion flag and completes the task.
- Changed tracked files pass `git diff --check`.

Browser results: `LAB_CINEMATICS_CHECKS.json`, `LAB_FIRE_FOLLOWTHROUGH.json`. Screenshots are in `docs/screens/lab-film-*.png` and `docs/screens/lab-round-*.png`.

No packages were installed, no Git writes or deployment were performed, and pre-existing workspace changes were preserved. The project workflow is recorded in the root `AGENTS.md` and uses Codex directly.
