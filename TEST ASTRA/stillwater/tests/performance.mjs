import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
const executablePath =
  process.env.CHROME_PATH ||
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].find(existsSync);
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://127.0.0.1:5173/");
await page.waitForFunction(() => !!window.__stillwater, { timeout: 60000 });
await page.waitForTimeout(10500);
const high = await page.evaluate(() => ({
  fps: document.querySelector("#fps").textContent,
  state: window.__stillwater.getState(),
  render: window.__stillwater.renderer.info.render,
}));
await page.locator("#drop-ball").click();
await page.waitForTimeout(3000);
console.log(
  JSON.stringify({
    errors,
    idle: high,
    duringSplash: await page.locator("#fps").textContent(),
  }),
);
await page.screenshot({ path: "test-results/desktop.png" });
await page.close();
const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await mobile.goto("http://127.0.0.1:5173/");
await mobile.waitForFunction(() => !!window.__stillwater, { timeout: 60000 });
await mobile.waitForTimeout(3000);
await mobile.screenshot({ path: "test-results/mobile.png" });
console.log(
  JSON.stringify({ mobileFPS: await mobile.locator("#fps").textContent() }),
);
await browser.close();
