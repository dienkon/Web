# stillwater

A quiet, interactive Three.js landscape with a grassy field, a textured ball, and a responsive water pond. Built with vanilla JavaScript and Vite.

## Run locally

Use Node.js 20.19+ or 22.12+ and a modern browser with WebGL 2 and hardware acceleration enabled. From this directory:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite, normally `http://127.0.0.1:5173/`.

```sh
npm run build     # Production files in dist/
npm run preview   # Preview the production build
npm test          # Ball physics regression tests
```

## Controls

| Action                      | Input                                                |
| --------------------------- | ---------------------------------------------------- |
| Pick up and move the ball   | Drag the ball with a mouse or touch                  |
| Throw the ball              | Move it, then release; faster movement adds momentum |
| Orbit the camera            | Drag the landscape                                   |
| Zoom                        | Scroll or pinch                                      |
| Drop the ball into the pond | **Drop into pond** or **Space**                      |
| Reset the ball              | **Reset ball** or **R**                              |
| Pause/resume the simulation | Pause button or **P**                                |
| Reset the camera            | Camera button                                        |

The environment panel changes the light, wind, and wave intensity. **High / Balanced** changes rendering quality. **Sound** enables synthesized wind, birds, and splash sounds. Keyboard shortcuts are inactive while a form control or the About dialog has focus. On phones, expand **Your little world** to access the environment settings.

## Scene and rendering

- Custom GLSL water shaders combine animated surface waves, impact ripples, moving wakes, planar reflections, distorted refraction, depth-based absorption, and caustic highlights.
- The ball uses a fixed 120 Hz physics step with gravity, bounce, ground friction, water drag, and buoyancy calculated from its submerged volume. Water contact triggers expanding ripples and stronger impacts add splash particles.
- Instanced vegetation, procedural textures, soft shadows, damped camera controls, and Morning, Golden hour, and Dusk lighting form the landscape.
- High quality caps device pixel ratio at 1.5; Balanced starts at a rendering scale of 0.85 and can adapt down to 0.65. Water render targets and vegetation detail also adapt, and reflection/refraction work is staggered across frames. Sustained low frame rates switch to Balanced unless quality was selected manually.

Rendering is tuned toward 60 FPS, but actual performance depends on the GPU, browser, viewport, and display. A steady 60 FPS cannot be guaranteed on every device. Water is a real-time visual simulation with analytical waves and ball buoyancy, rather than a full fluid solver.

## Browser check

Keep `npm run dev` running on port **5173** in one terminal. In a second terminal, from this directory:

```sh
node tests/browser-check.mjs
```

The check exercises ball dragging and throwing, water contact, scene controls, audio, pause, and the mobile layout. It checks browser errors and saves screenshots to `test-results/`.

The script uses system Chrome or Edge at their usual Windows locations. To select another installed browser, set the `CHROME_PATH` environment variable to its executable. If no system browser is found, install Playwright's Chromium and rerun:

```sh
npx playwright install chromium
node tests/browser-check.mjs
```

Google Fonts supplies the optional DM Sans UI font; local system fonts remain available when offline. Scene geometry, textures, and audio are generated locally.
