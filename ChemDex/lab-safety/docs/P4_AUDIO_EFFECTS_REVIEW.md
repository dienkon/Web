# Audio and effects repair

## Root causes and changes

The old CO₂ stop method scheduled a new timer every frame while its playing flag remained true. Those timers referenced mutable source fields and could stop later playback. Fire completion also returned before stopping the active hiss. Spatial audio bypassed the SFX slider and created a second audio context.

Audio now uses one graph with unique keyed loops, immediate ownership release, audio-clock fades/stops, and source-local disconnection on completion. World audio stops on dialogs, pause, blur, menu, task completion, and restart. The SFX slider controls physical sounds and UI cues. User gestures unlock audio; render callbacks do not repeatedly resume the context.

One-shot cues have cooldowns and a 24-voice ceiling. Completed tasks cannot repeatedly emit rewards. Noise buffers are reused. Footsteps use actual distance travelled and stop when movement is blocked. Pin clicks and physical actions use filtered noise; rewards use a brief, quiet accent.

Flames use three animated soft billboards instead of solid cones. Smoke uses radial sprites. The CO₂ pool has 48 expanding, fading particles; it stops emission immediately when simulation/input stops. The lever and recoil follow actual discharge, including touch input.

## Validation

- TypeScript and production build passed.
- 500 start calls created one loop; 500 stop calls did not interfere with a restarted loop.
- Held spray created one hiss source. Dialog, SFX zero, blur, completion, restart and menu checks ended with zero active voices where silence was expected.
- Existing actual fire suppression, full Spill Kit flow, reset, touch spray and tool switching passed.
- No runtime or shader-console errors were recorded.

The updated fire/spray sample measured 78.6 FPS at 1366 × 768 / DPR 1, p95 20.9 ms. This is a short headless-browser sample, not a frame-rate guarantee for all devices.

Evidence: `docs/perf/P4_AUDIO_CHECK.json`, `docs/perf/P3_GAMEPLAY_CHECK.json`, `docs/perf/P3_MOBILE_TOOLS_CHECK.json`. Screenshot: `docs/screens/p3-fire-spray.png`.
