const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const url = pathToFileURL(path.resolve(__dirname, "../index.html")).href;
const out = path.resolve(__dirname, "../test-results");
fs.mkdirSync(out, { recursive: true });
let count = 0;
const log = (name) => {
  count++;
  console.log("PASS", name);
};
(async () => {
  for (const channel of ["chrome", "msedge"]) {
    const browser = await chromium.launch({ channel, headless: true });
    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
      acceptDownloads: true,
    });
    await context.setOffline(true);
    const page = await context.newPage();
    const errors = [],
      network = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (/^https?:/.test(r.url())) network.push(r.url());
    });
    try {
      await page.goto(url);
      await page.waitForFunction(() => window.Scrble);
      await page.screenshot({ path: path.join(out, channel + "-blank.png") });
      assert.equal(await page.title(), "Sổ tay Toán học — SCRBLE MATH STUDIO");
      log(channel + ": file:// loads with networking offline");
      const draw = async (points) => {
        await page.mouse.move(...points[0]);
        await page.mouse.down();
        for (const p of points.slice(1))
          await page.mouse.move(...p, { steps: 8 });
        await page.mouse.up();
      };
      await draw([
        [400, 430],
        [480, 430],
        [560, 430],
        [640, 430],
        [720, 430],
      ]);
      assert.equal(
        await page.evaluate(() => Store.current().objects.length),
        1,
      );
      assert.ok(
        (await page.evaluate(
          () => Store.current().objects[0].data.points.length,
        )) > 20,
      );
      log(channel + ": continuous real pointer ink");
      const original = await page.evaluate(() => Store.current().objects[0].id);
      await page.keyboard.press("e");
      await draw([
        [560, 420],
        [560, 440],
      ]);
      assert.ok(
        (await page.evaluate(() => Store.current().objects.length)) >= 2,
      );
      assert.ok(
        await page.evaluate(
          (id) => !Store.current().objects.some((o) => o.id === id),
          original,
        ),
      );
      await page.keyboard.press("Control+z");
      assert.equal(
        await page.evaluate(() => Store.current().objects[0].id),
        original,
      );
      await page.keyboard.press("Control+y");
      assert.ok(
        (await page.evaluate(() => Store.current().objects.length)) >= 2,
      );
      log(
        channel +
          ": partial eraser splits vectors; undo/redo restores exact stroke",
      );
      await page.keyboard.press("p");
      await page.locator('[data-color="#d86560"]').click();
      await draw([
        [400, 510],
        [440, 490],
        [480, 510],
        [520, 480],
      ]);
      assert.equal(
        await page.evaluate(() => Store.current().objects.at(-1).style.color),
        "#d86560",
      );
      log(channel + ": color changes persist in actual ink");
      await page.keyboard.press("s");
      await page.keyboard.press("Control+a");
      const oldPos = await page.evaluate(
        () => Store.current().objects[0].position.x,
      );
      await draw([
        [440, 430],
        [470, 460],
      ]);
      assert.ok(
        (await page.evaluate(() => Store.current().objects[0].position.x)) >
          oldPos,
      );
      await page.locator('[data-action="group"]').click();
      assert.equal(
        await page.evaluate(() => Store.current().objects.length),
        1,
      );
      assert.equal(
        await page.evaluate(() => Store.current().objects[0].type),
        "group",
      );
      await page.locator('[data-action="ungroup"]').click();
      assert.ok(
        (await page.evaluate(() => Store.current().objects.length)) >= 3,
      );
      log(channel + ": multiple selection, movement, grouping and ungrouping");
      await page.locator('.workspace-tabs [data-panel="graph"]').click();
      await page
        .locator("#graph-expressions input[type=text]")
        .fill("y=x^3-3x");
      await page.locator("#graph-expressions input[type=text]").press("Enter");
      assert.equal(await page.locator("#graph-error").textContent(), "");
      await page.locator("#graph-roots").click();
      assert.match(
        await page.locator("#graph-analysis").textContent(),
        /1\.732/,
      );
      await page.locator("#graph-insert").click();
      assert.equal(
        await page.evaluate(
          () =>
            Store.current().objects.filter((o) => o.type === "graph").length,
        ),
        1,
      );
      await page.locator('[data-action="close-panel"]').click();
      log(channel + ": graph input, numerical roots and insertion");
      await page.evaluate(() => {
        const o = Store.current().objects.find((o) => o.type === "graph");
        o.position = { x: 450, y: 370 };
        Store.emit();
      });
      const graphCenter = await page.evaluate(() => {
        const o = Store.current().objects.find((o) => o.type === "graph");
        const r = Renderer.area.getBoundingClientRect();
        return {
          x: r.left + o.position.x + o.size.w / 2,
          y: r.top + o.position.y + o.size.h / 2,
        };
      });
      await page.mouse.dblclick(graphCenter.x, graphCenter.y);
      await page.locator("#graph-expressions input[type=text]").fill("1/(x-2)");
      await page.locator("#graph-insert").click();
      assert.equal(
        await page.evaluate(
          () =>
            Store.current().objects.find((o) => o.type === "graph").data
              .expressions[0].text,
        ),
        "1/(x-2)",
      );
      await page.locator('[data-action="close-panel"]').click();
      log(channel + ": double click edits retained graph data");
      await page.locator('.workspace-tabs [data-panel="geometry"]').click();
      await page
        .getByRole("button", { name: "Tam giác · trung tuyến", exact: true })
        .click();
      const vertex = await page.evaluate(() => {
        const o = Store.selected()[0],
          q = Renderer.flatPoint(o, o.data.points[1]),
          r = Renderer.area.getBoundingClientRect();
        return {
          x: r.left + o.position.x + q[0],
          y: r.top + o.position.y + q[1],
        };
      });
      const old = await page.evaluate(
        () => Store.selected()[0].data.points[1][0],
      );
      await draw([
        [vertex.x, vertex.y],
        [vertex.x + 30, vertex.y - 20],
      ]);
      assert.ok(
        (await page.evaluate(() => Store.selected()[0].data.points[1][0])) >
          old,
      );
      await page.locator('[data-action="close-panel"]').click();
      log(
        channel + ": dragging a real geometry vertex updates the construction",
      );
      await page.locator('.workspace-tabs [data-panel="solid"]').click();
      await page
        .getByRole("button", { name: "Hình lập phương", exact: true })
        .click();
      const rotation = await page.evaluate(() =>
        Store.selected()[0].data.rotation.slice(),
      );
      const center = await page.evaluate(() => {
        const o = Store.selected()[0],
          r = Renderer.area.getBoundingClientRect();
        return {
          x: r.left + o.position.x + o.size.w / 2,
          y: r.top + o.position.y + o.size.h / 2,
        };
      });
      await draw([
        [center.x, center.y],
        [center.x + 50, center.y + 25],
      ]);
      assert.notDeepEqual(
        await page.evaluate(() => Store.selected()[0].data.rotation),
        rotation,
      );
      await page.locator('input[data-dimension="a"]').fill("3");
      await page.locator('input[data-dimension="a"]').dispatchEvent("change");
      assert.match(
        await page.locator("#geometry-measurement").textContent(),
        /V ≈ 27/,
      );
      await page.locator("#aux-midpoint").click();
      assert.equal(
        await page.evaluate(() => Store.selected()[0].data.aux.length),
        1,
      );
      await page.locator('[data-action="close-panel"]').click();
      log(
        channel +
          ": actual 3D rotation, model dimensions, volume and auxiliary midpoint",
      );
      await page.locator('.workspace-tabs [data-action="calculator"]').click();
      await page.locator("#calc-input").fill("sin(30)");
      await page.locator("#calc-input").press("Enter");
      assert.equal(await page.locator("#calc-result").textContent(), "0.5");
      await page.locator("#calc-angle").click();
      await page.locator("#calc-input").fill("sin(pi/6)");
      await page.locator("#calc-input").press("Enter");
      assert.equal(await page.locator("#calc-result").textContent(), "0.5");
      await page.locator("#calc-input").fill("1/2+1/3");
      await page.locator("#calc-input").press("Enter");
      assert.equal(await page.locator("#calc-result").textContent(), "5/6");
      await page.locator("#calc-insert").click();
      assert.ok(
        await page.evaluate(() =>
          Store.current().objects.some(
            (o) => o.type === "text" && o.data.text.includes("5/6"),
          ),
        ),
      );
      await page.locator("#calc-close").click();
      log(channel + ": calculator DEG/RAD, exact fraction and insert result");
      await page.keyboard.press("Control+s");
      const savedPromise = page.waitForEvent("download");
      await page.keyboard.press("Control+s");
      const saved = await savedPromise;
      const projectPath = path.join(out, channel + ".smath.json");
      await saved.saveAs(projectPath);
      const raw = JSON.parse(fs.readFileSync(projectPath, "utf8"));
      assert.equal(raw.format, "scrble-math");
      const objectCount = raw.notebook.pages[0].objects.length;
      await page.locator("#open-file").setInputFiles(projectPath);
      assert.equal(
        await page.evaluate(() => Store.current().objects.length),
        objectCount,
      );
      log(channel + ": save/import roundtrip retains editable typed data");
      await page.evaluate(() => Store.save());
      await page.reload();
      await page.waitForFunction(() => window.Scrble);
      assert.equal(
        await page.evaluate(() => Store.current().objects.length),
        objectCount,
      );
      log(channel + ": offline reload restores local notebook");
      const beforeCount = await page.evaluate(
        () => Store.state.notebooks.length,
      );
      await page
        .locator("#open-file")
        .setInputFiles({
          name: "invalid.smath.json",
          mimeType: "application/json",
          buffer: Buffer.from('{"format":"scrble-math","version":999}'),
        });
      assert.equal(
        await page.evaluate(() => Store.state.notebooks.length),
        beforeCount,
      );
      log(channel + ": invalid import leaves existing notebooks unchanged");
      const pdfPromise = page.waitForEvent("download");
      await page.evaluate(() => {
        App.dispatch("export-pdf", {});
      });
      await page.locator("#dialog-confirm").click();
      const pdf = await pdfPromise;
      const pdfPath = path.join(out, channel + ".pdf");
      await pdf.saveAs(pdfPath);
      const bytes = fs.readFileSync(pdfPath);
      assert.equal(bytes.subarray(0, 4).toString(), "%PDF");
      const { PDFDocument } = require("pdf-lib");
      assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
      log(channel + ": valid local PDF export");
      const svgPromise = page.waitForEvent("download");
      await page.evaluate(() => Exporter.svg());
      const svg = await svgPromise;
      const svgPath = path.join(out, channel + ".svg");
      await svg.saveAs(svgPath);
      assert.match(fs.readFileSync(svgPath, "utf8"), /<path/);
      log(channel + ": SVG exports real vector paths");
      await page.screenshot({
        path: path.join(out, channel + "-notebook.png"),
      });
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.screenshot({ path: path.join(out, channel + "-1920.png") });
      await page.setViewportSize({ width: 1366, height: 768 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        1366,
      );
      await page.screenshot({ path: path.join(out, channel + "-1366.png") });
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        390,
      );
      await page.screenshot({ path: path.join(out, channel + "-mobile.png") });
      log(channel + ": 1920, 1366 and mobile layout without document overflow");
      assert.deepEqual(errors, []);
      assert.deepEqual(network, []);
      log(
        channel +
          ": no JavaScript errors and no HTTP requests across tested flows",
      );
    } finally {
      await context.close();
      await browser.close();
    }
  }
  console.log("\n" + count + " browser checks passed.");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
