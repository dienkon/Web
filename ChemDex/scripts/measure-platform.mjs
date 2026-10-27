import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";
import net from "node:net";

const output = path.resolve("artifacts/platform");
fs.mkdirSync(output, { recursive: true });
const origin = process.env.CHEMDEX_TEST_URL ?? "http://127.0.0.1:4173";
const port = await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.on("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const value = server.address().port;
    server.close(() => resolve(value));
  });
});
const browser = await chromium.launch({
  args: [`--remote-debugging-port=${port}`, "--enable-unsafe-swiftshader"],
});
const results = [];
try {
  for (const route of ["/", "/tien-ich/"]) {
    const runs = [];
    for (let index = 0; index < 3; index++) {
      const result = await lighthouse(origin + route, {
        port,
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance", "accessibility"],
        formFactor: "mobile",
      });
      const run = {
        performance: Math.round(result.lhr.categories.performance.score * 100),
        accessibility: Math.round(
          result.lhr.categories.accessibility.score * 100,
        ),
        lcp_ms: result.lhr.audits["largest-contentful-paint"].numericValue,
        cls: result.lhr.audits["cumulative-layout-shift"].numericValue,
      };
      runs.push(run);
      fs.writeFileSync(
        path.join(
          output,
          `lighthouse-${route === "/" ? "home" : "tools"}-${index + 1}.json`,
        ),
        result.report,
      );
      console.log(route, index + 1, JSON.stringify(run));
    }
    const median = (key) =>
      runs.map((run) => run[key]).sort((a, b) => a - b)[1];
    results.push({
      route,
      runs,
      medianPerformance: median("performance"),
      medianAccessibility: median("accessibility"),
    });
  }
} finally {
  await browser.close();
}
fs.writeFileSync(
  path.join(output, "lighthouse-summary.json"),
  JSON.stringify(
    {
      origin,
      checkedAt: new Date().toISOString(),
      configuration:
        "Lighthouse default simulated mobile, identical settings for three runs per route",
      results,
    },
    null,
    2,
  ) + "\n",
);
if (
  results.some(
    (result) =>
      result.medianPerformance < 90 || result.medianAccessibility < 95,
  )
)
  process.exitCode = 1;
