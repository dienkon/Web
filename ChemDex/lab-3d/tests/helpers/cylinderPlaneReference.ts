/** Independent x-direction integral for a cylinder (production integrates y).
 * Splits at floor/top intersections before composite Simpson integration. */
export function cylinderPlaneReference(radius: number, height: number, base: number, nx: number, ny: number, c: number): number {
  const norm = Math.hypot(nx, ny); nx = Math.abs(nx / norm); ny /= norm; c /= norm;
  const knots = [-Math.PI / 2, Math.PI / 2];
  for (const y of [base, base + height]) {
    const x = (c - ny * y) / nx;
    if (x > -radius && x < radius) knots.push(Math.asin(x / radius));
  }
  knots.sort((a, b) => a - b);
  const integrand = (t: number) => {
    const x = radius * Math.sin(t);
    const below = ny === 0 ? (nx * x <= c ? height : 0)
      : Math.max(0, Math.min(height, (c - nx * x) / ny - base));
    return 2 * radius ** 2 * Math.cos(t) ** 2 * (ny < 0 ? height - below : below);
  };
  let volume = 0;
  for (let k = 1; k < knots.length; k++) {
    const a = knots[k - 1], b = knots[k], steps = 4096, dt = (b - a) / steps;
    // Endpoint limits avoid the isolated step at a vertical plane.
    let sum = integrand(a + dt * 1e-7) + integrand(b - dt * 1e-7);
    for (let j = 1; j < steps; j++) sum += integrand(a + j * dt) * (j % 2 ? 4 : 2);
    volume += sum * dt / 3;
  }
  return volume;
}
