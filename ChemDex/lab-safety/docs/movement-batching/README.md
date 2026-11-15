# Movement and render batching checks

`node scripts/test-player-motion.mjs` validates equal acceleration/stopping distance
at 20/30/60/120 FPS, analog joystick speed, diagonal normalization, exact wall
contact, obstacle sweeps, smooth stool sliding, and sprint hysteresis.

`P0_CDP_ORIGIN=http://127.0.0.1:9225 node scripts/test-static-batching-browser.mjs`
uses a local Chromium CDP instance and the Vite server on port 3000. It renders
the mobile scene at 844×390 and tests real stool/drawer motion, finite buffers,
raycast proxies, material separation, excluded deformed meshes, and ownership
of disposed resources. `before.json` is the pre-change room sample;
`after.json` contains final checks and an A/B render of the same live scene,
temporarily showing original meshes instead of their merged geometry.

These are draw-call and correctness measurements, not a hardware-mobile FPS
guarantee. Batching preserves geometry detail but can submit more off-screen
triangles because a merged object has a larger culling bound.
