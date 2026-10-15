import React from 'react';
import { useStore } from '../../../store/useStore';
import { useInteractionStore } from '../../../core/InteractionSystem';
import { isSceneInputBlocked } from '../../../systems/input/sceneInput';

export function FPSCrosshair({ showCrosshair = true }: { showCrosshair?: boolean }) {
  const blocked = useStore(isSceneInputBlocked);
  const label = useStore(s => s.activeInteraction);
  const detected = useInteractionStore(s => s.nearestId);
  if (blocked || !showCrosshair) return null;
  return <div className="lab-reticle-layer" aria-hidden="true">
    <span className={`lab-reticle ${detected ? 'is-detected' : ''}`} />
    {detected && label && <span className="lab-focus-prompt" data-focus-prompt>
      <kbd>E</kbd><span>{label}</span>
    </span>}
  </div>;
}
