/**
 * Flashcard Service with Spaced Repetition (SRS)
 */
import { store } from "../app/state.js";

const STORAGE_KEY_FLASHCARDS = "dkdocshop_flashcards";

class FlashcardService {
  constructor() {
    this.loadDecks();
  }

  loadDecks() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FLASHCARDS);
      if (saved) {
        store.setFlashcards({ decks: JSON.parse(saved) });
      } else {
        // Seed default high-school decks
        const initialDecks = {
          deck_tienganh_thpt: {
            id: "deck_tienganh_thpt",
            title: "Từ vựng trọng tâm THPT Quốc Gia",
            subject: "Tiếng Anh",
            color: "#2563eb",
            cards: [
              { id: "c1", front: "Exemplary (adj)", back: "Gương mẫu, mẫu mực", example: "Her exemplary behavior earned her a scholarship.", interval: 1, reps: 0, status: "learning" },
              { id: "c2", front: "Substantial (adj)", back: "Đáng kể, quan trọng", example: "There was a substantial increase in scores.", interval: 1, reps: 0, status: "learning" },
              { id: "c3", front: "Persevere (v)", back: "Kiên trì, bền bỉ", example: "He persevered with his study plan.", interval: 1, reps: 0, status: "learning" },
              { id: "c4", front: "Plausible (adj)", back: "Hợp lý, có thể tin được", example: "A plausible explanation for the error.", interval: 1, reps: 0, status: "learning" },
              { id: "c5", front: "Meticulous (adj)", back: "Tỉ mỉ, cẩn thận từng chi tiết", example: "She is meticulous about note-taking.", interval: 1, reps: 0, status: "learning" },
            ]
          },
          deck_hoahoc_12: {
            id: "deck_hoahoc_12",
            title: "Tên gọi & Công thức Hóa Học 12",
            subject: "Hóa Học",
            color: "#059669",
            cards: [
              { id: "h1", front: "Etyl fomat có mùi gì và công thức?", back: "HCOOC2H5, có mùi thơm của quả đào chín", interval: 1, reps: 0, status: "learning" },
              { id: "h2", front: "Thủy phân hoàn toàn tinh bột thu được gì?", back: "Chỉ thu được Glucozơ (α-glucozơ)", interval: 1, reps: 0, status: "learning" },
              { id: "h3", front: "Anilin có công thức và tính bazơ ra sao?", back: "C6H5NH2, tính bazơ rất yếu (không làm đổi màu quỳ tím)", interval: 1, reps: 0, status: "learning" },
            ]
          }
        };
        store.setFlashcards({ decks: initialDecks });
        this.persist(initialDecks);
      }
    } catch (e) {
      console.warn("Failed to load flashcard decks:", e);
    }
  }

  persist(decks) {
    localStorage.setItem(STORAGE_KEY_FLASHCARDS, JSON.stringify(decks));
  }

  createDeck({ title, subject = "Chung", color = "#10b981" }) {
    const decks = { ...store.getState().flashcards.decks };
    const id = `deck_${Date.now()}`;
    decks[id] = {
      id,
      title: title.trim(),
      subject,
      color,
      cards: [],
      createdAt: Date.now(),
    };
    store.setFlashcards({ decks });
    this.persist(decks);
    return decks[id];
  }

  addCard(deckId, { front, back, example = "" }) {
    const decks = { ...store.getState().flashcards.decks };
    if (!decks[deckId]) return null;

    const newCard = {
      id: `c_${Date.now()}`,
      front: front.trim(),
      back: back.trim(),
      example: example.trim(),
      interval: 1,
      reps: 0,
      status: "learning", // learning | review | mastered
      lastReviewed: Date.now(),
    };

    decks[deckId].cards.push(newCard);
    store.setFlashcards({ decks });
    this.persist(decks);
    return newCard;
  }

  /**
   * Spaced Repetition Rating: 'again' (1), 'hard' (2), 'good' (3), 'easy' (4)
   */
  rateCard(deckId, cardId, rating) {
    const decks = { ...store.getState().flashcards.decks };
    const deck = decks[deckId];
    if (!deck) return;

    const card = deck.cards.find(c => c.id === cardId);
    if (!card) return;

    card.lastReviewed = Date.now();
    card.reps = (card.reps || 0) + 1;

    if (rating === "again") {
      card.interval = 1;
      card.status = "learning";
    } else if (rating === "hard") {
      card.interval = Math.max(1, Math.round((card.interval || 1) * 1.2));
      card.status = "review";
    } else if (rating === "good") {
      card.interval = Math.round((card.interval || 1) * 1.8) + 1;
      card.status = card.interval > 6 ? "mastered" : "review";
    } else if (rating === "easy") {
      card.interval = Math.round((card.interval || 1) * 2.5) + 2;
      card.status = "mastered";
    }

    store.setFlashcards({ decks });
    this.persist(decks);
  }

  deleteDeck(deckId) {
    const decks = { ...store.getState().flashcards.decks };
    delete decks[deckId];
    store.setFlashcards({ decks });
    this.persist(decks);
  }
}

export const flashcardService = new FlashcardService();
