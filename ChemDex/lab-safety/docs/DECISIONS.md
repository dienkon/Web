# Architectural Decisions: Lab Safety 3D ("Bright White Lab")

## 1. State Management & Per-Frame Performance
- **Decision:** Keep player position and camera target in shared mutable vectors/refs (`playerTransformRef`) instead of pushing coordinates to Zustand at 60 Hz.
- **Rationale:** React component tree renders will only fire on discrete state transitions (task complete, rule violation, dialog state, item equip), maintaining 60 FPS on mobile devices.

## 2. Asset Pipeline & Offline Resilience
- **Decision:** Bundle font definitions and procedural 3D fallbacks (RoundedBox, Lathe, Extrude primitives) for every GLB model and texture.
- **Rationale:** Zero downtime or blank screens if large GLB assets fail to load or take excessive time over mobile 3G/4G networks.

## 3. UI System & Design Tokens
- **Decision:** Strictly light theme ("Bright White Lab") with clean CSS variables (`--bg`, `--surface`, `--ink`, `--primary`, `--danger`, `--warning`, `--mandatory`, `--safe`).
- **Rationale:** Maximizes readability and matches modern laboratory aesthetics.

## 4. Mobile & Orientation Support
- **Decision:** Support both portrait and landscape orientation natively. Never block the user with an undismissible lock screen; instead adapt HUD layouts gracefully.

## 5. Deployment & Routing (Vercel & ChemDex Suite)
- **Decision:** Use `base: './'` in `vite.config.ts` for both `lab-safety` and `lab-3d` to guarantee seamless asset loading under `/lab-safety/`, `/lab-3d/`, or `/lab/` proxies.
- **Decision:** Create a dedicated, vibrant animated 404 page (`404.html`) in ChemDex root for unmatched paths.
