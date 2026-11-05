const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
(async () => {
  const product = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, "../dist/SCRBLE-MATH-STUDIO");
  assert.ok(
    fs.existsSync(path.join(product, "index.html")),
    "Build the package first",
  );
  for (const channel of ["chrome", "msedge"]) {
    const browser = await chromium.launch({ channel, headless: true });
    try {
      const ctx = await browser.newContext({
        offline: true,
        viewport: { width: 1366, height: 768 },
        acceptDownloads: true,
      });
      const page = await ctx.newPage(),
        errors = [],
        failed = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("requestfailed", (r) => failed.push(r.url()));
      await page.goto(pathToFileURL(path.join(product, "index.html")).href);
      await page.waitForFunction(() => window.Scrble);
      await page
        .locator("#open-file")
        .setInputFiles(path.join(product, "examples/Toan-12.smath.json"));
      await page.waitForFunction(() =>
        Store.current().objects.some((o) => o.type === "solid"),
      );
      assert.equal(
        await page.evaluate(() => MathEngine.exact("1/2+1/3")),
        "5/6",
      );
      await page.locator('.workspace-tabs [data-panel="solid"]').click();
      assert.equal(await page.locator(".library-item").count(), 13);
      assert.deepEqual(errors, []);
      assert.deepEqual(failed, []);
      console.log(
        "PASS packaged index.html offline:",
        channel,
        browser.version(),
      );
    } finally {
      await browser.close();
    }
  }
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const ctx = await browser.newContext({
      offline: true,
      acceptDownloads: true,
    });
    await ctx.addInitScript(() => {
      Storage.prototype.setItem = function () {
        throw new DOMException("Storage blocked", "SecurityError");
      };
    });
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(path.join(product, "index.html")).href);
    await page.waitForFunction(() => window.Scrble);
    assert.equal(
      await page.evaluate(() => Store.state.storageAvailable),
      false,
    );
    assert.match(await page.locator("#save-state").textContent(), /thủ công/);
    await page.evaluate(() =>
      App.insertText("Vẫn lưu được tệp khi storage bị chặn"),
    );
    const pending = page.waitForEvent("download");
    await page.keyboard.press("Control+s");
    const download = await pending;
    assert.ok(download.suggestedFilename().endsWith(".smath.json"));
    console.log(
      "PASS storage blocked: visible fallback and actual manual download",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
