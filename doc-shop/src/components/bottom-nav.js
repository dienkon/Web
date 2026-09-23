/**
 * Mobile Bottom Navigation removed per user specification
 */
export function renderBottomNav() {
  const navEl = document.getElementById("mobile-bottom-nav");
  if (navEl) {
    navEl.remove();
  }
}

export default renderBottomNav;

