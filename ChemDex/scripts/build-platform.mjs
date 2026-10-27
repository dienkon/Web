import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";
import { viewerLifecyclePlugin } from "./3dmol-lifecycle.mjs";
const root = path.resolve(import.meta.dirname, "..");
process.chdir(root);
const projects = [
  "lab-2d",
  "lab-3d",
  "lab-safety",
  "trung-tam",
  "dau-truong",
  "tien-ich/phuong-trinh/nhan-dien-pthh-thong-minh",
  "tien-ich/phuong-trinh/chuoi-phan-ung",
];
const output = path.join(root, "dist");
if (path.dirname(output) !== root) throw new Error("Invalid output directory");
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
function run(command, args, cwd = root) {
  const directNode =
    command === "node" || (command === "npm" && process.env.npm_execpath);
  const executable = directNode ? process.execPath : command;
  const parameters =
    command === "npm" && process.env.npm_execpath
      ? [process.env.npm_execpath, ...args]
      : args;
  const result = spawnSync(executable, parameters, {
    cwd,
    stdio: "inherit",
    shell: !directNode && process.platform === "win32",
  });
  if (result.status !== 0) throw new Error(`${command} failed in ${cwd}`);
}
for (const project of projects) {
  if (!process.argv.includes("--static-only")) {
    if (process.env.CI || !fs.existsSync(path.join(project, "node_modules")))
      run("npm", ["ci"], path.join(root, project));
    run("npm", ["run", "build"], path.join(root, project));
  }
  const source = path.join(root, project, "dist");
  if (!fs.existsSync(source)) throw new Error(`Missing build: ${project}`);
  fs.cpSync(source, path.join(output, project), {
    recursive: true,
    filter: (p) => !/(?:\.map$|server\.cjs$|server\.js$)/.test(p),
  });
  const entry = path.join(output, project, "index.source.html");
  if (fs.existsSync(entry))
    fs.copyFileSync(entry, path.join(output, project, "index.html"));
  if (!fs.existsSync(path.join(output, project, "index.html")))
    throw new Error(`Missing HTML: ${project}`);
}
for (const folder of ["assets", "css", "js", "data", "shared"]) {
  if (fs.existsSync(folder))
    fs.cpSync(folder, path.join(output, folder), {
      recursive: true,
      filter: (p) => !/\.(?:ts|tsx|map)$/.test(p),
    });
}
function copyStatic(directory, relative = "") {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const rel = path.posix.join(relative, entry.name),
      full = path.join(directory, entry.name);
    if (
      projects.includes(rel) ||
      [
        "node_modules",
        "dist",
        ".git",
        "scripts",
        "docs",
        "api",
        "tests",
        "shared",
        "assets",
        "data",
        "js",
        "css",
      ].includes(entry.name)
    )
      continue;
    if (entry.isDirectory()) {
      if (
        relative === "tien-ich" ||
        rel === "tien-ich" ||
        relative.startsWith("tien-ich/") ||
        rel === "on-tap"
      )
        copyStatic(full, rel);
    } else if (
      /\.(html|mp3|ico|svg|png|webmanifest)$/.test(entry.name) &&
      !/legacy|source|thi-nghiem/.test(entry.name)
    ) {
      fs.mkdirSync(path.dirname(path.join(output, rel)), { recursive: true });
      fs.copyFileSync(full, path.join(output, rel));
    }
  }
}
copyStatic(root);
await build({
  entryPoints: [
    "platform/periodic.js",
    "platform/structures.js",
    "platform/study.js",
    "platform/viewer.js",
    "platform/tools.js",
  ],
  bundle: true,
  splitting: true,
  format: "esm",
  outdir: path.join(output, "platform"),
  minify: true,
  chunkNames: "chunks/[name]-[hash]",
  target: "es2022",
  plugins: [viewerLifecyclePlugin],
  loader: { ".frag": "text", ".vert": "text" },
});
fs.copyFileSync(
  "platform/styles.css",
  path.join(output, "platform/styles.css"),
);
fs.mkdirSync(path.join(output, "licenses"), { recursive: true });
fs.copyFileSync(
  "node_modules/3dmol/LICENSE",
  path.join(output, "licenses/3dmol.txt"),
);
fs.copyFileSync(
  "shared/element-properties.json",
  path.join(output, "licenses/element-property-attribution.json"),
);
run("node", [
  "node_modules/tailwindcss/lib/cli.js",
  "-c",
  "tailwind.config.cjs",
  "-i",
  "platform/tailwind.css",
  "-o",
  path.join(output, "css/utilities.css"),
  "--minify",
]);
function cleanHtml(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) cleanHtml(p);
    else if (e.name.endsWith(".html")) {
      let s = fs.readFileSync(p, "utf8");
      s = s
        .replace(
          /<script[^>]*src=["']https:\/\/cdn\.tailwindcss\.com[^"']*["'][^>]*><\/script>/g,
          '<link rel="stylesheet" href="/css/utilities.css">',
        )
        .replace(/<script>\s*tailwind\.config\s*=[\s\S]*?<\/script>/g, "");
      fs.writeFileSync(p, s);
    }
  }
}
cleanHtml(output);
console.log("Production output ready: dist (source files preserved)");
