/**
 * Report Repository
 */
import { FirebaseRepository } from "./firebase.repository.js";
import { Collections } from "../app/constants.js";
import { memoryCache } from "../cache/memory-cache.js";
import { CacheKeys, cachePolicy } from "../cache/cache-policy.js";
import { APP_CONFIG } from "../config/app-config.js";

export const ReportRepository = {
  /**
   * Create document report
   */
  async createReport(reportData) {
    cachePolicy.invalidateAdmin("reports");
    return await FirebaseRepository.push(Collections.REPORTS, reportData);
  },

  /**
   * Update report (resolve)
   */
  async updateReport(reportId, partial) {
    cachePolicy.invalidateAdmin("reports");
    return await FirebaseRepository.update(Collections.REPORTS, reportId, partial);
  },

  /**
   * Get all reports (Admin)
   */
  async getAllReports(forceFresh = false) {
    if (!forceFresh) {
      const cached = memoryCache.get(CacheKeys.ADMIN_REPORTS);
      if (cached) return cached;
    }

    const reports = await FirebaseRepository.getAll(Collections.REPORTS);
    memoryCache.set(CacheKeys.ADMIN_REPORTS, reports, APP_CONFIG.CACHE.ADMIN_CACHE_TTL_MS);
    return reports;
  },
};
