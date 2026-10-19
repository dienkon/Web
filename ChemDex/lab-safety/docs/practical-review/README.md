# Practical lab interaction update

The latest interaction and mobile changes are documented in [cải thiện thao tác và giao diện điện thoại](mobile-interaction-update.md).

The next iteration adds a full post-phase practice workshop. See [cải tiến minigame sau các chặng chính](advanced-update.md), [advanced runtime checks](advanced-browser-checks.json), and [assembly/mobile checks](advanced-detail-checks.json).

The main lab now opens an overhead simulation for each incident. It uses draggable, individually drawn SVG objects, sequential tool paths, continuous holds, and adjustable controls. These are focused 2D workbenches; the surrounding room remains 3D. The Academy's four flow games also use direct circular stirring and permit two controlled additions.

## Interaction coverage

- Fifteen incident workbenches, including bench organization, centrifuge balancing, pipette setup, glove removal, storage, and shutdown.
- Bandaging: clean equipment, pre-check, gauze placement, simulated pressure, wrapping, securing, and post-check. Game hold durations are animation exercises, not clinical treatment durations. First aid content references [American Red Cross wound guidance](https://www.redcross.org/take-a-class/resources/learn-first-aid/wounds).
- Waste: sweep five separate pieces along tool paths into a dustpan, carry the collected sample, then physically place it in the appropriate container.
- Alcohol lamp: separate fuel from heat, notify the instructor, align the snuffer, lower it over the wick, and check extinction. No sideways push or blowing out the lamp.
- PASS training and acid dilution now require object manipulation before unlocking or recording completion. The spill exercise requires individual warning-cone placement, perimeter application, instructor verification, absorption, dustpan collection, and wiping. Live fire suppression and the spill scene remain in the room.
- Generic equipment also uses practical workbenches; an unfinished quest reserves its associated equipment so an inspection menu cannot intercept its interaction.

## Input and presentation

Scene clicks request mouse lock; dragging to look does not request lock. Opening a dialog, pausing, losing focus, or leaving the game releases lock and clears movement input. Notification and new-game confirmations use custom dialogs.

Touch devices must enter in landscape. The entry gesture requests browser fullscreen and orientation lock. Browsers that reject these APIs retain a portrait gate and allow manual landscape entry; a web page cannot override the browser's permission requirements.

The reagent racks were moved away from the middle of the benches, duplicate acid props were removed, and detailed vessels were repositioned. Scenario work surfaces are cleared for their props. Models include separate caps, labels, graduation marks, valves, storage compartments, and waste-container openings.

## Verification

- `npm run lint`
- `npm run build`
- `npm test`
- `node scripts/test-bright-lab-core.mjs` (legacy save compatibility and focus checks)
- `npm run test:practical` (workflow integrity, sequential completion, save restoration, required lamp round, quest ownership)
- `npm run test:practical:browser` with Chrome DevTools Protocol at `P0_CDP_ORIGIN` (default `http://127.0.0.1:9222`) and the dev app at `P0_APP_URL` (default `http://127.0.0.1:3000/?debug=1`).

The browser test sends actual mouse/touch events and writes its assertions to `browser-checks.json`. Screenshots in this folder cover the overhead table, bandaging, lamp exercise, and mobile layouts. Use an isolated Chrome profile inside the ignored `.browser-review/` directory and disable HMR while running checks against a stable revision.
