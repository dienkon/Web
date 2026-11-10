import { Page, BrowserContext, expect } from '@playwright/test';
const guestContexts: BrowserContext[] = [];
export async function closeGuestContexts() {
  await Promise.all(guestContexts.splice(0).map(c => c.close()));
}

export async function guestPage(context: BrowserContext) {
  const guest = await context.browser()!.newContext({ baseURL: 'http://localhost:3000', permissions: ['camera', 'microphone'] });
  guestContexts.push(guest);
  return guest.newPage();
}
export async function createTestRoom(page: Page) {
  const response = await page.request.post('/api/rooms');
  expect(response.status()).toBe(201);
  const { code, hostToken } = await response.json();
  expect(code).toMatch(/^[A-Z2-9]{9}$/);
  await page.addInitScript(({ code, hostToken }) => localStorage.setItem(`meetclass_host_${code}`, hostToken), { code, hostToken });
  return code as string;
}
