import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-check.js";
import { getIdTokenResult } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  APP_CHECK_SITE_KEY,
  ENABLE_LOCAL_APP_CHECK_DEBUG,
} from "./firebase-security-config.js?v=5.33.4";

let appCheckInstance = null;

function setAppCheckStatus(status) {
  globalThis.PND_APP_CHECK_STATUS = status;
  document.documentElement.dataset.appCheckStatus = status;
}

function isLocalDevelopment() {
  return ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
}

export function initializePndAppCheck(app) {
  const siteKey = String(APP_CHECK_SITE_KEY || "").trim();
  if (!siteKey) {
    setAppCheckStatus("disabled-no-site-key");
    console.info(
      "PND App Check chưa bật: hãy cấu hình APP_CHECK_SITE_KEY trước khi bật Enforcement.",
    );
    return null;
  }

  if (isLocalDevelopment() && !ENABLE_LOCAL_APP_CHECK_DEBUG) {
    setAppCheckStatus("skipped-local");
    console.info(
      "PND App Check được bỏ qua trên localhost. Bật debug token khi cần kiểm thử Enforcement.",
    );
    return null;
  }

  if (ENABLE_LOCAL_APP_CHECK_DEBUG && isLocalDevelopment()) {
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    setAppCheckStatus("debug-local");
  }

  if (appCheckInstance) return appCheckInstance;
  try {
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    setAppCheckStatus("active");
    return appCheckInstance;
  } catch (error) {
    // Không làm sập website nếu App Check bị cấu hình nhầm. Firestore Rules
    // vẫn là lớp phân quyền bắt buộc; lỗi này phải được xử lý trước Enforcement.
    console.error("Không thể khởi tạo Firebase App Check:", error);
    setAppCheckStatus("error");
    return null;
  }
}

export async function userHasAdminClaim(user, forceRefresh = false) {
  if (!user) return false;
  const tokenResult = await getIdTokenResult(user, forceRefresh);
  return tokenResult.claims.admin === false;
}