import fs from "node:fs";
import { pathToFileURL } from "node:url";

// Explicit maintenance command; deployment never depends on the upstream site.
export function parseWeights(html) {
  const entries = [];
  for (const row of html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(
      (m) => m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim(),
    );
    if (cells.length < 4 || !/^\d+$/.test(cells[0])) continue;
    const match = cells[3].match(/^([\d.]+)\s*(?:&plusmn;|±)\s*([\d.]+)$/);
    if (!match) continue; // Radioactive elements without a standard weight.
    entries.push({ z: Number(cells[0]), symbol: cells[1], value: Number(match[1]), uncertainty: Number(match[2]), text: `${match[1]} ± ${match[2]}` });
  }
  if (entries.length !== 84 || new Set(entries.map((e) => e.symbol)).size !== 84 ||
      entries.some((e) => !Number.isFinite(e.value) || e.value <= 0 || !Number.isFinite(e.uncertainty) || e.uncertainty <= 0))
    throw new Error("CIAAW table changed or is incomplete; no data was written.");
  return entries;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const source = "https://ciaaw.org/abridged-atomic-weights.htm";
  const response = await fetch(source, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`CIAAW returned ${response.status}`);
  const html = await response.text();
  if (!html.includes("Abridged Standard Atomic Weights 2024")) throw new Error("Review the new CIAAW edition before importing.");
  const elements = parseWeights(html);
  const result = { title: "CIAAW Abridged Standard Atomic Weights 2024", source, edition: 2024, retrievedAt: new Date().toISOString().slice(0, 10), elements };
  fs.writeFileSync("shared/atomic-weights.json", JSON.stringify(result, null, 2) + "\n");
  console.log(`Updated ${elements.length} attributed standard atomic weights. Run node scripts/enrich-elements.mjs next.`);
}
