/**
 * Master Seed Data Orchestrator for DkDocShop 2.0 (Section AA - CE)
 */
import { SEED_DOCUMENTS } from "./documents.seed.js";
import { SEED_CATEGORIES } from "./categories.seed.js";
import { SEED_SUBJECTS } from "./subjects.seed.js";
import { SEED_BANNERS } from "./banners.seed.js";
import { SEED_PROMOTIONS } from "./promotions.seed.js";
import { SEED_BUNDLES } from "./bundles.seed.js";
import { SEED_REVIEWS } from "./reviews.seed.js";
import { SEED_USERS } from "./users.seed.js";
import { SEED_TRANSACTIONS } from "./transactions.seed.js";
import { SEED_PURCHASES } from "./purchases.seed.js";
import { SEED_NOTIFICATIONS } from "./notifications.seed.js";
import { SEED_ANNOUNCEMENTS } from "./announcements.seed.js";
import { SEED_AUDIT_LOGS } from "./audit-logs.seed.js";

export {
  SEED_DOCUMENTS,
  SEED_CATEGORIES,
  SEED_SUBJECTS,
  SEED_BANNERS,
  SEED_PROMOTIONS,
  SEED_BUNDLES,
  SEED_REVIEWS,
  SEED_USERS,
  SEED_TRANSACTIONS,
  SEED_PURCHASES,
  SEED_NOTIFICATIONS,
  SEED_ANNOUNCEMENTS,
  SEED_AUDIT_LOGS,
};

/**
 * Initialize fallback or demo seed data into the reactive state store
 */
export const initSeedData = (store) => {
  if (!store) return;
  const state = store.getState();

  // Populate documents if empty
  const docCount = Object.keys(state.documents.items || {}).length;
  if (docCount === 0) {
    const docMap = {};
    SEED_DOCUMENTS.forEach((doc) => {
      docMap[doc.id] = {
        ...doc,
        // Ensure backward compatibility fields
        category: doc.categories?.[0] || doc.subject,
        thumbnailUrl: doc.thumbnail,
        price: doc.price,
        downloadsCount: doc.purchaseCount,
        rating: doc.rating,
      };
    });
    store.setDocuments(docMap);
  }

  // Populate notifications if empty
  if ((state.notifications.items || []).length === 0) {
    store.setNotifications(SEED_NOTIFICATIONS);
  }
};

export default {
  SEED_DOCUMENTS,
  SEED_CATEGORIES,
  SEED_SUBJECTS,
  SEED_BANNERS,
  SEED_PROMOTIONS,
  SEED_BUNDLES,
  SEED_REVIEWS,
  SEED_USERS,
  SEED_TRANSACTIONS,
  SEED_PURCHASES,
  SEED_NOTIFICATIONS,
  SEED_ANNOUNCEMENTS,
  SEED_AUDIT_LOGS,
  initSeedData,
};
