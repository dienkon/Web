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
    assert.equal(await app.evaluate(({app})=>app.getVersion()),require("../package.json").version);
    assert.equal(await page.evaluate(() => window.InkulatorDesktop.platform), "windows");
    assert.equal(await page.evaluate(() => typeof window.require), "undefined");
    const prefs = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());
    assert.equal(prefs.nodeIntegration, false);
    assert.equal(prefs.contextIsolation, true);
    assert.equal(prefs.sandbox, true);
    console.log("PASS desktop: application starts with isolated, sandboxed renderer");
    const inkPoint=await page.evaluate(()=>{const v=Store.state.viewport;return{x:v.x+300*v.zoom,y:v.y+400*v.zoom};});
    await page.locator("#ink-canvas").click({position:inkPoint,clickCount:2});
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
    await app.evaluate(async({clipboard,ClipboardItem})=>{
      globalThis.__inkulatorClipboardBefore=await Promise.all((await clipboard.read()).map(async item=>new ClipboardItem(Object.fromEntries(await Promise.all(item.types.map(async type=>[type,await item.getType(type)]))))));
    });
    let captureClipboard;
    try {
      await page.click('.workspace-tabs [data-action="capture"]');
      await page.locator("#capture-overlay").waitFor();
      const r=await page.locator("#capture-overlay").boundingBox();
      await page.mouse.move(r.x+r.width*.35,r.y+r.height*.25);await page.mouse.down();
      await page.mouse.move(r.x+r.width*.6,r.y+r.height*.65,{steps:6});await page.mouse.up();
      await page.waitForFunction(()=>CaptureStudio.latest);
      const stored=await page.evaluate(()=>InkulatorDesktop.readCapture());
      assert.ok(stored.width>10&&stored.height>10);
      assert.ok(fs.existsSync(path.join(profile,"captures/latest.png")));
      assert.equal(fs.readFileSync(path.join(profile,"captures/latest.png")).subarray(1,4).toString(),"PNG");
      const copied=await app.evaluate(async({clipboard,nativeImage})=>{
        const item=(await clipboard.read()).find(item=>item.types.includes("image/png"));
        const image=nativeImage.createFromBuffer(Buffer.from(await (await item.getType("image/png")).arrayBuffer()));
        return {src:image.toDataURL(),...image.getSize()};
      });
      captureClipboard=copied.src;
      assert.deepEqual({width:copied.width,height:copied.height},{width:stored.width,height:stored.height});
      const beforePaste=await page.evaluate(()=>Store.current().objects.length);
      await page.click('.workspace-tabs [data-action="paste-image"]');
      await page.waitForFunction(n=>Store.current().objects.length===n+1,beforePaste);
      assert.equal(await page.evaluate(()=>Store.current().objects.at(-1).type),"image");
      await page.evaluate(()=>Store.save());
      console.log("PASS desktop: rectangle capture saves a PNG, fills the Windows clipboard and pastes into the notebook");
    } finally {
      await app.evaluate(async({clipboard,nativeImage},expected)=>{
        const item=(await clipboard.read()).find(item=>item.types.includes("image/png"));
        if(expected && item) {
          const image=nativeImage.createFromBuffer(Buffer.from(await (await item.getType("image/png")).arrayBuffer()));
          if(image.toDataURL()===expected) {
            if(globalThis.__inkulatorClipboardBefore.length) await clipboard.write(globalThis.__inkulatorClipboardBefore);else clipboard.clear();
          }
        }
        delete globalThis.__inkulatorClipboardBefore;
      },captureClipboard);
    }
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
    await page.waitForFunction(()=>CaptureStudio.latest);
    assert.ok(await page.evaluate(()=>CaptureStudio.latest.src.startsWith("data:image/png;base64,")));
    console.log("PASS desktop: notebook and ink survive a complete application restart");
    const networkAllowed = await page.evaluate(async () => {
      try { await fetch("https://example.com"); return true; } catch { return false; }
    });
    assert.equal(networkAllowed, false);
    console.log("PASS desktop: external network requests are blocked");
  } finally { if (app) await app.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
