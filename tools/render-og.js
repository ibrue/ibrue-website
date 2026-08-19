/**
 * Renders tools/og-card.html to og.png (1200x630), the social preview image.
 *
 *   npx puppeteer browsers install chrome   # first time only
 *   node tools/render-og.js
 *
 * Serves the repo root over HTTP first, because the card fetches a .glb and
 * file:// URLs are blocked by CORS.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = path.join(__dirname, '..');
const PORT = 8799;
const TYPES = {
  '.html': 'text/html', '.js': 'application/javascript',
  '.glb': 'model/gltf-binary', '.png': 'image/png', '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/tools/og-card.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.dataset.ready === '1', { timeout: 60000 });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(ROOT, 'og.png') });
  await browser.close();
  server.close();
  console.log('wrote og.png');
})();
