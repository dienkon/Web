# English Prompt: Fix UI Theme, 3D Island Journey, Reveal-on-Scroll, and System Optimization

You are a senior React/TypeScript frontend engineer working in the existing DkTEST Vite app.

## Context

The project is a React 19 + Vite + Tailwind CSS v4 app. The learning journey page already exists at:

- `src/pages/student/LearningJourney.tsx`
- `src/features/journey/components/World3DViewport.tsx`
- `src/context/ThemeContext.tsx`
- `src/components/ui/ThemeToggle.tsx`
- `src/index.css`

The app already supports `light`, `dark`, and `system` theme modes through `ThemeContext`, which toggles the `html.dark` class. However, several journey UI components are hard-coded as dark surfaces, especially the 3D world viewport and several journey modals. The goal is to make the whole interface correctly adapt to light and dark mode, build a polished 3D floating-island learning journey, add progressive block reveal effects while scrolling, and optimize rendering/performance without changing the core data model.

## Main Goals

1. Fix broken theme behavior so the interface is fully bright in light mode and fully dark in dark mode.
2. Redesign the 3D learning journey as a floating-island expedition path with polished subject-specific visual atmospheres.
3. Add progressive reveal-on-scroll animations so each major block appears smoothly as the user scrolls down.
4. Optimize the system for performance, maintainability, mobile responsiveness, accessibility, and reduced-motion support.

## Files to Inspect First

Read these files before editing:

- `src/context/ThemeContext.tsx`
- `src/components/ui/ThemeToggle.tsx`
- `src/pages/student/LearningJourney.tsx`
- `src/features/journey/components/World3DViewport.tsx`
- `src/features/journey/types/journey3D.ts`
- All modal/widget components under `src/features/journey/components/`
- `src/index.css`
- `package.json`

## Theme Fix Requirements

Make all journey UI components respect light/dark mode:

- Remove hard-coded always-dark shells such as `bg-slate-950`, `bg-slate-900`, `text-slate-100`, and `border-slate-800` where they appear in components that should support light mode.
- Replace them with paired classes like:
  - `bg-white dark:bg-slate-900`
  - `bg-slate-50 dark:bg-slate-950`
  - `text-slate-900 dark:text-white`
  - `text-slate-600 dark:text-slate-300`
  - `border-slate-200 dark:border-slate-800`
- Ensure the 3D world viewport is bright and readable in light mode. It should not remain a black/dark space when the app theme is light.
- Keep dark mode immersive, but do not force dark mode inside modals or journey widgets.
- Audit these journey components especially:
  - `World3DViewport.tsx`
  - `AccessibleJourneyView.tsx`
  - `CooperativeExpeditionsModal.tsx`
  - `DiscoveryEventsModal.tsx`
  - `DiscoveryJournalModal.tsx`
  - `JourneyModesModal.tsx`
  - `JourneySettingsModal.tsx`
  - `KnowledgeConstellationModal.tsx`
  - any other journey modal with hard-coded dark backgrounds.
- Preserve existing Vietnamese UI copy unless a label is clearly broken.
- Do not introduce a new theme framework. Use the existing `html.dark` + Tailwind `dark:` approach.

## 3D Floating-Island Journey Requirements

Improve `World3DViewport.tsx` into a more convincing 3D island expedition:

- Keep the existing `Journey3DNode[]` data contract.
- Keep node interactions:
  - click/select node
  - current node focus
  - zoom in/out
  - reset camera
  - quality profiles: `high`, `balanced`, `low`, `fallback`
  - `reducedMotion`
  - `ambientParticles`
- Make each level feel like a floating island/block on a vertical journey path:
  - completed islands: green/teal, confident, unlocked
  - current island: brighter accent, active beacon, clear CTA feel
  - locked islands: muted but still visible
  - checkpoints: larger monument-style island
  - boss/final node: strongest visual hierarchy
- Add layered island depth:
  - top land/platform
  - underside/shadow
  - soft ground shadow
  - path ribbon/bridge connecting islands
  - subtle atmospheric background
- The subject atmosphere should adapt in both light and dark modes:
  - math: indigo/blue/cyan, clean academic energy
  - physics: sky/cyan/electric accents
  - chemistry: amber/orange/emerald lab accents
- Avoid a single-color UI. Use restrained accent colors over neutral surfaces.
- Use CSS transforms for depth where practical. Avoid heavy WebGL unless the existing architecture already uses it.
- The viewport should be responsive:
  - desktop: rich 3D path with side widgets
  - tablet: comfortable spacing and no clipped controls
  - mobile: controls wrap cleanly, no text overlap, viewport height feels usable
- Ensure no labels or buttons overflow their containers.
- Do not place cards inside cards unnecessarily.

## Reveal-on-Scroll Requirements

Add progressive reveal animations for major screen blocks while scrolling down:

- Add a reusable solution, for example:
  - `src/hooks/useRevealOnScroll.ts`, or
  - a small `RevealOnScroll` component under `src/components/common/`.
- Use `IntersectionObserver`, not scroll event polling.
- Animate major blocks in `LearningJourney.tsx`, such as:
  - top header
  - mode switcher/toolbars
  - 3D world viewport
  - daily missions
  - leaderboard
  - roadmap stats
  - today tasks
  - recommendations
  - topic mastery map
  - timeline
- Use subtle motion:
  - fade in
  - translateY from 12-24px
  - optional small scale from `0.98`
  - staggered delays for nearby blocks
- Respect reduced motion:
  - if `prefers-reduced-motion: reduce` or the journey `reducedMotion` setting is active, content should appear immediately with no movement.
- Keep animations CSS-based and cheap.
- Avoid layout shifts. Revealed blocks should reserve their normal space before becoming visible.

## System Optimization Requirements

Optimize without changing product behavior:

- Avoid unnecessary re-renders in `LearningJourney.tsx`.
- Memoize expensive derived data where useful:
  - journey node generation
  - leaderboard fallback/sorting helpers if extracted
  - subject theme objects in `World3DViewport`
- Use stable callbacks with `useCallback` for functions passed deeply into components where it helps.
- Avoid inline allocation inside large lists where reasonable.
- For `World3DViewport`, reduce expensive effects on low/fallback quality:
  - fewer/no particles
  - fewer shadows/glows
  - simpler transforms
  - disable nonessential animations
- Ensure timers and event listeners are cleaned up correctly.
- Keep Firestore/network behavior unchanged unless there is a clear bug.
- Do not refactor unrelated exam, auth, admin, or AI features.

## Accessibility Requirements

- Keep keyboard accessibility for buttons and modal close controls.
- Add useful `aria-label`s for icon-only controls.
- Preserve visible focus styles.
- Ensure color contrast works in both light and dark mode.
- Ensure reduced-motion users are respected.
- Do not rely on color alone to communicate locked/current/completed state.

## Visual Acceptance Criteria

Light mode:

- The journey page background is bright.
- Panels, modals, controls, atlas, journal, modes, settings, constellation, events, and expedition UIs are not stuck in dark mode.
- The 3D viewport has a bright sky/atmosphere and readable controls.
- Text remains high contrast.

Dark mode:

- The UI remains immersive and readable.
- No bright surfaces appear accidentally without matching dark styles.
- Borders and shadows are subtle, not muddy.

3D journey:

- Floating islands/blocks are visually distinct.
- The current level is immediately obvious.
- Completed/locked/checkpoint/boss states are easy to understand.
- The route path feels continuous from one island to the next.

Scroll reveal:

- Blocks appear progressively as the user scrolls.
- No content jumps or overlaps.
- Reduced motion disables movement.

Performance:

- `npm run lint` passes.
- `npm run build` passes.
- The page remains smooth when panning/zooming the journey map.
- Mobile viewport has no horizontal overflow.

## Implementation Notes

- Prefer small, focused edits over a full rewrite.
- Keep existing component names and public props unless absolutely necessary.
- If adding helper utilities, keep them scoped and simple.
- Use existing dependencies. The project already has `motion`, but prefer native CSS + IntersectionObserver unless `motion` is already a better local fit.
- Avoid adding new packages.
- Use Tailwind classes and small custom CSS in `src/index.css` when needed.

## Suggested Implementation Plan

1. Audit journey components for hard-coded dark classes and convert them to paired light/dark classes.
2. Update `World3DViewport.tsx` theme objects to include both light and dark atmosphere values.
3. Improve island visuals and route/path styling while preserving interactions.
4. Add reusable reveal-on-scroll helper/component and CSS utilities.
5. Wrap major `LearningJourney.tsx` sections with the reveal helper.
6. Apply reduced-motion handling.
7. Optimize memoization/callbacks where it reduces real work.
8. Run `npm run lint` and `npm run build`.
9. Manually verify `/student/learning-journey` or the app route that renders `LearningJourney` in both light and dark mode.

## Do Not Do

- Do not replace the app theme system.
- Do not remove existing journey features or modals.
- Do not change Firestore schema or user progress storage.
- Do not rewrite unrelated pages.
- Do not add heavy 3D libraries for this task.
- Do not leave any journey component permanently dark in light mode unless it is intentionally a small decorative preview and still readable.

## Mobile UI Optimization Requirements

Treat mobile as a first-class journey experience, not a compressed desktop layout. Verify at minimum at 320px, 360px, 390px, 414px, and 768px widths.

### Layout and navigation

- Remove accidental horizontal overflow from the page, toolbars, modal content, and the 3D viewport.
- Do not use fixed desktop widths for the main journey surface. Use `w-full`, responsive max-widths, and safe horizontal padding.
- Keep the page header compact. On narrow screens, allow title/meta content to wrap naturally and move secondary actions into an overflow menu or a horizontally scrollable action row with hidden scrollbar.
- Make the subject switcher and journey mode switcher usable with one hand. If a segmented control cannot fit, make it horizontally scrollable instead of shrinking text until it becomes unreadable.
- Preserve a clear mobile reading order: current progress and primary action first, map second, supporting widgets after it.
- Keep the most important action visible after a node is selected. Use a mobile bottom action bar or bottom sheet when appropriate, but do not cover the browser safe area or the selected node.
- Respect `env(safe-area-inset-bottom)` for fixed mobile controls.

### Touch targets and interaction

- Make all interactive controls at least 44x44 CSS pixels, including icon-only buttons, close buttons, map controls, and carousel controls.
- Add `aria-label` and tooltip/title text for unfamiliar icon-only actions.
- Do not rely on hover states. Every hover-only affordance must have a touch and keyboard equivalent.
- Avoid nested click targets. A selectable node card must not contain another button that accidentally triggers the parent.
- Do not use `select-none` on the entire page. Preserve text selection for descriptions, questions, journal entries, and learning content; use it only on draggable map surfaces if needed.
- Ensure panning does not block vertical page scrolling on touch devices. Use deliberate pointer/touch behavior and provide a visible reset/recenter control.

### Mobile 3D journey

- Use a stable responsive viewport height such as `clamp(...)`, with a shorter but still usable height on phones.
- Keep the current node, route direction, and selected-node feedback visible at small sizes.
- Scale or simplify labels before they collide. Never let level titles, badges, or buttons overlap.
- On low-end/mobile devices, default to `balanced` or `low` quality when appropriate, while preserving the user's explicit setting.
- Prefer a focused single-node detail sheet on mobile instead of showing a wide side panel.
- Make the map usable without precision dragging: tapping a node must select it, and explicit buttons must provide zoom, reset, and next-node navigation.

### Mobile modal and sheet behavior

- On phones, full-screen modals should use `max-h-[100dvh]`, internal scrolling, and a visible close action.
- Convert suitable detail modals into bottom sheets below the `md` breakpoint. The sheet must have a visible drag/handle affordance only if a real drag interaction is implemented.
- Lock background scrolling while a modal is open and restore focus to the triggering element when it closes.
- Support `Escape`, focus containment, and screen-reader dialog semantics.
- Do not place a modal inside a transformed ancestor if that breaks fixed positioning.

### Mobile visual polish

- Use fewer simultaneous borders, shadows, badges, and gradients on small screens. Keep hierarchy clear with spacing and typography.
- Avoid text smaller than 12px for important information. Long Vietnamese labels must wrap instead of overflowing.
- Use `min-w-0`, `break-words`, and flexible grid/flex children where needed so content can shrink safely.
- Keep sticky/fixed elements visually distinct from the page without creating a second card inside a card.
- Check light mode and dark mode separately on a real narrow viewport. A light theme must not become a low-contrast gray-on-white interface.

## New Product Features to Add Carefully

Add only features that can be implemented with existing local state, existing journey services, and the current data contracts. Do not invent Firestore fields or fake server responses. If persistence is needed but no service exists, use a small versioned local-storage preference with safe parsing and a clear fallback.

### 1. Continue Learning rail

Add a compact `Continue learning` block near the top of the journey page:

- Show the next recommended node, estimated time, subject, and the reason it is recommended.
- Prefer the current unlocked node; otherwise use the first incomplete mission or a `needs_revision` node with weak accuracy.
- Provide one primary action: `Continue` or the existing equivalent action.
- On mobile, keep this block above the 3D map and make it easy to resume with one thumb.
- Derive it from existing `Journey3DNode`, `JourneyMission`, and progress state. Do not create another source of truth.

### 2. Smart review queue

Add a small `Review next` view based on existing accuracy, attempt count, `needs_revision`, and `insufficient_evidence` states:

- Explain why each item is recommended, such as low accuracy, repeated mistakes, or not enough evidence.
- Limit the first view to 3 items and provide a `View all` action.
- Reuse existing question/level routes and do not duplicate quiz logic.
- Use neutral language. Never make a student feel punished for needing review.

### 3. Journey focus mode

Add a focus mode that temporarily declutters the page:

- Keep only the selected subject, current node, progress, primary action, and essential map controls.
- Hide secondary widgets without losing their state.
- Persist the preference only if the existing settings pattern supports it.
- Provide an obvious exit action and preserve keyboard/screen-reader access.

### 4. Lightweight progress snapshot

Add a small progress snapshot action that opens a shareable/read-only summary of current journey progress:

- Include completed levels, current subject, streak/progress values already available in the page, and next goal.
- Prefer the Web Share API when available and provide a clipboard fallback.
- Never expose private student identifiers or unrelated profile data.
- If sharing is unavailable, the feature should still work as a copy-to-clipboard action.

### 5. Mobile quick actions

On mobile, expose a compact quick-action surface for the most-used actions already present in `LearningJourney`:

- continue current node
- open missions
- open journal or review
- open settings

Use icons plus short labels, keep the surface dismissible, and avoid duplicating every desktop action. Do not add a second competing navigation system.

## New Feature Architecture Rules

- Prefer derived selectors/helpers over additional duplicated React state.
- Keep new UI components small and colocated under `src/features/journey/components/`.
- Keep persistence keys versioned and safely parsed.
- Keep all new features compatible with `accessibleMode`, `reducedMotion`, light/dark themes, and narrow screens.
- Add focused tests for any new selector or service logic, especially recommendation ordering and local-storage parsing.
- If a feature cannot be completed without a backend/schema change, implement the presentation and a clearly safe no-data state, then document the limitation instead of fabricating data.

## Anti-Pattern Audit Before Completion

Before declaring the work complete, explicitly audit and fix:

- hard-coded dark surfaces or light-only text in journey components
- desktop-only widths, clipped toolbars, and horizontal page overflow
- buttons below 44px touch size
- `select-none` applied to content that students may need to copy
- hover-only interaction
- nested interactive elements
- animation that runs when `prefers-reduced-motion` is enabled
- timers, observers, pointer listeners, and body scroll locks that are not cleaned up
- duplicated recommendation/progress state that can drift from the existing journey data
- modal focus, Escape handling, and focus restoration
- low contrast in both themes

## Additional Acceptance Criteria

- At 320px width, the page has no horizontal scrollbar and no clipped primary action.
- A student can open, use, and close every journey modal with touch, keyboard, and a screen reader.
- A selected 3D node has a readable detail action on mobile without requiring precise dragging.
- The `Continue learning`, `Review next`, focus mode, and snapshot features have useful empty/loading/error states.
- Existing campaign, mission, journal, collectible, companion, constellation, and expedition features still open and behave as before.
- Existing Firestore writes, routes, and quiz progression remain unchanged.
- Run `npm run lint` and `npm run build`, then manually verify light/dark at desktop and mobile widths.

