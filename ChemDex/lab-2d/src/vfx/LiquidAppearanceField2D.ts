/**
 * 2D Eulerian Spatial Color & Appearance Advection-Diffusion Field (lab-3d LiquidAppearanceField parity).
 *
 * Models localized reagent entry plumes, alkali phenolphthalein ribbons, thermal Rayleigh convection,
 * stirrer vortex rotational swirl, and viscosity-governed Fickian diffusion ("loang màu") inside
 * each 2D vessel, then blits with bilinear hardware smoothing onto Canvas 2D at 60 FPS.
 */

export const FIELD_COLS = 18;
export const FIELD_ROWS = 14;
const FIELD_CELLS = FIELD_COLS * FIELD_ROWS;

export function hexToRgbBytes(hex: string): [number, number, number] {
  const clean = (hex || '#f8fafc').replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 248,
      parseInt(clean[1] + clean[1], 16) || 250,
      parseInt(clean[2] + clean[2], 16) || 252,
    ];
  }
  const num = parseInt(clean.slice(0, 6), 16);
  if (Number.isNaN(num)) return [248, 250, 252];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

let sharedCanvas: HTMLCanvasElement | null = null;
let sharedCtx: CanvasRenderingContext2D | null = null;
let sharedImg: ImageData | null = null;

function getSharedScratch(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; img: ImageData } | null {
  if (typeof document === 'undefined') return null;
  if (!sharedCanvas) {
    sharedCanvas = document.createElement('canvas');
    sharedCanvas.width = FIELD_COLS;
    sharedCanvas.height = FIELD_ROWS;
    sharedCtx = sharedCanvas.getContext('2d');
    if (sharedCtx) {
      sharedImg = sharedCtx.createImageData(FIELD_COLS, FIELD_ROWS);
    }
  }
  if (!sharedCanvas || !sharedCtx || !sharedImg) return null;
  return { canvas: sharedCanvas, ctx: sharedCtx, img: sharedImg };
}

export interface LiquidFieldStepOptions {
  viscosity_mPa_s: number;
  temperature_c: number;
  stirIntensity: number; // 0..1
  isBoiling: boolean;
  isHeated: boolean;
}

export class LiquidAppearanceField2D {
  public readonly r = new Float32Array(FIELD_CELLS);
  public readonly g = new Float32Array(FIELD_CELLS);
  public readonly b = new Float32Array(FIELD_CELLS);
  public readonly a = new Float32Array(FIELD_CELLS);

  private readonly nextR = new Float32Array(FIELD_CELLS);
  private readonly nextG = new Float32Array(FIELD_CELLS);
  private readonly nextB = new Float32Array(FIELD_CELLS);
  private readonly nextA = new Float32Array(FIELD_CELLS);

  private targetR = 248;
  private targetG = 250;
  private targetB = 252;
  private targetA = 0.24;

  public initialized = false;
  public activeDiffusing = false;

  public reset(baseHex = '#f8fafc', alpha = 0.24): void {
    const [cr, cg, cb] = hexToRgbBytes(baseHex);
    this.targetR = cr;
    this.targetG = cg;
    this.targetB = cb;
    this.targetA = alpha;
    this.r.fill(cr);
    this.g.fill(cg);
    this.b.fill(cb);
    this.a.fill(alpha);
    this.initialized = true;
    this.activeDiffusing = false;
  }

  public syncTarget(hex: string, alpha = 0.72): void {
    const [cr, cg, cb] = hexToRgbBytes(hex);
    if (!this.initialized) {
      this.reset(hex, alpha);
      return;
    }
    this.targetR = cr;
    this.targetG = cg;
    this.targetB = cb;
    this.targetA = Math.max(0.16, Math.min(0.96, alpha));
  }

  /**
   * Injects a localized Gaussian reagent plume or streak into the spatial color field
   * around normalized vessel coordinates (normX in 0..1, normY in 0..1).
   */
  public injectPlume(
    normX: number,
    normY: number,
    radiusNorm: number,
    hex: string,
    strength = 0.85,
    plumeAlpha = 0.88
  ): void {
    if (!this.initialized) this.reset('#f8fafc', 0.25);
    const [ir, ig, ib] = hexToRgbBytes(hex);
    const rad = Math.max(0.08, radiusNorm);
    const invTwoSigma2 = 1 / (2 * rad * rad);

    for (let row = 0; row < FIELD_ROWS; row++) {
      const cy = (row + 0.5) / FIELD_ROWS;
      const dy = cy - normY;
      for (let col = 0; col < FIELD_COLS; col++) {
        const cx = (col + 0.5) / FIELD_COLS;
        const dx = cx - normX;
        const d2 = dx * dx + dy * dy;
        const w = Math.min(1, Math.exp(-d2 * invTwoSigma2) * strength);
        if (w < 0.01) continue;
        const idx = row * FIELD_COLS + col;
        this.r[idx] = this.r[idx] * (1 - w) + ir * w;
        this.g[idx] = this.g[idx] * (1 - w) + ig * w;
        this.b[idx] = this.b[idx] * (1 - w) + ib * w;
        this.a[idx] = Math.min(0.96, Math.max(this.a[idx], plumeAlpha * w + this.a[idx] * (1 - w)));
      }
    }
    this.activeDiffusing = true;
  }

  /** Seeds a smooth transition from prevHex bulk background with rich local entry plume at contactX. */
  public seedMixingTransition(
    prevHex: string,
    targetHex: string,
    targetAlpha: number,
    contactXNorm = 0, // -1..1
    plumeHex?: string
  ): void {
    const bulkAlpha = Math.max(0.75, targetAlpha);
    if (!this.initialized) {
      this.reset(prevHex, bulkAlpha);
    } else {
      for (let i = 0; i < FIELD_CELLS; i++) {
        this.a[i] = Math.max(this.a[i], bulkAlpha);
      }
    }
    this.syncTarget(targetHex, targetAlpha);
    const nx = Math.max(0.14, Math.min(0.86, 0.5 + contactXNorm * 0.38));
    const entryHex = plumeHex && plumeHex !== '#f8fafc' ? plumeHex : targetHex;
    // Top impact crown + descending mushroom stem + lateral vortex curl
    this.injectPlume(nx, 0.14, 0.24, entryHex, 0.96, 0.94);
    this.injectPlume(nx + (Math.random() - 0.5) * 0.1, 0.38, 0.2, entryHex, 0.85, 0.9);
    this.injectPlume(nx - contactXNorm * 0.14, 0.58, 0.18, targetHex, 0.72, Math.max(0.8, targetAlpha));
    this.activeDiffusing = true;
  }

  /**
   * Advances Fickian diffusion, Rayleigh thermal convection, stirring rotational vortex advection,
   * and gentle relaxation toward thermodynamic optical equilibrium.
   */
  public step(dt: number, opts: LiquidFieldStepOptions): void {
    if (!this.initialized) return;
    const clampedDt = Math.min(0.05, Math.max(0.001, dt));

    const viscFactor = 0.89 / Math.max(0.35, opts.viscosity_mPa_s || 0.89);
    const tempFactor = 1 + Math.max(0, opts.temperature_c - 20) * 0.028;
    const stir = Math.max(0, Math.min(1, opts.stirIntensity));

    // Dimensionless neighbor diffusion coupling coefficient (strictly stability-clamped <= 0.19)
    const baseD = (0.19 * Math.pow(viscFactor, 0.55) * tempFactor + stir * 0.85 + (opts.isBoiling ? 0.9 : 0)) * clampedDt;
    const D = Math.min(0.185, Math.max(0.005, baseD));

    // Advective swirl strength (rotation + thermal central updraft)
    const swirlVel = stir * 2.6 + (opts.isBoiling ? 1.6 : 0);
    const thermalConvVel = opts.isHeated || opts.temperature_c > 42 ? Math.min(1.6, Math.max(0.15, (opts.temperature_c - 30) * 0.025)) : 0;

    let maxErr = 0;
    const eqRelax = Math.min(0.25, (0.026 * Math.pow(viscFactor, 0.45) * tempFactor + stir * 0.45 + (opts.isBoiling ? 0.55 : 0)) * clampedDt);

    for (let row = 0; row < FIELD_ROWS; row++) {
      const ny = (row + 0.5) / FIELD_ROWS - 0.5;
      const rowUp = Math.max(0, row - 1);
      const rowDn = Math.min(FIELD_ROWS - 1, row + 1);

      for (let col = 0; col < FIELD_COLS; col++) {
        const nx = (col + 0.5) / FIELD_COLS - 0.5;
        const colL = Math.max(0, col - 1);
        const colR = Math.min(FIELD_COLS - 1, col + 1);
        const idx = row * FIELD_COLS + col;

        // 1. 4-neighbor isotropic Laplacian diffusion
        const cR = this.r[idx];
        const cG = this.g[idx];
        const cB = this.b[idx];
        const cA = this.a[idx];

        const lapR = this.r[row * FIELD_COLS + colL] + this.r[row * FIELD_COLS + colR] + this.r[rowUp * FIELD_COLS + col] + this.r[rowDn * FIELD_COLS + col] - 4 * cR;
        const lapG = this.g[row * FIELD_COLS + colL] + this.g[row * FIELD_COLS + colR] + this.g[rowUp * FIELD_COLS + col] + this.g[rowDn * FIELD_COLS + col] - 4 * cG;
        const lapB = this.b[row * FIELD_COLS + colL] + this.b[row * FIELD_COLS + colR] + this.b[rowUp * FIELD_COLS + col] + this.b[rowDn * FIELD_COLS + col] - 4 * cB;
        const lapA = this.a[row * FIELD_COLS + colL] + this.a[row * FIELD_COLS + colR] + this.a[rowUp * FIELD_COLS + col] + this.a[rowDn * FIELD_COLS + col] - 4 * cA;

        // 2. Semi-Lagrangian rotational stirrer + Rayleigh convection advection offset
        let advR = cR + D * lapR;
        let advG = cG + D * lapG;
        let advB = cB + D * lapB;
        let advA = cA + D * lapA;

        if (swirlVel > 0.05 || thermalConvVel > 0.05) {
          // Stirrer circular flow + upward core convection / wall sink
          const uVel = -ny * swirlVel + (ny < 0 ? nx * thermalConvVel * 0.5 : -nx * thermalConvVel * 0.35);
          const vVel = nx * swirlVel * 0.7 - (0.35 - Math.abs(nx)) * thermalConvVel;
          const srcCol = Math.max(0, Math.min(FIELD_COLS - 1, Math.round(col - uVel * clampedDt * 8)));
          const srcRow = Math.max(0, Math.min(FIELD_ROWS - 1, Math.round(row - vVel * clampedDt * 8)));
          const srcIdx = srcRow * FIELD_COLS + srcCol;
          const advMix = Math.min(0.45, (swirlVel + thermalConvVel) * clampedDt * 1.4);
          advR = advR * (1 - advMix) + this.r[srcIdx] * advMix;
          advG = advG * (1 - advMix) + this.g[srcIdx] * advMix;
          advB = advB * (1 - advMix) + this.b[srcIdx] * advMix;
          advA = advA * (1 - advMix) + this.a[srcIdx] * advMix;
        }

        // 3. Relax gradually toward equilibrium Beer-Lambert target
        const nr = advR + (this.targetR - advR) * eqRelax;
        const ng = advG + (this.targetG - advG) * eqRelax;
        const nb = advB + (this.targetB - advB) * eqRelax;
        const na = advA + (this.targetA - advA) * eqRelax;

        this.nextR[idx] = nr;
        this.nextG[idx] = ng;
        this.nextB[idx] = nb;
        this.nextA[idx] = na;

        const err = Math.abs(nr - this.targetR) + Math.abs(ng - this.targetG) + Math.abs(nb - this.targetB);
        if (err > maxErr) maxErr = err;
      }
    }

    this.r.set(this.nextR);
    this.g.set(this.nextG);
    this.b.set(this.nextB);
    this.a.set(this.nextA);
    this.activeDiffusing = maxErr > 1.5;
  }

  /** Returns 0..1 fraction indicating spatial color uniformity across the vessel interior. */
  public getMixingUniformity(): number {
    if (!this.initialized) return 1;
    let sumErr = 0;
    for (let i = 0; i < FIELD_CELLS; i++) {
      sumErr += (Math.abs(this.r[i] - this.targetR) + Math.abs(this.g[i] - this.targetG) + Math.abs(this.b[i] - this.targetB)) / 765;
    }
    return Math.max(0, Math.min(1, 1 - (sumErr / FIELD_CELLS) * 3));
  }

  /** Blits the 2D advection-diffusion field onto Canvas 2D with bilinear smoothing. */
  public drawToCanvas(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): boolean {
    if (!this.initialized || !this.activeDiffusing) return false;
    const scratch = getSharedScratch();
    if (!scratch) return false;

    const data = scratch.img.data;
    for (let i = 0; i < FIELD_CELLS; i++) {
      const p = i * 4;
      data[p] = Math.max(0, Math.min(255, Math.round(this.r[i])));
      data[p + 1] = Math.max(0, Math.min(255, Math.round(this.g[i])));
      data[p + 2] = Math.max(0, Math.min(255, Math.round(this.b[i])));
      // High opacity wherever cell diverges from final equilibrium SVG fill so "loang màu" plume contrast stays vivid
      const cellDiff =
        (Math.abs(this.r[i] - this.targetR) + Math.abs(this.g[i] - this.targetG) + Math.abs(this.b[i] - this.targetB)) / 255;
      const effectiveAlpha = cellDiff > 0.04
        ? Math.max(this.a[i], Math.min(0.95, 0.42 + cellDiff * 0.95))
        : this.a[i] * 0.25;
      data[p + 3] = Math.max(0, Math.min(242, Math.round(effectiveAlpha * 255)));
    }
    scratch.ctx.putImageData(scratch.img, 0, 0);

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(scratch.canvas, x, y, w, h);
    ctx.restore();
    return true;
  }
}
