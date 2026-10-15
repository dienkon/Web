# ChemDex Academy upgrade

## Open the new experience

Reload the application and choose **Học viện · 44 thử thách** from the start screen or laboratory. Instruments also offer **Chơi thử thách nâng cao với dụng cụ này**. The academy loads on demand and blocks room controls while it is open; returning releases the same lock.

## Delivered features

- 44 playable challenges across seven mechanics: pointer/touch sorting, ordered workflows, matching memory cards, hazard spotting, precision measurement, contextual decisions, and continuous pour/heat control.
- Six skill chapters: preparation, identification, measurement, handling, cleanup and emergency response.
- Three difficulty settings with explicit explanations. Scores prioritize correct actions; elapsed time never reduces a score or forces a round to end.
- 72 authored decision situations, each with three choices and specific feedback. Incorrect decisions enter a spaced-review schedule; the review session prioritizes due or unseen cases.
- 57 glossary concepts with definitions, examples, common mistakes and related entries.
- XP, levels, best results, replay rewards, local study-day streaks and 25 achievement goals.
- A configurable 5/10/15/20-minute study planner, balanced daily recommendations, search without Vietnamese accents, bookmarks and personal coaching based on recorded mistakes.
- Editable, searchable and pinnable notebook entries, including one-click saves from results and the glossary.
- Local profile persistence, validated backup import, JSON backup and CSV reports. Formula-like CSV values are neutralized before export.
- Keyboard alternatives, focus containment, screen-reader feedback, pause-on-blur, touch controls, reduced-motion mode, larger text and higher contrast.

The main laboratory story, equipment inventory, PASS gate and academy profile remain separate. Academy results do not grant real-world credentials or automatically bypass laboratory prerequisites.

## Source-size evidence

`before-source.zip` and `baseline.json` were created from the existing source before this request was implemented. They preserve pre-existing user changes. `change-metrics.json` compares against that snapshot instead of Git HEAD, so earlier work is excluded.

Run `python scripts/measure-academy-upgrade.py` to recompute additions, deletions and nonblank changed lines. The measurement includes runtime source, runtime educational content and the new automated checks; it excludes screenshots, generated build bundles, backup data and this documentation.

The runtime educational catalog accounts for 6,245 added lines. It is consumed by the game, chapter, glossary and achievement screens, with reference and reachability checks. Remaining additions implement the interface, mechanics, state, persistence and verification.

## Verification

- `npm test`: catalog integrity, scoring, replay rewards, deterministic randomization, result deduplication, Vietnam study days, profile import sanitation, review scheduling, study planning, searching, achievements, coaching and CSV export.
- `npm run lint`: TypeScript verification, including the academy.
- `npm run build`: production packaging. Academy UI and catalog have a separate lazy-loaded chunk.
- `npm run test:academy:browser`: finishes all 44 challenges through UI actions, checks single result recording, pause timing, search, planning, glossary, notebook, achievements, coaching, reload persistence, mobile layout and scene-lock cleanup.
- `node scripts/test-academy-edges.mjs`: wrong-bin and wrong-order guards, real touch dragging, memory pause/resume, reverse-pour rejection, keyboard hold control, fluid pause, abandoned-round accounting and room input blocking.

Browser scripts use the development server and a dedicated Chromium CDP endpoint at `127.0.0.1:9222`. Keep browser checks sequential when they need foreground keyboard control. Long test runs should use the existing `DISABLE_HMR=true` environment option so written reports do not reload the tested page.

Reports and rendered screenshots are stored beside this file. Temporary test bundles stay under `.browser-review/academy-tests` inside the selected project workspace.
