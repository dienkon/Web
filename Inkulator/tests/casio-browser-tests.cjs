const { chromium } = require("playwright");
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), { pathToFileURL } = require("node:url");
const url = (file) => pathToFileURL(path.resolve(__dirname, "..", file)).href;
fs.mkdirSync(path.resolve(__dirname, "../test-results"), { recursive: true });
(async () => {
  for (const channel of ["chrome", "msedge"]) {
    const b = await chromium.launch({ channel, headless: true }), context = await b.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
    await context.setOffline(true);
    const p = await context.newPage(), errors = [], network = [], failed = [];
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("request", (r) => {
      if (/^https?:/.test(r.url())) network.push(r.url());
    });
    p.on("requestfailed", (r) => failed.push(r.url().slice(0, 120)));
    try {
      await p.goto(url("index.html"));
      await p.locator('.workspace-tabs [data-action="calculator"]').click();
      await p.locator('#native-web').click();
      const f = await p.locator("#casio-frame").contentFrame();
      await f.locator("#btn-1").waitFor();
      await p.waitForFunction(() => document.querySelector("#casio-calculator")?.dataset.ready==='true');
      for (const k of ["1", "add", "1", "EQUALS"]) await f.locator('[data-key="' + k + '"]').click();
      const frame = p.frames().find((f2) => f2.url().includes("/runtime.html"));
      assert.equal(await frame.evaluate(() => casioApp.displayResult), "2");
      assert.ok(await frame.evaluate(() => {
        try {
          parent.Store;
          return false;
        } catch (e) {
          return e.name === "SecurityError";
        }
      }));
      await frame.evaluate(() => document.fonts.ready);
      assert.equal(await frame.evaluate(() => document.fonts.status), "loaded");
      await p.screenshot({ path: path.resolve(__dirname, "../test-results", channel + "-casio.png") });
      console.log("PASS", channel, "offline original calculator, isolated frame and fonts");
      const before = await p.evaluate(() => Store.current().objects.length);
      await p.locator('[data-casio="result"]').click();
      await p.waitForFunction((n2) => Store.current().objects.length === n2 + 1, before);
      assert.match(await p.evaluate(() => Store.current().objects.at(-1).data.text), /1\+1\n= 2/);
      await p.locator('[data-casio="lcd"]').click();
      await p.waitForFunction(() => Store.current().objects.at(-1)?.type === "image", {}, { timeout: 1e4 });
      const dimensions = await p.evaluate(async () => {
        const image = new Image();
        image.src = Store.current().objects.at(-1).data.src;
        await image.decode();
        return [image.naturalWidth, image.naturalHeight];
      });
      assert.deepEqual(dimensions, [768, 290]);
      console.log("PASS", channel, "insert original LCD PNG and result");
      const original = await context.newPage();
      await original.goto(url("vendor/casio-fx580vnx/upstream/index.html"));
      await original.waitForFunction(() => window.casioApp);
      const modes = ["COMP", "CMPLX", "BASE-N", "MAT", "VCT", "STAT", "DIST", "TABLE", "EQN", "INEQ", "RATIO", "SHEET"];
      const cases = [
        ["sin", "3", "0", "close_paren", "EQUALS"],
        ["1", "add", "2", "ENG", "EQUALS"],
        ["1", "5", "pow"],
        ["1", "2", "2", "2", "EQUALS", "3", "EQUALS", "4", "EQUALS", "5", "EQUALS"],
        ["1", "3", "1", "EQUALS", "2", "EQUALS", "3", "EQUALS"],
        ["1", "EQUALS", "2", "EQUALS", "3", "EQUALS", "optn"],
        ["1", "0", "EQUALS", "0", "EQUALS", "1", "EQUALS"],
        ["x_var", "sqr", "EQUALS", "EQUALS", "1", "EQUALS", "3", "EQUALS", "1", "EQUALS"],
        ["2", "2", "1", "EQUALS", "neg", "5", "EQUALS", "6", "EQUALS"],
        ["2", "1", "1", "EQUALS", "0", "EQUALS", "neg", "1", "EQUALS"],
        ["1", "1", "EQUALS", "2", "EQUALS", "4", "EQUALS"],
        ["4", "2", "EQUALS", "7", "EQUALS"]
      ];
      const snapshot = () => ({
        mode: casioApp.state.modeName,
        os: casioApp.osState,
        expression: casioApp.expression,
        result: casioApp.displayResult,
        lcd: document.getElementById("lcd-screen").innerText.replace(/\s+/g, " ").trim()
      });
      await original.evaluate(() => {
        for (const key of ["1", "add", "1", "EQUALS"]) casioApp.handleKey(key);
      });
      for (let i = 0; i < 12; i++) {
        for (const target of [frame, original]) {
          await target.evaluate(() => casioApp.selectMode(1));
          await target.locator("#btn-MENU").click();
          await target.locator("#btn-" + (i < 9 ? i + 1 : ["neg", "deg", "recip"][i - 9])).click();
        }
        assert.equal(await frame.evaluate(() => casioApp.state.modeName), modes[i]);
        assert.deepEqual(await frame.evaluate(snapshot), await original.evaluate(snapshot), modes[i] + " menu");
        for (const target of [frame, original]) await target.evaluate((keys) => keys.forEach((k) => casioApp.handleKey(k)), cases[i]);
        assert.deepEqual(await frame.evaluate(snapshot), await original.evaluate(snapshot), modes[i] + " calculations");
        console.log("PASS", channel, modes[i], "matches upstream menu and calculations");
      }
      assert.deepEqual(await frame.evaluate(() => [casioApp.sheetState.cells.A1, casioApp.sheetState.cells.A2]), [42, 7]);
      await original.close();
      const state = await frame.evaluate(snapshot), src = await p.locator("#casio-frame").getAttribute("src");
      const pen = await context.newCDPSession(p);
      const drag = async (selector, dx, dy) => {
        const box = await p.locator(selector).boundingBox(), x = box.x + 12, y = box.y + 12;
        await pen.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, pointerType: "pen" });
        await pen.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1, pointerType: "pen" });
        await pen.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x + dx, y: y + dy, button: "left", buttons: 1, pointerType: "pen" });
        await pen.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x + dx, y: y + dy, button: "left", buttons: 0, clickCount: 1, pointerType: "pen" });
      };
      const initial = await p.locator("#casio-calculator").boundingBox();
      await drag(".casio-heading", -200, 0);
      const moved = await p.locator("#casio-calculator").boundingBox();
      assert.ok(moved.x < initial.x - 100);
      await drag(".casio-resize", -55, -90);
      assert.ok((await p.locator("#casio-calculator").boundingBox()).width < moved.width - 30);
      await p.locator('[data-casio="pin"]').click();
      const pinned = await p.locator("#casio-calculator").boundingBox();
      await drag(".casio-heading", 100, 20);
      assert.deepEqual(await p.locator("#casio-calculator").boundingBox(), pinned);
      await p.locator('[data-casio="pin"]').click();
      await p.locator('[data-casio="minimize"]').click();
      assert.ok((await p.locator("#casio-calculator").boundingBox()).height < 60);
      const savedHeight=await p.locator('#casio-calculator').evaluate(el=>el.style.height);
      await p.evaluate(()=>window.dispatchEvent(new Event('resize')));
      assert.equal(await p.locator('#casio-calculator').evaluate(el=>el.style.height),savedHeight);
      await p.locator('[data-casio="minimize"]').click();
      await p.locator('[data-casio="maximize"]').click();
      assert.equal((await p.locator("#casio-calculator").boundingBox()).width, 1366);
      await p.locator('[data-casio="maximize"]').click();
      await p.locator('[data-casio="close"]').click();
      const savedSize=await p.locator('#casio-calculator').evaluate(el=>[el.style.width,el.style.height]);
      await p.evaluate(()=>window.dispatchEvent(new Event('resize')));
      assert.deepEqual(await p.locator('#casio-calculator').evaluate(el=>[el.style.width,el.style.height]),savedSize);
      await p.locator('.workspace-tabs [data-action="calculator"]').click();
      await p.locator('#native-web').click();
      assert.equal(await p.locator("#casio-frame").getAttribute("src"), src);
      assert.deepEqual(await frame.evaluate(snapshot), state);
      console.log("PASS", channel, "drag, resize, pin, minimize, maximize and reopen preserve state");
      await frame.evaluate(() => casioApp.selectMode(1));
      const tool = await p.evaluate(() => Store.state.tool);
      await frame.locator("#btn-1").focus();
      await p.keyboard.type("12+3");
      await p.keyboard.press("Enter");
      assert.equal(await frame.evaluate(() => casioApp.rawResult), 15);
      await frame.locator("#btn-STO").click();
      await frame.locator("#btn-neg").click();
      assert.equal(await frame.evaluate(() => casioApp.engine.variables.A), 15);
      assert.equal(await p.evaluate(() => Store.state.tool), tool);
      await frame.locator("#tb-btn-keylog").click();
      assert.ok(await frame.locator("#emulator-keylog-panel").isVisible());
      await frame.locator("#keylog-close-btn").click();
      await frame.locator("#tb-btn-popup").click();
      assert.ok(await frame.locator("#emulator-popup-display").isVisible());
      await frame.locator("#tb-btn-popup").click();
      const zoom = await frame.evaluate(() => emulatorUI.zoomLevel);
      await frame.locator("#tb-btn-zoom-in").click();
      assert.notEqual(await frame.evaluate(() => emulatorUI.zoomLevel), zoom);
      console.log("PASS", channel, "keyboard isolation, variable memory, key log, popup LCD and zoom");
      await p.evaluate(() => {
        window.casioClipboardWrites = 0;
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: { write: async () => {
          window.casioClipboardWrites++;
        } } });
      });
      let download = p.waitForEvent("download");
      await frame.locator("#tb-btn-capture").click();
      let png = await download;
      assert.equal(png.suggestedFilename(), "Casio-LCD.png");
      assert.equal(await p.evaluate(() => window.casioClipboardWrites), 1);
      const data = fs.readFileSync(await png.path());
      assert.equal(data.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
      await p.evaluate(() => {
        Object.defineProperty(navigator, "clipboard", { configurable: true, value: { write: async () => {
          throw Error("denied");
        } } });
      });
      download = p.waitForEvent("download");
      await frame.locator("#tb-btn-capture").click();
      png = await download;
      assert.equal(png.suggestedFilename(), "Casio-LCD.png");
      console.log("PASS", channel, "camera PNG, clipboard delegation and denied clipboard fallback");
      const n = await p.evaluate(() => Store.current().objects.length);
      await p.evaluate(() => window.postMessage({ channel: "inkulator-casio-v1", token: document.querySelector("#casio-frame").src.split("#")[1], type: "result", text: "forged" }, "*"));
      await frame.evaluate(() => parent.postMessage({ channel: "inkulator-casio-v1", token: "wrong", type: "result", text: "forged" }, "*"));
      await p.waitForTimeout(50);
      assert.equal(await p.evaluate(() => Store.current().objects.length), n);
      await frame.locator("#tb-btn-update").click();
      assert.match(await frame.locator("body").innerText(), /ngoại tuyến/);
      console.log("PASS", channel, "message validation and offline build information");
      await p.setViewportSize({ width: 390, height: 844 });
      await p.waitForFunction(()=>{const r=document.getElementById('casio-calculator').getBoundingClientRect();return r.right<=innerWidth+.1&&r.bottom<=innerHeight+.1;});
      const small = await p.locator("#casio-calculator").boundingBox(), close = await p.locator('[data-casio="close"]').boundingBox();
      assert.ok(small.x >= 0 && small.x + small.width <= 390.1 && small.y + small.height <= 844.1);
      assert.ok(close.x >= 0 && close.x + close.width <= 390);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= 390));
      await p.screenshot({ path: path.resolve(__dirname, "../test-results", channel + "-casio-small.png") });
      console.log("PASS", channel, "small display keeps window controls accessible");
      assert.deepEqual(errors, []);
      assert.deepEqual(network, []);
      assert.deepEqual(failed, []);
    } finally {
      await b.close();
    }
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
