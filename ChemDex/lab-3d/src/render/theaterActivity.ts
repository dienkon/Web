let theaterActive = false;
const listeners = new Set<() => void>();
export const isTheaterActive = () => theaterActive;
export function setTheaterActive(active: boolean) {
  theaterActive = active; for (const listener of listeners) listener();
}
export function subscribeTheaterActivity(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
