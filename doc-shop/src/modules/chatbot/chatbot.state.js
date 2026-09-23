/**
 * Chatbot State & Message History
 */

class ChatbotState {
  constructor() {
    this.history = [];
    this.isOpen = false;
  }

  addMessage(role, content) {
    this.history.push({ role, content, timestamp: Date.now() });
    if (this.history.length > 20) {
      this.history = this.history.slice(-20);
    }
  }

  getHistory() {
    return this.history;
  }

  clearHistory() {
    this.history = [];
  }
}

export const chatbotState = new ChatbotState();
