import React from 'react';
import { useFrame } from '@react-three/fiber';
import { useInteractionStore } from '../../core/InteractionSystem';
import { playerCoords, useStore } from '../../store/useStore';

export const InteractionManager: React.FC = () => {
  useFrame(() => {
    const interactables = useInteractionStore.getState().interactables;
    let minId: string | null = null;
    let minDist = 2.5;
    let minLabel = null;

    for (const id in interactables) {
      const item = interactables[id];
      if (!item.isActive) continue;

      const dx = playerCoords.position[0] - item.position[0];
      const dz = playerCoords.position[2] - item.position[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) {
        minDist = dist;
        minId = id;
        minLabel = item.label;
      }
    }

    const currentNearest = useInteractionStore.getState().nearestId;
    if (currentNearest !== minId) {
      useInteractionStore.getState().setNearest(minId);
      if (minId && minLabel) {
        useStore.getState().setActiveInteraction(minLabel);
      } else {
        useStore.getState().setActiveInteraction(null);
      }
    }
  });

  return null;
};
