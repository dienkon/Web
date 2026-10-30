import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { parseWeights } from "../scripts/refresh-atomic-weights.mjs";
const json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const elements = json("shared/elements.json"), weights = json("shared/atomic-weights.json");
const output = await build({ stdin: { contents: 'export * from "./platform/periodic-model.js"; export * from "./platform/search-index.js"; export * from "./platform/catalog.js";', resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "node" });
const { matchesElement, sortElements, comparisonCSV, searchRecords, tools } = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`);
const filter = (q, rest = {}) => elements.filter((e) => matchesElement(e, { q, ...rest }, elements));

test("CIAAW 2024 values match all 84 shared elements and retain uncertainty", () => {
  assert.equal(weights.elements.length, 84);
  assert.equal(new Set(weights.elements.map((e) => e.z)).size, 84);
  for (const w of weights.elements) {
    const e = elements.find((e) => e.z === w.z);
    assert.equal(e.symbol, w.symbol);
    assert.equal(e.mass, w.value);
    assert.equal(e.massSource, "CIAAW2024");
    assert.ok(w.uncertainty > 0);
  }
  assert.equal(elements.find((e) => e.symbol === "Zr").mass, 91.222);
  assert.ok(!weights.elements.some((e) => ["Tc", "Pm", "Og"].includes(e.symbol)));
  assert.throws(() => parseWeights("<html>Upstream maintenance</html>"), /incomplete/);
  assert.throws(() => parseWeights('<tr><td>1</td><td>H</td><td>hydrogen</td><td>1.0080 &plusmn; 0.0002</td></tr>'), /incomplete/);
});
test("home summary stays synchronized without bundling the full study and structure catalogs", () => {
  const summary = json("shared/platform-summary.json");
  assert.equal(summary.compoundCount, json("shared/compounds.json").length);
  assert.deepEqual(summary.studyQuestionIds, json("shared/study-questions.json").map((q) => q.id));
});
test("sourced insights and pressure-dependent phase notes do not become ordinary melting points", () => {
  const insights = json("shared/element-insights.json");
  assert.equal(Object.keys(insights.elements).length, 10);
  for (const [symbol, insight] of Object.entries(insights.elements)) {
    assert.ok(elements.some((e) => e.symbol === symbol));
    assert.match(insight.source, /^https:\/\/periodic-table\.rsc\.org\/element\//);
    assert.ok(insight.applications.length >= 2);
  }
  for (const symbol of ["He", "C"]) {
    const e = elements.find((e) => e.symbol === symbol);
    assert.equal(e.meltingPoint, null);
    assert.ok(e.meltingPointNote.length > 30);
  }
});
test("element search distinguishes exact symbols/numbers, accents and combined filters", () => {
  assert.deepEqual(filter("29").map((e) => e.symbol), ["Cu"]);
  assert.deepEqual(filter("1").map((e) => e.symbol), ["H"]);
  assert.deepEqual(filter("c").map((e) => e.symbol), ["C"]);
  assert.deepEqual(filter("dong").map((e) => e.symbol), ["Cu"]);
  assert.equal(filter("khi hiem").length, 7);
  assert.deepEqual(filter("", { period: "3", phase: "gas" }).map((e) => e.symbol), ["Cl", "Ar"]);
  assert.deepEqual(filter("", { favorites: true, favoriteSymbols: ["Au", "Cu"] }).map((e) => e.symbol), ["Cu", "Au"]);
  assert.equal(filter("not-an-element").length, 0);
});
test("sorting puts missing electronegativity last and CSV retains scientific notes", () => {
  const sorted = sortElements(elements, "electronegativity");
  assert.equal(sorted[0].symbol, "F");
  assert.equal(sorted.at(-1).electronegativity, null);
  assert.equal(elements[0].symbol, "H");
  const csv = comparisonCSV(elements.filter((e) => ["Cu", "He"].includes(e.symbol)), weights);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes("63.546"));
  assert.ok(csv.includes(weights.source));
  assert.ok(csv.includes("áp suất"));
  assert.ok(csv.includes("Độ không đảm bảo"));
});
test("global search ranks exact identities and finds tools and structure formulas", () => {
  assert.equal(searchRecords("cu")[0].id, "element-Cu");
  assert.equal(searchRecords("29")[0].id, "element-Cu");
  assert.equal(searchRecords("H2O")[0].id, "cid-962");
  assert.ok(searchRecords("tinh tan").some((r) => r.id === "tinh-tan"));
  assert.ok(searchRecords("phuong trinh").some((r) => r.kind === "Tiện ích"));
  assert.deepEqual(searchRecords("<img onerror=alert(1)>"), []);
  assert.ok(searchRecords("").every((r) => r.kind === "Tiện ích"));
});
test("the complete tool directory has unique IDs and packaged destinations", () => {
  assert.equal(tools.length, 25);
  assert.equal(new Set(tools.map((t) => t.id)).size, tools.length);
  for (const tool of tools) {
    assert.ok(tool.href.startsWith("/"));
    assert.ok(fs.existsSync(`dist${tool.href}index.html`), tool.href);
  }
});

test("legacy element loader shares standard weights and phase corrections with the home page", async () => {
  const { loadElementData } = await import("../data/loader.js");
  const originalFetch = globalThis.fetch, references = [];
  globalThis.fetch = async (url) => {
    if (String(url).includes("/shared/")) references.push(String(url));
    try { return new Response(fs.readFileSync(fileURLToPath(url), "utf8"), { headers: { "Content-Type": "application/json" } }); }
    catch { return new Response("Not found", { status: 404 }); }
  };
  try {
    const zr = await loadElementData("Zr");
    assert.equal(zr.mass, 91.222);
    assert.equal(zr.massStandardText, "91.222 ± 0.003");
    assert.equal(zr.massStandardSource, weights.source);
    const he = await loadElementData("He");
    assert.match(he.general.meltingPoint, /áp suất/);
    assert.equal((await loadElementData("Zr")), zr);
    assert.equal(references.length, 2);
  } finally { globalThis.fetch = originalFetch; }
});
