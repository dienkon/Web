# English Prompt: Build a Complete Grade 12 Practice Ecosystem for Math, Physics, Chemistry, and Computer Science

You are a senior learning-platform product engineer, React/TypeScript architect, Firebase engineer, and assessment-content designer working in the existing DkTEST repository. Upgrade the entire practice and revision ecosystem so Vietnamese grade 12 students can find, study, review, and track useful practice across Mathematics, Physics, Chemistry, and Computer Science (Tin học).

This is an implementation task, not just a visual mockup. First inspect the existing system, then deliver the highest-value complete vertical slices while preserving current routes, exam flows, scoring, student data, and unrelated user work.

## Existing System to Extend

The repository already contains:

- A registered generator-based practice engine under `src/practice/`.
- `PracticeCategory`, `QuestionInputType`, `PracticeMode`, and `PracticeRegistry` in `src/practice/core/`.
- A practice lobby and session under `src/practice/pages/`.
- Generators mainly for elementary arithmetic, expressions, equations, fractions, geometry, word problems, English, and a Computer Science code-tracing mode.
- A revision program wizard and task service under `src/components/revision/` and `src/services/revisionProgramService.ts`.
- A question bank service and admin question-bank page.
- Learning activities, topic mastery, recommendations, and the 3D journey question datasets.
- Existing question input formats including numeric, choice, fraction, comparison, step-error, number-line, and expression-builder.

The existing practice lobby filters subjects as `all | math | english | cs`, and its current registered modes do not provide a complete grade 12 Physics and Chemistry practice catalog. Most Math generators are basic arithmetic or general elementary topics. The journey dataset also includes repeated templates, so it must not be treated as a complete grade 12 bank.

Inspect at minimum:

- `src/practice/core/types.ts`
- `src/practice/core/PracticeRegistry.ts`
- `src/practice/generators/registerAllModes.ts`
- `src/practice/pages/PracticeLobbyPage.tsx`
- `src/practice/pages/PracticeSessionPage.tsx`
- `src/practice/components/PracticeQuestionView.tsx`
- `src/practice/components/PracticeSummaryModal.tsx`
- `src/components/revision/RevisionProgramWizardModal.tsx`
- `src/services/revisionProgramService.ts`
- `src/services/questionBankService.ts`
- `src/pages/admin/QuestionBank.tsx`
- learning activity/mastery/recommendation services
- Firestore rules and indexes that govern any changed data path

## Product Outcome

Create one coherent “Grade 12 Practice Center” where a student can:

1. Choose Math, Physics, Chemistry, or Computer Science.
2. Navigate a curriculum-aligned tree of subject → strand/chapter → topic → skill.
3. See the actual available practice count, format, difficulty, and content status before starting.
4. Start focused practice, mixed review, wrong-answer review, spaced review, or timed exam simulation.
5. Receive useful feedback and a concrete next step after each session.
6. Build and resume a revision plan using real available questions and generators.
7. See progress by topic and skill without interpreting a tiny sample as mastery.

The system must make missing content visible and honest. Never imply “full coverage” when only a few questions exist.

## Curriculum Mapping and Content Taxonomy

Create a versioned curriculum catalog, separate from UI labels and generator implementation. Before defining chapter/topic coverage, inspect the official Vietnamese grade 12 curriculum and current exam format applicable to this project. Record the source, curriculum version, effective year, and date checked in a content metadata document. Do not copy protected questions from commercial books or websites.

The catalog should support:

- subject: `math | physics | chemistry | computer_science`
- grade and optional curriculum/track/version
- chapter/strand, topic, subtopic, and measurable skill/objective
- prerequisites and recommended learning order
- difficulty and cognitive demand, with explicit mappings to the app's existing difficulty model
- supported assessment formats
- content provenance, license, author/reviewer, validation status, version, and publication state
- verified item count and generator availability for each topic/format/difficulty combination

Make taxonomy data-driven and localized. Do not scatter chapter names and subject checks through components.

## Grade 12 Subject Coverage

Build the catalog and practice workflows for all four subjects. Verify topic naming and scope against the project’s intended official curriculum/version before content is published.

### Mathematics

Cover the grade 12 strands and skills that apply to the selected curriculum, including conceptual understanding, symbolic manipulation, graphs, modeling, and multi-step problem solving. Include varied item types such as exact response, single/multiple choice, parameter reasoning, graph/table interpretation, proof/reasoning prompts where supported, and contextual modeling.

### Physics

Create topic families for the applicable grade 12 curriculum, with formula use, unit conversion, graph/data interpretation, experiment reasoning, multi-step quantitative problems, conceptual explanation, and vector/diagram interpretation where appropriate. Every generated numerical question must check units, significant assumptions, valid ranges, and answer tolerance.

### Chemistry

Create topic families for the applicable grade 12 curriculum, with reaction/equation interpretation, stoichiometry, structure/property reasoning, organic/inorganic classification where in scope, data/table analysis, lab and safety reasoning, and multi-step calculations. Validate balancing, conservation, units, and chemical notation. Do not create unsafe practical instructions.

### Computer Science / Tin học

Cover the applicable grade 12 curriculum and exam skills: algorithmic thinking, code tracing, debugging, data structures/representations, complexity at the appropriate level, databases/networks/security concepts where in scope, and practical digital literacy. Support code snippets with correct language/version metadata and tests for expected outputs.

This list is a coverage framework, not permission to invent an official syllabus. Confirm exact strands and exam alignment from the official source selected for the product.

## Question and Exercise Formats

Keep and improve the existing formats:

- single-choice
- numeric/exact response
- fraction/expression response
- comparison
- diagnose the incorrect step
- number line
- expression builder
- code trace/output prediction

Add formats only with a complete typed implementation in the question renderer, answer validator, session state, scoring, summary/review UI, accessibility behavior, and tests:

- multiple-select with explicit partial-credit rules
- true/false with required reasoning where useful
- matching and ordering
- fill-in-the-blank and short constructed response
- unit-aware numeric response with configurable tolerance
- graph, chart, table, or diagram interpretation
- multi-part questions with shared stimulus and independent scoring
- code completion/debugging only where sandbox/security and deterministic checking are well-defined

Do not add a format to the catalog before the full lifecycle works. The UI must clearly tell students what input is expected and how it will be evaluated.

## Question Bank Architecture

Use one normalized question content model or a carefully designed adapter for current generators and authored question documents. Preserve compatibility with the existing `PracticeMode` generator API while allowing catalog filters to select content by subject/topic/skill.

Each question/item should carry stable metadata such as:

- stable ID and content version
- subject, grade, curriculum version, chapter/topic/skill IDs
- type, difficulty, estimated time, and learning objective
- prompt/stimulus, optional media/diagram/code/data table
- typed answer key and validation configuration
- worked explanation, hints, common misconception/distractor rationale
- provenance/license, author/reviewer, validation state, publication status
- generator ID/version/seed metadata when generated
- exposure/attempt policy and duplicate-group ID where needed

Protect answer keys according to the product's assessment integrity requirements. Do not expose private/unpublished answer keys to clients that should not have them.

## Content Quality and Full Bank Validation

Build a content validation pipeline before adding volume:

- detect duplicate IDs, near-duplicate prompts, repeated templates, and accidental repeated parameters
- validate required metadata, valid type-specific answer schema, option counts, unique options, correct answer membership, and explanation presence
- validate formulas, units, rounding, sign conventions, chemistry conservation, and code output with deterministic checkers where possible
- validate that the question matches its displayed topic and claimed difficulty
- include adversarial/edge-case tests for generators and answer normalization
- record reviewed/verified status and keep draft items out of student search
- provide a content coverage report by subject → topic → format → difficulty, distinguishing authored, generated, imported, reviewed, and published counts

Do not inflate quantity by cycling a small set of templates, changing only IDs, or presenting generated variants as unique authored questions. Parameterized generators are welcome when they create mathematically valid, diverse instances and retain generator/version/seed traceability.

## Practice Center UI and Discovery

Redesign or extend `PracticeLobbyPage.tsx` into a clear study workspace:

- subject selector for Math, Physics, Chemistry, Tin học
- search by topic, skill, question format, or learning objective
- filters for grade/curriculum, chapter, difficulty, format, time, and content availability
- an overview of coverage and honest counts, including topics with no content yet
- focused routes: `Continue`, `Practice a topic`, `Review mistakes`, `Spaced review`, `Mixed practice`, `Exam simulation`
- a recently practiced/resume area sourced from existing history
- presets for short sessions (5/10/15/20 questions or minutes) and custom sessions
- mobile-first filter drawer, clear active-filter chips, and reset controls
- accessible loading, empty, offline, and error states

Use compact cards/rows designed for repeated study, not a marketing landing page. Keep the primary learning action obvious without overloading the first screen.

## Revision Ecosystem

Extend `RevisionProgramWizardModal.tsx`, revision task scheduling, and session launch so the plan uses the new catalog:

- choose one or more subjects, topics/skills, difficulty mix, formats, target date, available minutes, and weekly schedule
- offer evidence-based presets: build foundations, target weak skills, review wrong answers, spaced retention, mixed practice, and exam simulation
- preview the actual task types and available item counts before saving
- never promise a task that has no usable content
- select unseen or due items first; avoid repeats until available items are exhausted, then explain when repetition is intentional
- allow pause/resume/edit/reschedule/cancel with idempotent operations and preserved completion history
- include answer explanations and targeted retry after each task
- adapt difficulty gradually from a meaningful sample and expose the rule in student-friendly language
- keep the student’s existing progress and local/offline behavior consistent with server state

Ensure recommendations link to a real catalog selection. Remove hard-coded mappings such as always routing a weak topic to Math `expressions`; use subject/topic/skill IDs and a safe filtered-lobby fallback.

## Student Feedback and Learning Support

For every answer, provide:

- immediate but appropriately timed correctness feedback
- a step-by-step explanation, not only the final answer
- a concise misconception note for common distractors where authored
- a hint path that reveals support progressively without giving away the answer too early
- report-question/content-feedback action, stored through an appropriate moderated workflow
- save/bookmark for later review
- retry similar-but-not-identical questions when verified items exist

After a session, show accuracy with sample size, time, topic-level results, missed/bookmarked items, and a recommended next session. Use confidence labels cautiously; do not label mastery from a handful of questions.

## Progress and Analytics

Track progress by stable topic/skill IDs across practice modes:

- attempted, correct, recent accuracy, last practiced, and sample size
- item exposure to prevent repeated questions
- spaced-review due date using a documented, testable scheduling policy
- learning activity writes idempotently
- dashboards explain how the recommendation was derived

Do not use unsupported claims about learning science or make deterministic predictions from sparse evidence. Treat timezone/date handling explicitly, preferably with the user’s local study date where the existing architecture allows it.

## Firestore Cost, Security, and Offline Behavior

- Reuse the existing read-cost audit work and avoid duplicate reads between lobby, history, revision plans, and mastery summaries.
- Load only the selected subject/topic/session content. Use bounded pagination and query-side filtering rather than whole-collection reads and client filtering.
- Cache public/versioned catalog metadata separately from per-student progress; invalidate it predictably.
- Scope every private query by authenticated UID and enforce ownership in Firestore rules. Guest mode must not query private collections.
- Distinguish successful empty server results from failed requests so stale local data does not resurrect completed/deleted records.
- Avoid one Firestore read per question during a session. Load a bounded session batch or generate locally from trusted deterministic generators.
- Avoid writing progress after every keystroke/interaction. Persist on meaningful boundaries with idempotent IDs and recoverable local draft state.
- Include expected query/document counts in the implementation summary and do not claim savings that the query shape does not support.
- Keep content authorization and answer-key integrity intact.

## Content Authoring and Operations

Extend the admin question-bank workflow only as needed to support:

- browse taxonomy and content coverage gaps
- author/edit questions using type-specific validation
- import/export a documented JSON schema with validation report
- batch review/publish/unpublish with audit metadata
- preview as a student on mobile and desktop
- versioning and rollback for content changes
- track provenance/license and reviewer sign-off
- identify broken media, invalid formulas, duplicate content, and unsupported item formats

Do not allow bulk import to bypass validation or publish draft content by default.

## Implementation Strategy

Deliver this in vertical slices, with quality and functional coverage before raw item volume:

1. Audit current practice modes, catalog filters, question formats, revision flows, and subject coverage. Produce an honest baseline report.
2. Define versioned curriculum taxonomy and normalized metadata with official source references.
3. Implement validation and coverage reporting; fix current repeated/mismatched journey questions and bad category routing.
4. Add the four-subject practice catalog and make all new question modes end-to-end usable.
5. Connect revision plans and mistake review to actual available items.
6. Improve the student UI for discovery, session feedback, accessibility, and mobile.
7. Add content authoring/import workflows and documentation if required to grow/maintain the bank.
8. Verify Firestore rules, indexes, cost, account separation, offline behavior, and migration compatibility.

When the scope is too large for a single pass, complete a working, high-quality slice for all four subjects first, then report exactly which chapters/formats are covered and which remain. Never claim the whole syllabus is complete if it is not.

## Verification

Add focused tests for:

- question schema and catalog validation
- generator determinism, range validity, answer correctness, and duplicate avoidance
- all input formats and answer normalization
- scoring and partial-credit policies
- topic selection and recommendation routing
- revision scheduling, repeat control, and timezone boundaries
- account scoping and read/query bounds where testable
- UI states for empty, unavailable, loading, offline, and errors

Run `npm run lint`, `npm run test`, and `npm run build`. Manually verify at 320px and desktop widths, light/dark themes, keyboard-only interaction, reduced motion, MathJax/LaTeX, code snippets, and all four subject flows.

## Acceptance Criteria

- Students can navigate a grade 12 catalog for Math, Physics, Chemistry, and Tin học.
- Each published topic shows real, validated counts and supported formats.
- All four subject flows can start a session, submit answers, show explanations, complete, and appear in review/history.
- Revision plans only schedule content that exists and is eligible.
- Wrong-answer and spaced-review routes select relevant items and explain their selection.
- Existing elementary practice modes remain available and correctly categorized.
- Content validators detect structural and high-risk correctness issues before publication.
- No repeated-template bank is represented as complete coverage.
- No cross-student data exposure, unbounded Firestore reads, or answer-key leaks are introduced.
- Existing exams, submissions, student progress, and practice history continue to work.
- UI works at 320px, supports keyboard/screen readers, and handles long Vietnamese text, formulas, diagrams, units, and code.
- The handoff includes actual published item counts by subject/topic/type, outstanding coverage gaps, and read-cost changes.

## Do Not Do

- Do not replace the current practice engine with a second disconnected engine.
- Do not bulk-generate low-quality questions to make the catalog look full.
- Do not copy copyrighted exam-bank content without a compatible license.
- Do not invent official curriculum requirements; cite the selected authoritative curriculum source in the content docs.
- Do not claim mastery from too few attempts or make unsupported motivational/statistical claims.
- Do not change existing scoring or exam submission behavior without an explicit migration and regression coverage.
- Do not add a large dependency unless the current architecture cannot support a required interaction.
