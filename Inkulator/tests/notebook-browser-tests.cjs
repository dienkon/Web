const { chromium } = require("playwright"),
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
  checks++;
  console.log("PASS", s);
};
(async () => {
  for (const channel of ["chrome", "msedge"]) {
    const browser = await chromium.launch({ channel, headless: true });
    try {
      const context = await browser.newContext({
          offline: true,
          viewport: { width: 1440, height: 960 },
        }),
        page = await context.newPage(),
        errors = [],
        failed = [],
        network = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("requestfailed", (r) => failed.push(r.url()));
      page.on("request", (r) => {
        if (/^https?:/.test(r.url())) network.push(r.url());
      });
      await page.goto(pathToFileURL(path.join(root, "index.html")).href);
      await page.waitForFunction(() => window.Scrble);
      const client = await context.newCDPSession(page);
      const pen = async (type, x, y, down = false, pressure = 0.6) =>
        client.send("Input.dispatchMouseEvent", {
          type,
          x,
          y,
          button: type === "mouseMoved" ? "none" : "left",
          buttons: down ? 1 : 0,
          pointerType: "pen",
          force: down ? pressure : 0,
          clickCount: 1,
        });
      const tap = async (selector) => {
        const el = page.locator(selector).first();
        await el.waitFor({ state: "visible" });
        await el.scrollIntoViewIfNeeded();
        const r = await el.boundingBox(),
          x = r.x + r.width / 2,
          y = r.y + r.height / 2;
        await pen("mouseMoved", x, y);
        await pen("mousePressed", x, y, true);
        await pen("mouseReleased", x, y);
      };
      const screen = async (P) =>
        page.evaluate((P) => {
          const r = Renderer.area.getBoundingClientRect(),
            v = Store.state.viewport;
          return {
            x: r.left + v.x + P.x * v.zoom,
            y: r.top + v.y + P.y * v.zoom,
          };
        }, P);
      const drag = async (A, B) => {
        await pen("mouseMoved", A.x, A.y);
        await pen("mousePressed", A.x, A.y, true, 0.2);
        for (let i = 1; i <= 12; i++)
          await pen(
            "mouseMoved",
            A.x + ((B.x - A.x) * i) / 12,
            A.y + ((B.y - A.y) * i) / 12,
            true,
            0.2 + i * 0.05,
          );
        await pen("mouseReleased", B.x, B.y);
      };
      const at = async (P) => {
        const p = await screen(P);
        await pen("mousePressed", p.x, p.y, true);
        await pen("mouseReleased", p.x, p.y);
      };
      const vertex = async (key) =>
        at(
          await page.evaluate(
            (key) =>
              TeacherGeometry.points(Store.selected()[0]).find(
                (p) => p.key === key,
              ).world,
            key,
          ),
        );
      const mode = async (key) => {
        if(await page.locator("#geo-hub").getAttribute("aria-expanded")==="false")await tap("#geo-hub");
        if (!(await page.locator('[data-geo-mode="' + key + '"]').first().isVisible()))
          {await tap("#geo-more");const tab=await page.evaluate(k=>GeometryControls.categoryFor(k),key);await tap('[data-geo-tab="'+tab+'"]');}
        await tap('[data-geo-mode="' + key + '"]');
      };
      assert.equal(
        await page.evaluate(
          () => PageFlow.enabled() && Store.state.settings.autoPages,
        ),
        true,
      );
      assert.equal(await page.locator("#document-scroll").isVisible(), true);
      assert.equal(await page.evaluate(() => Store.book().pages.length), 1);
      pass(
        channel +
          ": ordinary notebooks start in continuous mode with automatic pages enabled",
      );
      await tap("#fullscreen-toggle");
      await page.waitForFunction(
        () =>
          !!document.fullscreenElement &&
          document
            .getElementById("fullscreen-toggle")
            .getAttribute("aria-pressed") === "true",
      );
      assert.equal(
        await page.locator("#fullscreen-toggle").getAttribute("aria-pressed"),
        "true",
      );
      await tap("#fullscreen-toggle");
      await page.waitForFunction(
        () =>
          !document.fullscreenElement &&
          document
            .getElementById("fullscreen-toggle")
            .getAttribute("aria-pressed") === "false",
      );
      assert.equal(
        await page.locator("#fullscreen-toggle").getAttribute("aria-pressed"),
        "false",
      );
      pass(
        channel +
          ": header fullscreen button enters and exits actual browser fullscreen through pen taps",
      );
      await page.mouse.move(850, 500);
      await page.mouse.wheel(0, await page.evaluate(()=>Store.current().height*.4*Store.state.viewport.zoom));
      await page.waitForFunction(() => Store.book().pages.length === 2);
      const joined = await page.evaluate(() =>
        PageFlow.layout().items.map((p) => ({
          y: p.y,
          height: p.page.height,
          paper: p.page.paper,
          title: p.page.showTitle,
        })),
      );
      assert.equal(joined[1].y, joined[0].height);
      assert.equal(joined[1].paper, joined[0].paper);
      assert.equal(joined[1].title, false);
      await page.evaluate(() => {
        for (let i = 0; i < 50; i++) Renderer.render();
      });
      assert.equal(await page.evaluate(() => Store.book().pages.length), 2);
      assert.equal(
        await page.evaluate(() => {
          const index = Store.state.pageIndex,
            v = { ...Store.state.viewport };
          CanvasEngine.zoomAt(0.2);
          for (let i = 0; i < 50; i++) Renderer.render();
          const count = Store.book().pages.length;
          Store.state.pageIndex = index;
          Store.state.viewport = v;
          Store.emit();
          return count;
        }),
        2,
      );
      pass(
        channel +
          ": downward scrolling appends a matching page once, with no gap or render-driven growth",
      );
      await tap('#pen-dock [data-tool="pan"]');
      for (let i = 0; i < 2; i++)
        await drag({ x: 850, y: 800 }, { x: 850, y: 100 });
      await page.waitForFunction(() => Store.book().pages.length >= 3);
      assert.ok(await page.evaluate(() => Store.state.pageIndex >= 1));
      await tap('#pen-dock [data-action="pen-options"]');
      await tap("#pen-auto-pages");
      await page.evaluate(() => App.closePopover());
      assert.equal(
        await page.evaluate(() => Store.state.settings.autoPages),
        false,
      );
      const fixedCount = await page.evaluate(() => Store.book().pages.length);
      await page.evaluate(() => {
        PageFlow.go(Store.book().pages.length - 1);
      });
      await page.mouse.move(850, 500);
      await page.mouse.wheel(0, 5000);
      await page.waitForTimeout(100);
      assert.equal(
        await page.evaluate(() => Store.book().pages.length),
        fixedCount,
      );
      pass(
        channel +
          ": repeated scrolling advances through new pages and a visible pen toggle can stop extension",
      );
      await page.evaluate(() => {
        Store.transaction(() => {
          const a = Store.page(),
            b = Store.page();
          for (const p of [a, b])
            Object.assign(p, { width: 1000, height: 600, showTitle: false });
          Store.book().pages = [a, b];
          Store.state.pageIndex = 0;
        });
        Store.state.pageIndex = 0;
        Store.state.selection = [];
        Store.state.viewport = { x: 50, y: -150, zoom: 1 };
        App.setTool("pen");
        Store.clearHistory();
        Store.emit();
      });
      await drag(
        await screen({ x: 150, y: 550 }),
        await screen({ x: 200, y: 650 }),
      );
      const crossing = await page.evaluate(() =>
        Store.book().pages.map((p) =>
          p.objects.filter((o) => o.type === "stroke"),
        ),
      );
      assert.equal(crossing[0].length, 1);
      assert.equal(crossing[1].length, 1);
      const a = crossing[0][0],
        b = crossing[1][0],
        end = a.data.points.at(-1),
        start = b.data.points[0];
      assert.ok(Math.abs(a.position.y + end[1] - 600) < 1e-7);
      assert.ok(Math.abs(b.position.y + start[1]) < 1e-7);
      assert.ok(
        Math.abs(a.position.x + end[0] - b.position.x - start[0]) < 1e-7,
      );
      assert.ok(Math.abs(end[2] - start[2]) < 1e-7);
      await tap('#file-tools [data-action="undo"]');
      assert.equal(
        await page.evaluate(
          () => Store.book().pages.flatMap((p) => p.objects).length,
        ),
        0,
      );
      await tap('#file-tools [data-action="redo"]');
      assert.deepEqual(
        await page.evaluate(() =>
          Store.book().pages.map((p) => p.objects[0].id),
        ),
        [a.id, b.id],
      );
      await page.screenshot({
        path: path.join(out, channel + "-joined-pages.png"),
      });
      pass(
        channel +
          ": one continuous pen stroke crosses a page seam with shared pressure and one Undo/Redo",
      );
      await page.evaluate(() => {
        Store.transaction(() => {
          const p = Store.page();
          Object.assign(p, { width: 1000, height: 600, showTitle: false });
          Store.book().pages = [p];
          Store.state.pageIndex = 0;
        });
        Store.state.pageIndex = 0;
        Store.state.settings.autoPages = true;
        Store.state.viewport = { x: 50, y: -150, zoom: 1 };
        Store.clearHistory();
        Store.emit();
      });
      await drag(
        await screen({ x: 150, y: 550 }),
        await screen({ x: 200, y: 650 }),
      );
      assert.equal(await page.evaluate(() => Store.book().pages.length), 2);
      assert.equal(
        await page.evaluate(
          () => Store.book().pages.flatMap((p) => p.objects).length,
        ),
        2,
      );
      await tap('#file-tools [data-action="undo"]');
      assert.equal(await page.evaluate(() => Store.book().pages.length), 1);
      assert.equal(
        await page.evaluate(() => Store.current().objects.length),
        0,
      );
      await tap('#file-tools [data-action="redo"]');
      assert.equal(await page.evaluate(() => Store.book().pages.length), 2);
      pass(
        channel +
          ": writing past the last page creates its continuation within the same undo transaction",
      );
      const movedId = await page.evaluate(() => {
        Store.state.pageIndex = 0;
        Store.book().pages.forEach((p) => (p.objects = []));
        const o = Store.object(
          "shape",
          { kind: "rectangle" },
          { position: { x: 150, y: 550 }, size: { w: 100, h: 50 } },
        );
        Store.current().objects = [o];
        Store.state.selection = [o.id];
        Store.state.viewport = { x: 50, y: -150, zoom: 1 };
        App.setTool("select");
        Store.clearHistory();
        Store.emit();
        return o.id;
      });
      await drag(
        await screen({ x: 200, y: 575 }),
        await screen({ x: 250, y: 675 }),
      );
      assert.equal(await page.evaluate(() => Store.state.pageIndex), 1);
      assert.equal(
        await page.evaluate(() => Store.book().pages[0].objects.length),
        0,
      );
      assert.equal(await page.evaluate(() => Store.selected()[0].id), movedId);
      assert.ok(
        Math.abs(
          (await page.evaluate(() => Store.selected()[0].position.y)) - 50,
        ) < 1e-7,
      );
      await tap('#file-tools [data-action="undo"]');
      assert.equal(
        await page.evaluate(() => Store.book().pages[0].objects[0].id),
        movedId,
      );
      await tap('#file-tools [data-action="redo"]');
      assert.equal(
        await page.evaluate(() => Store.book().pages[1].objects[0].id),
        movedId,
      );
      pass(
        channel +
          ": dragging a selected object across pages transfers it without losing identity or history",
      );
      await page.evaluate(() => {
        const p = Store.page();
        p.showTitle = false;
        Store.book().pages = [p];
        Store.state.pageIndex = 0;
        Store.state.viewport = { x: 30, y: 10, zoom: 1 };
        const o = Panels.makeGeometry("square", false);
        o.position = { x: 120, y: 170 };
        o.size = { w: 460, h: 400 };
        o.data.aux = [
          { type: "segment", a: 0, b: 2 },
          { type: "segment", a: 1, b: 3 },
        ];
        p.objects = [o];
        App.setTool("select");
        Store.clearHistory();
        Store.state.selection = [o.id];
        Store.emit();
      });
      assert.ok((await page.locator("#geometry-toolbar button:visible").count()) <= 2);
      assert.equal(
        await page
          .locator('#geometry-toolbar [data-geo-mode="intersection"]')
          .count(),
        0,
      );
      await mode("intersection");
      for (const refs of [
        ["v:0", "v:2"],
        ["v:1", "v:3"],
      ]) {
        const p = await page.evaluate((refs) => {
          const l = TeacherGeometry.lines(Store.selected()[0]).find(
            (l) => l.refs.join("|") === refs.join("|"),
          );
          return {
            x: l.world[0].x * 0.72 + l.world[1].x * 0.28,
            y: l.world[0].y * 0.72 + l.world[1].y * 0.28,
          };
        }, refs);
        await at(p);
      }
      const intersection = await page.evaluate(() => {
        const o = Store.selected()[0],
          c = o.data.constructions.find((c) => c.type === "intersection");
        return {
          id: c.id,
          point: Constructions.build(o).points.get("c:" + c.id).coords,
        };
      });
      assert.deepEqual(intersection.point, [2, 2]);
      pass(
        channel +
          ": compact construction menu creates a true intersection by pen tapping two drawn diagonals",
      );
      await mode("centroid");
      for (const key of ["v:0", "v:1", "v:2"]) await vertex(key);
      const gid = await page.evaluate(
        () =>
          Store.selected()[0].data.constructions.find(
            (c) => c.type === "centroid",
          ).id,
      );
      await mode("segment");
      await vertex("v:3");
      await vertex("c:" + gid);
      assert.ok(
        await page.evaluate(
          (gid) =>
            Store.selected()[0].data.constructions.some(
              (c) => c.type === "segment" && c.refs.includes("c:" + gid),
            ),
          gid,
        ),
      );
      await tap("#geo-finish");
      const B = await page.evaluate(
          () =>
            TeacherGeometry.points(Store.selected()[0]).find(
              (p) => p.key === "v:2",
            ).world,
        ),
        bp = await screen(B);
      await drag(bp, { x: bp.x + 45, y: bp.y - 30 });
      assert.ok(
        await page.evaluate((gid) => {
          const o = Store.selected()[0],
            r = Constructions.build(o),
            c = r.points.get("c:" + gid).coords,
            P = o.data.points.slice(0, 3);
          return (
            c.every(
              (v, j) =>
                Math.abs(v - P.reduce((n, p) => n + p[j], 0) / 3) < 1e-8,
            ) && r.warnings.length === 0
          );
        }, gid),
      );
      pass(
        channel +
          ": a constructed centroid accepts vertex connections and updates with actual pen vertex dragging",
      );
      await mode("median");
      for (const key of ["v:0", "v:1", "v:2"]) await vertex(key);
      await mode("bisector");
      for (const key of ["v:0", "v:1", "v:2"]) await vertex(key);
      assert.ok(
        await page.evaluate(() => {
          const r = Constructions.build(Store.selected()[0]);
          return (
            r.items.some((i) => i.type === "median") &&
            r.items.some((i) => i.type === "bisector") &&
            !r.warnings.length
          );
        }),
      );
      await tap("#geo-finish");
      const saved = await page.evaluate(() => {
        const data = Store.envelope();
        Store.validate(data, true);
        Store.save();
        return {
          id: Store.selected()[0].id,
          constructions: Store.selected()[0].data.constructions,
        };
      });
      await page.screenshot({
        path: path.join(out, channel + "-geometry-tools.png"),
      });
      await page.reload();
      await page.waitForFunction(() => window.Scrble);
      assert.deepEqual(
        await page.evaluate(
          (id) =>
            Store.current().objects.find((o) => o.id === id).data.constructions,
          saved.id,
        ),
        saved.constructions,
      );
      pass(
        channel +
          ": median/bisector tools and all dependent construction references persist offline",
      );
      await page.evaluate(() => {
        Store.state.settings.autoPages = false;
        Store.save();
      });
      await page.reload();
      await page.waitForFunction(() => window.Scrble);
      assert.equal(
        await page.evaluate(() => Store.state.settings.autoPages),
        false,
      );
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        390,
      );
      assert.ok(await page.locator("#fullscreen-toggle").isVisible());
      assert.deepEqual(errors, []);
      assert.deepEqual(failed, []);
      assert.deepEqual(network, []);
      pass(
        channel +
          ": page preferences persist, the header stays responsive and all flows remain offline without errors",
      );
    } finally {
      await browser.close();
    }
  }
  console.log(checks + " notebook/geometry browser checks passed.");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
