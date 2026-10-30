/** Radius/height contours of the lathed glass meshes, in model-local units.
 * Kept independent of Three.js so containment and rendering share one shape. */
export type ContourPoint = readonly [radius: number, y: number];
const point = (radius: number, y: number): ContourPoint => [radius, y];
export function vesselContours(type: string): { outer: ContourPoint[]; inner: ContourPoint[] } {
  const outerPoints: ContourPoint[] = [];
  const innerPoints: ContourPoint[] = [];

  if (type === 'beaker') {
    // Beaker: y from -1.0 to 1.0, r = 1.0
    outerPoints.push(point(0, -1.0));
    outerPoints.push(point(0.92, -1.0));
    outerPoints.push(point(1.0, -0.95));
    outerPoints.push(point(1.0, 0.95));
    outerPoints.push(point(1.04, 1.0)); // Rim bead

    innerPoints.push(point(0, -0.96));
    innerPoints.push(point(0.965, -0.96));
    innerPoints.push(point(0.965, 0.98));
  } else if (type === 'flask') {
    // Erlenmeyer Flask: y from -1.0 to 1.5, rBase = 1.25, rNeck = 0.38
    outerPoints.push(point(0, -1.0));
    outerPoints.push(point(1.16, -1.0));
    outerPoints.push(point(1.25, -0.95));
    outerPoints.push(point(0.38, 0.7));
    outerPoints.push(point(0.38, 1.45));
    outerPoints.push(point(0.42, 1.5)); // Flared rim bead

    innerPoints.push(point(0, -0.96));
    innerPoints.push(point(1.215, -0.96));
    innerPoints.push(point(0.35, 0.7));
    innerPoints.push(point(0.35, 1.48));
  } else if (type === 'volumetric_flask') {
    // Volumetric Flask: pear/bulbous bottom with very tall, narrow neck
    outerPoints.push(point(0, -0.95));
    outerPoints.push(point(0.65, -0.95));
    outerPoints.push(point(1.05, -0.65));
    outerPoints.push(point(1.08, -0.2));
    outerPoints.push(point(0.65, 0.35));
    outerPoints.push(point(0.19, 0.65));
    outerPoints.push(point(0.18, 1.85));
    outerPoints.push(point(0.24, 1.95)); // Flared ground glass mouth

    innerPoints.push(point(0, -0.91));
    innerPoints.push(point(0.62, -0.91));
    innerPoints.push(point(1.01, -0.63));
    innerPoints.push(point(1.04, -0.2));
    innerPoints.push(point(0.62, 0.35));
    innerPoints.push(point(0.16, 0.65));
    innerPoints.push(point(0.15, 1.92));
  } else if (type === 'separatory_funnel') {
    // Separatory Funnel: conical pear-shaped body tapering to narrow stopcock stem
    outerPoints.push(point(0.09, -1.25)); // Lower drip stem
    outerPoints.push(point(0.09, -0.55));
    outerPoints.push(point(0.18, -0.45)); // Stopcock bulge
    outerPoints.push(point(0.22, -0.25));
    outerPoints.push(point(0.92, 0.45));  // Conical flare
    outerPoints.push(point(0.96, 0.85));  // Bulb curve
    outerPoints.push(point(0.32, 1.40));  // Shoulder
    outerPoints.push(point(0.26, 1.70));  // Neck
    outerPoints.push(point(0.32, 1.78));  // Rim

    innerPoints.push(point(0.06, -1.25));
    innerPoints.push(point(0.06, -0.55));
    innerPoints.push(point(0.14, -0.45));
    innerPoints.push(point(0.18, -0.25));
    innerPoints.push(point(0.88, 0.45));
    innerPoints.push(point(0.92, 0.85));
    innerPoints.push(point(0.28, 1.40));
    innerPoints.push(point(0.22, 1.76));
  } else if (type === 'filter_funnel') {
    // Filter Funnel: 60° conical funnel bowl on top of narrow delivery stem
    outerPoints.push(point(0.10, -1.15));
    outerPoints.push(point(0.10, -0.15));
    outerPoints.push(point(0.18, -0.05));
    outerPoints.push(point(0.96, 0.85));
    outerPoints.push(point(1.02, 0.92));

    innerPoints.push(point(0.07, -1.15));
    innerPoints.push(point(0.07, -0.15));
    innerPoints.push(point(0.14, -0.05));
    innerPoints.push(point(0.92, 0.85));
    innerPoints.push(point(0.96, 0.90));
  } else if (type === 'mortar_pestle') {
    // Mortar: heavy thick-walled ceramic hemispherical basin
    outerPoints.push(point(0, -0.65));
    outerPoints.push(point(0.72, -0.65));
    outerPoints.push(point(0.85, -0.55));
    outerPoints.push(point(1.02, 0.20));
    outerPoints.push(point(1.06, 0.32)); // Heavy rim

    innerPoints.push(point(0, -0.42));
    innerPoints.push(point(0.55, -0.38));
    innerPoints.push(point(0.78, 0.05));
    innerPoints.push(point(0.84, 0.30));
  } else if (type === 'condenser') {
    // Liebig Condenser: outer water cooling sleeve with inner straight vapor tube
    outerPoints.push(point(0.16, -1.25));
    outerPoints.push(point(0.16, -0.90));
    outerPoints.push(point(0.38, -0.80));
    outerPoints.push(point(0.38, 1.25));
    outerPoints.push(point(0.16, 1.35));
    outerPoints.push(point(0.16, 1.65));
    outerPoints.push(point(0.20, 1.70));

    innerPoints.push(point(0.12, -1.25));
    innerPoints.push(point(0.12, 1.68));
  } else if (type === 'wash_bottle') {
    // Wash bottle: flexible translucent PE bottle body
    outerPoints.push(point(0, -0.95));
    outerPoints.push(point(0.68, -0.95));
    outerPoints.push(point(0.74, -0.85));
    outerPoints.push(point(0.74, 0.75));
    outerPoints.push(point(0.30, 1.15));
    outerPoints.push(point(0.28, 1.35));
    outerPoints.push(point(0.32, 1.40));

    innerPoints.push(point(0, -0.91));
    innerPoints.push(point(0.65, -0.91));
    innerPoints.push(point(0.70, -0.83));
    innerPoints.push(point(0.70, 0.74));
    innerPoints.push(point(0.26, 1.14));
    innerPoints.push(point(0.24, 1.38));
  } else if (type === 'test_tube_rack' || type === 'tongs') {
    // Cylindrical base profile for rack/tongs mount
    outerPoints.push(point(0, -0.2));
    outerPoints.push(point(0.85, -0.2));
    outerPoints.push(point(0.85, 0.2));
    innerPoints.push(point(0, -0.15));
    innerPoints.push(point(0.8, -0.15));
    innerPoints.push(point(0.8, 0.18));
  } else if (type === 'test_tube') {
    // Test Tube: radius 0.22, bottom dome around (0, -0.6), cylinder up to 1.2
    const r = 0.22;
    const domeSamples = 12;

    for (let i = 0; i <= domeSamples; i++) {
      const angle = (i / domeSamples) * (Math.PI / 2);
      const px = Math.sin(angle) * r;
      const py = -0.6 - Math.cos(angle) * r;
      outerPoints.push(point(px, py));
    }
    outerPoints.push(point(r, 1.16));
    outerPoints.push(point(r + 0.025, 1.2));

    const rIn = 0.20;
    for (let i = 0; i <= domeSamples; i++) {
      const angle = (i / domeSamples) * (Math.PI / 2);
      const px = Math.sin(angle) * rIn;
      const py = -0.6 - Math.cos(angle) * rIn + 0.02;
      innerPoints.push(point(px, py));
    }
    innerPoints.push(point(rIn, 1.18));
  } else if (type === 'watch_glass') {
    // Watch Glass: shallow spherical cap, r ~ 1.05, slight curvature
    const samples = 14;
    const maxR = 1.05;
    const depth = 0.18;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const r = t * maxR;
      const y = -depth * (1.0 - t * t);
      outerPoints.push(point(r, y));
    }
    outerPoints.push(point(maxR + 0.025, 0.02));

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const r = t * (maxR - 0.02);
      const y = -depth * (1.0 - t * t) + 0.025;
      innerPoints.push(point(r, y));
    }
  } else if (type === 'evaporating_dish') {
    // Evaporating Dish: spherical porcelain bowl with wide open mouth
    const samples = 16;
    for (let i = 0; i <= samples; i++) {
      const theta = (i / samples) * (Math.PI * 0.44); // ~80 degrees
      const r = Math.sin(theta) * 1.12;
      const y = -0.42 + (1.0 - Math.cos(theta)) * 0.72;
      outerPoints.push(point(r, y));
    }
    outerPoints.push(point(1.16, 0.35)); // Pour rim

    for (let i = 0; i <= samples; i++) {
      const theta = (i / samples) * (Math.PI * 0.43);
      const r = Math.sin(theta) * 1.06;
      const y = -0.38 + (1.0 - Math.cos(theta)) * 0.69;
      innerPoints.push(point(r, y));
    }
  } else if (type === 'crucible') {
    // Porcelain Crucible: tapered tall ceramic cup
    outerPoints.push(point(0, -0.65));
    outerPoints.push(point(0.38, -0.65));
    outerPoints.push(point(0.44, -0.58));
    outerPoints.push(point(0.68, 0.48));
    outerPoints.push(point(0.72, 0.52)); // Top lip

    innerPoints.push(point(0, -0.60));
    innerPoints.push(point(0.34, -0.60));
    innerPoints.push(point(0.40, -0.55));
    innerPoints.push(point(0.64, 0.50));
  } else if (type === 'petri_dish') {
    // Petri Dish: shallow flat glass dish with vertical rim
    outerPoints.push(point(0, -0.22));
    outerPoints.push(point(1.10, -0.22));
    outerPoints.push(point(1.15, -0.18));
    outerPoints.push(point(1.15, 0.20));
    outerPoints.push(point(1.18, 0.22));

    innerPoints.push(point(0, -0.18));
    innerPoints.push(point(1.08, -0.18));
    innerPoints.push(point(1.10, -0.15));
    innerPoints.push(point(1.10, 0.21));
  } else if (type === 'burette') {
    // Burette: long narrow glass tube, r = 0.14
    const r = 0.14;
    outerPoints.push(point(0, -1.8));
    outerPoints.push(point(r - 0.02, -1.8));
    outerPoints.push(point(r, -1.78));
    outerPoints.push(point(r, 1.8));
    outerPoints.push(point(r + 0.02, 1.82));

    const rIn = 0.12;
    innerPoints.push(point(0, -1.78));
    innerPoints.push(point(rIn, -1.78));
    innerPoints.push(point(rIn, 1.82));
  } else {
    // Graduated Cylinder: y from -0.9 to 1.7, r = 0.35
    const r = 0.35;
    outerPoints.push(point(0, -0.9));
    outerPoints.push(point(r - 0.04, -0.9));
    outerPoints.push(point(r, -0.86));
    outerPoints.push(point(r, 1.65));
    outerPoints.push(point(r + 0.035, 1.7));

    const rIn = 0.325;
    innerPoints.push(point(0, -0.87));
    innerPoints.push(point(rIn, -0.87));
    innerPoints.push(point(rIn, 1.68));
  }

  return { outer: outerPoints, inner: innerPoints };
}

export function vesselOuterDimensions(type: string): {
  topY: number;
  bottomY: number;
  rimRadius: number;
  baseRadius: number;
  height: number;
} {
  const { outer } = vesselContours(type);
  const bottomY = outer[0][1];
  const topY = outer[outer.length - 1][1];
  const rimRadius = outer[outer.length - 1][0];
  const basePoints = outer.filter(([, y]) => y <= bottomY + 0.26);
  const baseRadius = Math.max(...basePoints.map(([r]) => r), outer[1]?.[0] ?? outer[0][0]);
  return {
    topY,
    bottomY,
    rimRadius,
    baseRadius,
    height: topY - bottomY
  };
}
