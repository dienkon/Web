// Emulate GitHub Pages: only the packaged files, HTTPS and a project subdirectory.
const fs = require('node:fs');
const path = require('node:path');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const files = new Set(['index.html', 'memories.css', 'assets/site.css', 'favicon.svg', 'drive-config.js', 'drive-live.js', 'drive-images.js', 'member-profiles.js', '.nojekyll']);
module.exports = async (context, baseURL) => {
  const base = new URL(baseURL), root = process.env.STATIC_ROOT || path.join(__dirname, '..', 'dist');
  await context.route(base.origin + '/**', route => {
    const url = new URL(route.request().url());
    const name = url.pathname.startsWith(base.pathname) ? decodeURIComponent(url.pathname.slice(base.pathname.length)) || 'index.html' : '';
    if (!files.has(name)) return route.fulfill({ status: 404, body: 'Static file not found' });
    return route.fulfill({ contentType: mime[path.extname(name)] || 'text/plain', body: fs.readFileSync(path.join(root, name)) });
  });
};
