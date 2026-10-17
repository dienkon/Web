/** Native pointer lifecycle shared by tool dragging. Coordinate projection stays
 * in the R3F adapter; this controller can be exercised without a GPU or DOM. */
export function beginPointerDrag(options: {
  canvas: EventTarget & { setPointerCapture(id: number): void; hasPointerCapture(id: number): boolean; releasePointerCapture(id: number): void };
  events: EventTarget;
  pointerId: number;
  schedule: (callback: FrameRequestCallback) => number;
  cancelFrame: (handle: number) => void;
  onMove: (event: PointerEvent) => void;
  onEnd: (committed: boolean) => void;
}) {
  const { canvas, events, pointerId } = options;
  let ended = false;
  let frame: number | null = null;
  let pending: PointerEvent | null = null;
  const flush = () => {
    frame = null;
    const event = pending;
    pending = null;
    if (event && !ended) options.onMove(event);
  };
  const finish = (committed: boolean) => {
    if (ended) return;
    if (frame !== null) options.cancelFrame(frame);
    frame = null;
    if (committed) flush();
    ended = true;
    pending = null;
    events.removeEventListener('pointermove', move);
    events.removeEventListener('pointerup', up, true);
    events.removeEventListener('pointercancel', cancelPointer, true);
    events.removeEventListener('blur', cancel);
    events.removeEventListener('keydown', key);
    canvas.removeEventListener('lostpointercapture', lost);
    try { if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId); }
    catch { /* Capture can already have been released by the browser. */ }
    finally { options.onEnd(committed); }
  };
  const move = (event: Event) => {
    const pointer = event as PointerEvent;
    if (ended || pointer.pointerId !== pointerId) return;
    pending = pointer;
    if (frame === null) frame = options.schedule(flush);
  };
  const up = (event: Event) => {
    if ((event as PointerEvent).pointerId !== pointerId) return;
    // Include the release coordinates even if the final move was coalesced.
    pending = event as PointerEvent;
    finish(true);
  };
  const cancel = () => finish(false);
  const cancelPointer = (event: Event) => { if ((event as PointerEvent).pointerId === pointerId) cancel(); };
  const lost = cancelPointer;
  const key = (event: Event) => { if ((event as KeyboardEvent).key === 'Escape') cancel(); };
  events.addEventListener('pointermove', move);
  events.addEventListener('pointerup', up, true);
  events.addEventListener('pointercancel', cancelPointer, true);
  events.addEventListener('blur', cancel);
  events.addEventListener('keydown', key);
  canvas.addEventListener('lostpointercapture', lost);
  try { canvas.setPointerCapture(pointerId); }
  catch { cancel(); }
  return cancel;
}
