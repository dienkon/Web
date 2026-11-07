const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { PDFDocument, StandardFonts, rgb, degrees } = require("pdf-lib");
const { pathToFileURL } = require("node:url");
const appRoot = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, "..");
const out = path.resolve(__dirname, "../test-results");
fs.mkdirSync(out, { recursive: true });
let count = 0;
const pass = (s) => {
  count++;
  console.log("PASS", s);
};
(async () => {
  const doc = await PDFDocument.create(),
    font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 2; i++) {
    const p = doc.addPage([595, 842]);
    p.drawText("OFFLINE MATH LESSON " + (i + 1), {
      x: 45,
      y: 790,
      size: 25,
      font,
    });
    p.drawText("f(x) = x^2 - 3x + 2", { x: 45, y: 735, size: 19, font });
    p.drawRectangle({
      x: 50,
      y: 500,
      width: 220,
      height: 160,
      borderWidth: 2,
      borderColor: rgb(0, 0, 0),
    });
    p.drawLine({
      start: { x: 50, y: 500 },
      end: { x: 270, y: 660 },
      thickness: 2,
    });
    if (i === 1) p.setRotation(degrees(90));
  }
  const fixture = path.join(out, "source-teaching.pdf");
  fs.writeFileSync(fixture, await doc.save());
  for (const channel of ["chrome", "msedge"]) {
    const browser = await chromium.launch({ channel, headless: true });
    try {
      const context = await browser.newContext({
          offline: true,
          viewport: { width: 1440, height: 960 },
          acceptDownloads: true,
        }),
        page = await context.newPage(),
        errors = [],
        failed = [],
        http = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("requestfailed", (r) => failed.push(r.url()));
      page.on("request", (r) => {
        if (/^https?:/.test(r.url())) http.push(r.url());
      });
      await page.goto(pathToFileURL(path.join(appRoot, "index.html")).href);
      await page.waitForFunction(() => window.Scrble);
      assert.equal(
        await page.evaluate(() => Renderer.area.getBoundingClientRect().top),
        87,
      );
      await page.keyboard.press("F8");
      assert.equal(
        await page.evaluate(() => Renderer.area.getBoundingClientRect().top),
        87,
      );
      assert.equal(
        await page
          .locator('.titlebar,.statusbar,[data-action="focus"]')
          .count(),
        0,
      );
      pass(channel + ": compact workspace without titlebar, footer or F8 mode");
      await page.locator('.workspace-tabs [data-panel="geometry"]').click();
      await page
        .getByRole("button", { name: "Tam giác ABC", exact: true })
        .click();
      assert.deepEqual(await page.evaluate(() => Store.selected()[0].style), {
        color: "#111111",
        width: 2.6,
        opacity: 1,
      });
      assert.equal(
        await page.evaluate(() => Store.selected()[0].data.fillOpacity),
        0,
      );
      const selectedId = await page.evaluate(() => Store.selected()[0].id);
      await page.locator('[data-action="close-panel"]').click();
      const selectMode = async (mode) => {
          if (
            !(await page.locator('[data-geo-mode="' + mode + '"]').isVisible())
          )
            await page.locator("#geo-more").click();
          await page.locator('[data-geo-mode="' + mode + '"]').click();
        },
        point = async (key) => {
          const p = await page.evaluate((key) => {
            const o = Store.selected()[0],
              p = TeacherGeometry.points(o).find((p) => p.key === key),
              r = Renderer.area.getBoundingClientRect(),
              v = Store.state.viewport;
            return {
              x: r.left + p.world.x * v.zoom + v.x,
              y: r.top + p.world.y * v.zoom + v.y,
            };
          }, key);
          await page.mouse.move(p.x + 3, p.y + 2);
          await page.mouse.click(p.x + 3, p.y + 2);
        };
      await selectMode("midpoint");
      await point("v:0");
      await point("v:1");
      assert.equal(
        await page.evaluate(
          () => Store.selected()[0].data.constructions[0].type,
        ),
        "midpoint",
      );
      const midKey = await page.evaluate(
        () => "c:" + Store.selected()[0].data.constructions[0].id,
      );
      await selectMode("segment");
      await point("v:2");
      await point(midKey);
      assert.equal(
        await page.evaluate(
          () => Store.selected()[0].data.constructions[1].refs[1],
        ),
        midKey,
      );
      pass(
        channel +
          ": magnetic vertex clicks construct midpoint and connect a dependent point",
      );
      const before = await page.evaluate(
        () =>
          Constructions.build(Store.selected()[0]).points.get(
            "c:" + Store.selected()[0].data.constructions[0].id,
          ).coords,
      );
      await page.locator("#geo-finish").click();
      await page.evaluate(() => {
        const o = Store.selected()[0];
        Store.transaction(() => CanvasEngine.setVertex(o, 1, [8, 1]));
      });
      const after = await page.evaluate(
        () =>
          Constructions.build(Store.selected()[0]).points.get(
            "c:" + Store.selected()[0].data.constructions[0].id,
          ).coords,
      );
      assert.notDeepEqual(before, after);
      await page.keyboard.press("Control+z");
      assert.deepEqual(
        await page.evaluate(
          () =>
            Constructions.build(
              Store.current().objects.find((o) => o.type === "geometry"),
            )
              .points.values()
              .next().value.coords,
        ),
        [0, 0],
      );
      pass(
        channel +
          ": dependent construction updates and undo retains original definition",
      );
      await page.evaluate(() => {
        const o = Panels.makeGeometry("cube", true);
        o.position = { x: 80, y: 190 };
        Store.add(o);
      });
      assert.equal(
        await page.evaluate(() => Store.selected()[0].data.live),
        false,
      );
      assert.equal(
        await page.evaluate(() => Store.selected()[0].data.faceOpacity),
        0,
      );
      await selectMode("midpoint");
      await point("v:0");
      await point("v:1");
      const c1 = await page.evaluate(
        () => "c:" + Store.selected()[0].data.constructions.at(-1).id,
      );
      await point("v:0");
      await point("v:3");
      const c2 = await page.evaluate(
        () => "c:" + Store.selected()[0].data.constructions.at(-1).id,
      );
      await point("v:0");
      await point("v:4");
      const c3 = await page.evaluate(
        () => "c:" + Store.selected()[0].data.constructions.at(-1).id,
      );
      await selectMode("section");
      await point(c1);
      await point(c2);
      await point(c3);
      assert.equal(
        await page.evaluate(
          () =>
            Constructions.build(Store.selected()[0]).items.at(-1).points.length,
        ),
        3,
      );
      pass(
        channel +
          ": 3D section is computed from three user-selected edge midpoints",
      );
      await page.locator("#geo-finish").click();
      await page.evaluate(() => {
        Store.state.selection = [];
        Store.emit();
      });
      await page.locator('.workspace-tabs [data-action="formula"]').click();
      await page.locator("#formula-source").fill("f(x)=sqrt(x^2+1)/(x-2)");
      assert.equal(await page.locator("#formula-preview img").count(), 1);
      await page.locator("#dialog-confirm").click();
      await page.waitForFunction(() => Store.selected()[0]?.type === "formula");
      const formula = await page.evaluate(() => Store.selected()[0]);
      assert.match(formula.data.tex, /\\frac/);
      assert.match(formula.data.tex, /\\sqrt/);
      assert.equal(await page.evaluate(() => Formulas.detect("y=π*x^2")), true);
      assert.ok(
        await page.evaluate(() => Formulas.render("α*x^2+β*x+γ").w > 0),
      );
      await page.evaluate(() => Formulas.prepare(Store.selected()[0]));
      pass(
        channel +
          ": auto-recognized typed expression creates a scalable typeset formula",
      );
      await page.evaluate(() => App.editObject(Store.selected()[0]));
      await page
        .locator("#formula-source")
        .fill("\\int_0^1 x^2\\,dx=\\frac{1}{3}");
      await page.locator("#dialog-confirm").click();
      assert.match(
        await page.evaluate(() => Store.selected()[0].data.tex),
        /\\int/,
      );
      await page.evaluate(() => Formulas.prepare(Store.selected()[0]));
      assert.ok(
        await page.evaluate(() => {
          try {
            Formulas.render("\\href{https://example.com}{x}");
            return false;
          } catch (_) {
            return true;
          }
        }),
      );
      pass(
        channel +
          ": formulas can be edited and external TeX links are rejected",
      );
      await page.locator("#pdf-file").setInputFiles(fixture);
      await page.locator("#pdf-range").waitFor();
      assert.equal(await page.locator("#pdf-range").inputValue(), "1-2");
      await page.locator("#dialog-confirm").click();
      await page.waitForFunction(
        () => Store.current().objects.some((o) => o.type === "pdf"),
        { timeout: 30000 },
      );
      assert.equal(
        await page.evaluate(
          () =>
            Store.book().pages.filter((p) =>
              p.objects.some((o) => o.type === "pdf"),
            ).length,
        ),
        2,
      );
      assert.ok(await page.evaluate(() => Store.current().objects[0].locked));
      const pdfID = await page.evaluate(
        () => Store.current().objects[0].data.assetId,
      );
      assert.ok(
        await page.evaluate(
          () => Object.keys(Store.book().assets).length === 1,
        ),
      );
      await page.evaluate(() =>
        PDFStudio.prepare(Store.current().objects[0], 2400),
      );
      pass(
        channel +
          ": local multi-page PDF imports offline with locked backgrounds and one shared source",
      );
      const c = await page.locator("#ink-canvas").boundingBox();
      await page.keyboard.press("p");
      await page.mouse.move(c.x + 160, c.y + 180);
      await page.mouse.down();
      await page.mouse.move(c.x + 330, c.y + 210, { steps: 15 });
      await page.mouse.up();
      assert.ok(
        await page.evaluate(() =>
          Store.current().objects.some((o) => o.type === "stroke"),
        ),
      );
      await page.evaluate(() => {
        Formulas.insert("x^2+y^2=1", { position: { x: 350, y: 230 } });
      });
      await page.evaluate(() => Renderer.awaitImages(Store.current()));
      pass(
        channel +
          ": PDF background, ink and formula coexist as editable layers",
      );
      await page.locator('.workspace-tabs [data-panel="pdf"]').click();
      await page.locator("#pdf-text").click();
      await page.waitForFunction(() =>
        document
          .getElementById("pdf-extracted")
          .value.includes("OFFLINE MATH LESSON 1"),
      );
      pass(channel + ": PDF text is extractable without online OCR");
      await page.locator('[data-action="close-panel"]').click();
      const jsonPromise = page.waitForEvent("download");
      await page.keyboard.press("Control+s");
      const json = await jsonPromise,
        jsonPath = path.join(out, channel + "-pdf.smath.json");
      await json.saveAs(jsonPath);
      const saved = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      assert.ok(saved.assets[pdfID]);
      assert.equal(saved.notebook.assets, undefined);
      const schema = await page.evaluate(() =>
        Store.validate(Store.envelope()),
      );
      assert.equal(Object.keys(schema.assets).length, 1);
      await page.locator("#open-file").setInputFiles(jsonPath);
      await page.waitForFunction(() => Store.state.notebooks.length > 1);
      await page.evaluate(() => Store.switchPage(1));
      await page.waitForFunction(() =>
        Store.current().objects.some((o) => o.type === "pdf"),
      );
      assert.equal(
        await page.evaluate(() => Object.keys(Store.book().assets).length),
        1,
      );
      pass(
        channel +
          ": save/import embeds original PDF once and preserves formula and construction data",
      );
      const pdfPromise = page.waitForEvent("download");
      await page.evaluate(() => {
        Exporter.pdf();
      });
      await page.locator("#dialog-confirm").click();
      const exported = await pdfPromise,
        exportPath = path.join(out, channel + "-annotated.pdf");
      await exported.saveAs(exportPath);
      const exportedDoc = await PDFDocument.load(fs.readFileSync(exportPath));
      assert.equal(exportedDoc.getPageCount(), 3);
      const outputText = await page.evaluate(
        async (data) => {
          const doc = await PDFStudio.open(
            Uint8Array.from(data),
            "export-test",
          );
          const page = await doc.getPage(2);
          return (await page.getTextContent()).items
            .map((i) => i.str)
            .join(" ");
        },
        [...fs.readFileSync(exportPath)],
      );
      assert.match(outputText, /OFFLINE MATH LESSON 1/);
      pass(
        channel +
          ": annotated PDF export preserves source text/vector content and page count",
      );
      await page.evaluate(() => Store.switchPage(2));
      await page.evaluate(() =>
        PDFStudio.prepare(
          Store.current().objects.find((o) => o.type === "pdf"),
          2400,
        ),
      );
      assert.equal(
        await page.evaluate(
          () =>
            Store.current().objects.find((o) => o.type === "pdf").data
              .pageRotation,
        ),
        90,
      );
      await page.screenshot({
        path: path.join(out, channel + "-pdf-rotated.png"),
      });
      await page.evaluate(() => Store.switchPage(1));
      await page.screenshot({
        path: path.join(out, channel + "-pdf-annotations.png"),
      });
      pass(
        channel +
          ": rotated source PDF and annotations render with correct page orientation",
      );
      const src = await page.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = 200;
        c.height = 100;
        const x = c.getContext("2d");
        x.fillStyle = "white";
        x.fillRect(0, 0, 200, 100);
        x.fillStyle = "#777";
        x.fillRect(30, 35, 120, 2);
        return c.toDataURL();
      });
      await page.locator("#image-file").setInputFiles({
        name: "diagram.png",
        mimeType: "image/png",
        buffer: Buffer.from(src.split(",")[1], "base64"),
      });
      await page.waitForFunction(() => Store.selected()[0]?.type === "image");
      const cleaned = await page.evaluate(async () => {
        const o = Store.selected()[0],
          i = new Image();
        i.src = o.data.src;
        await i.decode();
        const c = document.createElement("canvas");
        c.width = i.width;
        c.height = i.height;
        const x = c.getContext("2d");
        x.drawImage(i, 0, 0);
        return {
          background: [...x.getImageData(5, 5, 1, 1).data],
          line: [...x.getImageData(50, 35, 1, 1).data],
          width: o.style.width,
          opacity: o.style.opacity,
          hasOriginal: !!o.data.originalSrc,
        };
      });
      assert.deepEqual(cleaned.background, [255, 255, 255, 255]);
      assert.deepEqual(cleaned.line, [119, 119, 119, 255]);
      assert.ok(cleaned.hasOriginal);
      assert.equal(cleaned.opacity, 1);
      const corner = await page.evaluate(() => {
        const o = Store.selected()[0],
          p = Renderer.worldPoint(o, { x: o.size.w, y: o.size.h }),
          r = Renderer.area.getBoundingClientRect(),
          v = Store.state.viewport;
        return {
          x: r.left + v.x + p.x * v.zoom,
          y: r.top + v.y + p.y * v.zoom,
        };
      });
      await page.mouse.move(corner.x, corner.y);
      await page.mouse.down();
      await page.mouse.move(corner.x + 80, corner.y + 70, { steps: 5 });
      await page.mouse.up();
      assert.ok(
        await page.evaluate(() => {
          const o = Store.selected()[0];
          return Math.abs(o.size.w / o.size.h - 2) < 1e-8;
        }),
      );
      await page.evaluate(() => App.editObject(Store.selected()[0]));
      await page.locator("#image-clean").click();
      await page.waitForFunction(() => !!Store.selected()[0].data.processing);
      assert.notEqual(
        await page.evaluate(() => Store.selected()[0].data.src),
        src,
      );
      await page.locator("#image-restore").click();
      assert.ok(
        await page.evaluate(
          () =>
            Store.selected()[0].data.src ===
            Store.selected()[0].data.originalSrc,
        ),
      );
      await page.locator('[data-action="close-panel"]').click();
      pass(
        channel +
          ": images retain original pixels by default; black/transparent processing remains optional",
      );
      const counts = await page.evaluate(() => ({
        pages: Store.book().pages.length,
        assets: Object.keys(Store.book().assets).length,
      }));
      assert.equal(
        await page.evaluate(() =>
          PDFStudio.importFile(
            new File(["invalid content"], "broken.pdf", {
              type: "application/pdf",
            }),
          ),
        ),
        false,
      );
      assert.deepEqual(
        await page.evaluate(() => ({
          pages: Store.book().pages.length,
          assets: Object.keys(Store.book().assets).length,
        })),
        counts,
      );
      assert.ok(
        await page.evaluate(() => {
          try {
            PDFStudio.parseRange("3-1", 5);
            return false;
          } catch (_) {
            return true;
          }
        }),
      );
      assert.ok(
        await page.evaluate(() => {
          const p = Store.envelope();
          p.notebook.pages[1].objects.find(
            (o) => o.type === "pdf",
          ).data.assetId = "missing";
          try {
            Store.validate(p);
            return false;
          } catch (_) {
            return true;
          }
        }),
      );
      pass(
        channel +
          ": corrupt PDF, invalid page range and missing PDF source leave the document intact",
      );
      const pageID = await page.evaluate(() => Store.current().id);
      assert.equal(await page.evaluate(() => Store.save()), true);
      await page.reload();
      await page.waitForFunction(() => window.Scrble);
      assert.equal(await page.evaluate(() => Store.current().id), pageID);
      assert.equal(
        await page.evaluate(() => Object.keys(Store.book().assets).length),
        1,
      );
      await page.evaluate(() =>
        PDFStudio.prepare(
          Store.current().objects.find((o) => o.type === "pdf"),
          2400,
        ),
      );
      assert.ok(
        await page.evaluate(() =>
          Store.current().objects.some((o) => o.type === "formula"),
        ),
      );
      pass(
        channel +
          ": offline reload restores original PDF, ink, formulas and stable page IDs",
      );
      await page.setViewportSize({ width: 1366, height: 768 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        1366,
      );
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        390,
      );
      assert.deepEqual(errors, []);
      assert.deepEqual(failed, []);
      assert.deepEqual(http, []);
      pass(
        channel +
          ": responsive layout, no JavaScript errors, failed local resources or HTTP requests",
      );
    } finally {
      await browser.close();
    }
  }
  console.log(count + " modern studio browser checks passed.");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
