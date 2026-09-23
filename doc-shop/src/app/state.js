/**
 * Centralized Application Store
 */

class Store {
  constructor() {
    const savedTheme = localStorage.getItem("dkdocshop_theme") || "light";

    this._state = {
      auth: {
        currentUser: null,
        initialized: false,
      },
      user: {
        data: null, // role, verified, walletBalance, class, school, etc.
        profileCompleted: false,
      },
      theme: savedTheme,
      documents: {
        items: {}, // docId -> docData
        filter: "all",
        search: "",
        currentDocId: null,
      },
      purchases: {
        items: {}, // purchaseId -> purchaseData
      },
      wallet: {
        transactions: {}, // txId -> txData
      },
      keywords: {
        items: {}, // keywordId -> keywordData
      },
      notifications: {
        items: [],
        unreadCount: 0,
      },
      library: {
        folders: ["Toán", "Vật Lý", "Hóa Học", "Sinh Học", "Ngữ Văn", "Tiếng Anh", "Ôn THPT", "ĐGNL", "HS Giỏi"],
        activeFolder: "all",
        readingProgress: {}, // docId -> { page, totalPages, progressPct, lastReadAt }
      },
      notes: {
        items: {}, // noteId -> noteData
      },
      flashcards: {
        decks: {}, // deckId -> deckData with cards
        activeDeckId: null,
      },
      quiz: {
        quizzes: {},
        activeQuiz: null,
        attempts: [],
      },
      studyPlan: {
        tasks: [],
        studyStreak: 1,
        lastStudyDate: null,
      },
      gamification: {
        xp: 0,
        level: 1,
        unlockedBadges: [],
        completedQuests: [],
      },
      wishlist: {
        items: [], // docIds
      },
      seller: {
        isSeller: false,
        profile: null,
        documents: [],
        earnings: { gross: 0, platformFee: 0, net: 0, pending: 0 },
      },
      admin: {
        activeTab: "admin-overview",
        txFilter: "deposit",
        searchTerm: "",
        users: {},
        transactions: {},
        reports: {},
        keyLogs: {},
        keyPools: {},
        announcements: {},
        promotions: {},
        auditLogs: [],
        stats: {
          totalUsers: 0,
          totalDocs: 0,
          totalRevenue: 0,
          pendingTx: 0,
          keyClicks: 0,
        },
      },
      ui: {
        sidebarOpen: false,
        chatbotOpen: false,
        commandPaletteOpen: false,
        notificationsOpen: false,
        readerOpen: false,
        online: navigator.onLine,
      },
    };

    this._listeners = new Map();
  }

  getState() {
    return this._state;
  }

  subscribe(slice, callback) {
    if (!this._listeners.has(slice)) {
      this._listeners.set(slice, new Set());
    }
    this._listeners.get(slice).add(callback);

    return () => {
      const set = this._listeners.get(slice);
      if (set) set.delete(callback);
    };
  }

  _notify(slice, data) {
    const sliceListeners = this._listeners.get(slice);
    if (sliceListeners) {
      sliceListeners.forEach((fn) => {
        try {
          fn(data, this._state);
        } catch (err) {
          console.error(`Error in state subscriber for ${slice}:`, err);
        }
      });
    }

    const wildcardListeners = this._listeners.get("*");
    if (wildcardListeners) {
      wildcardListeners.forEach((fn) => {
        try {
          fn(slice, data, this._state);
        } catch (err) {}
      });
    }
  }

  setTheme(theme) {
    this._state.theme = theme;
    localStorage.setItem("dkdocshop_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    this._notify("theme", theme);
  }

  setAuthState(user, initialized = true) {
    this._state.auth.currentUser = user;
    this._state.auth.initialized = initialized;
    this._notify("auth", this._state.auth);
  }

  setAuth(user, initialized = true) {
    this.setAuthState(user, initialized);
  }

  setUser(userData) {
    this._state.user.data = userData;
    const isCompleted = Boolean(userData?.name && userData?.class);
    this._state.user.profileCompleted = isCompleted;
    this._notify("user", this._state.user);
  }

  setDocuments(docsMap) {
    this._state.documents.items = docsMap || {};
    this._notify("documents", this._state.documents);
  }

  patchDocument(docId, partial) {
    if (!docId || !partial) return;
    const existing = this._state.documents.items[docId] || {};
    this._state.documents.items[docId] = { ...existing, ...partial, id: docId };
    this._notify("documents", this._state.documents);
  }

  setDocumentFilter(filter, search = "") {
    this._state.documents.filter = filter;
    this._state.documents.search = search;
    this._notify("documents", this._state.documents);
  }

  setDocFilter(filter) {
    this.setDocumentFilter(filter, this._state.documents.search);
  }

  setDocSearch(search) {
    this.setDocumentFilter(this._state.documents.filter, search);
  }

  setCurrentDocId(id) {
    this._state.documents.currentDocId = id;
    this._notify("documents", this._state.documents);
  }

  setPurchases(purchasesMap) {
    this._state.purchases.items = purchasesMap || {};
    this._notify("purchases", this._state.purchases);
  }

  setWallet(txMap) {
    this._state.wallet.transactions = txMap || {};
    this._notify("wallet", this._state.wallet);
  }

  setTransactions(txMap) {
    this.setWallet(txMap);
  }

  setKeywords(keywordsMap) {
    this._state.keywords.items = keywordsMap || {};
    this._notify("keywords", this._state.keywords);
  }

  setNotifications(items) {
    this._state.notifications.items = items || [];
    this._state.notifications.unreadCount = (items || []).filter(i => !i.read).length;
    this._notify("notifications", this._state.notifications);
  }

  setLibrary(data) {
    this._state.library = { ...this._state.library, ...data };
    this._notify("library", this._state.library);
  }

  setNotes(notesMap) {
    this._state.notes.items = notesMap || {};
    this._notify("notes", this._state.notes);
  }

  setFlashcards(data) {
    this._state.flashcards = { ...this._state.flashcards, ...data };
    this._notify("flashcards", this._state.flashcards);
  }

  setQuiz(data) {
    this._state.quiz = { ...this._state.quiz, ...data };
    this._notify("quiz", this._state.quiz);
  }

  setStudyPlan(data) {
    this._state.studyPlan = { ...this._state.studyPlan, ...data };
    this._notify("studyPlan", this._state.studyPlan);
  }

  setGamification(data) {
    this._state.gamification = { ...this._state.gamification, ...data };
    this._notify("gamification", this._state.gamification);
  }

  setWishlist(items) {
    this._state.wishlist.items = items || [];
    this._notify("wishlist", this._state.wishlist);
  }

  setSeller(data) {
    this._state.seller = { ...this._state.seller, ...data };
    this._notify("seller", this._state.seller);
  }

  setAdminState(partial) {
    this._state.admin = { ...this._state.admin, ...partial };
    this._notify("admin", this._state.admin);
  }

  setUI(partial) {
    this._state.ui = { ...this._state.ui, ...partial };
    this._notify("ui", this._state.ui);
  }
}

export const store = new Store();
