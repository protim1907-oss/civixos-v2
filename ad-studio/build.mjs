// Civix250 ad builder — inject a content JSON into template.html at a chosen size.
// Usage:  node ad-studio/build.mjs ad-01-lobby 1200x628
//         node ad-studio/build.mjs ad-01-lobby            (builds every preset size)
// Output: ad-studio/out/<name>-<size>.html   (open + screenshot -> .jpg)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));

// Per-size layout tokens. Add a new key here to support a new Google Ads size.
const PRESETS = {
  '1200x628': { W:1200, H:628, TOPH:96, LOGOH:56, PADX:64, URLFS:22, BODYPADY:20,
    GAP:20, EYEFS:20, H1FS:66, TXTW:760, DESCFS:27, CTAMT:14, CTAFS:25,
    CTAPY:17, CTAPX:40, STRIPEH:10 },
  '1200x1200': { W:1200, H:1200, TOPH:120, LOGOH:66, PADX:80, URLFS:26, BODYPADY:60,
    GAP:28, EYEFS:24, H1FS:92, TXTW:1000, DESCFS:38, CTAMT:24, CTAFS:34,
    CTAPY:22, CTAPX:52, STRIPEH:14 },
  '1080x1080': { W:1080, H:1080, TOPH:110, LOGOH:60, PADX:72, URLFS:24, BODYPADY:52,
    GAP:26, EYEFS:22, H1FS:82, TXTW:900, DESCFS:34, CTAMT:22, CTAFS:31,
    CTAPY:20, CTAPX:48, STRIPEH:12 },
};

const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const [name, size] = process.argv.slice(2);
if (!name) { console.error('usage: node build.mjs <ad-name> [size]'); process.exit(1); }

const ad = JSON.parse(readFileSync(join(ROOT, 'ads', `${name}.json`), 'utf8'));
const template = readFileSync(join(ROOT, 'template.html'), 'utf8');
const logoB64 = readFileSync(join(ROOT, 'assets', 'logo.png')).toString('base64');
const logoURI = `data:image/png;base64,${logoB64}`;

const sizes = size ? [size] : Object.keys(PRESETS);
for (const s of sizes) {
  const p = PRESETS[s];
  if (!p) { console.error(`unknown size "${s}". known: ${Object.keys(PRESETS).join(', ')}`); process.exit(1); }
  const tokens = {
    LOGO: logoURI,
    EYEBROW: esc(ad.eyebrow), HEADLINE: esc(ad.headline), DESC: esc(ad.desc),
    CTA: esc(ad.cta), URL: esc(ad.url), ...p,
  };
  const html = template.replace(/__([A-Z0-9]+)__/g, (_, k) =>
    (k in tokens) ? tokens[k] : `__${k}__`);
  const outFile = join(ROOT, 'out', `${ad.name}-${s}.html`);
  writeFileSync(outFile, html);
  console.log('wrote', outFile);
}
