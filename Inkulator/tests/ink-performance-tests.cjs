const { chromium, webkit, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path"), fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "..");
const url = pathToFileURL(path.join(root, "index.html")).href;
const report = [];
(async () => {
  for (const engine of ["chrome", "webkit"]) {
    const browser = engine === "chrome" ? await chromium.launch({ channel:"chrome", headless:true }) : await webkit.launch({headless:true,
      ...(process.env.INKULATOR_WEBKIT_EXECUTABLE ? {executablePath:process.env.INKULATOR_WEBKIT_EXECUTABLE} : {})});
    try {
      const context = await browser.newContext({ ...devices["iPad Pro 11"], offline:true });
      const page = await context.newPage(), errors = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.goto(url);
      await page.waitForFunction(() => window.Scrble);
      const baseline = await page.evaluate(() => ({save: Store.state.settings.autosave, undo:Store.state.settings.historyLimit}));
      assert.equal(baseline.save,30000); assert.equal(baseline.undo,500);
      // Native capture is exercised in pen-browser-tests. Synthetic events let
      // us deliver palm, cancellation and coalesced samples in a reproducible order.
      const result = await page.evaluate(() => {
        const canvas = document.getElementById("ink-canvas");
        canvas.setPointerCapture = () => {};
        Store.current().showTitle = false;
        Store.state.viewport = {x:0,y:0,zoom:1};
        const rect = canvas.getBoundingClientRect();
        const send = (type, id, kind, x, y, extra={}) => canvas.dispatchEvent(new PointerEvent(type, {
          bubbles:true, pointerId:id, pointerType:kind, clientX:rect.left+x, clientY:rect.top+y,
          button:0,buttons:type === "pointerup" ? 0 : 1,pressure:.6,...extra,
        }));
        window.__inkTestSend = send;
        send("pointerdown",1,"pen",200,250);
        send("pointerdown",2,"touch",350,300);
        send("pointercancel",2,"touch",350,300);
        send("pointermove",1,"pen",260,280);
        send("pointerup",1,"pen",280,290);
        canvas.dispatchEvent(new MouseEvent("dblclick",{bubbles:true,clientX:rect.left+240,clientY:rect.top+270}));
        const penSafe = Store.state.tool === "pen" && Store.state.selection.length === 0 && Store.state.panel === null;
        const end = Store.current().objects[0];
        const endpoint = end.position.x + end.data.points.at(-1)[0];
        Store.clearHistory();
        // A full notebook snapshot must not occur anywhere in the pen hot path.
        const snapshot = Store.snapshot;
        Store.snapshot = () => { throw Error("Full snapshot during ink"); };
        for (let i=0;i<550;i++) {
          send("pointerdown",10,"pen",100+i%400,350);
          send("pointermove",10,"pen",110+i%400,360);
          send("pointerup",10,"pen",120+i%400,365);
        }
        Store.snapshot = snapshot;
        const historyCount = Store.state.history.length;
        const historyBytes = Store.state.history.reduce((sum,e) => sum+e.bytes,0);
        const initial = Store.current().objects.length;
        for(let i=0;i<400;i++) Store.undo();
        const undone = Store.current().objects.length;
        for(let i=0;i<400;i++) Store.redo();
        const redone = Store.current().objects.length;
        // Snapshot transactions must interoperate with compact ink commands.
        Store.transaction(() => Store.current().objects.at(-1).style.color = "#cc0000");
        Store.undo(); Store.undo(); Store.redo(); Store.redo();
        const mixedColor = Store.current().objects.at(-1).style.color;
        // Changing later objects must never mutate saved ink entries.
        Store.undo();
        Store.current().objects.at(-1).position.x = 999;
        Store.undo(); Store.redo();
        const originalRestored = Store.current().objects.at(-1).position.x !== 999;
        Store.state.settings.autosave = 180000;
        Store.state.settings.historyLimit = 1500;
        Store.save();
        return {penSafe,endpoint,historyCount,historyBytes,initial,undone,redone,mixedColor,originalRestored};
      });
      assert.equal(result.penSafe,true); assert.equal(result.endpoint,280);
      assert.equal(result.historyCount,500); assert.ok(result.historyBytes < 1e6);
      assert.equal(result.initial-result.undone,400); assert.equal(result.initial,result.redone);
      assert.equal(result.mixedColor,"#cc0000"); assert.equal(result.originalRestored,true);
      console.log(`PASS ${engine}: palm rejection, double tap, endpoint, 400 Undo/Redo and mixed history; ${result.historyBytes} history characters`);
      const savedBefore = await page.evaluate(() => {
        Store.state.settings.autosave=40;
        __inkTestSend("pointerdown",25,"pen",300,400);
        __inkTestSend("pointermove",25,"pen",320,420);
        Store.save();
        return localStorage.getItem("scrble-math-library-v1");
      });
      await page.waitForTimeout(120);
      assert.equal(await page.evaluate(() => localStorage.getItem("scrble-math-library-v1")),savedBefore);
      await page.evaluate(() => __inkTestSend("pointerup",25,"pen",330,430));
      await page.waitForFunction(() => !Store.state.dirty);
      await page.evaluate(() => { Store.state.settings.autosave=180000; Store.save(); });
      console.log(`PASS ${engine}: autosave defers throughout an active stroke and resumes after release`);
      await page.reload(); await page.waitForFunction(() => window.Scrble);
      assert.deepEqual(await page.evaluate(() => [Store.state.settings.autosave,Store.state.settings.historyLimit]),[180000,1500]);
      console.log(`PASS ${engine}: long autosave and expanded history settings survive reload`);
      await page.evaluate(() => { App.openPanel("settings"); });
      await page.selectOption("#setting-performance","economy");
      const density = await page.evaluate(() => document.getElementById("ink-canvas").width / Renderer.area.clientWidth);
      assert.ok(density <= 1.51);
      await page.click('[data-action="close-panel"]');
      assert.equal(await page.locator("#panel-reopen").isVisible(),true);
      await page.click("#panel-reopen");
      assert.equal(await page.locator("#setting-performance").inputValue(),"economy");
      await page.evaluate(() => { App.openPanel("paper"); App.openPanel("settings"); App.closePanel(); });
      await page.click("#panel-reopen");
      assert.equal(await page.locator("#setting-performance").inputValue(),"economy");
      const dragGrip = async (selector, dx) => {
        const r = await page.locator(selector).boundingBox();
        await page.mouse.move(r.x+r.width/2,r.y+50);
        await page.mouse.down();
        await page.mouse.move(r.x+r.width/2+dx,r.y+50,{steps:8});
        await page.mouse.up();
      };
      const panelWidth = await page.locator("#panel").evaluate(el=>el.getBoundingClientRect().width);
      await dragGrip(".grip-right",-60);
      assert.ok(await page.locator("#panel").evaluate(el=>el.getBoundingClientRect().width)>panelWidth);
      await dragGrip(".grip-right",500);
      assert.equal(await page.locator("#panel").isHidden(),true);
      await page.click("#panel-reopen");
      await dragGrip(".grip-left",-250);
      assert.equal(await page.locator("#pages-sidebar").isHidden(),true);
      await page.click("#pages-toggle");
      assert.equal(await page.locator("#pages-sidebar").isVisible(),true);
      console.log(`PASS ${engine}: iPad-size controls, panel restore and economy canvas density`);
      await page.screenshot({path:path.join(root,`test-results/${engine}-tablet-workspace.png`)});
      await page.evaluate(() => { App.closePanel(); Store.state.settings.historyLimit=500; });
      if (engine === "chrome") {
        const cdp = await context.newCDPSession(page);
        await cdp.send("Emulation.setCPUThrottlingRate", {rate:4});
      }
      const metrics = await page.evaluate(async () => {
        const p = Store.current();
        p.objects = [];
        for(let i=0;i<1200;i++) {
          const points = Array.from({length:64},(_,j)=>[j*2,20+Math.sin(j/5)*15,.5]);
          p.objects.push(Store.object("stroke",{points,baseSize:{w:126,h:40},pen:"ballpoint"}, {
            position:{x:50+i%12*75,y:180+Math.floor(i/12)*12}, size:{w:126,h:40},
          }));
        }
        Store.emit(); Renderer.render();
        const samples = [];
        for(let i=0;i<15;i++) {
          const t=performance.now(); Renderer.render(); samples.push(performance.now()-t);
          await new Promise(requestAnimationFrame);
        }
        samples.sort((a,b)=>a-b);
        return {strokes:1200,points:76800,renderMedianMs:samples[7],renderP95Ms:samples[14],canvasPixels:document.getElementById("ink-canvas").width*document.getElementById("ink-canvas").height};
      });
      report.push({engine,...metrics,cpuThrottle:engine==="chrome"?4:1,historyCharacters:result.historyBytes});
      assert.deepEqual(errors,[]);
      console.log("BENCHMARK", JSON.stringify(report.at(-1)));
      await context.close();
    } finally { await browser.close(); }
  }
  fs.writeFileSync(path.join(root,"test-results/ink-performance.json"),JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
