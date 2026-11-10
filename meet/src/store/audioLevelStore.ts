import { create } from 'zustand';

// Meter updates must not re-render the meeting grid ten times per second.
export const useAudioLevelStore = create<{ level: number }>(() => ({ level: 0 }));
