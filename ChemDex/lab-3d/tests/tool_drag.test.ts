import { afterEach, describe, expect, it } from 'vitest';
import { beginPointerDrag } from '../src/handling/pointerDrag';
import { toolVisible, restingToolHeight } from '../src/handling/handheldRest';
import { instrumentHome, type InstrumentId } from '../src/handling/instrumentCatalog';
import { positionInstrument, returnInstrumentHome } from '../src/handling/instrumentOperations';
import { useToolDockStore } from '../src/handling/toolDock';
import { useAppStore } from '../src/store/useAppStore';
import { LAB_PHYSICS } from '../src/engine/interactionEngine';

function pointer(type: string, id = 7, x = 10, y = 20) {
  return Object.assign(new Event(type), { pointerId: id, clientX: x, clientY: y });
}
function harness(captureFailure = false, releaseFailure = false) {
  const events = new EventTarget();
  const canvas = Object.assign(new EventTarget(), {
    captured: false,
    setPointerCapture() { if (captureFailure) throw Error('capture failed'); this.captured = true; },
    hasPointerCapture() { return this.captured; },
    releasePointerCapture() { this.captured = false; if (releaseFailure) throw Error('already released'); },
  });
  let sequence = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const positions: number[] = [];
  const ends: boolean[] = [];
  const cancel = beginPointerDrag({ events, canvas, pointerId: 7,
    schedule: callback => { frames.set(++sequence, callback); return sequence; },
    cancelFrame: id => { frames.delete(id); },
    onMove: event => positions.push(event.clientX), onEnd: committed => ends.push(committed),
  });
  const flush = () => { for (const [id, frame] of [...frames]) { frames.delete(id); frame(0); } };
  return { events, canvas, frames, positions, ends, cancel, flush };
}

describe('Pointer dragging lifecycle', () => {
  it('coalesces moves to one frame and applies the final pointer-up position', () => {
    const h = harness();
    h.events.dispatchEvent(pointer('pointermove', 7, 30));
    h.events.dispatchEvent(pointer('pointermove', 7, 50));
    expect(h.frames.size).toBe(1);
    h.flush();
    expect(h.positions).toEqual([50]);
    h.events.dispatchEvent(pointer('pointermove', 7, 60));
    h.events.dispatchEvent(pointer('pointerup', 7, 65));
    expect(h.positions).toEqual([50, 65]);
    expect(h.frames.size).toBe(0);
    expect(h.ends).toEqual([true]);
    expect(h.canvas.captured).toBe(false);
    h.events.dispatchEvent(pointer('pointermove', 7, 100));
    h.cancel();
    expect(h.ends).toEqual([true]);
  });
  it('ignores another finger moving, cancelling or releasing', () => {
    const h = harness();
    for (const event of ['pointermove', 'pointercancel', 'pointerup']) h.events.dispatchEvent(pointer(event, 8));
    h.canvas.dispatchEvent(pointer('lostpointercapture', 8));
    h.flush();
    expect(h.positions).toEqual([]);
    expect(h.ends).toEqual([]);
    expect(h.canvas.captured).toBe(true);
    h.events.dispatchEvent(pointer('pointerup'));
    expect(h.ends).toEqual([true]);
  });
  it('cancels safely on blur, Escape, pointer cancel, capture loss and unmount', () => {
    for (const cause of ['blur', 'escape', 'pointercancel', 'lostpointercapture', 'unmount']) {
      const h = harness();
      h.events.dispatchEvent(pointer('pointermove', 7, 40));
      if (cause === 'escape') h.events.dispatchEvent(Object.assign(new Event('keydown'), { key: 'Escape' }));
      else if (cause === 'unmount') h.cancel();
      else if (cause === 'lostpointercapture') h.canvas.dispatchEvent(pointer(cause));
      else h.events.dispatchEvent(cause === 'blur' ? new Event('blur') : pointer(cause));
      h.flush();
      expect(h.positions, cause).toEqual([]);
      expect(h.ends, cause).toEqual([false]);
      expect(h.canvas.captured, cause).toBe(false);
      expect(h.frames.size, cause).toBe(0);
      h.events.dispatchEvent(pointer('pointerup'));
      expect(h.ends, cause).toEqual([false]);
    }
  });
  it('cleans up even when capture or release is rejected by the browser', () => {
    const failed = harness(true);
    expect(failed.ends).toEqual([false]);
    failed.events.dispatchEvent(pointer('pointermove'));
    expect(failed.frames.size).toBe(0);
    const lost = harness(false, true);
    expect(() => lost.cancel()).not.toThrow();
    expect(lost.ends).toEqual([false]);
  });
});

const appBefore = useAppStore.getState(), dockBefore = useToolDockStore.getState();
afterEach(() => { useAppStore.setState(appBefore); useToolDockStore.setState(dockBefore); });
describe('Handheld tool rests', () => {
  it('shows tools for selection in move mode and hides unused tools afterwards', () => {
    expect(toolVisible(false, false, true)).toBe(true);
    expect(toolVisible(false, false, false)).toBe(false);
    expect(toolVisible(true, false, false)).toBe(true);
    expect(toolVisible(false, true, false)).toBe(true);
  });
  it('places each handheld at its bench rest height instead of retaining an arbitrary input Y', () => {
    const ids: InstrumentId[] = ['pipette', 'thermometer', 'ph_meter', 'stirring_rod', 'spatula'];
    for (const id of ids) {
      positionInstrument(id, [2, 100, 1]);
      const actual = useToolDockStore.getState().positions[id];
      expect(actual).toEqual([2, restingToolHeight(id, 100), 1]);
      expect(actual[1]).toBeGreaterThan(LAB_PHYSICS.TABLE_SURFACE_Y);
      expect(actual[1]).toBeLessThan(LAB_PHYSICS.TABLE_SURFACE_Y + 0.14);
      returnInstrumentHome(id);
      expect(useToolDockStore.getState().positions[id]).toEqual(instrumentHome(id));
    }
    expect(restingToolHeight('balance', -1.175)).toBe(-1.175);
  });
});
