/** Keep effect/operation audits on a fresh bench without the first-visit tour
 * intercepting their pointer input. The onboarding audit deliberately omits
 * this fixture and exercises the real welcome flow. */
export async function prepareLabAuditSession(page) {
  await page.addInitScript(() => {
    localStorage.setItem('chemdex_lab_interactive_tour_v2', JSON.stringify({
      index: 0, completed: false, done: [], vesselId: null,
    }));
  });
}
