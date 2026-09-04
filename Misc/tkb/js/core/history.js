/**
 * Undo & Redo History Management
 */

export class HistoryManager {
  constructor(store) {
    this.store = store;
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 30;
  }

  recordState() {
    const state = this.store.getState();
    const snapshot = {
      schedule: JSON.parse(JSON.stringify(state.schedule)),
      lessons: JSON.parse(JSON.stringify(state.lessons)),
    };
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack = []; // Clear redo on new action
  }

  undo() {
    if (this.undoStack.length === 0) return false;
    const currentState = {
      schedule: JSON.parse(JSON.stringify(this.store.getState().schedule)),
      lessons: JSON.parse(JSON.stringify(this.store.getState().lessons)),
    };
    this.redoStack.push(currentState);

    const prevState = this.undoStack.pop();
    this.store.hydrate(prevState);
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    const currentState = {
      schedule: JSON.parse(JSON.stringify(this.store.getState().schedule)),
      lessons: JSON.parse(JSON.stringify(this.store.getState().lessons)),
    };
    this.undoStack.push(currentState);

    const nextState = this.redoStack.pop();
    this.store.hydrate(nextState);
    return true;
  }
}
