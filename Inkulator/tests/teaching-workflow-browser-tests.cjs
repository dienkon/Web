const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");
const { PDFDocument } = require("pdf-lib");

async function run(channel, pdf) {
  const browser = await chromium.launch({ channel, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, offline: true });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, "../index.html")).href);
    await page.waitForFunction(() => window.Scrble);
    assert.equal(await page.locator("#page-title-input").count(), 0);

    await page.evaluate(() => { Store.state.settings.autoPages = false; App.openPanel("settings"); });
    assert.equal(await page.locator("#setting-pdf-first-page").isChecked(), true);
    await page.selectOption("#setting-capture-mode", "question");
    await page.evaluate(() => { App.closePanel(); CaptureStudio.start(); });
    assert.equal(await page.locator("#capture-mode").inputValue(), "question");
    await page.keyboard.press("Escape");

    const importPdf = async () => {
      await page.locator("#pdf-file").setInputFiles({ name: "Đề kiểm tra.pdf", mimeType: "application/pdf", buffer: pdf });
      await page.locator("#pdf-range").waitFor();
      await page.click("#dialog-confirm");
      await page.waitForFunction(() => Store.current().objects[0]?.type === "pdf");
    };
    await importPdf();
    assert.equal(await page.evaluate(() => Store.book().pages.length), 1);
    await page.evaluate(() => Store.undo());
    assert.equal(await page.evaluate(() => Store.current().objects.length), 0);
    await page.evaluate(() => App.openPanel("settings"));
    await page.uncheck("#setting-pdf-first-page");
    await page.evaluate(() => App.closePanel());
    await importPdf();
    assert.equal(await page.evaluate(() => Store.book().pages.length), 2);

    const fit = await page.evaluate(() => {
      Store.state.viewport = { x: 70, y: -310, zoom: .9 };
      const center = Renderer.area.clientHeight / 2;
      const position = () => (center - Store.state.viewport.y) / Store.state.viewport.zoom;
      const before = position();
      PageFlow.fit("width");
      return Math.abs(position() - before);
    });
    assert.ok(fit < 1e-8);
    await page.evaluate(() => {
      const p = Store.current();
      p.inlineQuestions = [350, 580, 900].map((y, i) => ({ id: Store.uid(), x: 50, y, w: 100, h: 40, title: "Câu " + (i + 1) }));
      Store.state.viewport.y = 20;
    });
    for (const y of [350, 580, 900]) {
      await page.click('[data-action="next-question"]');
      const aligned = await page.evaluate(y => {
        const v = Store.state.viewport;
        return Math.abs(v.y + y * v.zoom - Math.min(100, Renderer.area.clientHeight * .2));
      }, y);
      assert.ok(aligned < 1e-8);
    }

    await page.evaluate(() => {
      Store.state.notebooks.push(Store.notebook("Hình học"));
      Store.switchBook(1);
      Store.state.viewport = { x: 30, y: 20, zoom: 1 };
      Store.state.settings.smartShape = true;
      App.setTool("pen");
      Store.state.pen = "dashed";
      Store.emit();
    });
    const area = await page.locator("#canvas-area").boundingBox();
    await page.mouse.move(area.x + 180, area.y + 120);
    await page.mouse.down();
    await page.mouse.move(area.x + 420, area.y + 230, { steps: 18 });
    await page.mouse.up();
    assert.equal(await page.evaluate(() => Store.current().objects[0]?.data.kind), "dashed");
    await page.evaluate(() => {
      App.setTool("select");
      Store.state.selection = [Store.current().objects[0].id];
      Store.emit();
    });
    const end = await page.evaluate(() => {
      const object = Store.selected()[0], point = Renderer.worldPoint(object, Renderer.lineEnds(object)[1]);
      const v = Store.state.viewport;
      return { x: point.x * v.zoom + v.x, y: point.y * v.zoom + v.y };
    });
    await page.mouse.move(area.x + end.x, area.y + end.y);
    await page.mouse.down();
    await page.mouse.move(area.x + 130, area.y + 300, { steps: 10 });
    await page.mouse.up();
    assert.equal(await page.evaluate(() => Store.current().objects[0].data.dirX), -1);

    await page.evaluate(() => { Panels.insert("pyramid", true, { x: 200, y: 100 }); App.openPanel("solid", Store.selected()[0]); });
    await page.click("#geo-rename-all");
    await page.fill("#geo-vertex-sequence", "TJKLM");
    await page.click("#geo-name-apply");
    await page.click("#geo-name-shift");
    assert.deepEqual(await page.evaluate(() => Object.values(Store.selected()[0].data.vertexLabels)), ["M", "J", "K", "L", "T"]);
    await page.evaluate(() => {
      App.closePanel(); App.closePopover(); TeacherGeometry.setMode("section");
      for (const i of [0, 1, 2, 3]) TeacherGeometry.pick("v:" + i);
    });
    assert.equal(await page.evaluate(() => Store.selected()[0].data.constructions?.length || 0), 0);
    await page.evaluate(() => TeacherGeometry.pick("v:0"));
    const section = await page.evaluate(() => {
      Store.validate(Store.envelope(), true);
      const o = Store.selected()[0], item = Constructions.build(o).items[0];
      return [item.refs.length, item.points.length];
    });
    assert.deepEqual(section, [4, 4]);
    const snap = await page.evaluate(() => {
      const o = Store.selected()[0];
      TeacherGeometry.setMode("freePoint", o);
      const line = TeacherGeometry.lines(o).find(l => l.refs.join() === "v:0,v:1"), [a, b] = line.world;
      TeacherGeometry.handleDown({ button: 0 }, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 4 });
      const item = Constructions.build(o).items.at(-1);
      return { refs: item.refs, point: item.point, vertices: Geometry.mesh(o.data.kind, o.data.params).vertices };
    });
    assert.deepEqual(snap.refs, ["v:0", "v:1"]);
    assert.equal(snap.point[1], snap.vertices[0][1]);
    assert.equal(snap.point[2], snap.vertices[0][2]);

    await page.evaluate(() => {
      TeacherGeometry.cancel();
      App.setTool("pen");
      Store.state.viewport = { x: 30, y: -150, zoom: 1 };
      Store.emit();
    });
    const cdp = await page.context().newCDPSession(page);
    const penPan = (type, y, buttons) => cdp.send("Input.dispatchMouseEvent", {
      type, x: area.x + 160, y: area.y + y, buttons, pointerType: "pen",
      button: type === "mouseMoved" ? "none" : "right", force: .6, clickCount: 1,
    });
    await penPan("mousePressed", 390, 2);
    await penPan("mouseMoved", 285, 2);
    await penPan("mouseReleased", 285, 0);
    await page.waitForFunction(() => Store.state.viewport.y < -265);
    assert.equal(await page.evaluate(() => Store.state.tool), "pen");
    assert.equal(await page.locator("#canvas-context").isHidden(), true);

    await page.evaluate(() => { TeacherGeometry.cancel(); App.setTool("pen"); });
    await page.click("#width-button");
    await page.locator(".pen-palette-grid [data-color='#ef4973']").click();
    await page.getByRole("button", { name: "Ghim màu" }).click();
    assert.equal(await page.evaluate(() => Store.state.color), "#ef4973");
    await page.evaluate(() => {
      App.closePopover();
      Store.switchBook(0);
      Store.save();
    });
    await page.reload();
    await page.waitForFunction(() => window.Scrble);
    const restored = await page.evaluate(() => ({ color: Store.state.color, error: Store.state.loadError }));
    assert.equal(restored.color, "#ef4973", JSON.stringify(restored));
    assert.equal(await page.locator("#colors [data-color]").first().getAttribute("data-color"), "#ef4973");
    assert.equal(await page.evaluate(() => Store.state.settings.captureMode), "question");
    await page.evaluate(() => { App.dispatch("library", {}); });
    await page.click("#folder-new");
    await page.getByRole("textbox", { name: "Tên thư mục mới" }).fill("Toán 12");
    await page.locator(".library-editor button.primary").click();
    assert.equal(await page.locator(".notebook-folder .library-folder-icon").count(), 1);
    await page.click("#notebook-view");
    assert.equal(await page.locator(".notebook-list canvas").count(), 0);
    await page.fill("#notebook-search", "Hình học");
    await page.waitForFunction(() => document.querySelectorAll(".notebook-card").length === 1);
    assert.equal(await page.locator(".notebook-card strong").textContent(), "Hình học");
    await page.locator(".notebook-card summary").click();
    await page.click('.notebook-card [data-do="move"]');
    await page.getByRole("combobox", { name: "Chuyển đến thư mục" }).selectOption("Toán 12");
    await page.locator(".library-editor button.primary").click();
    await page.click('.library-tree [data-folder="Toán 12"]');
    assert.equal(await page.locator(".notebook-card strong").textContent(), "Hình học");
    assert.deepEqual(errors, []);
    console.log(`PASS ${channel}: teaching preferences, PDF replacement, anchored zoom, question jump, dashed shape, section, snapped point, names and document library`);
  } finally {
    await browser.close();
  }
}

(async () => {
  const source = await PDFDocument.create();
  source.addPage([500, 810]);
  const pdf = Buffer.from(await source.save());
  for (const channel of ["chrome", "msedge"]) await run(channel, pdf);
})().catch(error => { console.error(error); process.exitCode = 1; });
