import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
const json = (file) =>
  JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
test("shared periodic grid contains 118 unique correctly placed elements", () => {
  const elements = json("shared/elements.json");
  assert.equal(elements.length, 118);
  const cells = new Set();
  for (const e of elements) {
    assert.ok(e.z >= 1 && e.z <= 118);
    assert.ok(e.xpos >= 1 && e.xpos <= 18);
    assert.ok(e.period >= 1 && e.period <= 7);
    const cell = `${e.xpos}:${e.ypos}`;
    assert.ok(!cells.has(cell), `duplicate cell ${cell}`);
    cells.add(cell);
    for (const key of [
      "mass",
      "electronegativity",
      "atomicRadius",
      "ionizationEnergy",
      "meltingPoint",
    ])
      assert.ok(e[key] === null || Number.isFinite(e[key]));
  }
  assert.equal(elements.find((e) => e.symbol === "Og").xpos, 18);
  assert.equal(elements.find((e) => e.symbol === "La").ypos, 9);
  assert.equal(elements.find((e) => e.symbol === "Ac").ypos, 10);
});
test("curated molecular files contain real coordinates and match element counts", () => {
  const compounds = json("shared/compounds.json");
  assert.ok(compounds.length >= 40);
  const ids = new Set();
  for (const c of compounds) {
    assert.ok(!ids.has(c.id));
    ids.add(c.id);
    assert.match(c.structure.source, /^https:\/\//);
    const raw = fs
      .readFileSync("." + c.structure.url, "utf8")
      .replace(/^\uFEFF/, "");
    if (c.kind === "crystal") {
      assert.match(raw, /_cell_length_a/);
      assert.match(raw, /_atom_site_fract_x/);
      continue;
    }
    assert.ok(!raw.includes("<html"));
    const lines = raw.split(/\r?\n/),
      n = Number(lines[3].slice(0, 3));
    assert.equal(n, c.atomCount);
    const actual = {};
    for (const line of lines.slice(4, 4 + n)) {
      const symbol = line.slice(31, 34).trim();
      actual[symbol] = (actual[symbol] ?? 0) + 1;
      for (const offset of [0, 10, 20])
        assert.ok(Number.isFinite(Number(line.slice(offset, offset + 10))));
    }
    const expected = {};
    for (const match of c.formula.matchAll(/([A-Z][a-z]?)(\d*)/g))
      expected[match[1]] = (expected[match[1]] ?? 0) + Number(match[2] || 1);
    assert.deepEqual(actual, expected, c.id);
  }
});
test("every lab chemical has an explicit scientific structure status", () => {
  const coverage = json("shared/lab-structure-coverage.json"),
    compounds = json("shared/compounds.json");
  assert.ok(coverage.length >= 93);
  assert.equal(
    new Set(coverage.map((c) => c.chemicalId)).size,
    coverage.length,
  );
  for (const c of coverage) {
    assert.ok(["available", "components", "unavailable"].includes(c.status));
    if (c.status === "available")
      assert.ok(compounds.some((p) => p.id === c.compoundId));
    if (c.status === "components") {
      assert.ok(c.components.length);
      assert.equal(c.compoundId, null);
    }
  }
  assert.equal(
    coverage.find((c) => c.chemicalId === "chem-nacl").status,
    "components",
  );
  assert.equal(
    coverage.find((c) => c.chemicalId === "chem-ch3coona").status,
    "components",
  );
});
test("study bank has 60 valid questions with explanations", () => {
  const questions = json("shared/study-questions.json");
  assert.equal(questions.length, 60);
  assert.equal(new Set(questions.map((q) => q.id)).size, 60);
  for (const q of questions) {
    assert.equal(q.options.length, 4);
    assert.ok(q.answer >= 0 && q.answer < 4);
    assert.ok(q.explanation.length > 25);
    assert.equal(new Set(q.options).size, 4);
  }
});
test("production package excludes development sources and missing assets are not rewritten to HTML", () => {
  const config = json("vercel.json");
  assert.equal(config.outputDirectory, "dist");
  assert.ok(!config.rewrites.some((r) => r.source.includes("assets")));
  for (const filename of [
    "index.html",
    "lab-2d/index.html",
    "lab-3d/index.html",
    "lab-safety/index.html",
    "tien-ich/cau-truc-3d/index.html",
    "on-tap/index.html",
    "platform/viewer.js",
  ])
    assert.ok(fs.existsSync(`dist/${filename}`), filename);
  assert.ok(!fs.existsSync("dist/.env"));
  assert.ok(!fs.existsSync("dist/lab-2d/src"));
  assert.ok(!fs.existsSync("dist/api"));
  assert.ok(
    !fs
      .readFileSync("dist/lab-2d/index.html", "utf8")
      .includes("/src/main.tsx"),
  );
});
test("serverless routes validate inputs and retain JSON errors", async () => {
  const file = ".cache/test-api.mjs";
  await build({
    entryPoints: ["api/[...route].ts"],
    bundle: true,
    format: "esm",
    platform: "node",
    packages: "external",
    outfile: file,
  });
  const { default: handler } = await import(
    pathToFileURL(process.cwd() + "/" + file)
  );
  async function request(path, method = "GET", body = {}, query = {}) {
    const result = { statusCode: 200, headers: {} };
    const response = {
      setHeader(k, v) {
        result.headers[k] = v;
      },
      status(code) {
        result.statusCode = code;
        return this;
      },
      json(value) {
        result.body = value;
        return this;
      },
      end() {
        return this;
      },
    };
    await handler({ url: path, method, body, query, headers: {} }, response);
    return result;
  }
  assert.equal((await request("/api/health")).body.status, "ok");
  assert.equal(
    (await request("/api/chemistry/structure", "GET", {}, { cid: "invalid" }))
      .statusCode,
    400,
  );
  assert.equal(
    (await request("/api/chemistry/search", "GET", {}, { q: "x".repeat(151) }))
      .statusCode,
    400,
  );
  assert.equal((await request("/api/does-not-exist")).statusCode, 404);
  assert.equal(
    (await request("/api/gemini/generate", "POST", { contents: "invalid" }))
      .statusCode,
    400,
  );
});
