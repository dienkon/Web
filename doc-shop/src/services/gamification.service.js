/**
 * Gamification Service
 * Manages XP, Levels, Badges, Quests and Study Streak
 */
import { store } from "../app/state.js";
import { AchievementRules } from "../app/constants.js";
import { toast } from "../components/toast.js";

const STORAGE_KEY_GAMIFICATION = "dkdocshop_gamification";

class GamificationService {
  constructor() {
    this.loadState();
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GAMIFICATION);
      if (saved) {
        store.setGamification(JSON.parse(saved));
      } else {
        const initial = {
          xp: 150,
          level: 1,
          streak: 1,
          lastActiveDate: new Date().toISOString().slice(0, 10),
          unlockedBadges: ["first_login"],
          completedQuests: [],
        };
        store.setGamification(initial);
        this.persist(initial);
      }
    } catch (e) {
      console.warn("Failed to load gamification:", e);
    }
  }

  persist(data) {
    localStorage.setItem(STORAGE_KEY_GAMIFICATION, JSON.stringify(data));
  }

  calculateLevel(xp) {
    // 0-99 XP = Level 1, 100-399 = Level 2, 400-899 = Level 3, etc.
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  addXP(amount, reason = "") {
    const current = store.getState().gamification;
    const newXP = (current.xp || 0) + amount;
    const oldLevel = current.level || 1;
    const newLevel = this.calculateLevel(newXP);

    const updated = {
      ...current,
      xp: newXP,
      level: newLevel,
    };

    store.setGamification(updated);
    this.persist(updated);

    toast.success(`+${amount} XP! ${reason}`);

    if (newLevel > oldLevel) {
      toast.info(`🎉 Chúc mừng bạn đã thăng cấp Lên Level ${newLevel}!`);
    }

    this.checkBadges();
  }

  checkBadges() {
    const current = store.getState().gamification;
    const unlocked = new Set(current.unlockedBadges || []);
    let newUnlocked = false;

    AchievementRules.forEach((rule) => {
      if (unlocked.has(rule.id)) return;

      let qualified = false;
      if (rule.id === "study_streak_7" && current.streak >= 7) qualified = true;
      if (rule.id === "first_quiz" && (store.getState().quiz.attempts || []).length >= 1) qualified = true;

      if (qualified) {
        unlocked.add(rule.id);
        newUnlocked = true;
        this.addXP(rule.xp, `Đạt huy hiệu: ${rule.title}`);
      }
    });

    if (newUnlocked) {
      const updated = { ...current, unlockedBadges: Array.from(unlocked) };
      store.setGamification(updated);
      this.persist(updated);
    }
  }

  recordActivity() {
    const today = new Date().toISOString().slice(0, 10);
    const current = store.getState().gamification;
    const lastDate = current.lastActiveDate;

    if (lastDate === today) return; // Already recorded today

    let newStreak = current.streak || 1;
    if (lastDate) {
      const diffDays = Math.round((new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        newStreak++;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    }

    const updated = {
      ...current,
      streak: newStreak,
      lastActiveDate: today,
    };
    store.setGamification(updated);
    this.persist(updated);
  }
}

export const gamificationService = new GamificationService();
