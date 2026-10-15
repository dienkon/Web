# Bright lab and situation campaign

This update modifies the existing 3D lab and continues its teacher-led progression. There are now five phases and 34 tasks. The optional academy remains available in the tools menu.

## Detection and interaction

- Equipment is considered only inside a short reach distance and within the camera's forward cone.
- Generic equipment needs a ray hit on the actual object. A nearer opaque surface prevents interacting through furniture or walls; clear glass remains detectable.
- Ceiling fixtures, clocks and ventilation fixtures do not produce automatic use prompts.
- A target must remain stable for 180 ms before acquisition. Changing to an adjacent target uses a longer delay; losing aim or leaving reach removes the prompt immediately.
- Exactly one focused target owns the green ring, reticle prompt and E action. A direct equipment event or pointer click cannot bypass the current focus state.
- The objective waypoint yields when an object is detected, avoiding overlapping labels.
- Nearby station controls use focus as well as proximity. The spill task registers independently so its detection does not depend on itself.

Implementation: `src/core/focus/FocusResolver.ts`, `InteractionManager.tsx`, `FocusMarker.tsx`, `LabEquipmentController.tsx`, `InteractableItem.tsx`.

## Additional campaign

After the three advanced rounds in phase 4, the teacher unlocks phase 5. Only the current situation's props are mounted, with a physical position and an approach point in the existing lab.

| Situation | Main subject |
| --- | --- |
| Chai hóa chất mất nhãn | Identify unknown reagents without guessing |
| Ống nghiệm nứt trên giá | Reject damaged glass and collect sharps correctly |
| Ống dẫn khí tuột khớp | Stop, avoid ignition and report a loose gas connection |
| Cốc nóng nhìn như cốc nguội | Recognize hot glass and use appropriate tools |
| Hai chai không được để cạnh nhau | Store by compatibility and local instructions |
| Pipet cần bóng hút | Use a mechanical pipetting aid |
| Máy ly tâm mất cân bằng | Check load, lid and stopping conditions |
| Thùng đồ chắn lối thoát | Preserve a clear evacuation route |
| Kính bảo hộ bị tháo giữa buổi | Keep suitable eye protection in the hazard area |
| Găng bẩn và chiếc điện thoại | Separate clean personal objects from contaminated gloves |
| Hai chai chất thải khác nhóm | Check waste compatibility and fill limits |
| Bình hút chân không chưa kiểm tra | Verify equipment suitability before pressure work |
| Mẫu thừa không trở lại chai gốc | Avoid contaminating shared reagent bottles |
| Bàn thực hành quá chật | Prepare a stable, unobstructed work area |
| Kiểm tra trước khi rời phòng | Follow the shutdown and handover checklist |

Each situation includes three NPC camera shots, three inspectable clues, three decisions with individual choice feedback, three ordered actions and a debrief. Across the new campaign this provides 45 observations, 45 decisions, 135 answer choices, 45 actions and 45 cinematic shots.

The scenario reducer prevents skipped observations, repeated answer submission, continuing after an incorrect answer, performing actions out of order and finishing before all stages are verified. Progress is saved after accepted actions. Restoring a saved attempt filters foreign clues, bounds counters and rebuilds validated decision progress. The certificate is available only after the full campaign is complete.

## White interface

- White question panels, evidence cards, menus, subtitle bars, instrument panels, handbook and exercise-library surfaces.
- Dark readable text, restrained green accents, clear borders and minimal shadow.
- A single objective card at the upper left, status/tools at the upper right, tools at the bottom center and an interaction button at the bottom right.
- The equipment directory, handbook and practice shortcuts live in one menu.
- Modal content scrolls within the viewport, with safe-area padding, focus handling and Escape support for the new situation panel.
- Mobile landscape panels use compact headers and independently scrolling content. The tools popover reserves space above the interaction button.

## Runtime work

- Demand rendering is scheduled at up to 60 fps for active play, 30/40 fps for lower presets and 15 fps during menus. Hidden tabs stop scheduled scene invalidation.
- Focus ranking is sampled about 13 times per second; raycasts run only for plausible equipment targets.
- No React store publication when the focused ID is unchanged.
- Only the active situation's props are mounted; label textures are disposed on unmount.
- Graduation marks use instanced geometry. Existing per-frame hover-vector allocations were removed.
- Auto graphics excludes intentionally slowed menu frames from its overload calculation and recovers resolution after sustained headroom.
- Generated test artifacts no longer cause Vite to reload the running game.

The frame sample in `browser-checks.json` is the browser's animation callback interval, not a claim of rendered scene FPS. Rendering cost and frame rate vary with hardware and preset.

## Validation and source size

- TypeScript check and production build pass.
- Existing academy core suite passes.
- `node scripts/test-bright-lab-core.mjs` validates all 15 scenario paths, wrong choices, action ordering, save sanitization and focus behavior.
- `node scripts/test-bright-lab-browser.mjs` exercises real detection, one green ring/prompt, no ceiling-light prompts, white instrument panels, all 15 situation panels, desktop/mobile button coverage, completion gating, save/resume and runtime errors.
- The original PASS/cinematic/waste suite is adapted to aim-based detection and phase 5 progression.
- The fire follow-through check uses the actual pin, aim, spray and sweep behavior.

`source-count.json` compares source files with the snapshot taken at the beginning of this request. It counts nonblank added application lines separately from tests and tooling, excluding documentation and generated build output. Application additions exceed 6,000 lines, including the scenario content, models, interaction system and interface.

Run the browser suites with the game server and Chrome's existing debugging endpoint:

```powershell
npm run dev -- --port 3001
$env:P0_APP_URL='http://127.0.0.1:3001/?debug=1'
node scripts/test-bright-lab-browser.mjs
node scripts/test-lab-cinematics.mjs
node scripts/check-fire-after-cinematic.mjs
```

No packages were installed, no Git commits or pushes were made and no deployment was performed.
