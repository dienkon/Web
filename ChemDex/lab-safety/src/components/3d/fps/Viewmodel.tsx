import React from 'react';
import { FPSHands } from './FPSHands';

export type HeldItemSlot =
  | 'none'
  | 'goggles'
  | 'glove'
  | 'beaker'
  | 'flask'
  | 'dropper'
  | 'extinguisher'
  | 'fireBlanket'
  | 'sweeper'
  | 'spillScoop'
  | 'bandage'
  | 'clipboard'
  | 'wasteItem';

export const Viewmodel: React.FC = () => {
  return <FPSHands />;
};

export { FPSHands };
