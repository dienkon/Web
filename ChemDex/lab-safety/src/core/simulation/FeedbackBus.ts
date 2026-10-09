export type FeedbackEvent =
  | { type: 'alarm'; active: boolean }
  | { type: 'fire'; active: boolean; escalated?: boolean }
  | { type: 'extinguisher'; active: boolean; agent?: string }
  | { type: 'spill'; active: boolean }
  | { type: 'stress'; value: number };

type FeedbackListener = (event: FeedbackEvent) => void;

class FeedbackBus {
  private listeners = new Set<FeedbackListener>();
  private state = { alarm: false, fire: false, extinguisher: false, spill: false, stress: 0 };

  subscribe(listener: FeedbackListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: FeedbackEvent): void {
    if (event.type === 'alarm') this.state.alarm = event.active;
    if (event.type === 'fire') this.state.fire = event.active;
    if (event.type === 'extinguisher') this.state.extinguisher = event.active;
    if (event.type === 'spill') this.state.spill = event.active;
    if (event.type === 'stress') this.state.stress = Math.max(0, Math.min(1, event.value));
    this.listeners.forEach(listener => listener(event));
  }

  snapshot() {
    return { ...this.state };
  }
}

export const feedbackBus = new FeedbackBus();
