const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { pathToFileURL } = require("node:url");
const appRoot = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(__dirname, ".."),
  out = path.resolve(__dirname, "../test-results");
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
        acceptDownloads: true,
      });
      // Isolate clipboard fixtures inside the test context; never inspect the user's OS clipboard.
      await context.addInitScript(() => {
        const state = { items: [], blocked: false };
        window.__clipboardFixture = state;
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            read: async () => {
              if (state.blocked)
                throw new DOMException(
                  "Clipboard test permission denied",
                  "NotAllowedError",
                );
              return state.items;
            },
            writeText: async (text) => {
              state.items = [
                {
                  types: ["text/plain"],
                  getType: async () => new Blob([text], { type: "text/plain" }),
                },
              ];
            },
          },
        });
      });
      const page = await context.newPage(),
        errors = [],
        failed = [],
        network = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("requestfailed", (r) => failed.push(r.url()));
      page.on("request", (r) => {
        if (/^https?:/.test(r.url())) network.push(r.url());
      });
      await page.goto(pathToFileURL(path.join(appRoot, "index.html")).href);
      await page.waitForFunction(() => window.Scrble);
      const cdp = await context.newCDPSession(page);
      const pen = async (type, x, y, down = false) =>
        cdp.send("Input.dispatchMouseEvent", {
          type,
          x,
          y,
          button: type === "mouseMoved" ? "none" : "left",
          buttons: down ? 1 : 0,
          pointerType: "pen",
          clickCount: 1,
          force: down ? 0.65 : 0,
        });
      const tap = async (selector) => {
        const el = page.locator(selector).first();
        await el
          .waitFor({ state: "visible", timeout: 7000 })
          .catch(async (e) => {
            console.log(
              "FAILED TARGET",
              selector,
              await page.evaluate(() => ({
                popoverHidden: document.getElementById("popover").hidden,
                keyboardHidden: document.getElementById("pen-keyboard").hidden,
                dialog: document.getElementById("dialog").open,
                penActive: CanvasEngine.penActive,
              })),
            );
            await page.screenshot({
              path: require("path").join(out, "pen-failure.png"),
            });
            throw e;
          });
        await el.scrollIntoViewIfNeeded();
        const r = await el.boundingBox();
        if (!r) throw Error("No target " + selector);
        const x = r.x + r.width / 2,
          y = r.y + r.height / 2;
        await pen("mouseMoved", x, y);
        await pen("mousePressed", x, y, true);
        await pen("mouseReleased", x, y);
      };
      const drag = async (A, B) => {
        await pen("mouseMoved", A.x, A.y);
        await pen("mousePressed", A.x, A.y, true);
        for (let i = 1; i <= 12; i++)
          await pen(
            "mouseMoved",
            A.x + ((B.x - A.x) * i) / 12,
            A.y + ((B.y - A.y) * i) / 12,
            true,
          );
        await pen("mouseReleased", B.x, B.y);
      };
      const coord = async (point) =>
        page.evaluate((point) => {
          const r = Renderer.area.getBoundingClientRect(),
            v = Store.state.viewport;
          return {
            x: r.left + v.x + point.x * v.zoom,
            y: r.top + v.y + point.y * v.zoom,
          };
        }, point);
      const fixture = await page.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = 240;
        c.height = 140;
        const x = c.getContext("2d");
        x.fillStyle = "white";
        x.fillRect(0, 0, 240, 140);
        x.strokeStyle = "black";
        x.lineWidth = 3;
        x.strokeRect(30, 25, 175, 80);
        x.beginPath();
        x.moveTo(30, 105);
        x.lineTo(205, 25);
        x.stroke();
        return c.toDataURL();
      });
      await page.evaluate((src) => {
        const bytes = Uint8Array.from(atob(src.split(",")[1]), (c) =>
            c.charCodeAt(0),
          ),
          blob = new Blob([bytes], { type: "image/png" });
        __clipboardFixture.items = [
          { types: ["image/png"], getType: async () => blob },
        ];
      }, fixture);
      await tap('.workspace-tabs [data-action="paste-image"]');
      await page.waitForFunction(() => Store.current().objects.length === 1);
      assert.equal(
        await page.evaluate(() => Store.selected()[0].type),
        "image",
      );
      assert.equal(
        await page.evaluate(() => Store.selected()[0].data.src),
        fixture,
      );
      assert.equal(
        await page.evaluate(() => Store.state.transformMode),
        "move",
      );
      assert.equal(
        await page
          .locator('#selection-tools [data-action="transform-selection"]')
          .count(),
        1,
      );
      pass(
        channel +
          ": pen button pastes a real PNG fixture and exposes move/size controls",
      );
      const native = await page.evaluate((src) => {
        const dt = new DataTransfer(),
          bytes = Uint8Array.from(atob(src.split(",")[1]), (c) =>
            c.charCodeAt(0),
          );
        dt.items.add(new File([bytes], "capture.png", { type: "image/png" }));
        const key = new KeyboardEvent("keydown", {
          key: "v",
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        });
        document.body.dispatchEvent(key);
        const paste = new ClipboardEvent("paste", {
          clipboardData: dt,
          bubbles: true,
          cancelable: true,
        });
        document.body.dispatchEvent(paste);
        return {
          keyBlocked: key.defaultPrevented,
          pasteHandled: paste.defaultPrevented,
        };
      }, fixture);
      assert.equal(native.keyBlocked, false);
      assert.equal(native.pasteHandled, true);
      await page.waitForFunction(() => Store.current().objects.length === 2);
      pass(
        channel +
          ": Ctrl+V remains native and image paste events insert exactly one image",
      );
      await page.evaluate(() => {
        Store.transaction(() => {
          Store.current().objects[0].position = { x: 100, y: 200 };
          Store.current().objects[1].position = { x: 480, y: 200 };
        });
        Store.state.selection = [Store.current().objects[1].id];
        Store.emit();
      });
      const before = await page.evaluate(() => ({
        ...Store.selected()[0].position,
      }));
      await drag(
        await coord({ x: 570, y: 260 }),
        await coord({ x: 620, y: 290 }),
      );
      assert.ok(
        await page.evaluate(
          (x) => Store.selected()[0].position.x > x,
          before.x,
        ),
      );
      pass(
        channel + ": pasted image moves by pen dragging without a modifier key",
      );
      const handle = await page.evaluate(() => {
        const o = Store.selected()[0];
        return Renderer.worldPoint(o, { x: o.size.w, y: o.size.h });
      });
      const initialSize = await page.evaluate(() => ({
        ...Store.selected()[0].size,
      }));
      const hp = await coord(handle);
      await drag(hp, { x: hp.x + 90, y: hp.y + 60 });
      assert.ok(
        await page.evaluate(
          (w) => Store.selected()[0].size.w > w,
          initialSize.w,
        ),
      );
      assert.ok(
        await page.evaluate(
          (r) =>
            Math.abs(
              Store.selected()[0].size.w / Store.selected()[0].size.h - r,
            ) < 1e-8,
          initialSize.w / initialSize.h,
        ),
      );
      pass(
        channel +
          ": enlarged corner handles resize with the correct aspect ratio",
      );
      await tap('#selection-tools [data-action="transform-selection"]');
      await tap("#transform-width");
      await tap('#pen-keyboard [data-keyboard-special="selectall"]');
      await tap('#pen-keyboard [aria-label="Nhập 3"]');
      await tap('#pen-keyboard [aria-label="Nhập 0"]');
      await tap('#pen-keyboard [aria-label="Nhập 0"]');
      await tap(
        '#pen-keyboard .keyboard-controls [data-keyboard-special="close"]',
      );
      await tap("#transform-apply");
      assert.equal(await page.evaluate(() => Store.selected()[0].size.w), 300);
      pass(
        channel +
          ": width and position controls are editable through the on-screen numeric keyboard",
      );
      await tap('#pen-dock [data-action="pen-options"]');
      await tap("#pen-multiselect");
      await tap('#popover [data-action="finish-action"]');
      await tap('#pen-dock [data-tool="select"]');
      await tap('#pen-dock [data-action="pen-options"]');
      await page.evaluate(() => App.closePopover());
      const first = await coord({ x: 180, y: 250 }),
        second = await page.evaluate(() => {
          const o = Store.current().objects[1],
            r = Renderer.area.getBoundingClientRect(),
            v = Store.state.viewport;
          return {
            x: r.left + v.x + (o.position.x + o.size.w / 2) * v.zoom,
            y: r.top + v.y + (o.position.y + o.size.h / 2) * v.zoom,
          };
        });
      await pen("mousePressed", first.x, first.y, true);
      await pen("mouseReleased", first.x, first.y);
      await pen("mousePressed", second.x, second.y, true);
      await pen("mouseReleased", second.x, second.y);
      assert.equal(await page.evaluate(() => Store.selected().length), 2);
      pass(
        channel +
          ": multiple selection works using pen taps and a visible toggle",
      );
      await tap('#selection-tools [data-action="group"]');
      assert.equal(
        await page.evaluate(() => Store.selected()[0].type),
        "group",
      );
      await tap('#selection-tools [data-action="ungroup"]');
      assert.equal(await page.evaluate(() => Store.selected().length), 2);
      pass(
        channel +
          ": group and ungroup are available without keyboard shortcuts",
      );
      await page.evaluate(() => {
        Store.state.multiSelect = false;
        Store.state.selection = [Store.current().objects[0].id];
        Store.emit();
      });
      await tap('#selection-tools [data-action="copy"]');
      await tap('#pen-dock [data-action="pen-options"]');
      await tap('#popover [data-action="paste"]');
      await page.waitForFunction(() => Store.current().objects.length === 3);
      pass(
        channel +
          ": internal object copy/paste coexists with external image clipboard data",
      );
      await page.evaluate(() => {
        __clipboardFixture.blocked = true;
      });
      await tap('.workspace-tabs [data-action="paste-image"]');
      assert.equal(await page.locator("#clipboard-receiver").count(), 1);
      await page.evaluate((src) => {
        const dt = new DataTransfer();
        dt.items.add(
          new File(
            [Uint8Array.from(atob(src.split(",")[1]), (c) => c.charCodeAt(0))],
            "fallback.png",
            { type: "image/png" },
          ),
        );
        document.getElementById("clipboard-receiver").dispatchEvent(
          new ClipboardEvent("paste", {
            clipboardData: dt,
            bubbles: true,
            cancelable: true,
          }),
        );
      }, fixture);
      await page.waitForFunction(() => Store.current().objects.length === 4);
      assert.equal(
        await page.locator("#dialog").evaluate((e) => e.open),
        false,
      );
      pass(
        channel +
          ": denied Clipboard API has a functional native-paste receiver and file fallback",
      );
      await tap('.workspace-tabs [data-action="formula"]');
      await page.locator("#pen-keyboard").waitFor({ state: "visible" });
      for (const name of ["x", "x²", "+", "1"])
        await tap('#pen-keyboard [aria-label="Nhập ' + name + '"]');
      assert.equal(await page.locator("#formula-source").inputValue(), "x^2+1");
      await tap("#dialog-confirm");
      await page.waitForFunction(() => Store.selected()[0]?.type === "formula");
      await page.evaluate(() => Formulas.prepare(Store.selected()[0]));
      pass(
        channel +
          ": pen-only formula entry, live typesetting and insertion work inside a modal dialog",
      );
      await tap("#notebook-title");
      await tap('#pen-keyboard [data-keyboard-special="selectall"]');
      await tap("#pen-keyboard #keyboard-caps");
      await tap('#pen-keyboard [aria-label="Nhập T"]');
      await tap("#pen-keyboard #keyboard-caps");
      await tap('#pen-keyboard [aria-label="Nhập o"]');
      await tap('#pen-keyboard [aria-label="Nhập a"]');
      await tap('#pen-keyboard [data-keyboard-mode="vietnamese"]');
      await tap('#pen-keyboard [aria-label="Nhập Sắc ◌́"]');
      await tap('#pen-keyboard [data-keyboard-mode="abc"]');
      await tap('#pen-keyboard [aria-label="Nhập n"]');
      await tap(
        '#pen-keyboard .keyboard-controls [data-keyboard-special="close"]',
      );
      assert.equal(await page.evaluate(() => Store.book().title), "Toán");
      pass(
        channel +
          ": Vietnamese title entry and accents are possible with the pen keyboard",
      );
      await page.evaluate(() => {
        Store.state.selection = [];
        Store.state.multiSelect = false;
        Store.emit();
      });
      await tap('.workspace-tabs [data-panel="solid"]');
      await tap("#geometry-library button.library-item");
      await tap('[data-action="close-panel"]');
      const objectId = await page.evaluate(() => Store.selected()[0].id);
      await tap('#selection-tools [data-action="orbit-selection"]');
      const rotation = await page.evaluate(() =>
        Store.selected()[0].data.rotation.slice(),
      );
      let center = await page.evaluate(() => {
        const o = Store.selected()[0];
        return {
          x: o.position.x + o.size.w / 2,
          y: o.position.y + o.size.h / 2,
        };
      });
      let cp = await coord(center);
      await drag(cp, { x: cp.x + 55, y: cp.y + 20 });
      assert.notDeepEqual(
        await page.evaluate(() => Store.selected()[0].data.rotation),
        rotation,
      );
      await tap('#selection-tools [data-action="move-selection"]');
      const rotationAfter = await page.evaluate(() =>
          Store.selected()[0].data.rotation.slice(),
        ),
        positionAfter = await page.evaluate(() => ({
          ...Store.selected()[0].position,
        }));
      center = await page.evaluate(() => {
        const o = Store.selected()[0];
        return {
          x: o.position.x + o.size.w / 2,
          y: o.position.y + o.size.h / 2,
        };
      });
      cp = await coord(center);
      await drag(cp, { x: cp.x + 35, y: cp.y + 20 });
      assert.deepEqual(
        await page.evaluate(() => Store.selected()[0].data.rotation),
        rotationAfter,
      );
      assert.ok(
        await page.evaluate(
          (x) => Store.selected()[0].position.x > x,
          positionAfter.x,
        ),
      );
      pass(
        channel +
          ": explicit orbit/move controls prevent accidental rotation and need no Alt key",
      );
      await page.evaluate((id) => {
        const o = Store.current().objects.find((o) => o.id === id);
        Store.transaction(() => {
          o.position = { x: 180, y: 200 };
          o.data.rotation = [-0.45, -0.55];
        });
        Store.state.selection = [id];
        Store.emit();
      }, objectId);
      await tap('[data-geo-mode="segment"]');
      const vertex = async (key) => {
        const point = await page.evaluate(
            (key) =>
              TeacherGeometry.points(Store.selected()[0]).find(
                (p) => p.key === key,
              ).world,
            key,
          ),
          p = await coord(point);
        await pen("mousePressed", p.x, p.y, true);
        await pen("mouseReleased", p.x, p.y);
      };
      await vertex("v:0");
      await vertex("v:2");
      const connected = await page.evaluate(() => {
        const o = Store.selected()[0],
          item = Constructions.build(o).items.at(-1);
        return {
          mode: item.lineMode,
          hidden: SolidView.forObject(o)
            .segments(...item.coords)
            .every((s) => s.hidden),
        };
      });
      assert.equal(connected.mode, "auto");
      assert.ok(connected.hidden);
      await tap("#geo-finish");
      pass(
        channel +
          ": a pen-drawn connection on the back/base is automatically classified as dashed",
      );
      const dashPixels = await page.evaluate(() => {
        const v = SolidView.create(
            "sphere",
            { a: 3, b: 3, h: 3 },
            [-0.45, -0.55],
            400,
            350,
          ),
          parts = SolidView.roundSegments(v, {}).curves,
          c = document.createElement("canvas");
        c.width = 400;
        c.height = 350;
        const x = c.getContext("2d");
        x.strokeStyle = "#111";
        SolidView.trace(x, parts, { width: 2.6 });
        let gaps = 0,
          nearGaps = 0;
        for (const s of parts) {
          const px = Math.round((s.a[0] + s.b[0]) / 2),
            py = Math.round((s.a[1] + s.b[1]) / 2),
            pixels = x.getImageData(px - 1, py - 1, 3, 3).data;
          let max = 0;
          for (let i = 3; i < pixels.length; i += 4)
            max = Math.max(max, pixels[i]);
          if (max < 50) {
            if (s.hidden) gaps++;
            else nearGaps++;
          }
        }
        return { gaps, nearGaps };
      });
      assert.ok(dashPixels.gaps > 4);
      assert.equal(dashPixels.nearGaps, 0);
      pass(
        channel +
          ": sphere back arc contains real pixel gaps while the front arc stays continuous",
      );
      await page.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = 500;
        c.height = 400;
        const x = c.getContext("2d");
        for (let i = 0; i < 100; i++) {
          const kind = ["cube", "pyramid", "sphere", "cone", "cylinder"][i % 5],
            o = Panels.makeGeometry(kind, true);
          o.position = { x: 0, y: 0 };
          o.data.rotation = [-1.1 + i * 0.033, -2.7 + i * 0.173];
          Renderer.drawObject(x, o);
        }
      });
      pass(
        channel +
          ": rapid insertion and redraw across 100 camera/shape states remains error-free",
      );
      await tap('#file-tools [data-action="undo"]');
      await tap('#file-tools [data-action="redo"]');
      const pendingDownload = page.waitForEvent("download");
      await tap('#file-tools [data-action="save"]');
      const downloaded = await pendingDownload;
      await downloaded.saveAs(path.join(out, channel + "-pen.smath.json"));
      assert.equal(
        JSON.parse(
          fs.readFileSync(path.join(out, channel + "-pen.smath.json"), "utf8"),
        ).notebook.title,
        "Toán",
      );
      pass(
        channel +
          ": undo, redo and saving remain accessible through pen buttons",
      );
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.screenshot({
        path: path.join(out, channel + "-pen-workspace.png"),
      });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        1366,
      );
      const checkKeyboardLayout = async () => {
        await tap('.workspace-tabs [data-action="formula"]');
        await page.locator("#pen-keyboard").waitFor({ state: "visible" });
        const confirm = await page.locator("#dialog-confirm").boundingBox(),
          keyboard = await page.locator("#pen-keyboard").boundingBox();
        assert.ok(
          confirm.y >= 0 && confirm.y + confirm.height <= keyboard.y,
          "Modal confirmation must remain above the pen keyboard",
        );
        assert.ok(
          keyboard.x >= 0 &&
            keyboard.x + keyboard.width <= page.viewportSize().width,
        );
        await tap('#dialog button[value="cancel"]');
      };
      await checkKeyboardLayout();
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth),
        390,
      );
      await checkKeyboardLayout();
      assert.deepEqual(errors, []);
      assert.deepEqual(failed, []);
      assert.deepEqual(network, []);
      pass(
        channel +
          ": pen workflow stays offline, responsive and free of JavaScript/resource errors",
      );
    } finally {
      await browser.close();
    }
  }
  console.log(checks + " pen/clipboard browser checks passed.");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
