const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { _electron } = require("playwright");
const { PDFDocument } = require("pdf-lib");

const [, , executablePath, report] = process.argv;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "inkulator-release-244-"));
const env = { ...process.env, INKULATOR_TEST_PROFILE: profile };

async function run() {
  const app = await _electron.launch({ executablePath, args: ["--software-rendering"], env, timeout: 60000 });
  let metrics;
  try {
    const page = await app.firstWindow();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.waitForFunction(() => window.Scrble && DocumentFiles.status === "Đã lưu tệp trên máy");
    const runtime = await app.evaluate(({ app }) => ({
      version: app.getVersion(), packaged: app.isPackaged, gpu: app.getGPUFeatureStatus().gpu_compositing,
    }));
    assert.equal(runtime.version, require("../package.json").version);
    assert.equal(runtime.packaged, true);
    assert.match(runtime.gpu, /disabled|unavailable/i);
    assert.equal((await page.evaluate(() => InkulatorDesktop.gemini.status())).configured, false);

    const doc = await PDFDocument.create();
    for (let i = 1; i <= 64; i++) {
      const sheet = doc.addPage([600, 800]);
      sheet.drawText(`Question ${i}. Inkulator release fixture`, { x: 50, y: 600 });
      sheet.drawText(`Question ${i + 1}. Continue`, { x: 52, y: 450 });
    }
    await page.evaluate(() => {
      Object.defineProperty(navigator, "deviceMemory", { value: 4 });
      Renderer.resize();
    });
    assert.equal(await page.evaluate(() => Store.economyMode()), true);
    await page.locator("#pdf-file").setInputFiles({ name: "Release fixture.pdf", mimeType: "application/pdf", buffer: Buffer.from(await doc.save()) });
    await page.locator("#pdf-range").waitFor();
    await page.click("#dialog-confirm");
    await page.waitForFunction(() => Store.book().pages.length === 64 && PDFTiles.stats().rendered > 0, null, { timeout: 60000 });
    await page.click('[data-action="next-question"]');
    await page.waitForFunction(y => {
      const v = Store.state.viewport;
      return Math.abs(v.y + y * v.zoom - Math.min(100, Renderer.area.clientHeight * .2)) < 1e-8;
    }, 400);
    await page.evaluate(() => DocumentFiles.flush());

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    metrics = await page.evaluate(async () => {
      Store.state.notebooks.push(Store.notebook("Audit 4 GiB"));
      Store.switchBook(Store.state.notebooks.length - 1);
      const s = Store.state, p = Store.current();
      s.settings.autoPages = false;
      s.viewport = { x: 0, y: 20, zoom: 1 };
      p.objects = Array.from({ length: 1200 }, (_, i) => Store.object("stroke", {
        points: Array.from({ length: 64 }, (_, j) => [j * 2, 18 + 10 * Math.sin(j / 5), .5]),
        pen: "ballpoint", baseSize: { w: 126, h: 40 },
      }, { position: { x: 30 + i % 12 * 65, y: 140 + Math.floor(i / 12) * 10 }, size: { w: 126, h: 40 } }));
      Store.emit();
      Renderer.render();
      const frame = () => new Promise(requestAnimationFrame);
      const percentile = (samples, p) => samples.sort((a, b) => a-b)[Math.ceil(samples.length * p) - 1];
      const canvas = document.getElementById("ink-canvas"), r = canvas.getBoundingClientRect();
      const ink = canvas.getContext("2d"), clear = ink.clearRect;
      let sceneClears = 0, pointerId = 60;
      ink.clearRect = (...args) => { sceneClears++; return clear.apply(ink, args); };
      const send = (target, type, x, y) => target.dispatchEvent(new PointerEvent(type, {
        pointerId, pointerType: "pen", clientX: r.left + x, clientY: r.top + y,
        button: 0, buttons: type === "pointerup" ? 0 : 1, pressure: .45 + (x % 5) / 12, bubbles: true,
      }));
      canvas.setPointerCapture = () => {};
      const previews = [], commits = [];
      const brushes = InkBrush.catalog.map(([id]) => id);
      for (const [i, brush] of [...brushes, "highlighter"].entries()) {
        s.pen = brush;
        s.tool = brush === "highlighter" ? "highlighter" : "pen";
        const y = 150 + i * 21;
        for (let j = 0; j < 2; j++) {
          const x = 180 + j * 120;
          send(canvas, "pointerdown", x, y);
          for (let batch = 1; batch <= 5; batch++) {
            const t = performance.now();
            for (let k = 0; k < 5; k++) send(canvas, "pointermove", x + batch * 14 + 2 * k, y + 8 * Math.sin(batch / 2));
            await frame();
            previews.push(performance.now() - t);
          }
          const t = performance.now();
          send(canvas, "pointerup", x + 86, y);
          await frame();
          commits.push(performance.now() - t);
          pointerId++;
        }
      }
      ink.clearRect = clear;
      let captured;
      CaptureStudio.start({ onCapture: region => { captured = region; } });
      const overlay = document.getElementById("capture-overlay");
      const overlayCanvases = overlay.querySelectorAll("canvas").length;
      overlay.setPointerCapture = () => {};
      send(overlay, "pointerdown", 120, 210);
      const drag = [];
      for (let i = 1; i <= 25; i++) {
        const t = performance.now();
        send(overlay, "pointermove", 120 + i * 10, 210 + i * 5);
        await frame();
        drag.push(performance.now() - t);
      }
      const release = performance.now();
      send(overlay, "pointerup", 370, 335);
      while (!captured && CaptureStudio.active && performance.now() - release < 5000) await frame();
      return {
        seededStrokes: 1200, seededPoints: 76800, committedStrokes: p.objects.length - 1200,
        brushes: [...brushes, "highlighter"], sceneClears, overlayCanvases,
        inkPreviewP95Ms: percentile(previews, .95), inkCommitP95Ms: percentile(commits, .95),
        captureDragP95Ms: percentile(drag, .95), capturePngMs: performance.now() - release,
        capturedPng: captured?.src.startsWith("data:image/png;base64,") || false,
        canvasPixels: canvas.width * canvas.height,
      };
    });
    assert.equal(metrics.committedStrokes, 22);
    assert.equal(metrics.sceneClears, 0);
    assert.equal(metrics.overlayCanvases, 0);
    assert.equal(metrics.capturedPng, true);
    assert.ok(metrics.inkPreviewP95Ms < 50 && metrics.inkCommitP95Ms < 80 && metrics.captureDragP95Ms < 50, JSON.stringify(metrics));
    assert.deepEqual(errors, []);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await page.evaluate(() => DocumentFiles.flush());
    fs.writeFileSync(report, JSON.stringify({ runtime, pdfPages: 64, cpuThrottle: 4, simulatedDeviceMemoryGiB: 4, ...metrics }, null, 2));
    console.log("PASS packaged Windows x64, PDF navigation and low-memory pen/capture workload", JSON.stringify(metrics));
  } finally {
    await app.close();
  }
}

run().catch(e => { console.error(e); process.exitCode = 1; });
