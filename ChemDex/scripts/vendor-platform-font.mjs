import fs from "node:fs";

// Maintenance only: store the Vietnamese/Latin variable font and its license.
const response = await fetch("https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&display=swap", {
  headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36" },
  signal: AbortSignal.timeout(20000),
});
if (!response.ok) throw new Error(`Font CSS returned ${response.status}`);
const css = await response.text(), files = [];
for (const match of css.matchAll(/\/\* (vietnamese|latin-ext|latin) \*\/\s*(@font-face\s*\{[\s\S]*?\})/g)) {
  const name = `manrope-${match[1]}.woff2`, url = match[2].match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/)?.[1];
  if (!url) throw new Error("Unexpected font format");
  const font = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!font.ok) throw new Error(`Font returned ${font.status}`);
  const data = Buffer.from(await font.arrayBuffer());
  if (data.subarray(0, 4).toString() !== "wOF2") throw new Error("Invalid WOFF2 file");
  files.push({ name, data, rule: match[2].replace(url, `/assets/fonts/${name}`) });
}
if (files.length !== 3) throw new Error("Expected Vietnamese, Latin extended and Latin subsets");
const licenseResponse = await fetch("https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt", { signal: AbortSignal.timeout(20000) });
if (!licenseResponse.ok) throw new Error("Font license unavailable");
const license = await licenseResponse.text();
if (!license.includes("SIL OPEN FONT LICENSE")) throw new Error("Unexpected font license");
fs.mkdirSync("assets/fonts", { recursive: true });
for (const file of files) fs.writeFileSync(`assets/fonts/${file.name}`, file.data);
fs.writeFileSync("assets/fonts/fonts.css", "/* Manrope variable font. SIL OFL 1.1; see OFL-Manrope.txt. */\n" + files.map((f) => f.rule).join("\n") + "\n");
fs.writeFileSync("assets/fonts/OFL-Manrope.txt", license);
console.log(`Vendored ${files.length} font subsets (${files.reduce((n, f) => n + f.data.length, 0)} bytes), with license.`);
