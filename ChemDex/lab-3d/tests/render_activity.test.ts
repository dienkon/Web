import { afterEach, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  canvas: new EventTarget(), loop: vi.fn(), disconnect: vi.fn(),
  observe: undefined as undefined | ((entries: { isIntersecting: boolean }[]) => void),
  cleanup: undefined as undefined | (() => void),
}));
vi.mock('react', async () => ({ ...await vi.importActual('react'),
  useEffect: (effect: () => () => void) => { harness.cleanup = effect(); },
}));
vi.mock('@react-three/fiber', () => ({ useThree: () => ({
  gl: { domElement: harness.canvas, getContext: () => ({ isContextLost: () => false }),
    getSize: () => ({ x: 800, y: 600 }), setSize: () => {} },
  setFrameloop: harness.loop,
}) }));
import { RenderActivity } from '../src/render/RenderActivity';
import { useQualityStore } from '../src/vfx/quality';
import { setTheaterActive } from '../src/render/theaterActivity';
const original = useQualityStore.getState();
afterEach(() => { harness.cleanup?.(); setTheaterActive(false); harness.loop.mockClear(); vi.unstubAllGlobals(); useQualityStore.setState(original); });

it('suspends a lost context, restores only a visible canvas, and cleans its listeners', () => {
  const document = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('document', document);
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: typeof harness.observe) { harness.observe = callback; }
    observe() {} disconnect = harness.disconnect;
  });
  useQualityStore.setState({ preference: 'auto', effectiveTier: 'high' });
  RenderActivity();
  expect(harness.loop).toHaveBeenLastCalledWith('always');
  const event = new Event('webglcontextlost', { cancelable: true });
  harness.canvas.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(harness.loop).toHaveBeenLastCalledWith('never');
  expect(useQualityStore.getState().effectiveTier).toBe('potato');
  document.hidden = true;
  harness.canvas.dispatchEvent(new Event('webglcontextrestored'));
  expect(harness.loop).toHaveBeenLastCalledWith('never');
  document.hidden = false; document.dispatchEvent(new Event('visibilitychange'));
  expect(harness.loop).toHaveBeenLastCalledWith('always');
  harness.observe!([{ isIntersecting: false }]);
  expect(harness.loop).toHaveBeenLastCalledWith('never');
  harness.cleanup!(); harness.cleanup = undefined;
  harness.loop.mockClear();
  harness.canvas.dispatchEvent(new Event('webglcontextrestored'));
  document.dispatchEvent(new Event('visibilitychange'));
  expect(harness.loop).not.toHaveBeenCalled();
  expect(harness.disconnect).toHaveBeenCalled();
});

it('stops the hidden workbench canvas during automatic experiments and resumes without overriding visibility', () => {
  const document = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('document', document);
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: typeof harness.observe) { harness.observe = callback; }
    observe() {} disconnect = harness.disconnect;
  });
  RenderActivity();
  setTheaterActive(true); expect(harness.loop).toHaveBeenLastCalledWith('never');
  setTheaterActive(false); expect(harness.loop).toHaveBeenLastCalledWith('always');
  setTheaterActive(true); document.hidden = true; setTheaterActive(false);
  expect(harness.loop).toHaveBeenLastCalledWith('never');
});
