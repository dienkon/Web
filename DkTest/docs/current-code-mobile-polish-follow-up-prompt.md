# English Prompt: Follow-up Mobile UI Polish and Feature Upgrade for the Current DkTEST Journey

You are a senior React 19 + TypeScript + Tailwind CSS engineer working inside the existing DkTEST repository. This is a follow-up pass after a large learning journey implementation already exists. Read the current code and preserve its behavior before editing anything.

## Current Implementation Already Present

The current code already includes:

- `src/pages/student/LearningJourney.tsx` with roadmap mode and gamified 3D mode.
- `src/components/common/RevealOnScroll.tsx` using `IntersectionObserver`.
- `src/features/journey/components/World3DViewport.tsx` with camera controls, floating islands, subjects, quality profiles, particles, and reduced motion.
- `src/features/journey/components/NodeDetailPanel.tsx` for selected node actions.
- `src/features/journey/components/AccessibleJourneyView.tsx` for a 2D accessible journey.
- daily missions, collectibles, atlas, campaigns, constellation, expeditions, journal, discovery events, settings, companion, and progress replay features.
- learning intelligence services for activities, stats, revision programs, tasks, recommendations, and topic mastery.
- light/dark theme classes across most journey components.

The current TypeScript check passes with `npm run lint`. Do not discard the existing work or reimplement features that already exist.

## Read These Files First

Read the current implementations and their imports before making changes:

- `src/pages/student/LearningJourney.tsx`
- `src/components/common/RevealOnScroll.tsx`
- `src/features/journey/components/World3DViewport.tsx`
- `src/features/journey/components/NodeDetailPanel.tsx`
- `src/features/journey/components/AccessibleJourneyView.tsx`
- `src/features/journey/components/StudyCompanionWidget.tsx`
- `src/components/revision/RevisionProgramWizardModal.tsx`
- all components under `src/features/journey/components/`
- `src/context/ThemeContext.tsx`
- `src/index.css`
- the journey types and services used by `LearningJourney.tsx`

## Findings to Address From the Current Code

Treat these as concrete follow-up problems to verify and fix:

1. `LearningJourney.tsx` applies `select-none` to the entire page root. Students should still be able to select and copy learning text, explanations, journal content, and recommendations.
2. `World3DViewport.tsx` uses fixed viewport heights of `600px` and `650px`, which is excessive on short phones and can push the primary action far below the fold.
3. `NodeDetailPanel.tsx` uses a full-height right-side panel with `w-full max-w-md`; on mobile it needs a bottom-sheet or full-screen mobile presentation with safe-area padding and internal scrolling.
4. `StudyCompanionWidget.tsx` is fixed near the bottom-right and can cover primary mobile actions or the browser navigation area.
5. The top action area in `LearningJourney.tsx` contains many buttons and can become crowded or wrap poorly on narrow screens.
6. `AccessibleJourneyView.tsx` has small filter controls and dense rows that need stronger touch sizing and better wrapping on phones.
7. `RevisionProgramWizardModal.tsx` contains dense four-column and seven-column controls that need to remain readable and tappable at 320px.
8. `RevealOnScroll.tsx` currently uses `pointer-events-none` while hidden. Preserve the reveal behavior, but ensure it cannot make important content inaccessible if an observer is delayed or unavailable.
9. `LearningJourney.tsx` owns a very large amount of state and data loading. Improve boundaries and derived selectors only when it reduces real complexity; do not perform a risky full rewrite.
10. Theme support is much better, but audit remaining hard-coded dark visual values and special surfaces in the current files. Do not break intentionally dark code-preview styles or immersive decorative layers.

## Primary Goal

Make the current learning journey feel excellent on mobile while preserving desktop quality, existing Firestore behavior, existing routes, quiz progression, and all current journey features.

## Mobile Layout Requirements

Test at 320px, 360px, 390px, 414px, 768px, and a desktop width.

- The document must have no horizontal overflow.
- The page root must use responsive padding and must not disable text selection globally.
- Keep a clear mobile order: current goal, primary action, subject/mode controls, 3D journey, supporting widgets.
- Collapse secondary header actions into a compact overflow menu or an accessible horizontally scrollable action row.
- Keep labels readable. Prefer wrapping, `min-w-0`, and flexible children over forced truncation.
- Do not make important information smaller than 12px.
- All icon-only and compact controls must have at least a 44x44px effective touch target.
- Use `100dvh` where viewport height is required and respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
- Do not rely on hover states. Provide touch, keyboard, and screen-reader equivalents.

## 3D Viewport and Node Interaction

Improve `World3DViewport.tsx` without changing the `Journey3DNode` contract or existing callbacks:

- Replace fixed mobile height with a responsive `clamp()` or breakpoint-based height that remains usable but does not dominate a phone screen.
- Keep the current node and route direction visible after the map loads.
- Keep zoom, reset, and focus-current controls reachable with one thumb.
- Ensure touch panning does not hijack normal vertical page scrolling. Use deliberate pointer/touch behavior and test on a narrow viewport.
- Use `balanced` or `low` rendering behavior on small or low-capability devices when no explicit user preference exists. Preserve a saved explicit quality preference.
- Reduce formulas, shadows, glows, and animation work on low/fallback quality.
- Keep all node labels inside the viewport. If a label cannot fit, use a compact visual label and expose the full topic in the selected detail panel.
- Preserve light mode as a genuinely bright readable scene and dark mode as an immersive scene.

## Mobile Node Detail Sheet

Update `NodeDetailPanel.tsx` responsively:

- Desktop: keep a right-side panel.
- Mobile: use a bottom sheet or full-screen panel with `max-h-[100dvh]`, internal scrolling, and safe-area bottom padding.
- Keep the primary action visible without requiring a long scroll when practical.
- Add dialog semantics, an accessible close button, Escape handling, focus containment, and focus restoration to the triggering node.
- Prevent background scrolling while open and always restore the body state during cleanup.
- Do not place interactive buttons inside another clickable node container.

## Companion and Floating UI

Update `StudyCompanionWidget.tsx` for mobile:

- Keep it out of the way of the selected-node action, fixed bottom actions, and browser safe area.
- Add a compact mobile minimized state by default when screen width is small.
- Avoid covering content with a large fixed panel.
- Preserve its preferences, guidance generation, accessibility, and existing local-storage behavior.
- Respect reduced motion and avoid continuously running animation when minimized or disabled.

## Modal and Wizard Responsiveness

Audit every current journey modal and `RevisionProgramWizardModal.tsx`:

- Use `max-h-[100dvh]` and an internal scroll region on mobile.
- Convert suitable dialogs to bottom sheets below the `md` breakpoint.
- Keep close controls visible while content scrolls.
- Replace dense fixed grids such as seven weekday columns with a responsive layout that still keeps each option at a comfortable touch size.
- Ensure form inputs, date fields, checkboxes, and wizard footer actions do not overflow at 320px.
- Preserve validation, loading, error, and empty states.

## Reveal Animation Follow-up

Keep `RevealOnScroll` lightweight and accessible:

- Keep `IntersectionObserver`; do not introduce scroll polling.
- Preserve layout space before reveal to avoid content jumps.
- If hidden content is `pointer-events-none`, prove that delayed or unsupported observers cannot strand important content. A safe fallback must reveal content immediately.
- Respect both `prefers-reduced-motion` and the existing `reducedMotion` setting.
- Avoid stacking large delays on a long page, especially on mobile. Use a short stagger only for closely related items.
- Do not animate fixed overlays, dialog focus targets, or the primary action in a way that harms usability.

## New Features That Fit the Current Architecture

Add only features that derive from existing state/services. Do not invent Firestore fields, fake progress, or duplicate quiz logic.

### 1. Mobile Continue Bar

Add a dismissible mobile-only `Continue learning` bar near the top of the journey:

- Derive its target from the current level, selected node, today's tasks, and existing recommendations.
- Show one action, estimated time, and a short reason such as `Mục tiêu hiện tại` or `Ôn lại vì độ chính xác thấp`.
- It must not cover the 3D map or companion widget.
- Persist only dismissal state if needed, with a versioned local-storage key.

### 2. Focus Session Mode

Add an optional focused study session for the current node:

- Show the selected subject, node title, estimated time, and a simple local countdown/progress indicator.
- Keep the existing quiz route and completion flow unchanged.
- Allow pause, resume, and exit. Do not punish the student for exiting.
- Respect reduced motion and do not require a backend schema change.

### 3. Milestone Recap

After a level, checkpoint, or boss completion, show a concise recap using existing data:

- what was completed
- accuracy or progress already available
- the next unlocked or recommended destination
- one clear next action

Keep it as a reusable presentation component with useful empty-data behavior. Do not fabricate scores.

### 4. Mobile Map Overview

Add a small accessible overview control for the 3D journey:

- indicate current location, completed range, and the next checkpoint
- allow quick jump to current node or checkpoint
- keep the existing accessible 2D view as the full fallback
- do not introduce a second conflicting navigation system

## Architecture and Performance Rules

- Keep public props and existing data contracts stable.
- Extract small presentational components or selectors from `LearningJourney.tsx` only where ownership becomes clearer.
- Memoize derived values and stable callbacks where they prevent real child re-renders.
- Do not add state that duplicates `currentLevel`, recommendations, topic mastery, tasks, missions, or node data.
- Avoid calling `loadRoadmapData()` more often than necessary. Preserve cancellation/stale-response safety if loading can overlap.
- Clean up intervals, observers, pointer listeners, body scroll locks, and media-query listeners.
- Do not change Firestore rules/schema or unrelated admin, exam, auth, AI, and escape-room behavior.
- Prefer existing dependencies and native browser APIs. Do not add a heavy animation or 3D library.

## Accessibility Requirements

- Every dialog has correct dialog semantics, a labelled title, keyboard close support, and focus restoration.
- Every icon-only button has an accessible name.
- Color is not the only signal for locked, current, completed, or review states.
- Focus indicators remain visible in light and dark themes.
- Text selection remains possible for educational content.
- Touch interactions have keyboard equivalents where the action matters.
- Reduced motion removes transforms, bounce, pulse, and nonessential animated effects.

## Verification Checklist

Run:

- `npm run lint`
- `npm run build`

Manually verify:

- light and dark themes at desktop and mobile widths
- 320px layout with no horizontal scrollbar
- subject switcher and action toolbar
- 3D panning, zooming, reset, current-node focus, and node selection
- mobile node detail sheet and modal close/focus behavior
- companion minimized and expanded states
- revision wizard at 320px
- accessible 2D view
- reduced-motion and fallback quality
- existing quiz start/completion behavior and learning-data refresh

## Do Not Do

- Do not rewrite `LearningJourney.tsx` wholesale.
- Do not remove existing modals, accessible mode, companion, missions, roadmap, or 3D interactions.
- Do not change Firestore schema or invent server data.
- Do not force every feature into a fixed bottom navigation bar.
- Do not use `overflow-hidden` as a shortcut that clips content or focus rings.
- Do not hide important content only because it is difficult to fit on mobile.
