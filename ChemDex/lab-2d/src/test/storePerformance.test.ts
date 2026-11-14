import { describe, it, expect, beforeEach } from 'vitest';
import { useLabStore } from '../store/useLabStore';

describe('Store Performance & Subscription Hygiene', () => {
  beforeEach(() => {
    useLabStore.getState().resetWorkbench();
  });

  it('does not notify subscribers when setRealtimeKinetics is called with the same value', () => {
    useLabStore.getState().setRealtimeKinetics(true);
    let notifications = 0;
    const unsubscribe = useLabStore.subscribe(() => {
      notifications++;
    });
    try {
      useLabStore.getState().setRealtimeKinetics(true);
      useLabStore.getState().setRealtimeKinetics(true);
      expect(notifications).toBe(0);

      useLabStore.getState().setRealtimeKinetics(false);
      expect(notifications).toBe(1);
    } finally {
      unsubscribe();
    }
  });

  it('does not notify subscribers during idle tickSimulation when bench is at equilibrium', () => {
    const store = useLabStore.getState();
    const beakerId = store.addEquipment('beaker');
    store.addDistilledWater(beakerId, 50);

    // Run a couple ticks to settle any initial transient flags
    store.tickSimulation(0.08);
    store.tickSimulation(0.08);

    let notifications = 0;
    const unsubscribe = useLabStore.subscribe(() => {
      notifications++;
    });
    try {
      for (let i = 0; i < 20; i++) {
        useLabStore.getState().tickSimulation(0.08);
      }
      expect(notifications).toBe(0);
    } finally {
      unsubscribe();
    }
  });

  it('shares immutable history references in undoStack while isolating equipment mutations', () => {
    const store = useLabStore.getState();
    const id = store.addEquipment('beaker');
    const historyRefAfterAdd = useLabStore.getState().history;

    useLabStore.getState().addChemicalToEquipment(id, 'chem-hcl', 20);
    const undoSnap = useLabStore.getState().undoStack.at(-1)!;

    // Lightweight snapshot shares the immutable history array reference instead of cloning O(N) logs
    expect(undoSnap.history).toBe(historyRefAfterAdd);
    // Equipment objects remain deeply isolated
    expect(undoSnap.equipment[id].volume_ml).toBe(0);
    expect(useLabStore.getState().equipment[id].volume_ml).toBe(20);
  });
});
