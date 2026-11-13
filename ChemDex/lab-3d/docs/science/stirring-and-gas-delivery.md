# Stirring, gas delivery and precipitate rendering

The manual and automatic benches share a finite-core azimuthal carrier and its
pressure surface. The automated rod now supplies mechanical agitation to the
physical manager. Merely drawing a rod does not authorize a vortex or create
new precipitate. Idle water also gets a physical manager when stirring starts.

## Carrier and free surface

Lengths in `LiquidVortex` are vessel-model units; angular speeds are rad/s.
`metersPerModelUnit(profile)` converts the pressure head to physical units.
The regularized carrier is `v_theta = omega*r/(1+r²/a²)`, with a core radius
`a = 0.28R`. Radial momentum balance gives `dh/dr = v_theta²/(g*r)`, hence
`h(r) = c + A*r²/(a²+r²)` and `A = omega²*a²*metersPerModelUnit/(2g)`.
The centre offset preserves the existing liquid volume: an analytic disk mean
for straight beakers/cylinders, contour-split quadrature and bisection for other
reservoir shapes. No liquid is added or removed to draw the depression.

This pressure balance follows [MIT's rotating-liquid problem](https://ocw.mit.edu/courses/2-25-advanced-fluid-mechanics-fall-2013/1a6c09ad948d72b23e18872e3913370d_MIT2_25F13_Shapi1.14_Solu.pdf)
and [MIT's balanced-vortex discussion](https://weathertank.mit.edu/links/projects/balanced-vortex-introduction/balanced-vortex-theory).
The finite-core velocity profile, normalized rod control and spin-up/down
response are reduced modeling choices; no measured hand torque or RPM is inferred.

The same state drives the rendered surface height/normal, liquid clipping,
particle carrier velocities, particle containment and bubble surface contacts.
Spin decays after stirring stops. Suspended parcels retain their gravitational
slip and Brownian/flocculation models. Dense stock additionally feels buoyancy,
relative-velocity drag, viscous torque and floor friction, instead of receiving
a prescribed orbit. The manual bench retains Rapier contacts; the isolated
automatic bench uses coarse equivalent stock spheres.

The model is axisymmetric and upright. It is not a Navier–Stokes solver and does
not resolve turbulent breakup, an air core, multiphase interfacial shear or
stirring-induced overflow. Both angular carrier speed and head are bounded
together near the floor/rim; ice and dry residues cannot be stirred as liquid.

## Gas reagents

Liquid/solid loading precedes gas connection. Gas sources are stationary,
metered syringes on supports, connected to valved hoses and glass inlet tubes;
they never enter bottle-lift/tilt/pouring animations. The receiver cap is placed
before gas delivery, with separate inlets and an exhaust opening. Aqueous
receivers use a submerged inlet; dry gas reactions use a headspace inlet.
The quantity delivered is the same finite molar inventory used by chemistry.
Flow and inlet bubble glyphs stop when that inventory is exhausted or paused.
The displayed ambient gas volume uses the ideal-gas relation.

[University of York's teaching laboratory](https://chemtl.york.ac.uk/techniques/air-sensitive/gas-lines/sources)
describes gas sources connected through delivery lines; [RSC's technician notes](https://edu.rsc.org/download?ac=515965)
illustrate gas syringes and delivery tubing. Apparatus positions and valve
choreography are educational representations, not an experimentally calibrated
gas-pressure/line-residence solver. Lines are treated as preconditioned metered
delivery paths; hose elasticity, dead volume and gas absorption along the hose
are not additional chemical sources.

## Precipitates

The automatic bench uses the same species profiles and geometry as the manual
bench: hydrated gel, flocs, fine powder, granular precipitate or crystals only
when the formation route specifies crystallization. Each batch reads actual
solid inventory through the existing precipitation manager. Its finite
represented mass must equal the corresponding free-solid ledger (attached
metal deposits remain on their substrate). New product is
localized at the actual liquid/solid contact or gas-inlet position.

The receiver liquid now uses the actual glass contour, not a smaller cylinder.
Its dissolved supernatant color and suspended-solid scattering are separate;
settled material does not permanently tint clear supernatant. Optical depth
attenuates submerged glyphs rather than painting them over the opaque surface.
Glyph size, opacity and morphology are visual approximations and do not imply
measured particle-size distributions or experimental accuracy of every catalog
reaction. The existing reviewed chemistry/equilibrium models remain authoritative.

## Verification

- `tests/liquid_vortex.test.ts`: pressure balance, increasing depression with
  stirring, spin-down, volume preservation, divergence, curved containment.
- `tests/vortex_stock_motion.test.ts`: SI carrier, Rapier momentum response,
  finite stock mass, pause and non-orbiting dry solids.
- `tests/auto_gas_delivery.test.ts`: gas reagents in the complete catalog use
  stationary sources, closed valves outside delivery and immersed wet inlets.
- `scripts/auditLabFluidAndGasBrowser.mjs`: actual GPU shaders and screenshots,
  weak/strong stirring, rotating submerged gel, headspace and submerged gas
  delivery, and manual rod/intensity/pause behavior.
- `scripts/auditAutoExperiments.ts`: all automatic chemistry/effects pipelines,
  finite mass accounting and independent workbench state.
