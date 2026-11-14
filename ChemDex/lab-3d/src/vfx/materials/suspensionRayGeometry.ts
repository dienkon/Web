/** Ray clipping against the same piecewise-linear contour as the glass. The
 * vortex surface gives a cubic along a ray: derivative roots isolate every
 * monotone interval, including two separated wet lobes across an air core.
 * Only extinction sampling remains a coarse quadrature; clipping does not
 * turn narrow wet intervals into all-or-nothing midpoint samples. */
export const SUSPENSION_RAY_GEOMETRY = `
  void integrateSuspensionRange(vec3 origin, vec3 ray, float nearT, float farT,
      float nominalStep, inout float transmission, inout vec3 scattered) {
    float length = farT - nearT;
    if (length <= 0.00000001) return;
    int samples = int(clamp(ceil(length / max(0.00000001, nominalStep)), 1.0, 12.0));
    float ds = length / float(samples);
    for (int j = 0; j < 12; j++) {
      if (j >= samples || transmission < 0.00001) break;
      vec3 q = origin + ray * (nearT + (float(j) + 0.5) * ds);
      vec4 optics = uHasSuspensionAtlas ? sampleAppearanceAtlas(uSuspensionAtlas, q)
        : vec4(uAppearanceSuspension, 1.0) * -log(max(0.0001, 1.0 - sampleLiquidAppearance(q).a));
      float alpha = 1.0 - exp(-optics.a * ds * uOpticalPathScale);
      scattered += transmission * alpha * optics.rgb / max(0.000001, optics.a);
      transmission *= 1.0 - alpha;
    }
  }
  float cubicValue(vec4 c, float t) { return ((c.x * t + c.y) * t + c.z) * t + c.w; }
  void integrateWetSuspension(vec3 origin, vec3 ray, float nearT, float farT,
      float nominalStep, inout float transmission, inout vec3 scattered) {
    if (uAppearanceVortex.w < 0.5) {
      float depth = uAppearanceSurface.w - dot(uAppearanceSurface.xyz, origin);
      float slope = dot(uAppearanceSurface.xyz, ray);
      if (slope > 0.00000001) farT = min(farT, depth / slope);
      else if (slope < -0.00000001) nearT = max(nearT, depth / slope);
      else if (depth < 0.0) return;
      integrateSuspensionRange(origin, ray, nearT, farT, nominalStep, transmission, scattered);
      return;
    }
    float length = farT - nearT;
    if (length <= 0.00000001) return;
    vec3 p = origin + ray * nearT, d = ray * length;
    float a = dot(d.xz, d.xz), b = 2.0 * dot(p.xz, d.xz), r2 = dot(p.xz, p.xz);
    float h = uAppearanceVortex.z - p.y, k = uAppearanceVortex.x;
    float amplitude = uAppearanceVortex.y;
    vec4 c = vec4(-d.y * a, (h + amplitude) * a - d.y * b,
      (h + amplitude) * b - d.y * (k + r2), h * (k + r2) + amplitude * r2);
    // Normalize coefficients before testing degeneracy; dimensions vary greatly
    // between a burette, a shallow dish and a broad flask.
    c /= max(0.000000000001, max(max(abs(c.x), abs(c.y)), max(abs(c.z), abs(c.w))));
    float cut1 = 1.0, cut2 = 1.0;
    float qa = 3.0 * c.x, qb = 2.0 * c.y, qc = c.z;
    if (abs(qa) < 0.0000001) {
      if (abs(qb) > 0.0000001) { float t = -qc / qb; if (t > 0.0 && t < 1.0) cut1 = t; }
    } else {
      float discriminant = qb * qb - 4.0 * qa * qc;
      if (discriminant >= 0.0) {
        float root = sqrt(discriminant);
        float t1 = (-qb - root) / (2.0 * qa), t2 = (-qb + root) / (2.0 * qa);
        float lo = min(t1, t2), hi = max(t1, t2);
        if (lo > 0.0 && lo < 1.0) cut1 = lo;
        if (hi > 0.0 && hi < 1.0) { if (cut1 < 1.0) cut2 = hi; else cut1 = hi; }
      }
    }
    float cuts[4]; cuts[0] = 0.0; cuts[1] = cut1; cuts[2] = cut2; cuts[3] = 1.0;
    for (int j = 0; j < 3; j++) {
      float lo = cuts[j], hi = cuts[j + 1];
      if (hi <= lo) continue;
      bool wetLo = cubicValue(c, lo) >= 0.0, wetHi = cubicValue(c, hi) >= 0.0;
      if (!wetLo && !wetHi) continue;
      if (wetLo != wetHi) {
        float left = lo, right = hi;
        for (int n = 0; n < 18; n++) {
          float mid = 0.5 * (left + right);
          if ((cubicValue(c, mid) >= 0.0) == wetLo) left = mid; else right = mid;
        }
        if (wetLo) hi = 0.5 * (left + right); else lo = 0.5 * (left + right);
      }
      integrateSuspensionRange(origin, ray, nearT + lo * length, nearT + hi * length,
        nominalStep, transmission, scattered);
    }
  }
  vec4 integrateVesselSuspension(vec3 origin, vec3 ray, float enter, float leave) {
    float transmission = 1.0; vec3 scattered = vec3(0.0);
    float nominalStep = max(0.00000001, leave - enter) / 12.0;
    for (int j = 0; j < 31; j++) {
      if (j >= uAppearanceContourCount - 1 || transmission < 0.00001) break;
      int index = ray.y < 0.0 ? uAppearanceContourCount - 2 - j : j;
      vec2 low = uAppearanceContour[index], high = uAppearanceContour[index + 1];
      if (high.y <= low.y) continue;
      float nearT = enter, farT = leave;
      if (abs(ray.y) < 0.00000001) {
        // Half-open slabs prevent double-counting a horizontal ray on a seam.
        if (origin.y < low.y || origin.y >= high.y) continue;
      } else {
        float ta = (low.y - origin.y) / ray.y, tb = (high.y - origin.y) / ray.y;
        nearT = max(nearT, min(ta, tb)); farT = min(farT, max(ta, tb));
      }
      if (farT <= nearT) continue;
      // Work relative to the clipped slab, keeping quadratic coefficients near
      // the vessel instead of at a remote camera position.
      vec3 p = origin + ray * nearT;
      float slope = (high.x - low.x) / (high.y - low.y);
      float radius = low.x + slope * (p.y - low.y), dr = slope * ray.y;
      float qa = dot(ray.xz, ray.xz) - dr * dr;
      float qb = dot(p.xz, ray.xz) - radius * dr;
      float qc = dot(p.xz, p.xz) - radius * radius;
      float start = 0.0, end = farT - nearT;
      if (abs(qa) < 0.0000001) {
        if (abs(qb) < 0.0000001) { if (qc > 0.0) continue; }
        else if (qb > 0.0) end = min(end, -qc / (2.0 * qb));
        else start = max(start, -qc / (2.0 * qb));
      } else {
        float discriminant = qb * qb - qa * qc;
        if (discriminant < 0.0) { if (qa > 0.0) continue; }
        else {
          float root = sqrt(discriminant);
          float t1 = (-qb - root) / qa, t2 = (-qb + root) / qa;
          if (qa > 0.0) { start = max(start, min(t1, t2)); end = min(end, max(t1, t2)); }
          else if (dr > 0.0) start = max(start, max(t1, t2));
          else end = min(end, min(t1, t2));
        }
      }
      if (end > start) integrateWetSuspension(origin, ray, nearT + start, nearT + end,
        nominalStep, transmission, scattered);
    }
    return vec4(scattered / max(0.000001, 1.0 - transmission), 1.0 - transmission);
  }
`;
