import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import assert from "node:assert/strict";
const executablePath =
  process.env.CHROME_PATH ||
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].find(existsSync);
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForFunction(() => !!window.__stillwater, { timeout: 60000 });
await page.waitForTimeout(1500);
await mkdir("test-results", { recursive: true });
await page.screenshot({ path: "test-results/desktop.png" });
const initial = await page.evaluate(() => window.__stillwater.getState());
await page.locator("#drop-ball").click();
await page.waitForFunction(
  () => window.__stillwater.getState().rippleCount > 0,
  { timeout: 30000 },
);
assert.ok(
  (await page.evaluate(() => window.__stillwater.getState())).rippleCount > 0,
  "dropping ball produces water ripples",
);
await page.locator("#reset-ball").click();
await page.waitForTimeout(250);
const ballScreen = await page.evaluate(
  () => window.__stillwater.getState().ballScreen,
);
await page.mouse.move(ballScreen.x, ballScreen.y);
await page.mouse.down();
assert.equal(
  await page.evaluate(() => window.__stillwater.physics.held),
  true,
  "pointer picks up the ball",
);
await page.mouse.move(ballScreen.x + 120, ballScreen.y - 85, { steps: 8 });
await page.mouse.up();
assert.equal(
  await page.evaluate(() => window.__stillwater.physics.held),
  false,
  "pointer releases the ball",
);
assert.ok(
  await page.evaluate(() => window.__stillwater.physics.velocity.length() > 0),
  "throw has momentum",
);
await page.locator('[data-light="dusk"]').click();
assert.equal(
  await page.locator('[data-light="dusk"]').getAttribute("aria-pressed"),
  "true",
);
await page.locator("#wind").fill("0.8");
assert.equal(await page.locator("#wind-label").textContent(), "Fresh breeze");
await page.locator("#waves").fill("0.9");
assert.equal(await page.locator("#waves-label").textContent(), "Playful waves");
await page.locator("#pause").click();
const pausedTime = await page.evaluate(
  () => window.__stillwater.getState().elapsed,
);
await page.waitForTimeout(350);
assert.equal(
  await page.evaluate(() => window.__stillwater.getState().elapsed),
  pausedTime,
  "pause freezes simulation",
);
await page.locator("#pause").click();
await page.locator("#about").click();
assert.equal(
  await page.locator("#about-dialog").evaluate((el) => el.open),
  true,
);
await page.locator("#close-about").click();
await page.locator("#sound").click();
assert.equal(await page.locator("#sound").getAttribute("aria-pressed"), "true");
await page.locator("#sound").click();
const previousQuality = await page.evaluate(
  () => window.__stillwater.getState().highQuality,
);
await page.locator("#quality").click();
assert.notEqual(
  await page.evaluate(() => window.__stillwater.getState().highQuality),
  previousQuality,
);
await page.locator('[data-light="golden"]').click();
await page.locator("#reset-ball").click();
await page.mouse.move(750, 700);
await page.mouse.down();
await page.mouse.move(860, 690, { steps: 8 });
await page.mouse.up();
await page.locator("#reset-view").click();
await page.screenshot({ path: "test-results/desktop.png" });
const gpu = await page.evaluate(() => {
  const gl = window.__stillwater.renderer.getContext(),
    info = gl.getExtension("WEBGL_debug_renderer_info");
  return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : "Unavailable";
});
const final = await page.evaluate(() => window.__stillwater.getState());
const fps = await page.locator("#fps").textContent();
await page.close();
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
mobile.on("pageerror", (e) => errors.push(e.message));
await mobile.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await mobile.waitForFunction(() => !!window.__stillwater, { timeout: 60000 });
assert.equal(
  await mobile.locator("#toggle-panel").getAttribute("aria-expanded"),
  "false",
);
await mobile.locator("#toggle-panel").click();
await mobile.locator("#drop-ball").click();
await mobile.locator("#toggle-panel").click();
await mobile.waitForTimeout(800);
await mobile.screenshot({ path: "test-results/mobile.png" });
assert.equal(
  await mobile.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  ),
  false,
  "mobile has no horizontal overflow",
);
assert.deepEqual(errors, [], "no browser or shader errors");
console.log(
  JSON.stringify({
    checks: 15,
    errors,
    gpu,
    initial,
    final,
    fps,
    mobileOverflow: false,
  }),
);
await browser.close();
