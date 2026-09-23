/**
 * DkAI Rate Limiter & Usage Guard (Section BB)
 */

const STORAGE_KEY_USAGE = "dkai_usage_stats";
const MAX_REQUESTS_PER_DAY = 50;
const MIN_INTERVAL_MS = 2500; // Throttle 2.5 seconds between requests

export class AIGuard {
  constructor() {
    this.stats = this.loadStats();
    this.lastRequestTimestamp = 0;
  }

  loadStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USAGE);
      if (raw) {
        const parsed = JSON.parse(raw);
        const today = new Date().toISOString().slice(0, 10);
        if (parsed.date === today) {
          return parsed;
        }
      }
    } catch {}

    return {
      date: new Date().toISOString().slice(0, 10),
      requestsToday: 0,
      requestsThisMonth: 0,
      errorCount: 0,
    };
  }

  saveStats() {
    try {
      localStorage.setItem(STORAGE_KEY_USAGE, JSON.stringify(this.stats));
    } catch {}
  }

  checkQuota() {
    const now = Date.now();

    // Throttle check
    if (now - this.lastRequestTimestamp < MIN_INTERVAL_MS) {
      throw new Error("Thao tác quá nhanh. Vui lòng đợi vài giây trước khi gửi tiếp.");
    }

    // Daily quota check
    const today = new Date().toISOString().slice(0, 10);
    if (this.stats.date !== today) {
      this.stats.date = today;
      this.stats.requestsToday = 0;
    }

    if (this.stats.requestsToday >= MAX_REQUESTS_PER_DAY) {
      throw new Error(`Bạn đã đạt giới hạn ${MAX_REQUESTS_PER_DAY} lượt hỏi DkAI hôm nay. Hãy quay lại vào ngày mai!`);
    }

    return true;
  }

  recordSuccess() {
    this.lastRequestTimestamp = Date.now();
    this.stats.requestsToday++;
    this.stats.requestsThisMonth++;
    this.saveStats();
  }

  recordError() {
    this.stats.errorCount++;
    this.saveStats();
  }

  getUsage() {
    return { ...this.stats, remainingToday: Math.max(0, MAX_REQUESTS_PER_DAY - this.stats.requestsToday) };
  }
}

export const aiGuard = new AIGuard();
export default aiGuard;
