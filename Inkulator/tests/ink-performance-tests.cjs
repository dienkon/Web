const { chromium, webkit, devices } = require("playwright");
const assert = require("node:assert/strict");
const path = require("node:path"), fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "..");
const url = pathToFileURL(path.join(root, "index.html")).href;
const report = [];
(async () => {
  for (const engine of (process.env.INKULATOR_TEST_ENGINES?.split(",") || ["chrome", "webkit"])) {
    const browser = engine !== "webkit" ? await chromium.launch({ channel:engine, headless:true }) : await webkit.launch({headless:true,
      ...(process.env.INKULATOR_WEBKIT_EXECUTABLE ? {executablePath:process.env.INKULATOR_WEBKIT_EXECUTABLE} : {})});
    try {
      const context = await browser.newContext({ ...devices["iPad Pro 11"], offline:true });
      await context.addInitScript(() => {
        Object.defineProperty(navigator, "deviceMemory", { value: 4 });
        window.__inkTestSend = (type, id, kind, x, y, extra = {}) => {
          const canvas = document.getElementById("ink-canvas");
          const rect = canvas.getBoundingClientRect();
          canvas.setPointerCapture = () => {};
          return canvas.dispatchEvent(new PointerEvent(type, {
            bubbles: true, pointerId: id, pointerType: kind,
            clientX: rect.left + x, clientY: rect.top + y, button: 0,
            buttons: type === "pointerup" ? 0 : 1, pressure: 0.6, ...extra,
          }));
        };
      });
      const page = await context.newPage(), errors = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.goto(url);
      await page.waitForFunction(() => window.Scrble);
      const baseline = await page.evaluate(() => ({save: Store.state.settings.autosave, undo:Store.state.settings.historyLimit, economy:Store.economyMode()}));
      assert.equal(baseline.save,30000); assert.equal(baseline.undo,500);
      assert.equal(baseline.economy,true);
      const controls = await context.newPage();
      controls.on("pageerror", e => errors.push(e.message));
      await controls.goto(url);
      await controls.waitForFunction(() => window.Scrble);
      const dock = controls.locator("[data-action='toggle-dock']");
      assert.equal(await dock.getAttribute("aria-expanded"), "false");
      assert.equal(await controls.locator("#pen-dock [data-tool='pen']").isHidden(), true);
      await dock.click();
      assert.equal(await controls.locator("#pen-dock [data-tool='pen']").isVisible(), true);
      await dock.click();
      assert.equal(await controls.locator(".canvas-navigation button").count(), 5);
      assert.equal(await controls.locator(".canvas-navigation [data-action='next-question']").isVisible(), true);
      assert.equal(await controls.locator(".canvas-navigation [data-action='previous-page']").count(), 0);
      await controls.evaluate(() => {
        Store.state.viewport = {x:0,y:0,zoom:1};
        Store.current().showTitle = false;
        Store.state.settings.autoPages = false;
        const canvas = document.getElementById("ink-canvas");
        canvas.setPointerCapture = () => {};
        window.sendCanvas = (type, x, y, pointerType = "mouse") => {
          const r = canvas.getBoundingClientRect();
          canvas.dispatchEvent(new PointerEvent(type, {
            bubbles:true, pointerId:7, pointerType, clientX:r.left+x, clientY:r.top+y,
            button:0,buttons:type === "pointerup" ? 0 : 1,pressure:.6,
          }));
        };
        Store.add(Store.object("shape", {kind:"arrow", dirX:1, dirY:-1},
          { position:{x:275,y:270}, size:{w:180,h:90}, rotation:18 }));
        App.setTool("select");
      });
      const line = await controls.evaluate(() => {
        const o = Store.current().objects[0], ends = Renderer.lineEnds(o).map(p => Renderer.worldPoint(o,p));
        sendCanvas("pointerdown", (ends[0].x+ends[1].x)/2, (ends[0].y+ends[1].y)/2);
        sendCanvas("pointerup", (ends[0].x+ends[1].x)/2, (ends[0].y+ends[1].y)/2);
        const handles = CanvasEngine.selectionHandles(o).map(h => h.key);
        const moved = {x:ends[0].x-65,y:ends[0].y+70};
        sendCanvas("pointerdown", ends[1].x, ends[1].y, "touch");
        sendCanvas("pointermove", moved.x, moved.y, "touch");
        sendCanvas("pointerup", moved.x, moved.y, "touch");
        const result = Renderer.lineEnds(o).map(p => Renderer.worldPoint(o,p));
        return {handles, ends, moved, result};
      });
      assert.deepEqual(line.handles, ["end0", "end1"]);
      for (const axis of ["x", "y"]) {
        assert.ok(Math.abs(line.result[0][axis] - line.ends[0][axis]) < 1);
        assert.ok(Math.abs(line.result[1][axis] - line.moved[axis]) < 1);
      }
      const clickLine = () => controls.evaluate(() => {
        const o = Store.current().objects[0], [a,b] = Renderer.lineEnds(o).map(p => Renderer.worldPoint(o,p));
        const r = Renderer.area.getBoundingClientRect();
        document.getElementById("ink-canvas").dispatchEvent(new MouseEvent("contextmenu", {
          bubbles:true, cancelable:true, button:2, clientX:r.left+(a.x+b.x)/2, clientY:r.top+(a.y+b.y)/2,
        }));
      });
      await clickLine();
      assert.equal(await controls.locator("#canvas-context").isHidden(), true);
      await controls.click('#file-tools [data-panel="settings"]');
      await controls.check("#setting-canvas-menu");
      await controls.click('[data-action="close-panel"]');
      await clickLine();
      assert.equal(await controls.locator('#canvas-context [data-action="edit-selection"]').isVisible(), true);
      await controls.click('#ink-tools [data-tool="highlighter"]');
      await controls.click('#colors [data-color="#ff66a6"]');
      await controls.evaluate(() => {
        sendCanvas("pointerdown", 230, 320);
        sendCanvas("pointermove", 295, 330);
        sendCanvas("pointerup", 310, 335);
      });
      assert.deepEqual(await controls.evaluate(() => {
        const o = Store.current().objects.at(-1);
        return [o.data.pen, o.style.color, Store.state.color];
      }), ["highlighter", "#ff66a6", "#111111"]);
      await controls.click('#ink-tools [data-tool="eraser"]');
      await controls.click('#ink-tools [data-tool="eraser"]');
      await controls.click('[data-eraser="circle"]');
      const remaining = await controls.evaluate(() => {
        const page = Store.current();
        page.objects = [[313,313],[350,350]].map(([x,y]) => Store.object("stroke",
          {points:[[0,0,.5]], baseSize:{w:.1,h:.1}, pen:"ballpoint"},
          {position:{x,y},size:{w:.1,h:.1}}));
        Store.invalidateSnapshot();
        Store.emit();
        const drag = () => {
          sendCanvas("pointerdown", 310, 310);
          sendCanvas("pointermove", 390, 390);
          sendCanvas("pointerup", 390, 390);
        };
        drag();
        return page.objects.map(o => o.position.x);
      });
      assert.deepEqual(remaining, [313]);
      await controls.click('#ink-tools [data-tool="eraser"]');
      await controls.click('[data-eraser="square"]');
      await controls.evaluate(() => {
        sendCanvas("pointerdown", 391, 391);
        sendCanvas("pointermove", 310, 345);
        sendCanvas("pointerup", 310, 345);
      });
      assert.equal(await controls.evaluate(() => Store.current().objects.length), 0);
      await controls.evaluate(() => { Store.undo(); Store.save(); });
      assert.equal(await controls.evaluate(() => Store.current().objects[0].position.x), 313);
      await controls.reload();
      await controls.waitForFunction(() => window.Scrble);
      assert.deepEqual(await controls.evaluate(() => [Store.state.settings.canvasMenu,Store.state.settings.highlighterColor]), [true,"#ff66a6"]);
      await controls.close();
      // Keep the rest of the suite on a separate, empty notebook.
      await page.evaluate(() => localStorage.clear());
      console.log(`PASS ${engine}: compact zoom and collapsed dock, opt-in menu, touch endpoint, independent highlighter color, circle/square eraser and Undo`);
      // Native capture is exercised in pen-browser-tests. Synthetic events let
      // us deliver palm, cancellation and coalesced samples in a reproducible order.
      const result = await page.evaluate(() => {
        const canvas = document.getElementById("ink-canvas");
        Store.current().showTitle = false;
        Store.state.viewport = {x:0,y:0,zoom:1};
        const rect = canvas.getBoundingClientRect();
        const send = __inkTestSend;
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
      if (engine !== "webkit") {
        const cdp = await context.newCDPSession(page);
        await cdp.send("Emulation.setCPUThrottlingRate", {rate:4});
      }
      const metrics = await page.evaluate(async () => {
        const p = Store.current();
        p.showTitle = false;
        Store.state.settings.autoPages = false;
        Store.state.viewport = {x:0,y:0,zoom:1};
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
        const canvas = document.getElementById("ink-canvas");
        const overlay = document.getElementById("overlay-canvas");
        const inkContext = canvas.getContext("2d"), overlayContext = overlay.getContext("2d");
        const clearInk = inkContext.clearRect, clearOverlay = overlayContext.clearRect;
        let sceneClears = 0, partialPreviewClears = 0;
        inkContext.clearRect = function (...args) { sceneClears++; return clearInk.apply(this,args); };
        overlayContext.clearRect = function (x,y,w,h) {
          if (w*h < overlay.width*overlay.height) partialPreviewClears++;
          return clearOverlay.call(this,x,y,w,h);
        };
        Store.state.pen = "calligraphy";
        const waitFrame = () => new Promise(requestAnimationFrame);
        const frameGaps = [];
        const commitGaps = [];
        for (let stroke=0; stroke<18; stroke++) {
          const y = 180 + 18*stroke;
          __inkTestSend("pointerdown",80,"pen",100,y);
          for (let step=1; step<=4; step++) {
            const start = performance.now();
            for (let i=0;i<4;i++) __inkTestSend("pointermove",80,"pen",100+13*step+3*i,y+4*Math.sin(step));
            await waitFrame();
            frameGaps.push(performance.now()-start);
          }
          const start = performance.now();
          __inkTestSend("pointerup",80,"pen",166,y+5);
          await waitFrame();
          commitGaps.push(performance.now()-start);
        }
        inkContext.clearRect = clearInk;
        overlayContext.clearRect = clearOverlay;
        frameGaps.sort((a,b)=>a-b);
        commitGaps.sort((a,b)=>a-b);
        return {
          strokes:1200,points:76800,renderMedianMs:samples[7],renderP95Ms:samples[14],
          canvasPixels:canvas.width*canvas.height, sceneClears, partialPreviewClears,
          inkFrameP50Ms:frameGaps[Math.floor(frameGaps.length*.5)],
          inkFrameP95Ms:frameGaps[Math.floor(frameGaps.length*.95)],
          inkCommitP95Ms:commitGaps[Math.floor(commitGaps.length*.95)],
        };
      });
      report.push({engine,...metrics,cpuThrottle:engine!=="webkit"?4:1,historyCharacters:result.historyBytes});
      assert.deepEqual(errors,[]);
      assert.equal(metrics.sceneClears,0,"ordinary ink must not repaint the committed page");
      assert.ok(metrics.partialPreviewClears >= 60,"live strokes must clear only the affected overlay area");
      console.log("BENCHMARK", JSON.stringify(report.at(-1)));
      await context.close();
    } finally { await browser.close(); }
  }
  fs.writeFileSync(path.join(root,"test-results/ink-performance.json"),JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
