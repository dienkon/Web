import { inputManager } from './InputManager';

export const INTERACTION_PRIORITY = {
  TARGET: 100,
  QUIZ: 200,
  DIALOG: 300,
} as const;

interface InteractionSubscription {
  id: number;
  priority: number;
  isActive: () => boolean;
  onInteract: () => void;
}

export interface InteractionHandler {
  priority: number;
  isActive?: () => boolean;
  onInteract: () => void;
}

export class InteractionBus {
  private readonly handlers: InteractionSubscription[] = [];
  private nextId = 1;
  private lastEmitAt = -Infinity;

  constructor(private readonly debounceMs = 150) {}

  subscribe(handler: InteractionHandler) {
    const subscription: InteractionSubscription = {
      id: this.nextId++,
      priority: handler.priority,
      isActive: handler.isActive ?? (() => true),
      onInteract: handler.onInteract,
    };
    this.handlers.push(subscription);

    return () => {
      const index = this.handlers.findIndex((entry) => entry.id === subscription.id);
      if (index >= 0) this.handlers.splice(index, 1);
    };
  }

  emit(now = performance.now()) {
    if (now - this.lastEmitAt < this.debounceMs) return false;

    let selected: InteractionSubscription | null = null;
    for (const handler of this.handlers) {
      if (!handler.isActive()) continue;
      if (
        selected === null
        || handler.priority > selected.priority
        || (handler.priority === selected.priority && handler.id > selected.id)
      ) {
        selected = handler;
      }
    }

    if (!selected) return false;
    this.lastEmitAt = now;
    selected.onInteract();
    return true;
  }

  resetDebounce() {
    this.lastEmitAt = -Infinity;
  }
}

export const interactionBus = new InteractionBus();

export const dispatchInteractionInput = () => {
  inputManager.pressButton('interact');
  return inputManager.consumeButton('interact') && interactionBus.emit();
};
