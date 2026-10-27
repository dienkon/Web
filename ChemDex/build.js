// Compatibility entry point: package existing builds without changing source HTML.
const {spawnSync}=require('node:child_process');
const result=spawnSync(process.execPath,['scripts/build-platform.mjs','--static-only'],{cwd:__dirname,stdio:'inherit'});
process.exit(result.status??1);
