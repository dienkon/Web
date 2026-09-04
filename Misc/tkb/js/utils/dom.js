/**
 * DOM Manipulation & Touch Utilities
 */

export function escapeHTML(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function $(selector, context = document) {
  return context.querySelector(selector);
}

export function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

export function on(element, event, handler, options) {
  if (!element) return;
  element.addEventListener(event, handler, options);
}

export function delegate(element, event, selector, handler) {
  if (!element) return;
  element.addEventListener(event, (e) => {
    const target = e.target.closest(selector);
    if (target && element.contains(target)) {
      handler(e, target);
    }
  });
}

/**
 * Mobile Swipe Gesture Detector with Vertical Scroll preservation
 */
export function setupSwipeListener(element, { onSwipeLeft, onSwipeRight, threshold = 45 }) {
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  element.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    },
    { passive: true }
  );

  element.addEventListener(
    "touchend",
    (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleGesture();
    },
    { passive: true }
  );

  function handleGesture() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Distinguish horizontal swipe from vertical scroll
    if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0 && typeof onSwipeLeft === "function") {
        onSwipeLeft();
      } else if (deltaX > 0 && typeof onSwipeRight === "function") {
        onSwipeRight();
      }
    }
  }
}
