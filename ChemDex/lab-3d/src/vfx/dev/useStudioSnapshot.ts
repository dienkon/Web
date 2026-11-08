import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

/** The catalog is a control panel, not a frame renderer. Coalesce continuous
 * telemetry while keeping selection, pause and new specimens immediate. */
export function useStudioSnapshot(active: boolean) {
  const [snapshot, setSnapshot] = useState(useAppStore.getState);
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => { timer = undefined; setSnapshot(useAppStore.getState()); };
    refresh();
    const unsubscribe = useAppStore.subscribe((next, previous) => {
      if (next.selectedVesselId !== previous.selectedVesselId || next.vesselIds !== previous.vesselIds
        || next.isSimulationPaused !== previous.isSimulationPaused || next.timeScale !== previous.timeScale || next.language !== previous.language) {
        if (timer !== undefined) clearTimeout(timer); refresh();
      } else if (timer === undefined) timer = setTimeout(refresh, 100);
    });
    return () => { unsubscribe(); if (timer !== undefined) clearTimeout(timer); };
  }, [active]);
  return snapshot;
}
