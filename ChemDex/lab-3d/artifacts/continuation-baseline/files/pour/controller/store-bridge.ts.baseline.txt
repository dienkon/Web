import { useAppStore } from '../../store/useAppStore';
import { PourSessionState } from './modes';

/**
 * STORE BRIDGE: Single authoritative interface between PourController and useAppStore.
 * Ensures state updates are atomic, history snapshots are singular, and reactions are evaluated properly.
 */
export const storeBridge = {
  /**
   * Commits an inter-vessel pour: transfers substances, conserves mass/moles/temp,
   * creates exactly 1 history undo snapshot, and triggers chemistry reaction kinetics.
   */
  commitVesselPour: async (
    fromId: string,
    toId: string,
    poured_ml: number,
    initialFromVol?: number,
    initialToVol?: number
  ): Promise<void> => {
    const store = useAppStore.getState();
    const from = store.vessels[fromId];
    const to = store.vessels[toId];
    if (from && initialFromVol !== undefined) {
      from.volume_ml = initialFromVol;
    }
    if (to && initialToVol !== undefined) {
      to.volume_ml = initialToVol;
    }
    await store.pourVessel(fromId, toId, poured_ml);
  },

  /**
   * Commits reagent chemical addition (stock bottle, dropper, solid spatula).
   */
  commitAddChemical: async (targetId: string, chemical: string, amount: number): Promise<void> => {
    const store = useAppStore.getState();
    await store.mixSubstances(targetId, chemical, amount);
  },

  /**
   * Adds an environmental spill onto workbench at exact contact coordinates.
   */
  recordSpill: (
    position: [number, number, number],
    volume_ml: number,
    substances: string[],
    color: string,
    sourceName: string = 'Vessel'
  ): void => {
    if (volume_ml <= 0.01) return;
    const store = useAppStore.getState();
    store.addSpill(position, volume_ml, substances, color, sourceName);
  },

  /**
   * Cancels pouring session without mutating volume or leaving dangling particles/audio.
   */
  cancelPour: (session: PourSessionState): void => {
    const store = useAppStore.getState();
    store.setNearestPourTargetId(null);
  }
};
