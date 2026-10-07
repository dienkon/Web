/**
 * gl.ts - WebGL capability detection, quality tiers, and adaptive performance controller.
 * 
 * Hardware Capability Probing:
 * - WebGL2 context support
 * - EXT_color_buffer_float / OES_texture_float_linear for floating-point ping-pong fluid solvers
 * - Max texture size and max vertex uniform vectors
 * 
 * Quality Tier Budgets:
 * - Tier A (High): Desktop dGPU/iGPU, 3D/high-res fluid grid, 60k particles, screen-space refraction, bloom, heat-haze
 * - Tier B (Medium): Laptop, 2D slice fluid grid, 20k particles, analytic absorption, billboard steam
 * - Tier C (Low/Mobile): Weak devices, CPU typed array grid, 4k particles, lightweight shaders
 * 
 * Adaptive Performance:
 * - Moving average frame time over 120 frames
 * - 5-second hysteresis preventing oscillations between quality tiers
 */

export type RenderTier = 'A' | 'B' | 'C';

export interface WebGLCapabilities {
  isWebGL2: boolean;
  hasFloatColorBuffer: boolean;
  hasFloatLinear: boolean;
  maxTextureSize: number;
  maxRenderBufferSize: number;
  suggestedTier: RenderTier;
}

export function probeWebGLCapabilities(gl?: WebGLRenderingContext | WebGL2RenderingContext | null): WebGLCapabilities {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    // Headless / SSR fallback
    return {
      isWebGL2: false,
      hasFloatColorBuffer: false,
      hasFloatLinear: false,
      maxTextureSize: 2048,
      maxRenderBufferSize: 2048,
      suggestedTier: 'C',
    };
  }

  let testCanvas: HTMLCanvasElement | null = null;
  let context = gl;

  if (!context) {
    testCanvas = document.createElement('canvas');
    context = (testCanvas.getContext('webgl2') || testCanvas.getContext('webgl')) as WebGLRenderingContext | null;
  }

  if (!context) {
    return {
      isWebGL2: false,
      hasFloatColorBuffer: false,
      hasFloatLinear: false,
      maxTextureSize: 1024,
      maxRenderBufferSize: 1024,
      suggestedTier: 'C',
    };
  }

  const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && context instanceof WebGL2RenderingContext;
  const floatColor = isWebGL2
    ? !!context.getExtension('EXT_color_buffer_float')
    : !!context.getExtension('WEBGL_color_buffer_float');
  const floatLinear = !!context.getExtension('OES_texture_float_linear');

  const maxTextureSize = context.getParameter(context.MAX_TEXTURE_SIZE) || 2048;
  const maxRenderBufferSize = context.getParameter(context.MAX_RENDERBUFFER_SIZE) || 2048;

  let suggestedTier: RenderTier = 'C';
  if (isWebGL2 && floatColor && maxTextureSize >= 4096) {
    suggestedTier = 'A';
  } else if (isWebGL2 || maxTextureSize >= 2048) {
    suggestedTier = 'B';
  }

  return {
    isWebGL2,
    hasFloatColorBuffer: floatColor,
    hasFloatLinear: floatLinear,
    maxTextureSize,
    maxRenderBufferSize,
    suggestedTier,
  };
}

export class AdaptivePerformanceController {
  public tier: RenderTier = 'B';
  public userOverrideTier: RenderTier | null = null;

  private frameTimes: Float32Array = new Float32Array(120);
  private frameIndex: number = 0;
  private frameCount: number = 0;
  private lastTierChangeTime: number = 0;

  constructor(initialTier?: RenderTier) {
    if (initialTier) {
      this.tier = initialTier;
    } else {
      const caps = probeWebGLCapabilities();
      this.tier = caps.suggestedTier;
    }
  }

  /**
   * Record frame time in milliseconds
   */
  public recordFrame(frameDurationMs: number): void {
    if (this.userOverrideTier) {
      this.tier = this.userOverrideTier;
      return;
    }

    this.frameTimes[this.frameIndex] = frameDurationMs;
    this.frameIndex = (this.frameIndex + 1) % 120;
    if (this.frameCount < 120) this.frameCount++;

    if (this.frameCount < 60) return; // Warm-up

    const now = performance.now();
    if (now - this.lastTierChangeTime < 5000) return; // 5-second hysteresis guard

    // Calculate moving average
    let sum = 0;
    for (let i = 0; i < this.frameCount; i++) {
      sum += this.frameTimes[i];
    }
    const avgMs = sum / this.frameCount;

    // >20 ms (below 50 FPS) -> step down tier
    if (avgMs > 20.0) {
      if (this.tier === 'A') {
        this.tier = 'B';
        this.lastTierChangeTime = now;
      } else if (this.tier === 'B') {
        this.tier = 'C';
        this.lastTierChangeTime = now;
      }
    } else if (avgMs < 11.0) { // <11 ms (>90 FPS) -> step up tier
      if (this.tier === 'C') {
        this.tier = 'B';
        this.lastTierChangeTime = now;
      } else if (this.tier === 'B') {
        this.tier = 'A';
        this.lastTierChangeTime = now;
      }
    }
  }
}
