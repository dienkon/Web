# English Prompt: Improve DkTEST, Reduce Firestore Reads, Fix Learning UI, and Expand Practice Content

You are a senior React, TypeScript, Firebase, and learning-platform engineer working in the existing DkTEST repository. This is a codebase improvement task. Inspect current source before editing, preserve unrelated user changes, and implement the work in small verified stages.

## Project Context

The app is a React 19 + TypeScript + Vite + Tailwind CSS v4 learning platform using Firebase Firestore. The repository already has a practice engine, a gamified learning journey, roadmap and revision services, question generators, exam/submission flows, and student/admin pages.

Important existing areas:

- `src/pages/student/LearningJourney.tsx`
- `src/services/learningActivityService.ts`
- `src/services/revisionProgramService.ts`
- `src/services/topicMasteryService.ts`
- `src/services/learningRecommendationService.ts`
- `src/services/learningDataReconciliationService.ts`
- `src/features/journey/data/journeySubjectQuestions.ts`
- `src/features/journey/data/journeyQuestions12.ts`
- `src/practice/core/types.ts`
- `src/practice/core/PracticeRegistry.ts`
- `src/practice/generators/registerAllModes.ts`
- `src/practice/pages/PracticeLobbyPage.tsx`
- `src/practice/pages/PracticeSessionPage.tsx`
- `src/practice/components/PracticeQuestionView.tsx`
- `src/components/revision/RevisionProgramWizardModal.tsx`
- Firestore rules and indexes only where a required query change needs them.

The existing `npm run lint` TypeScript check has passed before this task. Re-run project checks after implementation and report any failures accurately.

## Evidence-Based Issues to Verify and Fix

Use the current code as the source of truth and confirm these observations before changing behavior:

### Redundant Firestore reads on the Learning Journey

`LearningJourney.tsx` currently calls these loaders together:

- `getStudentLearningActivities({ studentUid, limitCount: 30 })`
- `getStudentLearningStats(studentUid)`
- `getStudentRevisionPrograms(studentUid)`
- `getTodayTasks(studentUid)`
- `getStudentTopicMastery(studentUid)`

`getStudentLearningStats()` independently calls `getStudentLearningActivities({ limitCount: 100 })`, duplicating the activity query. `getTodayTasks()` independently calls `getStudentRevisionPrograms()` before querying pending tasks, duplicating the programs query already made by the page. This means the initial load performs redundant activity and program reads, in addition to task and mastery reads.

Fix this by sharing already-loaded data or exposing pure aggregation/query helpers. For example, compute stats from a suitably paginated activity result, and allow `getTodayTasks()` to accept active programs or query tasks without re-fetching programs. Keep the data completeness requirements explicit: do not silently compute all-time totals or streaks from only the latest 30 records. If all-time stats are required, use a bounded pagination strategy or a maintained aggregate with a deliberate migration plan; do not invent a new Firestore schema casually.

### Other read-cost and data-loading risks

- `LearningJourney` loads roadmap data even when the student is using only the gamified view. Consider lazy loading on roadmap entry and caching by student/session, while keeping first-open loading and stale data behavior clear.
- Review whether callbacks such as `loadRoadmapData()` are stable and whether create/complete/reschedule actions trigger a full reload of every dataset when only a subset changed.
- `getStudentTopicMastery()` fetches up to 50 entries and may be called again by summary helpers. Avoid fetching the same collection repeatedly in one screen lifecycle.
- `learningDataReconciliationService.ts` has broad fallback queries without a student filter. Audit authorization and call sites. Reconciliation must never read another student's records or use unscoped collection scans as a production fallback.
- `getTodayTasks()` currently reads up to 50 pending tasks then filters by date and active program in memory. Query only the needed student's due tasks where the Firestore schema and indexes support it; otherwise use a documented bounded strategy and filter safely.
- The leaderboard query reads the global top 10 first and filters by subject on the client. This can return too few or incorrect subject results. Query by subject server-side when supported, use an appropriate index, and ensure only intended public leaderboard fields are read.
- Check whether empty Firestore results incorrectly fall back to stale local cache, making deleted or completed data reappear. Distinguish “successful empty response” from “network/query failure”.
- Add request cancellation or stale-response guards when the student identity, route, or selected scope changes during loading.

For each high-impact query, document expected query count and maximum returned document count before and after. Do not claim a lower bill unless the query shape and returned documents actually reduce billed reads. Avoid cache strategies that can show another student's data after account switching.

## Question Quality Issues to Verify and Fix

### Repeated generated journey questions

`journeySubjectQuestions.ts` currently uses only four hard-coded templates per subject and cycles those templates across many levels. The displayed topic changes by level while the underlying question may stay unrelated to that topic. Replace this mismatch with a validated bank organized by subject, curriculum/grade, topic, difficulty, and item type. If an adequate verified item is unavailable, show a clear content-unavailable state rather than presenting an unrelated question as topic-specific.

### Answer position bias and older bank consistency

`journeyQuestions12.ts` contains 100 manually-authored items and many entries use `correctIndex: 0`. Audit the whole bank for answer-position bias, correctness, duplicate prompts, topic mismatch, explanation consistency, and formula rendering. Shuffle options with a deterministic mapping per session/question so the correct answer remains correct and review summaries can still identify it. Do not merely rotate option labels without updating the correct-answer index.

### Recommendation actions route to mismatched content

`learningRecommendationService.ts` currently maps a weak topic recommendation to `actionParams.category: "expressions"` regardless of the topic's subject or type. Resolve a real practice mode/topic mapping from the registry/catalog. If there is no matching content, use an honest fallback that opens the practice lobby with a selected subject or topic filter, not an unrelated category.

### Question validation and correctness

Add automated validation for every bank item and generator output:

- non-empty prompt, stable unique ID, valid subject/topic/grade/difficulty
- valid answer and option count for the input type
- correct answer appears exactly once in choices where applicable
- each distractor is distinct and plausible; no duplicate options
- explanation agrees with the keyed answer
- math/chemistry notation and units render correctly
- generator seeds are reproducible for a session and do not repeat items prematurely
- no answer leaks in visible metadata before submission
- all generated correct answers can be independently evaluated by the validator where feasible

Do not use LLM-generated questions as trusted answer-key content without validation and editorial review.

## Expand the Practice Bank Across Subjects and Formats

The practice engine already supports `PracticeCategory` and `QuestionInputType` in `src/practice/core/types.ts`, a registry in `PracticeRegistry.ts`, and generators registered in `registerAllModes.ts`. Extend the existing architecture rather than creating a parallel practice engine.

Build out an extensible, searchable practice catalog that supports:

- Subjects: Mathematics, Physics, Chemistry, English, and Computer Science; retain current categories and routes.
- Curriculum metadata: grade/class, curriculum or exam track when available, chapter, topic, subtopic, and prerequisite.
- Difficulty: foundation, standard, advanced, and exam-level, mapped carefully to existing difficulty semantics.
- Learning purpose: learn concept, guided practice, review mistakes, spaced review, timed practice, and exam simulation.
- Formats already present: numeric input, multiple choice, fraction, comparison, step-error diagnosis, number-line interaction, and expression builder.
- Additional formats only when the engine can validate them robustly: multi-select, true/false with explanation, matching, ordering/sequencing, short constructed response, unit entry, graph/diagram interpretation, and code tracing/output prediction.

For each new format, define a typed answer model, normalization rules, exact or tolerant answer validation, partial-credit policy if applicable, accessible keyboard/touch interaction, summary rendering, and tests before exposing it in the UI. Do not label an item “full coverage” just because a category exists; report actual verified item counts per subject/topic/type.

Create substantial coverage through curriculum-aligned, authored/versioned content and parameterized generators where the underlying math/science is valid. Keep a clear distinction between:

- authored questions with editorial provenance
- deterministically generated questions with generator/version metadata
- imported question sets with source/license metadata

Do not scrape copyrighted question banks or copy exam prep books. Do not generate a fake “large bank” by repeating a few templates with changed IDs/numbers. Preserve attribution/license metadata for imported material.

## Revision Experience Improvements

Improve the revision area and `RevisionProgramWizardModal.tsx` so students can build a useful plan from the expanded catalog:

- Select subject, grade/track, chapter/topic, difficulty range, question formats, session length, and review goal.
- Provide quick presets such as `Ôn câu sai`, `Ôn chuyên đề yếu`, `Luyện 15 phút`, `Trộn nhiều dạng`, and `Thi thử có giờ`.
- Generate tasks from available verified items/generators and explain exactly what each task will practice.
- Avoid scheduling the same question repeatedly until eligible items have been exhausted; use a deterministic selection history or session exclusions with bounded storage.
- Add an adaptive session that adjusts difficulty from recent answers, with visible and predictable rules. Do not equate a small sample with mastery.
- Allow learners to save, pause, resume, reschedule, and edit plans without duplicating tasks or losing completion history.
- After a session, show missed questions, solution/explanation, topic summary, and a one-tap targeted retry.
- Make review controls responsive and accessible, with clear empty, loading, offline, and no-content states.
- Keep Firestore ownership checks and existing `studentUid` authorization intact.

## UI and Product Quality Pass

Audit the practice lobby, practice session, journey quiz, revision wizard, summary, and review screens:

- consistent light/dark themes with readable contrast
- responsive layouts with no horizontal overflow at 320px
- touch targets at least 44x44px for primary controls
- clear progress, question count, selected answer, submitted answer, correctness, and explanation states
- keyboard navigation, screen-reader labels, focus visibility, and reduced-motion support
- distinguish unanswered, flagged, skipped, wrong, and correct states with text/icon as well as color
- preserve text selection for questions and explanations
- support long Vietnamese text, LaTeX, code snippets, units, and narrow screens
- do not display the correct answer before submission
- preserve current work when navigating back or resuming a session where appropriate
- avoid modal stacking and ensure Escape/focus restoration/body scroll cleanup

Do not use decorative complexity that makes dense learning content harder to scan. Keep the question and answer area dominant, explanations easy to open, and secondary gamification compact.

## Data and Security Requirements

- Never use `student_guest` or a local username as an authorization identity for private Firestore data. Require the authenticated UID or use a strictly local guest mode that makes no private Firestore requests.
- Verify Firestore security rules for every new read/write path. Client-side filtering is not authorization.
- Do not introduce broad, unscoped collection reads.
- Preserve existing exam, submission, and progress contracts unless a focused migration is required and documented.
- Use idempotent write IDs for activity/session completion to avoid duplicate records on retry.
- If adding content documents, include stable IDs, version, publication status, subject/topic metadata, provenance/license, and validation state. Keep answer keys protected from unauthorized clients if the platform's assessment integrity requires it.
- Define how offline/local cache merges with server state and how account changes clear or partition user-specific data.

## Implementation Order

1. Map the current read paths and question catalog; record actual query counts and data coverage.
2. Fix duplicate reads and unsafe/unbounded fallback queries without changing student-visible totals silently.
3. Correct topic-to-mode recommendation mapping and verify the journey question bank.
4. Add question-bank schema/validators and tests before expanding content.
5. Expand subject/topic/type coverage using the existing practice registry and typed validation.
6. Improve the revision wizard/session flow to select from valid content.
7. Polish UI and accessibility across the practice/revision surfaces.
8. Verify Firestore rules/indexes, account isolation, and behavior with empty/offline data.
9. Run project checks and summarize before/after read estimates, actual content coverage, files changed, and known limits.

## Acceptance Criteria

- The Learning Journey initial load no longer fetches the same activity history and revision program list twice.
- Screen-level mutations refresh only the data they invalidate where practical.
- All private Firestore queries are scoped to the authenticated student and bounded or paginated.
- An empty successful server result does not resurrect stale local records.
- The leaderboard returns the intended subject-specific rows.
- Every journey question corresponds to its displayed topic or is explicitly marked as unavailable.
- Tests catch duplicate IDs, invalid answer indices, duplicate options, missing explanations, repeated question templates, and broken answer shuffling.
- Recommendation links choose a compatible mode/topic or an honest filtered-lobby fallback.
- The practice catalog exposes actual available subject/topic/question-type coverage rather than claiming unverified completeness.
- Revision plans produce varied, valid practice and avoid unnecessary repeats.
- No regression to exam submissions, quiz scoring, activity tracking, or progress writes.
- UI is usable at 320px and with keyboard, screen reader, light/dark mode, and reduced motion.
- `npm run lint`, `npm run test`, and `npm run build` pass. If an existing test/build failure is unrelated, identify it precisely.

## Do Not Do

- Do not rewrite unrelated app areas.
- Do not add unbounded Firestore reads or query whole collections and filter on the client.
- Do not reduce read counts by dropping necessary history while still presenting incomplete totals as complete.
- Do not silently change scoring, answer keys, exam semantics, or user progress.
- Do not fabricate questions, answer keys, curriculum coverage, leaderboard users, or learning statistics.
- Do not add a heavy dependency when the existing registry and UI components can support the feature.
- Do not mark work complete based only on TypeScript passing; verify data correctness and interactions too.
