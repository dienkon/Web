import { expect, test } from "@playwright/test";

test("desktop: chapters, models, letter, photos, music, and local guestbook", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#main")).toHaveAttribute("aria-busy", "false", {
    timeout: 45000,
  });
  await expect(page.getByRole("heading", { name: "GEN TRI ÂN" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  await page.getByRole("button", { name: "Bắt đầu hành trình" }).click();
  await expect(page.locator(".chapter-label")).toContainText("THE DNA");
  await page.getByRole("button", { name: "Tháo xoắn", exact: true }).click();
  await expect(page.locator(".model-explanation")).toContainText(
    "Hai mạch tách nhau",
  );
  await page.getByRole("button", { name: "Nhân đôi", exact: true }).click();
  await expect(page.locator(".model-explanation")).toContainText("5′ → 3′");
  await page.getByRole("button", { name: "Phóng to mô hình" }).click();
  await expect(page.locator(".model-tools")).toContainText("120%");
  await page.getByRole("button", { name: "Base G", exact: true }).click();
  await expect(page.locator(".science-note")).toContainText(
    "G–C · 3 liên kết hydrogen",
  );
  await page.getByRole("button", { name: "Đặt lại mô hình" }).click();
  await expect(page.locator(".model-tools")).toContainText("100%");

  await page.getByRole("button", { name: "Bước vào vũ trụ sinh học" }).click();
  await expect(page.locator(".chapter-label")).toContainText(
    "THE BIOLOGY UNIVERSE",
  );
  for (const title of [
    "Nucleosome",
    "Nhiễm sắc thể",
    "Nhân đôi ADN",
    "Phiên mã",
    "Dịch mã",
    "Nguyên phân",
    "Di truyền Mendel",
    "Cây tiến hóa",
    "Hệ sinh thái",
  ]) {
    await page
      .locator(".exhibit-picker button")
      .filter({ hasText: title })
      .click();
    await expect(page.locator(".exhibit-info h3")).toHaveText(title);
  }

  await page.getByRole("button", { name: "Kỷ niệm", exact: true }).click();
  await expect(page.locator(".chapter-label")).toContainText("THE MEMORIES");
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 96;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#48e0ce";
    ctx.fillRect(0, 0, 128, 96);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.locator("input[type=file]").setInputFiles({
    name: "ky-niem.png",
    mimeType: "image/png",
    buffer: Buffer.from(image, "base64"),
  });
  await expect(page.locator(".photo-thumbnails")).toContainText("1 kỷ niệm");
  await page.getByRole("button", { name: "Mở ảnh 1", exact: true }).click();
  await expect(page.locator(".lightbox-image")).toBeVisible();
  expect(
    await page
      .locator(".lightbox-image")
      .evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth === 128,
      ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("button", { name: "Tri ân", exact: true }).click();
  await page.getByRole("button", { name: "Gửi thầy bó hoa này" }).click();
  await expect(
    page.getByRole("button", { name: "Bó hoa đã nở vì thầy" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Gửi thầy một lời" }).click();
  await expect(page.getByRole("dialog")).toContainText("Thầy kính mến");
  await page.getByRole("button", { name: "Để lại một lời nhắn" }).click();
  await page.getByLabel("Tên của bạn").fill("Một học trò");
  await page
    .getByLabel("Điều bạn muốn gửi gắm")
    .fill("Cảm ơn thầy đã gieo niềm yêu thích Sinh học.");
  await page.getByRole("button", { name: "Lưu lời nhắn", exact: true }).click();
  await expect(page.locator(".student-messages")).toContainText("Cảm ơn thầy");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Tải lưu bút xuống" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("Luu-but-20-11.txt");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("gen-tri-an-messages")!)[0].name,
    ),
  ).toBe("Một học trò");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Bật nhạc nền" }).click();
  await expect(page.getByRole("button", { name: "Tắt nhạc" })).toBeVisible();
  await page.getByRole("button", { name: "Tắt nhạc" }).click();
  await page.screenshot({ path: "test-results/desktop-gratitude.png" });
  expect(errors).toEqual([]);
});

test("mobile and reduced motion: navigation, settings, modal focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#main")).toHaveAttribute("aria-busy", "false", {
    timeout: 45000,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mobile-home.png" });
  await page.getByRole("button", { name: "Tùy chỉnh trải nghiệm" }).click();
  await expect(
    page.getByRole("button", { name: "Giảm chuyển động" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Chế độ nhẹ", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Bỏ qua đến lời tri ân" }).click();
  await expect(page.locator(".chapter-label")).toContainText("THE GRATITUDE");
  await page.getByRole("button", { name: "Mở lá thư gửi thầy" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Để lại một lời nhắn" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Mở lá thư gửi thầy" }),
  ).toBeFocused();
});

test("cinematic introduction can be skipped", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator("#main")).toHaveAttribute("aria-busy", "false", {
    timeout: 45000,
  });
  await page.getByRole("button", { name: "Bắt đầu hành trình" }).click();
  await expect(page.locator(".intro-overlay")).toBeVisible();
  await page.getByRole("button", { name: "Bỏ qua hoạt ảnh" }).click();
  await expect(page.locator(".intro-overlay")).toHaveCount(0);
  await expect(page.locator(".chapter-label")).toContainText("THE DNA");
});

test("WebGL unavailable: content and letter remain usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type.includes("webgl")) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.locator("#main")).toHaveAttribute("aria-busy", "false", {
    timeout: 45000,
  });
  await expect(page.locator(".webgl-fallback")).toBeVisible();
  await page.getByRole("button", { name: "Gửi thầy một lời" }).click();
  await expect(page.getByRole("dialog")).toContainText("Thầy kính mến");
});
