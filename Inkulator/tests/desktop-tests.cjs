const { _electron: electron } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
fs.mkdirSync(path.join(root, "test-results"), { recursive: true });
const profile = fs.mkdtempSync(path.join(root, "test-results/desktop-profile-"));
const executablePath = process.argv[2] && path.resolve(process.argv[2]);
const options = {
  ...(executablePath ? { executablePath, args: [] } : { args: [root] }),
  env: { ...process.env, INKULATOR_TEST_PROFILE: profile }, timeout: 60000,
};
(async () => {
  let app;
  try {
    app = await electron.launch(options);
    let page = await app.firstWindow();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.waitForFunction(() => window.Scrble);
    assert.equal(await page.evaluate(() => window.InkulatorDesktop.platform), "windows");
    assert.equal(await page.evaluate(() => typeof window.require), "undefined");
    const prefs = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());
    assert.equal(prefs.nodeIntegration, false);
    assert.equal(prefs.contextIsolation, true);
    assert.equal(prefs.sandbox, true);
    console.log("PASS desktop: application starts with isolated, sandboxed renderer");
    await page.locator("#ink-canvas").click({position:{x:300,y:250},clickCount:2});
    assert.deepEqual(await page.evaluate(() => [Store.state.tool,Store.state.selection.length,Store.state.panel]),["pen",0,null]);
    console.log("PASS desktop: native double click writes dots without opening object controls");
    const marker = "Desktop persistence " + Date.now();
    await page.evaluate((marker) => {
      Store.transaction(() => Store.book().title = marker);
      const token = Store.beginInk();
      const o = Store.object("stroke", { points: [[0, 0, .5], [90, 40, .8]], baseSize: {w:90,h:40}, pen: "ballpoint" });
      Store.current().objects.push(o);
      Store.commitInk(token, [{pageId:Store.current().id,object:o}]);
      Store.save();
    }, marker);
    await page.evaluate(() => InkulatorDesktop.flush());
    await page.screenshot({ path: path.join(root, "test-results/desktop-workspace.png") });
    await page.click('.workspace-tabs [data-action="calculator"]');
    await page.frameLocator("#casio-frame").locator("button").first().waitFor({state:"attached"});
    console.log("PASS desktop: bundled Casio iframe loads inside the packaged application");
    assert.deepEqual(errors, []);
    await app.close();
    app = await electron.launch(options);
    page = await app.firstWindow();
    await page.waitForFunction(() => window.Scrble);
    assert.equal(await page.evaluate(() => Store.book().title), marker);
    assert.equal(await page.evaluate(() => Store.current().objects[0].type), "stroke");
    console.log("PASS desktop: notebook and ink survive a complete application restart");
    const networkAllowed = await page.evaluate(async () => {
      try { await fetch("https://example.com"); return true; } catch { return false; }
    });
    assert.equal(networkAllowed, false);
    console.log("PASS desktop: external network requests are blocked");
  } finally { if (app) await app.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
