const fs = require("node:fs"),
  path = require("node:path"),
  esbuild = require("esbuild");
const root = path.resolve(__dirname, "..");
(async () => {
  await esbuild.build({
    entryPoints: [path.join(__dirname, "vendor-entry.mjs")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2022",
    minify: true,
    outfile: path.join(root, "vendor/pdfjs.js"),
    legalComments: "eof",
  });
  await esbuild.build({
    entryPoints: [path.join(__dirname, "math-typesetter-entry.mjs")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    minify: true,
    outfile: path.join(root, "vendor/math-typesetter.js"),
    legalComments: "eof",
  });
  const assets = {};
  for (const folder of ["cmaps", "standard_fonts", "wasm"]) {
    assets[folder] = {};
    for (const file of fs.readdirSync(
      path.join(root, "node_modules/pdfjs-dist", folder),
    )) {
      if (
        /\.(bcmap|pfb|ttf)$/.test(file) ||
        ["openjpeg.wasm", "jbig2.wasm"].includes(file)
      )
        assets[folder][file] = fs
          .readFileSync(
            path.join(root, "node_modules/pdfjs-dist", folder, file),
          )
          .toString("base64");
    }
  }
  for (const file of fs
    .readdirSync(path.join(root, "node_modules/pdfjs-dist/wasm"))
    .filter((n) => n.startsWith("LICENSE_")))
    fs.copyFileSync(
      path.join(root, "node_modules/pdfjs-dist/wasm", file),
      path.join(root, "vendor/licenses/pdfjs-" + file + ".txt"),
    );
  fs.writeFileSync(
    path.join(root, "vendor/pdfjs-assets.js"),
    "globalThis.PDFOfflineAssets=" + JSON.stringify(assets) + ";\n",
  );
  fs.copyFileSync(
    path.join(root, "node_modules/pdfjs-dist/LICENSE"),
    path.join(root, "vendor/LICENSE-pdfjs.txt"),
  );
  fs.copyFileSync(
    path.join(root, "node_modules/mathjax-full/LICENSE"),
    path.join(root, "vendor/LICENSE-mathjax.txt"),
  );
  for (const folder of ["cmaps", "standard_fonts"])
    for (const file of fs
      .readdirSync(path.join(root, "node_modules/pdfjs-dist", folder))
      .filter((n) => n.startsWith("LICENSE")))
      fs.copyFileSync(
        path.join(root, "node_modules/pdfjs-dist", folder, file),
        path.join(
          root,
          "vendor/licenses/pdfjs-" + folder + "-" + file + ".txt",
        ),
      );
  console.log(
    "Offline PDF.js, embedded fonts/CMaps and SVG mathematics renderer built.",
  );
  // Keep upstream notice text; normalize only trailing whitespace for repository checks.
  for(const file of fs.readdirSync(path.join(root,'vendor/licenses')).filter(n=>n.startsWith('pdfjs-'))){const target=path.join(root,'vendor/licenses',file),text=fs.readFileSync(target,'utf8');fs.writeFileSync(target,text.split(/\r?\n/).map(line=>line.trimEnd()).join('\n').trimEnd()+'\n');}
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
