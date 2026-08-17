import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const PROTECTED_ROUTES = new Set([
  "events",
  "exams",
  "ranking",
  "admin-grading",
]);
const SYNC_THROTTLE_MS = 1500;

let syncPromise = null;
let lastSyncStartedAt = 0;

function isEmailVerifiedClaim(tokenResult) {
  return tokenResult?.claims?.email_verified === true;
}

function updateVerifiedUi(user) {
  window.capNhatGiaoDienTaiKhoan?.(user);
  window.voHieuHoaCacheNguoiDung?.({ ketQua: true, phien: true });
}

export async function syncEmailVerification({ force = false } = {}) {
  const user = getAuth().currentUser;
  if (!user) {
    return { signedIn: false, verified: false, refreshed: false };
  }

  if (syncPromise) return syncPromise;

  const now = Date.now();
  if (!force && now - lastSyncStartedAt < SYNC_THROTTLE_MS) {
    return {
      signedIn: true,
      verified: Boolean(user.emailVerified),
      refreshed: false,
    };
  }
  lastSyncStartedAt = now;

  syncPromise = (async () => {
    const wasVerified = Boolean(user.emailVerified);
    let tokenVerified = false;

    try {
      tokenVerified = isEmailVerifiedClaim(await user.getIdTokenResult());
    } catch (error) {
      console.warn("Chưa đọc được trạng thái token xác minh email:", error);
    }

    if (!force && wasVerified && tokenVerified) {
      return { signedIn: true, verified: true, refreshed: false };
    }

    await user.reload();
    if (!user.emailVerified) {
      updateVerifiedUi(user);
      return { signedIn: true, verified: false, refreshed: false };
    }

    if (force || !tokenVerified) await user.getIdToken(true);
    updateVerifiedUi(user);
    return {
      signedIn: true,
      verified: true,
      refreshed: !wasVerified || !tokenVerified || force,
    };
  })().finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

window.pndSyncEmailVerification = syncEmailVerification;

async function refreshActiveView() {
  if (document.getElementById("view-events")?.classList.contains("active")) {
    await window.taiDanhSachSuKien?.();
    return;
  }
  if (document.getElementById("view-exams")?.classList.contains("active")) {
    await window.taiDanhSachDeThi?.();
    return;
  }
  if (document.getElementById("view-ranking")?.classList.contains("active")) {
    await window.taiBangXepHang?.(
      document.getElementById("ranking-event-select")?.value,
      true,
    );
    return;
  }
  if (document.getElementById("view-dashboard")?.classList.contains("active")) {
    await window.taiDuLieuDashboard?.();
  }
}

async function syncWhenReturningToApp() {
  if (document.hidden || window.antiCheatDangBat) return;

  try {
    const result = await syncEmailVerification();
    if (!result.refreshed) return;

    await refreshActiveView();
    if (window.Swal) {
      await window.Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Email đã được xác minh",
        showConfirmButton: false,
        timer: 2200,
        timerProgressBar: true,
      });
    }
  } catch (error) {
    console.warn("Chưa thể tự đồng bộ trạng thái xác minh email:", error);
  }
}

const originalNavigate = window.navigateTo;
if (
  typeof originalNavigate === "function" &&
  !originalNavigate.pndEmailVerificationReady
) {
  const verifiedNavigate = async function (route, ...args) {
    if (PROTECTED_ROUTES.has(route)) {
      try {
        await syncEmailVerification();
      } catch (error) {
        console.warn("Chưa thể làm mới quyền trước khi chuyển trang:", error);
      }
    }
    return originalNavigate.call(this, route, ...args);
  };
  verifiedNavigate.pndEmailVerificationReady = true;
  window.navigateTo = verifiedNavigate;
}

window.addEventListener("focus", syncWhenReturningToApp);
document.addEventListener("visibilitychange", syncWhenReturningToApp);
queueMicrotask(syncWhenReturningToApp);

window.addEventListener(
  "pagehide",
  () => {
    window.removeEventListener("focus", syncWhenReturningToApp);
    document.removeEventListener("visibilitychange", syncWhenReturningToApp);
  },
  { once: true },
);
