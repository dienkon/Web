const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const out = path.resolve(__dirname, "../test-results");
let checks = 0;
const pass = (s) => {
  checks++;
  console.log("PASS", s);
};
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true }),
    context = await browser.newContext({
      viewport: { width: 1440, height: 960 },
      acceptDownloads: true,
    }),
    page = await context.newPage();
  const errors = [],
    network = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) network.push(r.url());
  });
  await context.setOffline(true);
  try {
    await page.goto(
      pathToFileURL(path.resolve(__dirname, "../index.html")).href,
    );
    await page.waitForFunction(() => window.Scrble);
    const action = async (a) =>
      page.evaluate((a) => {
        App.dispatch(a, {});
      }, a);
    const calc = async (mode, raw) => {
      await page.locator("#calc-mode").selectOption(mode);
      await page.locator("#advanced-input").fill(raw);
      await page.locator("#advanced-evaluate").click();
      return page.locator("#advanced-output").textContent();
    };
    await action("calculator-tools");
    assert.match(await calc("EQUATION", "1,-5,6"), /x1 ≈ 2\nx2 ≈ 3/);
    await page.locator("#equation-type").selectOption("system");
    await page.locator("#advanced-input").fill("[[1,1],[2,-1]]");
    await page.locator("#system-b").fill("[3,0]");
    await page.locator("#advanced-evaluate").click();
    assert.match(
      await page.locator("#advanced-output").textContent(),
      /x1 ≈ 1\nx2 ≈ 2/,
    );
    await page.locator("#advanced-input").fill("[[1,1],[2,2]]");
    await page.locator("#system-b").fill("[3,6]");
    await page.locator("#advanced-evaluate").click();
    assert.match(
      await page.locator("#advanced-output").textContent(),
      /Vô số nghiệm/,
    );
    await page.locator("#system-b").fill("[3,7]");
    await page.locator("#advanced-evaluate").click();
    assert.match(
      await page.locator("#advanced-output").textContent(),
      /Vô nghiệm/,
    );
    pass(
      "Equation UI: polynomial, unique, infinite and inconsistent linear systems",
    );
    assert.match(await calc("SOLVE", "x^3-2x-5=0"), /2\.094551/);
    assert.match(await calc("TABLE", "x^2+2x"), /f\(x\)/);
    assert.match(await calc("STATISTICS", "1,2,3,4,5"), /Trung bình = 3/);
    await page.locator("#statistics-y").fill("2,4,6,8,10");
    await page.locator("#advanced-evaluate").click();
    assert.match(
      await page.locator("#advanced-output").textContent(),
      /y ≈ 2x \+ 0/,
    );
    pass("SOLVE, TABLE and population statistics with linear regression");
    for (const [mode, expr, result] of [
      ["MATRIX", "det([[1,2],[3,4]])", "-2"],
      ["VECTOR", "norm([3,4])", "5"],
      ["COMPLEX", "abs(3+4i)", "5"],
    ]) {
      await page.locator("#calc-mode").selectOption(mode);
      await page.locator("#calc-input").fill(expr);
      await page.locator("#calc-input").press("Enter");
      assert.equal(await page.locator("#calc-result").textContent(), result);
    }
    await page.locator("#calc-close").click();
    pass("MATRIX, VECTOR, COMPLEX have working expression handlers");
    await page.evaluate(() => App.openPanel("graph"));
    await page
      .locator("#graph-expressions input[type=text]")
      .fill("a*x^2+b*x+c");
    assert.equal(await page.locator("#graph-parameters input").count(), 3);
    await page.locator("#graph-parameters input").first().fill("2");
    await page.locator("#graph-insert").click();
    assert.equal(
      await page.evaluate(() => Store.selected()[0].data.params.a),
      2,
    );
    await page.locator("#graph-expressions input[type=text]").fill("x^2+y^2=9");
    await page.locator("#graph-insert").click();
    const implicit = await page.evaluate(() =>
      Store.validate(Store.envelope()).pages[0].objects.some(
        (o) => o.type === "graph" && o.data.expressions[0].text.includes("y^2"),
      ),
    );
    assert.ok(implicit);
    await page.locator('[data-action="close-panel"]').click();
    pass(
      "Parameter sliders and implicit conic survive validation and insertion",
    );
    const crosses = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 600;
      c.height = 400;
      const ctx = c.getContext("2d"),
        origLine = ctx.lineTo.bind(ctx),
        origMove = ctx.moveTo.bind(ctx);
      let previous = null,
        crosses = 0;
      ctx.moveTo = (x, y) => {
        previous = { x, y };
        origMove(x, y);
      };
      ctx.lineTo = (x, y) => {
        if (
          ctx.strokeStyle === "#268772" &&
          previous &&
          ((previous.x < 400 && x > 400) || (previous.x > 400 && x < 400)) &&
          Math.abs(y - previous.y) > 200
        )
          crosses++;
        previous = { x, y };
        origLine(x, y);
      };
      Graph.draw(
        ctx,
        {
          expressions: [{ text: "1/(x-2)", color: "#268772", visible: true }],
          view: { xmin: -6, xmax: 6, ymin: -4, ymax: 4 },
          params: {},
          axes: true,
        },
        600,
        400,
      );
      return crosses;
    });
    assert.equal(crosses, 0);
    pass("Renderer does not draw a branch-joining segment across the pole x=2");
    await page.evaluate(() => {
      Store.state.selection = [];
      App.setTool("pen");
      Store.state.pen = "fountain";
    });
    const client = await context.newCDPSession(page);
    for (const [type, x, y, force] of [
      ["mousePressed", 400, 450, 0.2],
      ["mouseMoved", 450, 455, 0.4],
      ["mouseMoved", 500, 450, 0.8],
      ["mouseReleased", 500, 450, 0],
    ])
      await client.send("Input.dispatchMouseEvent", {
        type,
        x,
        y,
        button: type === "mouseMoved" ? "none" : "left",
        buttons: type === "mouseReleased" ? 0 : 1,
        pointerType: "pen",
        force,
      });
    const pressures = await page.evaluate(() =>
      Store.current()
        .objects.at(-1)
        .data.points.map((p) => p[2]),
    );
    assert.ok(pressures.some((x) => x < 0.3) && pressures.some((x) => x > 0.7));
    pass("Synthetic stylus Pointer Events preserve distinct pressures");
    const cut = await page.evaluate(() => {
      const o = Store.object(
        "stroke",
        {
          points: [
            [0, 0, 0.3],
            [100, 20, 0.5],
            [200, 0, 0.8],
          ],
          pen: "fountain",
          baseSize: { w: 200, h: 20 },
        },
        {
          position: { x: 150, y: 500 },
          size: { w: 400, h: 60 },
          rotation: 30,
          style: { color: "#9473b6", width: 4, opacity: 1 },
        },
      );
      Store.add(o);
      App.setTool("eraser");
      Store.state.eraser = "partial";
      const q = Renderer.worldPoint(o, { x: 200, y: 60 }),
        r = Renderer.area.getBoundingClientRect();
      return { id: o.id, x: r.left + q.x, y: r.top + q.y };
    });
    await page.mouse.move(cut.x, cut.y);
    await page.mouse.down();
    await page.mouse.up();
    const fragments = await page.evaluate(() =>
      Store.current()
        .objects.filter(
          (o) => o.type === "stroke" && o.style.color === "#9473b6",
        )
        .map((o) => ({
          rotation: o.rotation,
          sx: o.size.w / o.data.baseSize.w,
          sy: o.size.h / o.data.baseSize.h,
          width: o.style.width,
        })),
    );
    assert.equal(fragments.length, 2);
    for (const f of fragments) {
      assert.equal(f.rotation, 30);
      assert.ok(Math.abs(f.sx - 2) < 1e-8 && Math.abs(f.sy - 3) < 1e-8);
      assert.equal(f.width, 4);
    }
    await page.evaluate(() => Store.undo());
    assert.ok(
      await page.evaluate(
        (id) => Store.current().objects.some((o) => o.id === id),
        cut.id,
      ),
    );
    pass(
      "Partial erase preserves rotation, nonuniform scaling, pen width and pressure model",
    );
    await page.evaluate(() => {
      App.openPanel("math");
    });
    await page.locator("#math-template").selectOption("fraction");
    await page.locator("#math-insert").click();
    assert.equal(
      await page.evaluate(() => Store.selected()[0].data.layout.kind),
      "fraction",
    );
    await page.locator("#math-template").selectOption("variation");
    await page.locator("#math-insert").click();
    assert.equal(
      await page.evaluate(() => Store.selected()[0].data.table.length),
      3,
    );
    await page.locator('[data-action="close-panel"]').click();
    pass(
      "Structured fraction and editable variation table insert real objects",
    );
    await page.evaluate(() => {
      App.openPanel("geometry");
    });
    await page
      .getByRole("button", { name: "Tam giác ABC", exact: true })
      .click();
    await page.locator("#aux-parallel").click();
    assert.equal(
      await page.evaluate(() => Store.selected()[0].data.aux[0].type),
      "parallel",
    );
    await page.locator("#aux-perpendicular").click();
    assert.equal(
      await page.evaluate(() => Store.selected()[0].data.aux[1].type),
      "perpendicular",
    );
    await page.locator('[data-action="close-panel"]').click();
    pass(
      "Dynamic parallel and perpendicular constructions are stored by definition",
    );
    await page.evaluate(() => App.openPanel("solid"));
    await page
      .getByRole("button", { name: "Chóp SA ⊥ đáy", exact: true })
      .click();
    assert.match(
      await page.locator("#geometry-measurement").textContent(),
      /V ≈ 32/,
    );
    await page.locator("#aux-height").click();
    await page.locator("#vector-measure").click();
    assert.match(await page.locator("#vector-result").textContent(), /90°/);
    await page.locator("#face-select").selectOption("1");
    assert.equal(
      await page.evaluate(() => Store.selected()[0].data.selectedFace),
      1,
    );
    await page.locator('[data-action="close-panel"]').click();
    pass("Right pyramid height, volume, vector angle and face selection");
    await page.evaluate(() => App.dispatch("lock", {}));
    await page.evaluate(() => {
      Store.state.selection = [];
      App.openPanel("layers");
    });
    await page.getByRole("button", { name: /Mở khóa solid/ }).click();
    assert.ok(
      await page.evaluate(() => !Store.current().objects.some((o) => o.locked)),
    );
    await page.locator('[data-action="close-panel"]').click();
    pass("Locked objects can be recovered from layer manager");
    const imagePath = path.join(out, "tiny.png");
    fs.writeFileSync(
      imagePath,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=",
        "base64",
      ),
    );
    await page.locator("#image-file").setInputFiles(imagePath);
    await page.waitForFunction(() =>
      Store.current().objects.some((o) => o.type === "image"),
    );
    const pngPromise = page.waitForEvent("download");
    await page.evaluate(() => {
      Exporter.png();
    });
    await (await pngPromise).saveAs(path.join(out, "export.png"));
    assert.ok(fs.statSync(path.join(out, "export.png")).size > 100);
    pass("Local image import and PNG export");
    await action("add-page");
    await page.locator("#page-title-input").fill("Trang thứ hai");
    await page.locator("#page-title-input").blur();
    const pdfPromise = page.waitForEvent("download");
    await page.evaluate(() => {
      Exporter.pdf();
    });
    await page.locator("#dialog-confirm").click();
    const pdf = await pdfPromise,
      pdfPath = path.join(out, "multiple-pages.pdf");
    await pdf.saveAs(pdfPath);
    const { PDFDocument } = require("pdf-lib");
    assert.equal(
      (await PDFDocument.load(fs.readFileSync(pdfPath))).getPageCount(),
      2,
    );
    pass("Multi-page PDF preserves the page count");
    await page
      .locator("#open-file")
      .setInputFiles(path.resolve(__dirname, "../examples/Toan-12.smath.json"));
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(out, "example-notebook.png") });
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    pass("Example project renders with no JavaScript errors or HTTP requests");
  } finally {
    await browser.close();
  }
  console.log(checks + " advanced browser checks passed.");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
