import { test, expect } from "@playwright/test";
import fs from "node:fs";
test("legacy laboratory links resolve to the React applications", async ({request}) => {
  for (const [path, destination] of [["/lab/","/lab-3d/"],["/lab","/lab-3d/"],
    ["/thi-nghiem","/lab-2d/"],["/thi-nghiem/","/lab-2d/"],["/thi-nghiem.html","/lab-2d/"]]) {
    const response=await request.get(path);
    expect(response.status(),path).toBe(200);
    expect(new URL(response.url()).pathname,path).toBe(destination);
  }
});
test("118 elements, accent-free search, filters and comparison", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".element")).toHaveCount(118);
  await page.locator("#search").fill("dong");
  await page.locator("#view").click();
  await expect(
    page.getByRole("button", { name: "29, Đồng, Cu", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "29, Đồng, Cu", exact: true }).click();
  await page.locator("#favorite").click();
  await page.locator("#compare").click();
  await expect(page.locator("#comparison")).toContainText("Đồng");
  await page.locator("#search").fill("");
  await page.locator("#category").selectOption("noble_gas");
  await expect(page.locator(".element")).toHaveCount(7);
  await page.locator("#theme").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
test("study answers and progress persist", async ({ page }) => {
  await page.goto("/on-tap/");
  await expect(page.locator("#quiz h2")).toBeVisible();
  await page.locator("[data-answer]").first().click();
  await expect(page.locator("#explanation")).not.toBeEmpty();
  await page.reload();
  await expect(page.locator("#stats")).toContainText("Đã làm 1/60");
  await page.locator("#wrong").click();
  await expect(page.locator("#quiz")).toBeVisible();
});
test("mobile layout remains within viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const route of ["/", "/tien-ich/", "/on-tap/"]) {
    await page.goto(route);
    await expect(page.locator("#site-header")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  await page.goto("/lab-2d/");
  await page.getByRole("button", { name: "Kho dụng cụ", exact: true }).click();
  await expect(page.locator(".lab-inventory")).toBeVisible();
  await page.getByRole("button", { name: "Kho dụng cụ", exact: true }).click();
  await expect(page.locator(".lab-inventory")).toBeHidden();
});
test("lab uses React build and saves an actual session", async ({ page }) => {
  await page.goto("/lab-2d/?chemical=chem-hcl");
  await page.getByRole("dialog").getByRole("spinbutton").fill("15");
  await page
    .getByRole("button", { name: "Thêm vào bàn thí nghiệm", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "▣ Phiên lab", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Tên phiên" })
    .fill("Browser integration");
  await page
    .getByRole("button", { name: "Lưu phiên mới", exact: true })
    .click();
  await expect(page.locator(".session-list")).toContainText(
    "Browser integration",
  );
  await expect(page.locator(".session-list")).toContainText("1 dụng cụ");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator(".session-list>div")
    .filter({ hasText: "Browser integration" })
    .getByRole("button", { name: "Mở", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "▶ Tiếp tục", exact: true }),
  ).toBeVisible();
});
test("known structures render or provide a meaningful WebGL fallback", async ({
  page,
  browserName,
}) => {
  await page.goto("/tien-ich/cau-truc-3d/?compound=cid-962");
  const viewer = page.locator("chem-structure-viewer");
  await expect(viewer).toBeVisible();
  await expect(viewer.locator(".viewer-status")).not.toHaveText(
    "Đang tải cấu trúc…",
    { timeout: 30000 },
  );
  if (browserName === "chromium") {
    await expect(viewer.locator("canvas")).toBeVisible();
    await expect(viewer.locator(".viewer-status")).toContainText("Kéo để xoay");
    await viewer.locator("[data-style]").selectOption("sphere");
    await viewer.locator("[data-hydrogen]").uncheck();
  } else {
    await expect(viewer.locator(".viewer-status")).not.toBeEmpty();
  }
  await page.locator("#search").fill("benzen");
  await page.locator('[data-id="cid-241"]').click();
  await expect(page.locator("#selected h2")).toHaveText("Benzen");
});
test("remote errors preserve offline library and API errors are JSON", async ({
  page,
  request,
}) => {
  await page.route("**/api/chemistry/search?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "PubChem tạm thời không khả dụng." }),
    }),
  );
  await page.goto("/tien-ich/cau-truc-3d/");
  await page.locator("#search").fill("unknown chemical");
  await page.locator("#remote").click();
  await expect(page.locator("#remote-results")).toContainText(
    "Kho cấu trúc sẵn",
  );
  await page.locator("#search").fill("");
  await expect(page.locator(".compound-card").first()).toBeVisible();
  const invalid = await request.get("/api/chemistry/structure?cid=invalid");
  expect(invalid.status()).toBe(400);
  expect((await invalid.json()).error).toContain("CID");
  const missing = await request.get("/lab-2d/assets/missing.js");
  expect(missing.status()).toBe(404);
});
test("shared PubChem CID restores the selected remote record", async ({page}) => {
  const cid=99999999;
  await page.route("**/api/chemistry/search?**", route=>route.fulfill({
    json:{results:[{cid,name_en:"Reference water fixture",formula:"H2O",molarMass:18.015,kind:"molecule"}]},
  }));
  await page.route("**/api/chemistry/structure?**", route=>route.fulfill({
    json:{cid,dimension:"3d",format:"sdf",data:fs.readFileSync("shared/structures/962.sdf","utf8")},
  }));
  await page.goto("/tien-ich/cau-truc-3d/");
  await page.locator("#search").fill(String(cid));
  await page.locator("#remote").click();
  await expect(page.locator("#selected h2")).toHaveText("Reference water fixture");
  await expect(page).toHaveURL(new RegExp(`[?&]cid=${cid}`));
  await page.reload();
  await expect(page.locator("#selected h2")).toHaveText("Reference water fixture");
  await expect(page.locator(".viewer-status")).not.toHaveText("Đang tải cấu trúc…");
});

test("repeated molecular viewing releases global handlers and measures reference geometry", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Chrome DevTools is used to inspect actual browser event listeners.",
  );
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/tien-ich/cau-truc-3d/?compound=cid-962");
  await expect(
    page.locator("chem-structure-viewer .viewer-status"),
  ).toContainText("Kéo để xoay");
  const client = await page.context().newCDPSession(page);
  const scripts = new Map();
  client.on("Debugger.scriptParsed", event=>scripts.set(event.scriptId,event.url));
  await client.send("Debugger.enable");
  const platformPrefix=new URL("/platform/",page.url()).href;
  const listeners = async (expression) => {
    const object = await client.send("Runtime.evaluate", { expression });
    return (
      await client.send("DOMDebugger.getEventListeners", {
        objectId: object.result.objectId,
      })
    ).listeners.filter(listener=>scripts.get(listener.scriptId)?.startsWith(platformPrefix)).length;
  };
  const before = {
    window: await listeners("window"),
    body: await listeners("document.body"),
  };
  // Scope to application scripts: the Vercel Preview toolbar can attach its
  // own global handlers after page load and is outside the viewer lifecycle.
  expect(before.window).toBeGreaterThan(0);
  expect(before.body).toBeGreaterThan(0);
  for (const id of ["cid-241", "cid-702", "cid-2519", "cid-962"]) {
    await page.locator(`#cards [data-id="${id}"]`).click();
    await expect(
      page.locator("chem-structure-viewer .viewer-status"),
    ).toContainText("Kéo để xoay");
    await expect(page.locator("chem-structure-viewer canvas")).toHaveCount(1);
  }
  expect({
    window: await listeners("window"),
    body: await listeners("document.body"),
  }).toEqual(before);
  await page.locator("chem-structure-viewer").evaluate((element) => {
    const atoms = element.viewer.getModel().selectedAtoms({});
    const oxygen = atoms.find((atom) => atom.elem === "O"),
      hydrogens = atoms.filter((atom) => atom.elem === "H");
    element.pick(hydrogens[0]);
    element.pick(oxygen);
    element.pick(hydrogens[1]);
  });
  await expect(page.locator(".atom-readout").first()).toContainText(
    /104\.[45]\d°/,
  );
  expect(errors).toEqual([]);
});
test("all existing applications hydrate with valid local assets", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "The full application startup smoke runs in Chromium.",
  );
  const errors = [],
    missing = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (
      response.url().startsWith("http://127.0.0.1:4173/") &&
      response.url().includes("/assets/") &&
      response.status() >= 400
    )
      missing.push(response.url());
  });
  for (const route of [
    "/lab-3d/",
    "/lab-safety/",
    "/trung-tam/",
    "/dau-truong/",
    "/tien-ich/phuong-trinh/chuoi-phan-ung/",
    "/tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh/",
  ]) {
    await page.goto(route);
    await expect(page.locator("#root")).not.toBeEmpty({ timeout: 30000 });
  }
  expect(missing).toEqual([]);
  expect(errors).toEqual([]);
});
