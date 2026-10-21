// Post-build assertions on website/dist (Plan 12, `npm run check`). Exits 1 on the first broken rule.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import SITE from '../site.config.js';

const dist = join(import.meta.dirname, '..', 'dist');
const fail = msg => { console.error(`check-dist: ${msg}`); process.exit(1); };
const walk = dir => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

if (!existsSync(dist)) fail('no dist folder: run `npm run build` first');
for (const f of ['google5e78a886f56186ac.html', 'index.html', 'privacy/index.html', '404.html', 'sitemap.xml', 'robots.txt', 'llms.txt', 'site.webmanifest', 'og-image.png', 'favicon.svg']) {
  if (!existsSync(join(dist, f))) fail(`missing ${f}`);
}

const files = walk(dist);
for (const f of files.filter(f => /\.(html|txt|xml|json|webmanifest|js|css|svg)$/.test(f))) {
  if (/macdroid/i.test(readFileSync(f, 'utf8'))) fail(`${relative(dist, f)} still mentions the old name (macdroid)`);
}

const read = f => readFileSync(join(dist, f), 'utf8');
// Search-engine verification files (e.g. Google's google<token>.html) are plain text, not pages.
const isVerification = f => /^google[0-9a-f]+\.html$/.test(f);
for (const f of files.filter(f => f.endsWith('.html')).map(f => relative(dist, f)).filter(f => !isVerification(f))) {
  const html = read(f);
  for (const [, url] of html.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    if (/^(https?:|mailto:|#|data:)/.test(url)) continue;
    if (!url.startsWith(SITE.base)) fail(`${f}: "${url}" is not under ${SITE.base}`);
    const file = url.slice(SITE.base.length).split(/[?#]/)[0];
    if (/\.\w+$/.test(file) && !existsSync(join(dist, file))) fail(`${f}: "${url}" points at a file that isn't in dist`);
  }
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) fail(`${f}: needs exactly one <h1>`);
  if ((html.match(/rel="canonical"/g) || []).length !== 1) fail(`${f}: needs exactly one canonical link`);
  if (!html.includes('property="og:image"')) fail(`${f}: no og:image`);
  if (!SITE.playUrl && html.includes('play.google.com')) fail(`${f}: links to Google Play before the listing is live`);
}

const index = read('index.html');
const ld = index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!ld) fail('index.html: no JSON-LD');
let data;
try { data = JSON.parse(ld[1]); } catch (e) { fail(`index.html: JSON-LD doesn't parse (${e.message})`); }
const os = SITE.playUrl ? 'macOS, Android' : 'macOS';
if (data.operatingSystem !== os) fail(`index.html: JSON-LD operatingSystem is "${data.operatingSystem}", expected "${os}"`);
const h1 = index.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1].replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
if (h1 !== SITE.tagline) fail(`index.html: <h1> is "${h1}", expected "${SITE.tagline}"`);

// The demo video and its poster, when set, are files the site ships (under the base path).
for (const [, attr, url] of index.matchAll(/data-video-(src|poster)="([^"]+)"/g)) {
  if (!url.startsWith(SITE.base) || !existsSync(join(dist, url.slice(SITE.base.length)))) fail(`index.html: demo video ${attr} "${url}" isn't in dist`);
}

// Every "Download for Mac" button downloads the DMG.
for (const [, cls, href] of index.matchAll(/<a class="([^"]*\b(?:dl|p)\b[^"]*)" href="([^"]*)"/g)) {
  if (href !== SITE.dmgUrl) fail(`index.html: download button (.${cls}) goes to "${href}", not the DMG`);
}

console.log(`check-dist: ok (${files.length} files)`);
