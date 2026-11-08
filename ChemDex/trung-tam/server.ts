import { spawn } from "node:child_process";
import path from "node:path";

// Unified ChemDex local server entrypoint:
// Delegates directly to the root platform preview server so `/trung-tam/`, `/tien-ich/`,
// `/lab-2d/`, `/lab-3d/`, and `/api/*` all run on one consistent local flow.
const rootDir = path.resolve(process.cwd(), "..");
const previewScript = path.join(rootDir, "scripts", "preview.mjs");

const child = spawn(process.execPath, [previewScript, ...process.argv.slice(2)], {
  cwd: rootDir,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
