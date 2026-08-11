// Render a built ad HTML to an exact-size JPEG via headless Chrome + sips.
// Usage: node ad-studio/capture.mjs ad-02-bills 1200x628
//        node ad-studio/capture.mjs ad-02-bills            (all built sizes for this ad)
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, 'out');

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
];
const chrome = CHROME_CANDIDATES.find(existsSync);
if (!chrome) { console.error('No Chromium-based browser found.'); process.exit(1); }

const [name, size] = process.argv.slice(2);
if (!name) { console.error('usage: node capture.mjs <ad-name> [size]'); process.exit(1); }

// Which sizes? Explicit arg, else every built <name>-<WxH>.html in out/.
const sizes = size ? [size] : readdirSync(OUT)
  .map((f) => f.match(new RegExp(`^${name}-(\\d+x\\d+)\\.html$`)))
  .filter(Boolean).map((m) => m[1]);
if (!sizes.length) { console.error(`No built HTML for "${name}". Run build.mjs first.`); process.exit(1); }

for (const s of sizes) {
  const [w, h] = s.split('x').map(Number);
  const html = join(OUT, `${name}-${s}.html`);
  const png = join(OUT, `${name}-${s}@2x.png`);
  const jpg = join(OUT, `${name}-${s}.jpg`);
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=2', `--window-size=${w},${h}`,
    `--screenshot=${png}`, `file://${html}`], { stdio: 'ignore' });
  // Supersample 2x -> exact WxH, export JPEG q90.
  execFileSync('sips', ['-z', String(h), String(w), png, '--out', jpg,
    '-s', 'format', 'jpeg', '-s', 'formatOptions', '90'], { stdio: 'ignore' });
  console.log('wrote', jpg);
}
