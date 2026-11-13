# Contact-local color and interior smoke

Both liquid renderers sample the same small 3D optical field (a 12³ RGBA atlas).
Its endpoint comes from the actual dissolved-species/color model and suspended
solid inventory. New appearance starts at the recorded contact point: an
entraining jet, finite dispersion and the existing vortex transport it through
the receiver. The field retains its history after pouring stops. Incoming
colored stock can remain briefly visible in the fresh jet even when its reaction
product is colorless; the color disappears downstream instead of replacing the
whole vessel's material color at once. Clear regions also lose absorption alpha.

The field advances at 30 Hz in simulation time, pauses with the experiment and
skips idle uniform samples. A byte atlas with linear RGB requires only 6.75 KiB
and works with a regular 2D sampler. The liquid body and meniscus use the same
atlas, before lighting and tone mapping. The old global vertical color wipe and
temporary colored overlay have been removed. Automatic aliquots mix their bulk
optics rather than assigning the entire donor stock color to the receiver.

White NH₄Cl is sampled from newly produced solid inventory, not invented gas.
These optical parcels now start at contact inside the headspace. Their opacity
and size grow with age; the vessel walls, liquid level and lid constrain them.
A dry NH₄Cl floor film follows a finite optical deposition/residence partition
instead of displaying all newly formed aerosol as an opaque floor disk at once.
A sealed vessel without an explicit outlet retains them. With the drawn vent
in the automatic apparatus, parcels first approach the hole below the lid and
then travel through the tube before entering the room. The same parcel leaves
the chamber, so no second cloud source replays the material. Colored retained
gases can also appear inside sealed vessels; colorless gases never become smoke.

This location follows teaching demonstrations in which ammonia and hydrogen
chloride form white ammonium chloride where their gas fronts meet, inside the
apparatus: [UW–Madison demonstration](https://demolab.chem.wisc.edu/general-chemistry-demonstrations-topic-page/gases-rate-of-diffusion-the-ammonium-chloride-ring-2/)
and [University of Colorado demonstration](https://www.colorado.edu/lab/lecture-demo-manual/g420-grahams-law-diffusion-nh3-and-hcl-diffusion).

These are reduced optical transport and residence-time models. Their mixing
coefficients, deposition opacity, parcel sizes and transit times are illustrative, not measured
diffusivities, particle distributions or pressure/vent flow predictions. They
do not change reaction stoichiometry, finite inventory, equilibrium or configured
chemical kinetics. Fast local reactions remain fast: gradual bulk appearance
comes from transport and accumulation, not an arbitrary delay to every reaction.

Verification: `tests/spatial_reaction_appearance.test.ts` covers local coloration,
bleaching, fresh colored feed, suspended-product opacity, pause, fixed-time
invariance, sealed confinement and finite delayed venting. The browser audit
`scripts/auditContactReactionAppearance.mjs` checks the actual automatic and manual
shaders, contact colors and successive interior/vent smoke screenshots.
