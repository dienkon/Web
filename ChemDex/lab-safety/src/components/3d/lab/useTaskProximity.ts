import { useEffect, useState } from 'react';
import { playerCoords, useStore } from '../../../store/useStore';
import { isSceneInputBlocked } from '../../../systems/input/sceneInput';
import { getActiveObjective } from './ObjectiveMarker';
import { useInteractionStore } from '../../../core/InteractionSystem';
export function useTaskProximity(position: [number, number, number], radius: number, taskIds: string[] = [], requireFocus = true) {
  const [near, setNear] = useState(false);
  const blocked = useStore(isSceneInputBlocked);
  const phase = useStore(s => s.currentPhase);
  const tasks = useStore(s => s.tasks);
  const flags = useStore(s => s.player.flags);
  const focus = useInteractionStore(s => s.focusPoint);
  const active = getActiveObjective(phase, tasks, flags);
  const allowed = !blocked && (taskIds.length === 0 || (!!active && taskIds.includes(active.id)));
  const [x, , z] = position;
  useEffect(() => {
    if (!allowed) { setNear(false); return; }
    const tick = () => setNear(Math.hypot(x - playerCoords.position[0], z - playerCoords.position[2]) < radius);
    tick(); const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [allowed, x, z, radius]);
  const detected = !requireFocus || !!focus && Math.hypot(focus[0] - x, focus[2] - z) < 1.3;
  return allowed && near && detected;
}
