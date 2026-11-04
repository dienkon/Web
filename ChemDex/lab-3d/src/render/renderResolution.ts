import { useLayoutEffect, useState, type RefObject } from 'react';
import { getQualitySettings, type QualityTier } from '../vfx/quality';

const pixelBudgets: Record<QualityTier, number> = {
  potato: 600_000, low: 1_000_000, medium: 1_800_000, high: 2_800_000, ultra: 4_000_000,
};

/** A DPR cap alone still allocates enormous framebuffers on 4K/Retina displays. */
export function renderPixelRatio(tier: QualityTier, width: number, height: number, deviceDpr: number): number {
  const preferred = Math.min(getQualitySettings(tier).dprMax,
    Number.isFinite(deviceDpr) && deviceDpr > 0 ? deviceDpr : 1);
  if (![width, height].every(Number.isFinite) || width <= 0 || height <= 0) return Math.min(1, preferred);
  return Math.min(preferred, Math.sqrt(pixelBudgets[tier] / width / height));
}

export function useRenderDpr(container: RefObject<HTMLElement | null>, tier: QualityTier) {
  const [size, setSize] = useState({ width: 0, height: 0, deviceDpr: window.devicePixelRatio });
  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const update = () => {
      const { width, height } = element.getBoundingClientRect();
      const deviceDpr = window.devicePixelRatio;
      setSize(old => old.width === width && old.height === height && old.deviceDpr === deviceDpr
        ? old : { width, height, deviceDpr });
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    // Recheck DPR when moving between displays, even if CSS size stays equal.
    window.addEventListener('resize', update);
    update();
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, [container]);
  return renderPixelRatio(tier, size.width, size.height, size.deviceDpr);
}
