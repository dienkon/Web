import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
const root = path.resolve(import.meta.dirname, ".."),
  output = path.join(root, "dist"),
  port = Number(process.env.PORT) || 4173;
if (
  process.argv.includes("--rebuild") ||
  !fs.existsSync(path.join(output, "index.html"))
) {
  const res = spawnSync(
    process.execPath,
    [path.join(root, "scripts/build-platform.mjs"), "--static-only"],
    { cwd: root, stdio: "inherit" },
  );
  if (res.status !== 0) process.exit(res.status ?? 1);
}
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".glb": "model/gltf-binary",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".sdf": "chemical/x-mdl-sdfile",
  ".cif": "chemical/x-cif",
  ".mp3": "audio/mpeg",
};
let api;
async function apiHandler() {
  if (!api) {
    const file = path.join(root, ".cache", "preview-api.mjs");
    await build({
      entryPoints: [path.join(root, "api/dispatch.ts")],
      bundle: true,
      platform: "node",
      format: "esm",
      packages: "external",
      outfile: file,
    });
    api = (await import(pathToFileURL(file).href)).default;
  }
  return api;
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith("/api/")) {
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 30000) {
          res.writeHead(413);
          res.end("Payload too large");
          return;
        }
      }
      req.query = Object.fromEntries(url.searchParams);
      req.body = body ? JSON.parse(body) : {};
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (value) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(value));
        return res;
      };
      return await (
        await apiHandler()
      )(req, res);
    }
    if (["/thi-nghiem", "/thi-nghiem/", "/thi-nghiem.html"].includes(pathname)) {
      res.writeHead(302, { Location: "/lab-2d/" });
      return res.end();
    }
    if (pathname === "/lab" || pathname.startsWith("/lab/")) {
      res.writeHead(307, { Location: pathname === "/lab" ? "/lab-3d/" : pathname.replace(/^\/lab/, "/lab-3d") });
      return res.end();
    }
    if (pathname === "/tai-lieu-so" || pathname.startsWith("/tai-lieu-so/")) {
      const target = pathname.replace(/^\/tai-lieu-so\/?/, "/trung-tam/tai-lieu-so/") + (new URL(req.url, "http://localhost").search);
      res.writeHead(302, { Location: target });
      return res.end();
    }
    let file = path.resolve(output, "." + pathname);
    if (file !== output && !file.startsWith(output + path.sep)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, "index.html");
    if (
      !fs.existsSync(file) &&
      /^\/trung-tam\/(tai-lieu-so|cong-dong)(\/|$)/.test(pathname)
    )
      file = path.join(output, "trung-tam/index.html");
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not found");
    }
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] ?? "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
    fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Preview request failed" }));
  }
});
server.listen(port, "127.0.0.1", () => {
  console.log(`ChemDex preview http://127.0.0.1:${port}`);
  console.log(`  • Bảng tuần hoàn : http://127.0.0.1:${port}/`);
  console.log(`  • Trung tâm Tiện ích : http://127.0.0.1:${port}/tien-ich/`);
  console.log(`  • Cấu trúc 3D : http://127.0.0.1:${port}/tien-ich/cau-truc-3d/`);
  console.log(`  • Tài liệu số : http://127.0.0.1:${port}/trung-tam/tai-lieu-so/`);
  console.log(`  • Phòng lab 2D / 3D : http://127.0.0.1:${port}/lab-2d/ | http://127.0.0.1:${port}/lab-3d/`);
});
