const { chromium } = require("playwright"),
  { PDFDocument, rgb, degrees } = require("pdf-lib"),
  assert = require("node:assert/strict"),
  fs = require("fs"),
  path = require("path"),
  { pathToFileURL } = require("url");
const root = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, ".."),
  out = path.join(__dirname, "../test-results");
fs.mkdirSync(out, { recursive: true });
let checks = 0;
const pass = (s) => {
  console.log("PASS", s);
  checks++;
};
(async () => {
  const doc = await PDFDocument.create();
  for (let i = 0; i < 34; i++) {
    const p = doc.addPage([600, 800]);
    p.drawRectangle({
      x: 40,
      y: 720,
      width: 520,
      height: 40,
      color: rgb(0.8, 0.2, 0.1),
    });
    p.drawText("PAGE " + (i + 1), { x: 60, y: 680, size: 28 });
    for (let y = 50; y < 650; y += 10)
      p.drawLine({
        start: { x: 40, y },
        end: { x: 560, y },
        thickness: 0.25,
        color: rgb(0.1, 0.1, 0.1),
      });
    if (i === 2) p.setRotation(degrees(90));
  }
  const file = path.join(out, "continuous-34-pages.pdf");
  fs.writeFileSync(file, await doc.save());
  for (const channel of ["chrome", "msedge"]) {
    const browser = await chromium.launch({ channel, headless: true });
    try {
      const context = await browser.newContext({
          offline: true,
          viewport: { width: 1440, height: 960 },
          deviceScaleFactor: 2,
        }),
        page = await context.newPage(),
        errors = [],
        network = [],
        failed = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("requestfailed", (r) => failed.push(r.url()));
      page.on("request", (r) => {
        if (/^https?:/.test(r.url())) network.push(r.url());
      });
      await page.goto(pathToFileURL(path.join(root, "index.html")).href);
      await page.waitForFunction(() => window.Scrble);
      // Fixed PDF-page counts here; automatic extension is covered by the notebook suite.
      await page.evaluate(() => {
        Store.state.settings.autoPages = false;
      });
      await page.locator("#pdf-file").setInputFiles(file);
      await page.locator("#pdf-range").waitFor();
      assert.equal(await page.locator("#pdf-range").inputValue(), "1-34");
      await page.locator("#dialog-confirm").click();
      await page.waitForFunction(() => Store.book().pages.length === 35);
      const previewCount = await page.evaluate(
        () =>
          Store.book()
            .pages.flatMap((p) => p.objects)
            .filter((o) => o.type === "pdf" && o.data.preview).length,
      );
      assert.equal(previewCount, 1);
      await page.waitForFunction(
        () => document.querySelectorAll(".page-thumb").length === 35,
      );
      assert.equal(
        await page
          .locator(".page-thumb")
          .last()
          .evaluate((c) => c.width),
        1,
      );
      assert.equal(await page.locator("#document-scroll").isVisible(), true);
      pass(
        channel +
          ": imports all 34 pages with only one saved preview and a real continuous scrollbar",
      );
      await page.waitForFunction(
        () =>
          PDFTiles.stats().rendered > 0 &&
          PDFTiles.stats().active === 0 &&
          PDFTiles.stats().queued === 0,
      );
      assert.ok(
        !(await page.evaluate(() => PDFTiles.stats().keys)).some((k) =>
          k.includes(":34:"),
        ),
      );
      pass(
        channel + ": visible pages render while distant pages remain unloaded",
      );
      // Actual wheel input travels across the page boundary, without switching thumbnails.
      await page.evaluate(() => App.openPanel("pdf"));
      await page.mouse.move(800, 500);
      for (let i = 0; i < 3; i++) {
        await page.mouse.wheel(0, 1600);
        await page.waitForTimeout(80);
      }
      await page
        .waitForFunction(
          () => Store.state.pageIndex >= 2,
          {},
          { timeout: 6000 },
        )
        .catch(async (e) => {
          console.log(
            await page.evaluate(() => ({
              index: Store.state.pageIndex,
              v: Store.state.viewport,
              busy: CanvasEngine.interacting,
              bar: document.getElementById("document-scroll").scrollTop,
              layout: PageFlow.layout()
                .items.slice(0, 3)
                .map((x) => ({ y: x.y, h: x.page.height })),
            })),
          );
          await page.screenshot({
            path: path.join(out, "pdf-flow-failed.png"),
          });
          throw e;
        });
      const afterWheel = await page.evaluate(() => ({
        index: Store.state.pageIndex,
        visible: PageFlow.visible().map((x) => x.index),
      }));
      assert.ok(afterWheel.visible.includes(afterWheel.index));
      assert.equal(await page.locator("#panel").isVisible(), false);
      pass(
        channel +
          ": wheel scrolling crosses page boundaries and tracks the current notebook page",
      );
      await page.evaluate(() => {
        PageFlow.go(1);
        Store.state.viewport = { x: 20, y: -740, zoom: 0.6 };
        Store.emit();
      });
      await page.waitForFunction(
        () =>
          PageFlow.visible().some((p) => p.index === 1) &&
          PageFlow.visible().some((p) => p.index === 2) &&
          PDFTiles.stats().keys.some((k) => k.includes(":2:")) &&
          PDFTiles.stats().active === 0 &&
          PDFTiles.stats().queued === 0,
      );
      assert.ok(
        await page.evaluate(() => {
          const c = document.getElementById("ink-canvas"),
            d = c.width / c.getBoundingClientRect().width,
            p = c
              .getContext("2d")
              .getImageData(
                Math.round(380 * d),
                Math.round(292 * d),
                1,
                1,
              ).data;
          return Math.abs(p[0] - 204) < 3 && Math.abs(p[1] - 51) < 3;
        }),
      );
      const penClient = await context.newCDPSession(page),
        canvasRect = await page.locator("#ink-canvas").boundingBox();
      for (const [type, x, y] of [
        ["mousePressed", 200, 400],
        ["mouseMoved", 220, 420],
        ["mouseReleased", 240, 430],
      ])
        await penClient.send("Input.dispatchMouseEvent", {
          type,
          x: canvasRect.x + x,
          y: canvasRect.y + y,
          button: type === "mouseMoved" ? "none" : "left",
          buttons: type === "mouseReleased" ? 0 : 1,
          pointerType: "pen",
          force: 0.6,
          clickCount: 1,
        });
      assert.equal(await page.evaluate(() => Store.state.pageIndex), 2);
      assert.equal(
        await page.evaluate(
          () =>
            Store.book().pages[1].objects.filter((o) => o.type === "stroke")
              .length,
        ),
        0,
      );
      assert.equal(
        await page.evaluate(
          () =>
            Store.book().pages[2].objects.filter((o) => o.type === "stroke")
              .length,
        ),
        1,
      );
      pass(
        channel +
          ": both sides of a page boundary render, and tapping the next page writes to that page",
      );
      // Position a known source-PDF point at a known screen pixel, at high zoom and DPR.
      async function showBand(index, zoom) {
        await page.evaluate(
          async ({ index, zoom }) => {
            PageFlow.go(index);
            const o = Store.current().objects.find((o) => o.type === "pdf"),
              d = await PDFStudio.getDocument(o),
              p = await d.getPage(o.data.pageNumber),
              v = p.getViewport({ scale: 1, rotation: o.data.pageRotation }),
              q = v.convertToViewportPoint(300, 740),
              local = {
                x: (q[0] / v.width) * o.size.w,
                y: (q[1] / v.height) * o.size.h,
              };
            Store.state.viewport = {
              zoom,
              x: 320 - local.x * zoom,
              y: 190 - local.y * zoom,
            };
            Store.emit();
          },
          { index, zoom },
        );
        await page.waitForFunction(
          () =>
            PDFTiles.stats().active === 0 &&
            PDFTiles.stats().queued === 0 &&
            PDFTiles.stats().keys.some((k) => k.includes("|16|")),
        );
        await page.waitForFunction(() => {
          const c = document.getElementById("ink-canvas"),
            r = c.getBoundingClientRect(),
            d = c.width / r.width,
            p = c
              .getContext("2d")
              .getImageData(
                Math.round(320 * d),
                Math.round(190 * d),
                1,
                1,
              ).data;
          return (
            Math.abs(p[0] - 204) < 3 &&
            Math.abs(p[1] - 51) < 3 &&
            Math.abs(p[2] - 26) < 3
          );
        });
      }
      await showBand(1, 4);
      const stats = await page.evaluate(() => PDFTiles.stats());
      assert.ok(stats.pixels <= 24 * 1024 * 1024);
      assert.ok(stats.keys.some((k) => k.includes("|16|"))); // 1200 world px / 600 pt × zoom 4 × DPR 2.
      pass(
        channel +
          ": 400% zoom at DPR 2 renders source-detail tiles beyond the former 4096px whole-page cap",
      );
      // Landscape source page has a different PDF->world scale; validate its transform independently.
      await page.evaluate(async () => {
        PageFlow.go(3);
        const o = Store.current().objects[0],
          d = await PDFStudio.getDocument(o),
          p = await d.getPage(3),
          v = p.getViewport({ scale: 1, rotation: 90 }),
          q = v.convertToViewportPoint(300, 740),
          zoom = 4;
        Store.state.viewport = {
          zoom,
          x: 320 - (q[0] / v.width) * o.size.w * zoom,
          y: 190 - (q[1] / v.height) * o.size.h * zoom,
        };
        Store.emit();
      });
      await page.waitForFunction(
        () =>
          PDFTiles.stats().keys.some((k) => k.includes(":3:90|12|")) &&
          PDFTiles.stats().active === 0 &&
          PDFTiles.stats().queued === 0,
      );
      assert.ok(
        await page.evaluate(() => {
          const c = document.getElementById("ink-canvas"),
            r = c.getBoundingClientRect(),
            d = c.width / r.width,
            p = c
              .getContext("2d")
              .getImageData(
                Math.round(320 * d),
                Math.round(190 * d),
                1,
                1,
              ).data;
          return Math.abs(p[0] - 204) < 3 && Math.abs(p[1] - 51) < 3;
        }),
      );
      pass(
        channel +
          ": rotated PDF pages keep source orientation and pixel placement at high zoom",
      );
      // Use trusted pen input to annotate a neighboring visible page, never a physical keyboard.
      const cdp = await context.newCDPSession(page),
        rect = await page.locator("#ink-canvas").boundingBox();
      await page.evaluate(() => App.setTool("pen"));
      for (const [type, x, y] of [
        ["mousePressed", 410, 260],
        ["mouseMoved", 450, 290],
        ["mouseReleased", 480, 310],
      ])
        await cdp.send("Input.dispatchMouseEvent", {
          type,
          x: rect.x + x,
          y: rect.y + y,
          button: type === "mouseMoved" ? "none" : "left",
          buttons: type === "mouseReleased" ? 0 : 1,
          pointerType: "pen",
          force: 0.6,
          clickCount: 1,
        });
      const ink = await page.evaluate(() => ({
        index: Store.state.pageIndex,
        ids: Store.current()
          .objects.filter((o) => o.type === "stroke")
          .map((o) => o.id),
      }));
      assert.equal(ink.index, 3);
      assert.equal(ink.ids.length, 1);
      await page.locator('[data-action="previous-page"]').click();
      await page.locator('[data-action="next-page"]').click();
      assert.deepEqual(
        await page.evaluate(() =>
          Store.current()
            .objects.filter((o) => o.type === "stroke")
            .map((o) => o.id),
        ),
        ink.ids,
      );
      pass(
        channel +
          ": pen annotations stay on their PDF page after scrolling and page navigation",
      );
      await page.evaluate(() => {
        const bar = document.getElementById("document-scroll");
        bar.scrollTop = bar.scrollHeight;
      });
      await page.waitForFunction(() => Store.state.pageIndex === 34);
      await page.waitForFunction(
        () =>
          PDFTiles.stats().keys.some((k) => k.includes(":34:")) &&
          PDFTiles.stats().active === 0 &&
          PDFTiles.stats().queued === 0,
      );
      assert.ok(
        await page.evaluate(() => PDFTiles.stats().pixels <= 24 * 1024 * 1024),
      );
      pass(
        channel +
          ": dragging the document scrollbar to the last page loads it within the tile-memory budget",
      );
      const rapid = await page.evaluate(() => {
        let peak = 0;
        for (let i = 0; i < 50; i++) {
          PageFlow.go(1 + (i % 34));
          Store.state.viewport = { zoom: 4, x: 20, y: -i * 35 };
          Renderer.render();
          peak = Math.max(peak, PDFTiles.stats().active);
        }
        return { peak, canceled: PDFTiles.stats().canceled };
      });
      assert.ok(rapid.peak <= 2);
      assert.ok(rapid.canceled > 0);
      await showBand(1, 4);
      pass(
        channel +
          ": rapid page/zoom navigation cancels stale work and recovers the correct visible pixels",
      );
      await page.evaluate(() => {
        Store.save();
      });
      await page.reload();
      await page.waitForFunction(() => window.Scrble);
      assert.equal(await page.evaluate(() => Store.book().pages.length), 35);
      assert.deepEqual(
        await page.evaluate(() =>
          Store.book()
            .pages[3].objects.filter((o) => o.type === "stroke")
            .map((o) => o.id),
        ),
        ink.ids,
      );
      pass(
        channel + ": offline reload restores the original PDF and annotations",
      );
      await page.evaluate(() => {
        PageFlow.go(1);
        Store.state.viewport = { x: 320, y: 20, zoom: 0.48 };
        Store.emit();
        document.getElementById("toast").classList.remove("visible");
      });
      await page.waitForFunction(
        () =>
          PDFTiles.stats().rendered > 0 &&
          PDFTiles.stats().active === 0 &&
          PDFTiles.stats().queued === 0,
      );
      await page.screenshot({
        path: path.join(out, channel + "-continuous-pdf.png"),
      });
      const scan = await page.evaluate(async () => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 5500;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "rgb(204,51,26)";
        ctx.fillRect(0, 0, 5500, 5500);
        const jpeg = canvas.toDataURL("image/jpeg", 0.9);
        canvas.width = canvas.height = 1;
        const pdf = await PDFLib.PDFDocument.create(),
          image = await pdf.embedJpg(
            Uint8Array.from(atob(jpeg.split(",")[1]), (c) => c.charCodeAt(0)),
          );
        pdf
          .addPage([600, 800])
          .drawImage(image, { x: 0, y: 0, width: 600, height: 800 });
        const doc = await PDFStudio.open(
            await pdf.save(),
            "large-scan-regression",
          ),
          result = await PDFStudio.raster(doc, 1, 0, 600),
          color = [
            ...result.getContext("2d").getImageData(200, 200, 1, 1).data,
          ];
        result.width = result.height = 1;
        return color;
      });
      assert.ok(
        Math.abs(scan[0] - 204) < 4 &&
          Math.abs(scan[1] - 51) < 4 &&
          Math.abs(scan[2] - 26) < 4,
      );
      pass(
        channel +
          ": scanned PDF images above 30 megapixels render instead of disappearing",
      );
      assert.deepEqual(errors, []);
      assert.deepEqual(failed, []);
      assert.deepEqual(network, []);
      pass(
        channel +
          ": continuous PDF viewing remains offline without JavaScript or resource errors",
      );
    } finally {
      await browser.close();
    }
  }
  console.log(checks + " continuous PDF browser checks passed.");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
