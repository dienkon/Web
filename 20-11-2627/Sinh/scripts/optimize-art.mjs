// Encode the original ImageGen PNGs as smaller lossless-alpha WebP assets.
// No generative changes, cropping, resizing, or background removal are applied.
import sharp from "sharp";
import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
const directory = resolve("public/assets");
for (const file of await readdir(directory)) {
  if (!file.endsWith("-art.png") && file !== "bouquet-roses.png") continue;
  const input = resolve(directory, file),
    output = input.replace(/\.png$/, ".webp");
  const previous = await stat(output).catch(() => null);
  if (previous && previous.mtimeMs >= (await stat(input)).mtimeMs) continue;
  await sharp(input)
    .webp({ quality: 91, alphaQuality: 100, effort: 6 })
    .toFile(output);
  const a = await stat(input),
    b = await stat(output);
  console.log(
    `${file}: ${Math.round(a.size / 1024)} KB → ${Math.round(b.size / 1024)} KB`,
  );
}
