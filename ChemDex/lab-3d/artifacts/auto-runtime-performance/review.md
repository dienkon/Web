# Automatic runtime performance baseline

Source revision: `1d2d935a`. No source files changed. CPU profile sampling interval: 100 microseconds. The benchmark drives existing `AutoExperiment.tick(1/60)`; it excludes React, WebGL, worker messaging, GPU and browser scheduling. These are CPU timings, not FPS claims.

| Case | Effects | Steps | Mean (ms/tick) | p95 (ms/tick) |
| --- | --- | ---: | ---: | ---: |
| 50 mL water, initially 95 C | off | 2400 | 0.394 | 0.866 |
| 50 mL water, initially 95 C | on | 1200 | 0.454 | 0.866 |
| Cu(OH)2 precipitate, post-reaction | off | 2400 | 0.598 | 1.119 |
| Cu(OH)2 precipitate, post-reaction | on | 1200 | 1.361 | 2.161 |
| CaCO3/HCl active reaction | off | 2400 | 0.793 | 1.488 |
| CaCO3/HCl active reaction | on | 1200 | 4.968 | 8.812 |

All runs reached expected complete/observe state, no runtime error, maximum material-accounting deviation below 6e-14 g.

## Findings

- Water/wall routing dominates the hot-water and precipitate-tail logic (about 0.21 and 0.32 ms/tick inclusive respectively). The finite film transport, wall thermal coupling and preview of water returning to the sample are the main costs.
- `projectAqueousSolution` costs approximately 0.029 / 0.046 / 0.030 ms per tick in the three logic scenarios. The two calls are not an Auto-only accidental duplicate: manual `useAppStore` also projects before wall routing and after wall/condenser return, because returned water and its heat can alter concentration and pH. Removing the final call without checking exact changed inputs is incorrect.
- Six phase-model probes cost about 0.009 / 0.035 / 0.007 ms/tick. They usually return null but collectively are a small fraction of current cost. Hoisting the phase-model array alone would not explain a large speedup.
- CaCO3/HCl with actual physical stock is dominated by `AutoStockDynamics.advance` (~54% inclusive), Rapier stepping and repeated stock/liquid-contact geometry. It is not primarily a wall/pH regression. No physics time or substeps should be dropped to improve these timings.

## Concrete bounded optimization candidate

`transportWallBeads` always receives an exterior condensation boundary, even when the exterior film is empty and ambient vapor pressure is below saturation at the dry wall. The current path seeds/copies 48 empty sites, allocates a geometry cache, runs two 120 Hz substeps and invokes finite-film condensation despite the exact boundary being unable to add water. Direct repeated calls at 25 C and 88 C cost 0.0098–0.0103 ms each and return zero retained/condensed/drained/evaporated mass.

An exact dry-boundary fast path can skip those transport loops only after validation proves: zero current film, zero direct deposit, valid boundary and no possible positive dry condensation (zero supply, zero region, insufficient enthalpy or nonpositive condensation flux). Preserve all returned diagnostics and empty-site positions, including malformed-boundary behavior. This helps both manual and automatic simulations, with expected savings of only several microseconds/tick; do not advertise a large FPS gain.

Required parity checks before accepting: exact output parity across dry warm/cold walls, zero/finite vapor supply, changing fill height, pre-existing malformed or zero-mass beads, first wet nucleation after dry frames; existing wet/boiling/drainage/energy tests unchanged. Full auto fixtures above must retain ledger, temperature, pH, phase, wall energy, clocks and output-array parity. The candidate was subsequently implemented and verified as recorded below.


## Implemented result

The exterior dry/no-supply path now returns the exact initialized bead layout and diagnostics after boundary validation. Inner walls, nonempty films, actual deposition and potential positive condensation continue through the existing transport integrator.

Alternating same-process A/B (eight rounds; no profiling overhead):

| Work | Baseline median | Optimized median | Ratio |
| --- | ---: | ---: | ---: |
| Dry 25 C exterior transport | 8.97 us | 6.19 us | 1.45x |
| Dry 88 C exterior transport | 8.99 us | 5.71 us | 1.57x |
| Complete hot-water Auto tick | 0.2904 ms | 0.2827 ms | 1.027x |
| Complete Cu(OH)2-tail Auto tick | 0.4733 ms | 0.4624 ms | 1.023x |
| Complete CaCO3/HCl Auto tick | 0.7075 ms | 0.6946 ms | 1.019x |

Wet-path micro timings varied in both directions by approximately 3-7%; no wet-path speed claim. Fourteen baseline fixtures match every serialized output field, including bead coordinates, heat/latent diagnostics and unsupported-boundary handling. Three Auto cases, each with eight alternating pairs of 600 fixed ticks, match the complete sample, phase, progress, clock and accounted-mass state exactly. Regression: 100 tests across seven wall/film/return-energy files passed. Results are a modest CPU improvement, not a browser FPS measurement.
