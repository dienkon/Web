# Audit Report: Lab Safety 3D Simulator

**Date:** 2026-10-07  
**Scope:** Architecture, Performance Hotspots, Critical Bugs & Asset Pipeline  

---

## 1. Executive Summary
The existing Lab Safety application is a React 19 + Three.js (@react-three/fiber 9, drei 10, zustand 5) interactive educational experience. While functional at a basic level, the codebase suffers from severe render loop bottlenecks, unconstrained re-renders, fragile mobile UX, and monolithic component structures (such as `LabEnvironment.tsx` at 2,267 lines).

---

## 2. Confirmed Bugs & Architectural Defects

1. **60 Hz Full-Scene Re-render Bottleneck:**
   - In `ThirdPersonController.tsx` (L159), `setPlayerPosition([nextX, ...])` updates Zustand on every animation frame.
   - In `InteractableItem.tsx` (L43), `useStore()` is called without selectors (`const { ... } = useStore() as any`).
   - In `LabEnvironment.tsx` (L634), the entire 2,267-line component subscribes directly to `playerPosition`.
   - **Impact:** The entire React virtual DOM tree inside the 3D canvas recalculates at ~60 Hz, causing frame drops and mobile thermal throttling.

2. **Undismissible "Rotate to Landscape" Overlay:**
   - In `App.tsx` (L78-L107), mobile portrait triggers a full-screen blocking overlay with no dismiss/continue option. On iOS/Safari (where `screen.orientation.lock` is unsupported), users can get completely locked out.

3. **Development Skip Buttons Leaked into Production:**
   - In `HUD.tsx` (L185), a `<button>DEV: Skip</button>` is rendered unconditionally in production.

4. **Faulty Error Tracking in Store:**
   - In `useStore.ts` (L94), `addError(ruleId: number, penalty: number = 5)` accepts `ruleId` but never saves or tracks it, preventing review of specific student mistakes.

5. **External CDN Font Dependency:**
   - In `LabEnvironment.tsx` (L8), `VIETNAMESE_FONT` fetches from `https://cdn.jsdelivr.net/gh/google/fonts@master/ofl/bevietnampro/BeVietnamPro-Medium.ttf`. This causes network lag, offline failure, and CORS risks.

6. **Dead Code & Unused Controllers:**
   - `FirstPersonController.tsx` is completely unreferenced and unused.

7. **Missing Asset Graceful Fallback:**
   - References to GLB assets (`/teacher.glb`, `player.glb`) must have reliable procedural fallbacks to ensure zero-crash operations on asset loading failure.

8. **Deployment Configuration Mismatch:**
   - `lab-safety/vite.config.ts` lacked a relative `base: './'`, causing assets to point to root `/assets/...` instead of `/lab-safety/assets/...` on sub-path deployments like Vercel.

---

## 3. Remediation Roadmap
- **Sprint 1 (Architecture & Perf):** Move player transforms to transient refs / vectors; use granular Zustand selectors; remove dead code (`FirstPersonController`); bundle fonts; fix `base` in Vite config.
- **Sprint 2 (Design System & UI Overhaul):** Implement "Bright White Lab" theme tokens, full Vietnamese i18n (`src/i18n/vi.ts`), responsive HUD (portrait + landscape), Character Creator, and dismissible modals.
- **Sprint 3 (3D Environment & Interaction System):** Decompose `LabEnvironment`, implement the Action Machine framework, realistic pouring/heating/pipetting/extinguisher systems.
- **Sprint 4 (Effects & Audio):** Particle pooling, procedural WebAudio SFX, fire, foam, spill, broken glass, eyewash, and certification.
