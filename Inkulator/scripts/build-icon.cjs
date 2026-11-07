const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 256, height: 256 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.resolve(__dirname, "../assets/icon.svg")).href);
    await page.evaluate(() => {
      document.documentElement.setAttribute("width", "256");
      document.documentElement.setAttribute("height", "256");
    });
    const png = await page.screenshot({ omitBackground: true });
    const header = Buffer.alloc(22);
    header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
    header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
    header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
    fs.writeFileSync(path.resolve(__dirname, "../assets/icon.ico"), Buffer.concat([header, png]));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
