# Unison Website (Plan 12) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Unison's website (landing page with three 3D scenes, install steps, privacy page, 404, full SEO + `llms.txt`) on GitHub Pages, plus the first `Unison.dmg` release it links to.

**Architecture:** A static Vite multi-page site in `website/`. All copy is real HTML; three Three.js scenes (hero, features, game) are separate modules lazy-loaded per section and chosen by a tested capability check (`full` / `lite` / `static`). SEO files are generated at build time from one config object by a tested pure module. A local script builds, signs and publishes the DMG; a GitHub Actions workflow deploys the site.

**Tech Stack:** Vite 7 (exact version pinned in `package.json`), three 0.160.0 (exact; the mockup is written against it), Vitest, plain HTML/CSS/JS (ES modules), bash + `hdiutil` + `codesign` + `gh` for the release, GitHub Actions (`actions/upload-pages-artifact`, `actions/deploy-pages`).

**Spec:** `docs/superpowers/specs/2026-10-21-unison-website-design.md`. Visual reference: `website/reference/mockup-v7.html` (committed with this plan; it still says "MacDroid" and uses a CDN import map, both of which the build replaces).

**Branch:** `feat/website` from `main`.

## Global Constraints

- Product name on every visible surface: **Unison**. The string `MacDroid` must not appear in any built file under `website/dist/`.
- Site URL: `https://venu005.github.io/unison/`; Vite `base`: `/unison/`. Both come only from `website/site.config.js`.
- Repo: `https://github.com/Venu005/unison`. DMG: `https://github.com/Venu005/unison/releases/latest/download/Unison.dmg`. Latest release page: `https://github.com/Venu005/unison/releases/latest`.
- Developer: **Venusai**, contact **venusaiyalamanchili@gmail.com**. Licence: MIT.
- Android: "Coming soon to Google Play"; `playUrl: null` in config means a non-link badge. JSON-LD `operatingSystem` is `"macOS"` only while `playUrl` is null.
- Brand facts (verbatim from the spec): free; no account; no cloud (direct over local Wi-Fi); paired by QR code; "encrypted end to end"; Mac app is sandboxed; features: send files both ways (resumable), notifications with replies, shared clipboard (text, links, images), calls on the Mac (answer/decline/dial), browse phone photos (preview, save, drag out), screen mirroring with remote control, ring my phone, media controls.
- No Apple logo, no "NOTHING" wordmark, no third-party product renders. No analytics, cookies or external requests at runtime (fonts and three are bundled, no CDN).
- Every canvas is `aria-hidden="true"`; every scene respects `prefers-reduced-motion` (still frame).
- Every commit also updates `docs/handoff/` (repo rule): this plan keeps one CHANGELOG entry "Plan 12: website (feat/website)" and adds a bullet per task.
- Gates for a task that touches only `website/`: `cd website && npm test && npm run build && npm run check`, no warnings. Task 8 also runs the Mac gates.

## Review Focus

1. **The site lives under `/unison/`, not `/`.** Every `href`/`src` in built HTML must work under that path, including on the 404 page, which GitHub Pages serves for any missing URL at any depth. → `npm run check` asserts every local URL in `dist/**/*.html` starts with `/unison/` or `#` (Task 2).
2. **No WebGL, reduced motion, a phone, a touch screen.** The page must still show all text and buttons, scroll normally, and never trap a swipe. → `chooseQuality` tests (Task 4) and the game's `touch-action: pan-y` + static mode on coarse pointers (Task 7).
3. **The Download button before or after a release.** The asset must be named exactly `Unison.dmg`, contain `Unison.app` plus an `Applications` link, and be signed with "MacDroid Self-Signed". → `make-release.sh --dry-run` verification (Task 8).
4. **Old brand or false claims leaking through.** Copying from the mockup can carry "MacDroid", an Android download link, or "macOS + Android" in JSON-LD. → `npm run check` asserts no `MacDroid` in `dist`, no Play link while `playUrl` is null, and `operatingSystem === "macOS"` (Task 2).
5. **Throws versus things that just fall.** Only a held or recently thrown object counts as a catch; dropped or respawned objects bounce off the head. → `catchDecision` tests (Task 7).

---

## File map

```
website/
  package.json, package-lock.json, vite.config.js, .gitignore (dist, node_modules)
  site.config.js                 the one config object (SITE)
  index.html, privacy/index.html, 404.html
  public/                        favicon.svg, icon-192.png, icon-512.png, apple-touch-icon.png, og-image.png
  src/seo.js                     pure: absoluteUrl, headTags, jsonLd, sitemapXml, robotsTxt, llmsTxt, webManifest
  src/seo-plugin.js              Vite plugin: fills %SEO_HEAD% / %JSON_LD%, emits sitemap/robots/llms/manifest
  src/capability.js              pure: chooseQuality(env)
  src/main.js                    nav, Play badge, lazy-mount scenes
  src/styles/base.css, sections.css
  src/three/shared.js            setup, clay, screenTexture, roundRect, makeRobot, makeMacBook, makePhone, dotText
  src/scenes/hero.js, features.js, game.js     export mount(section, quality) -> { stop(): void }
  src/game/rules.js              pure: catchDecision, THROW_FRAMES
  test/seo.test.js, capability.test.js, rules.test.js
  scripts/check-dist.mjs         post-build assertions (npm run check)
  reference/mockup-v7.html       visual reference, not built
  og/og-image.svg                source for public/og-image.png
scripts/make-release.sh          DMG + GitHub Release
scripts/render-icon.swift        gains an optional height argument
.github/workflows/website.yml
```

---

### Task 1: Scaffold, config and SEO module

**Files:**
- Create: `website/package.json`, `website/vite.config.js`, `website/.gitignore`, `website/site.config.js`, `website/src/seo.js`, `website/test/seo.test.js`
- Modify: `docs/handoff/DEV-GUIDE.md` (new "Website" section: `npm ci`, `npm run dev`, `npm test`, `npm run build`, `npm run check`, `npm run preview`), `docs/handoff/CHANGELOG.md`

**Interfaces:**
- Produces: `SITE` (default export of `site.config.js`):
  `{ name: 'Unison', tagline: 'Your phone lives here now.', description: string (≤ 160 chars, mentions Android, Mac, files, notifications, clipboard, no account, no cloud), url: 'https://venu005.github.io/unison/', base: '/unison/', repo, dmgUrl, releasesUrl, playUrl: null, version: '0.4.0', developer: { name: 'Venusai', email: 'venusaiyalamanchili@gmail.com' }, license: 'MIT', pages: [{ path: '', title, description }, { path: 'privacy/', title, description }] }`
- Produces (`src/seo.js`, all pure, take `site` as first arg):
  `absoluteUrl(site, path = '') -> string`; `headTags(site, page) -> string` (title, description, canonical, OG, Twitter, theme-color, icons, manifest link); `jsonLd(site) -> object`; `sitemapXml(site) -> string`; `robotsTxt(site) -> string`; `llmsTxt(site) -> string`; `webManifest(site) -> object`.

- [ ] **Step 1:** Create the branch `feat/website` from `main`. In `website/`, `npm init`, then add exact-pinned dev dependencies `vite`, `vitest` and dependency `three@0.160.0` (`npm i -E`). Scripts: `dev`, `build`, `preview`, `test` (`vitest run`), `check` (`node scripts/check-dist.mjs`, created in Task 2). `vite.config.js` reads `base` from `SITE` and lists the three HTML inputs.

- [ ] **Step 2: Write the failing tests** in `test/seo.test.js`:

```js
import SITE from '../site.config.js';
import { absoluteUrl, headTags, jsonLd, sitemapXml, robotsTxt, llmsTxt, webManifest } from '../src/seo.js';
const home = SITE.pages[0], privacy = SITE.pages[1];

test('absoluteUrl joins under the site url', () => {
  expect(absoluteUrl(SITE)).toBe('https://venu005.github.io/unison/');
  expect(absoluteUrl(SITE, 'privacy/')).toBe('https://venu005.github.io/unison/privacy/');
  expect(absoluteUrl(SITE, '/og-image.png')).toBe('https://venu005.github.io/unison/og-image.png');
});
test('headTags carries canonical, og and twitter for the page', () => {
  const h = headTags(SITE, privacy);
  expect(h).toContain('<link rel="canonical" href="https://venu005.github.io/unison/privacy/">');
  expect(h).toContain('property="og:image" content="https://venu005.github.io/unison/og-image.png"');
  expect(h).toContain('name="twitter:card" content="summary_large_image"');
  expect(h).toContain(`<title>${privacy.title}</title>`);
});
test('jsonLd is a free macOS app by Venusai while Play is not live', () => {
  const j = jsonLd(SITE);
  expect(j['@type']).toBe('SoftwareApplication');
  expect(j.operatingSystem).toBe('macOS');
  expect(j.offers).toMatchObject({ '@type': 'Offer', price: '0' });
  expect(j.author).toMatchObject({ name: 'Venusai', email: 'venusaiyalamanchili@gmail.com' });
  expect(j.downloadUrl).toBe(SITE.dmgUrl);
  expect(jsonLd({ ...SITE, playUrl: 'https://play.google.com/x' }).operatingSystem).toBe('macOS, Android');
});
test('sitemap lists both pages, robots points at it', () => {
  expect(sitemapXml(SITE)).toContain('<loc>https://venu005.github.io/unison/privacy/</loc>');
  expect(robotsTxt(SITE)).toContain('Sitemap: https://venu005.github.io/unison/sitemap.xml');
});
test('llms.txt follows llmstxt.org and says Android is coming soon', () => {
  const t = llmsTxt(SITE);
  expect(t.startsWith('# Unison\n\n> ')).toBe(true);
  expect(t).toMatch(/coming soon/i);
  expect(t).toContain('https://venu005.github.io/unison/privacy/');
  expect(t).toContain('https://github.com/Venu005/unison');
  expect(t).not.toContain('MacDroid');
});
test('webManifest uses the base path for start_url and icons', () => {
  const m = webManifest(SITE);
  expect(m.start_url).toBe('/unison/');
  expect(m.icons.map(i => i.src)).toEqual(['/unison/icon-192.png', '/unison/icon-512.png']);
});
```

- [ ] **Step 3:** Run `npm test` → FAIL (module not found).
- [ ] **Step 4:** Implement `site.config.js` and `src/seo.js` with the interfaces above. `llmsTxt`: H1, blockquote summary, then `## Key facts` (bullets from Global Constraints' brand facts, platforms "Mac now; Android coming soon to Google Play", the Gatekeeper note), `## Pages` (home, install anchor `#install`, privacy), `## Source` (repo, MIT). Escape HTML in `headTags`.
- [ ] **Step 5:** Run `npm test` → PASS.
- [ ] **Step 6:** Update DEV-GUIDE and CHANGELOG (create the Plan 12 entry). Commit `feat(website): scaffold, site config and SEO module`.

---

### Task 2: Page markup, styles, SEO plugin and the dist check

**Files:**
- Create: `website/index.html`, `website/privacy/index.html`, `website/404.html`, `website/src/styles/base.css`, `website/src/styles/sections.css`, `website/src/seo-plugin.js`, `website/src/main.js` (nav + Play badge only for now), `website/scripts/check-dist.mjs`
- Modify: `website/vite.config.js` (register plugin), `docs/handoff/CHANGELOG.md`

**Interfaces:**
- Consumes: `SITE`, all of `src/seo.js` (Task 1).
- Produces: section elements later tasks mount into: `<section id="hero">`, `<section id="features">` with `<div class="stage">` inside, `<section id="game">`; each contains one `<canvas aria-hidden="true">`. Game markup: `.word` containing `<span id="seat">o</span>` (the robot sits on the "o" of "Unison"; Task 7 measures it), `#sent`, `#toast`. Feature cards: `.feature[data-f="files|notifs|clip|calls|photos|mirror"]`. Play badge: any `[data-play]` element; `main.js` turns it into `<a href=playUrl>` only when `SITE.playUrl` is set, else a `<span aria-disabled="true">Coming soon to Google Play</span>`.
- Produces: `npm run check`, which later tasks rely on.

- [ ] **Step 1:** Port every section's HTML and CSS from `reference/mockup-v7.html` (order and copy per spec "The page, top to bottom"), renaming to Unison, the features section id to `features`, the toy section to `game`; drop the `.review` note. The video placeholder is one element, `<div class="player" data-video-src="" data-video-poster="">`: `main.js` swaps it for a `<video controls preload="none">` when `data-video-src` is set, so adding the demo later is a one-line edit. Install steps exactly as the spec's step 5 list, including the two command cards and "Why the warning?" (open source, MIT). "Check your download" links to `SITE.releasesUrl`. Head of each page contains `%SEO_HEAD%`; `index.html` also `%JSON_LD%`. `privacy/index.html`: the policy from the spec's Privacy bullet, with every permission in `android/app/src/main/AndroidManifest.xml` grouped in plain words (network, camera for QR, notifications access, photos/videos, calls, microphone for mirroring audio, accessibility for remote control, foreground service + wake lock to stay connected, start at boot), the Mac's entitlements (network server/client, user-selected files, Downloads), GitHub Pages logs with a link to GitHub's privacy statement, developer and contact. `404.html`: robot illustration (the icon SVG inline), "This page wandered off.", link to `SITE.base`.
- [ ] **Step 2: Write `scripts/check-dist.mjs`** (fails with a message and exit 1 on the first broken rule): `dist/index.html`, `dist/privacy/index.html`, `dist/404.html`, `dist/sitemap.xml`, `dist/robots.txt`, `dist/llms.txt`, `dist/site.webmanifest`, `dist/og-image.png`, `dist/favicon.svg` exist; no file in `dist` (html, txt, xml, json, js, css) contains `MacDroid`; every `href`/`src` in `dist/**/*.html` that isn't `http(s):`, `mailto:` or `#…` starts with `/unison/`; each page has exactly one `<h1>`, one canonical and an `og:image`; `index.html` JSON-LD parses and has `operatingSystem: "macOS"`; while `SITE.playUrl` is null no `href` contains `play.google.com`; the hero `<h1>` text is "Your phone lives here now." in the HTML (not only in canvas).
- [ ] **Step 3:** `npm run build && npm run check` → FAIL (plugin not written; placeholders unreplaced, missing files).
- [ ] **Step 4:** Implement `seoPlugin(site): import('vite').Plugin`: `transformIndexHtml` replaces `%SEO_HEAD%` with `headTags(site, pageFor(ctx.path))` and `%JSON_LD%` with a `<script type="application/ld+json">`; `generateBundle` emits `sitemap.xml`, `robots.txt`, `llms.txt`, `site.webmanifest`. Add placeholder `public/og-image.png` and `public/favicon.svg` (copy of the icon SVG) so the check can pass; Task 3 replaces them.
- [ ] **Step 5:** `npm test && npm run build && npm run check` → PASS, no warnings.
- [ ] **Step 6:** CHANGELOG bullet. Commit `feat(website): pages, styles, SEO plugin and dist check`.

---

### Task 3: Icons and the preview image

**Files:**
- Modify: `scripts/render-icon.swift` (optional 4th arg `height`; omitted = square, existing callers unchanged)
- Create: `website/og/og-image.svg` (1200×630: peach radial background, the icon artwork large on the right, "Unison" and "Your phone lives here now." on the left in the system font, small "Free for Mac · Android coming soon"), `website/scripts/render-assets.sh`
- Replace: `website/public/og-image.png`, `favicon.svg`, add `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (180)

- [ ] **Step 1:** Extend `render-icon.swift`: `render-icon.swift <in.svg> <out.png> <width> [height]`.
- [ ] **Step 2:** `render-assets.sh` compiles it once (as `scripts/render-icons.sh` does) and renders: `og-image.png` 1200×630 from `og/og-image.svg`; icons from `design/icon/macdroid-icon-mac.svg` at 192, 512, 180; copies the SVG to `public/favicon.svg`.
- [ ] **Step 3:** Run it; verify with `sips -g pixelWidth -g pixelHeight website/public/og-image.png` → `1200` × `630`, and `scripts/render-icons.sh` still renders the Mac app icons unchanged (`git status` shows no changes under `AppIcon.appiconset`).
- [ ] **Step 4:** `npm run build && npm run check` → PASS. CHANGELOG bullet. Commit `feat(website): icons and preview image`.

---

### Task 4: Capability check, shared 3D helpers and lazy mounting

**Files:**
- Create: `website/src/capability.js`, `website/test/capability.test.js`, `website/src/three/shared.js`
- Modify: `website/src/main.js`

**Interfaces:**
- Produces: `chooseQuality({ webgl: boolean, reducedMotion: boolean, width: number, coarsePointer: boolean, cores: number }) -> 'full' | 'lite' | 'static'`.
- Produces (`shared.js`, ported from the mockup with the same behaviour): `setup(el, { alpha, exposure, quality }) -> { renderer, scene, camera, pointer, smooth, visible: boolean, resize(), onResize, composer?, dispose() }` (pixel ratio ≤ 2 for `full`, 1 for `lite`; `dispose()` frees the renderer and observers); `clay(color, roughness)`; `screenTexture(w, h)`; `roundRect(ctx, x, y, w, h, r)`; `makeRobot()` → `{ robot, eyes, hands, bulb }`; `makeMacBook(w, h, open)` → `{ mb, lid, h, cv, ctx, tex }`; `makePhone()` → `{ phone, front, back, W, H }`; `drawPhoneBack(back, glow, color)`; `dotText(ctx, text, x, y, dot, color)`; `notch(ctx, W)`; `progress(el) -> number` (0 entering … 1 leaving).
- Produces (`main.js`): `mountWhenNear(section, loader: () => Promise<{ mount }>, quality)`: imports the scene module when the section is within 1 viewport, calls `mount(section, quality)`; does nothing for `static` except add class `static` to the section (CSS shows a still illustration: the icon SVG for hero/game, nothing extra for features since its cards carry the meaning).

- [ ] **Step 1: Write the failing tests:**

```js
import { chooseQuality } from '../src/capability.js';
const base = { webgl: true, reducedMotion: false, width: 1440, coarsePointer: false, cores: 8 };
test('a normal desktop gets full', () => expect(chooseQuality(base)).toBe('full'));
test('no WebGL is static', () => expect(chooseQuality({ ...base, webgl: false })).toBe('static'));
test('reduced motion is static', () => expect(chooseQuality({ ...base, reducedMotion: true })).toBe('static'));
test('phones and touch-only small screens get lite', () => {
  expect(chooseQuality({ ...base, width: 390, coarsePointer: true })).toBe('lite');
  expect(chooseQuality({ ...base, width: 820, coarsePointer: true })).toBe('lite');
});
test('weak machines get lite', () => expect(chooseQuality({ ...base, cores: 2 })).toBe('lite'));
```

- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** Implement (`lite` when `width < 900 || coarsePointer || cores <= 4`). **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Port the helpers into `shared.js` from the mockup (`import * as THREE from 'three'` and `three/examples/jsm/...` paths). Wire `main.js` to detect the environment (`!!canvas.getContext('webgl2')`, `matchMedia('(prefers-reduced-motion: reduce)')`, `innerWidth`, `matchMedia('(pointer: coarse)')`, `navigator.hardwareConcurrency`) and call `mountWhenNear` for the three sections with dynamic imports of the (not yet existing) scene modules guarded so a missing module only logs once. `npm run build && npm run check` → PASS.
- [ ] **Step 6:** CHANGELOG bullet. Commit `feat(website): capability check, shared 3D helpers, lazy mounting`.

---

### Task 5: Hero scene ("The Peek")

**Files:** Create `website/src/scenes/hero.js`. Modify `docs/handoff/CHANGELOG.md`.

**Interfaces:** Consumes `shared.js` (Task 4). Produces `export function mount(section, quality) -> { stop() }`.

- [ ] **Step 1:** Port the mockup's hero block. Behaviour unchanged: robot attached to the lid behind the screen, head centre at `lid.h + 0.02`, hands hooked over the edge, eye tracking + blink, bob + occasional pop-up, duck and camera swing on scroll; the screen cycles the four feature slides with the notch. `lite`: no shadows, pixel ratio 1. `static` never reaches this module. Pause rendering when off-screen (`visible`) and when `document.hidden`.
- [ ] **Step 2:** `npm run build && npm run check` → PASS; `npm run dev` and confirm in the browser that the hero renders and the console is clean (no errors or warnings).
- [ ] **Step 3:** CHANGELOG bullet. Commit `feat(website): hero scene`.

---

### Task 6: Features scene ("Phone. Mac. One link.")

**Files:** Create `website/src/scenes/features.js`. Modify `docs/handoff/CHANGELOG.md`.

**Interfaces:** Consumes `shared.js`; lights `.feature[data-f]` cards (Task 2 markup). Produces `mount(section, quality) -> { stop() }`.

- [ ] **Step 1:** Port the mockup's link block with its v3 behaviour: two shader lanes, sparks, six cards with soft glows, arrivals driving the Mac desktop (wallpaper pre-rendered once), phone home screen with dot-matrix clock, phone back light, flip every few seconds, drag-to-spin with momentum, camera push-in on scroll, camera distance fitted to the stage aspect. The Mac window title reads "Unison". `lite`: no bloom pass, 250 sparks instead of 700, pixel ratio 1. Canvas redraws throttled: phone back at 12 fps (as in the mockup), Mac and phone screens only on arrival changes plus once a second for the clock.
- [ ] **Step 2:** `npm run build && npm run check` → PASS; in `npm run dev` the stage spins, cards light up, and the console is clean.
- [ ] **Step 3:** CHANGELOG bullet. Commit `feat(website): features scene`.

---

### Task 7: The game ("Throw something at it.")

**Files:** Create `website/src/game/rules.js`, `website/test/rules.test.js`, `website/src/scenes/game.js`. Modify `website/src/styles/sections.css` (`#game { touch-action: pan-y }`, static illustration), `docs/handoff/CHANGELOG.md`.

**Interfaces:**
- Produces (`rules.js`): `THROW_FRAMES = 150`; `catchDecision({ held: boolean, thrownFrames: number, distance: number, reach: number, aboveBody: boolean }) -> 'eat' | 'bounce' | 'none'`.
- Produces: `mount(section, quality) -> { stop() }`.

- [ ] **Step 1: Write the failing tests:**

```js
import { catchDecision, THROW_FRAMES } from '../src/game/rules.js';
const near = { held: false, thrownFrames: 0, distance: 1, reach: 2, aboveBody: true };
test('a thrown object at the head is eaten', () => expect(catchDecision({ ...near, thrownFrames: 10 })).toBe('eat'));
test('a held object at the head is eaten', () => expect(catchDecision({ ...near, held: true })).toBe('eat'));
test('something that just fell on it bounces', () => expect(catchDecision(near)).toBe('bounce'));
test('out of reach or below the body does nothing', () => {
  expect(catchDecision({ ...near, thrownFrames: 10, distance: 3 })).toBe('none');
  expect(catchDecision({ ...near, thrownFrames: 10, aboveBody: false })).toBe('none');
});
test('a throw counts for 2.5 s at 60 fps', () => expect(THROW_FRAMES).toBe(150));
```

- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** Implement. **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Port the mockup's toy block (v7): seven objects, grab/throw, full robot on `#seat` (measured each resize, scaled to the letter's width), legs crossed at idle and kicking when excited, reaching, waving, cheering, short happy squint, toast, counter, respawn; the catch uses `catchDecision`. Pointer capture only after a hit on an object, so a swipe that misses keeps scrolling the page. `lite` (touch screens): objects still drop and settle, the robot still animates, but grabbing is off and the copy reads "Open this page on a computer to throw things at it." Pause when off-screen.
- [ ] **Step 6:** `npm run build && npm run check` → PASS; in `npm run dev` a throw is caught and counted, a drop bounces, the console is clean.
- [ ] **Step 7:** CHANGELOG bullet. Commit `feat(website): the game`.

---

### Task 8: Release script and the first DMG

**Files:** Create `scripts/make-release.sh`. Modify `docs/handoff/DEV-GUIDE.md` (Releasing), `docs/handoff/ARCHITECTURE.md` (release artefact), `docs/handoff/CHANGELOG.md`.

**Interfaces:** Produces `scripts/make-release.sh [--dry-run]`: writes `mac/build/release/Unison.dmg` and prints `SHA-256: <hex>`; without `--dry-run` it also runs `gh release create v<version> mac/build/release/Unison.dmg --repo Venu005/unison --title "Unison <version>" --notes <notes>` where the notes contain the SHA-256 line, the install link `https://venu005.github.io/unison/#install` and "Android: coming soon to Google Play".

- [ ] **Step 1:** Write the script: `set -euo pipefail`; refuse to run if the "MacDroid Self-Signed" identity is missing (point at `scripts/make-signing-cert.sh`) or the git tree is dirty (unless `--dry-run`); version from `CFBundleShortVersionString` in `mac/project.yml`; `xcodegen generate`; Release `xcodebuild` into `mac/build`; stage `Unison.app` + `ln -s /Applications` in a temp folder; `hdiutil create -volname Unison -fs HFS+ -format UDZO`; `codesign --sign "MacDroid Self-Signed" --timestamp=none` the DMG; `shasum -a 256`.
- [ ] **Step 2: Verify the dry run:** `scripts/make-release.sh --dry-run`, then:
  - `hdiutil attach -nobrowse -readonly mac/build/release/Unison.dmg` → mount shows `Unison.app` and `Applications -> /Applications`; detach.
  - `codesign -dv mac/build/release/Unison.dmg 2>&1 | grep Authority` → `Authority=MacDroid Self-Signed`.
  - `codesign -dr - <mounted>/Unison.app` → `identifier "dev.macdroid.mac" and certificate leaf = H"be20c074…"`.
- [ ] **Step 3:** Mac gates still pass (`swift test`; Debug build, no warnings). DEV-GUIDE "Releasing" (prerequisites: cert, `gh auth` with push rights to `Venu005/unison`; the publishing run happens only on the owner's word). Commit `feat: release script for Unison.dmg`.

---

### Task 9: Deploy workflow

**Files:** Create `.github/workflows/website.yml`. Modify `docs/handoff/DEV-GUIDE.md` (Deploying), `docs/handoff/ARCHITECTURE.md` (website component), `docs/handoff/CHANGELOG.md`.

- [ ] **Step 1:** Workflow: triggers `push` to `main` with `paths: ['website/**', '.github/workflows/website.yml']` and `workflow_dispatch`; permissions `contents: read, pages: write, id-token: write`; concurrency group `pages`; job `build` (checkout, `actions/setup-node` with Node 24 and npm cache on `website/package-lock.json`, `npm ci`, `npm test`, `npm run build`, `npm run check`, `actions/upload-pages-artifact` with `website/dist`) and job `deploy` (`actions/deploy-pages`, environment `github-pages`). Pin each action to its current major version tag.
- [ ] **Step 2:** Validate locally: `npx --yes @action-validator/cli .github/workflows/website.yml` (or `actionlint` if installed) → no errors; `cd website && npm ci && npm test && npm run build && npm run check` → PASS from a clean checkout.
- [ ] **Step 3:** ARCHITECTURE gains a "Website" component row (files, SEO generation, capability tiers, scenes, deploy). Commit `ci(website): deploy to GitHub Pages`.

---

### Task 10: Final gates, whole-branch review, owner check, go-live

- [ ] **Step 1:** All gates: website (`npm test`, `npm run build`, `npm run check`), Mac (`swift test`, xcodegen + Debug build), Android (`:core:test :app:testDebugUnitTest :app:assembleDebug`), all with no warnings. Update STATUS, ROADMAP, README (round table + a "Website" line) and CHANGELOG.
- [ ] **Step 2:** Whole-branch review by a fresh reviewer; fix Critical/Important findings.
- [ ] **Step 3: Owner check** with `cd website && npm run build && npm run preview` (open `http://localhost:4173/unison/`): hero, features, install, game, privacy, 404 (`/unison/nope`), a narrow (phone-width) window, reduced motion (System Settings → Accessibility → Display → Reduce motion).
- [ ] **Step 4: Go-live, only on the owner's explicit word for each action** (all are public): merge `feat/website` into `main`; `git push origin main`; enable Pages with source "GitHub Actions" (`gh api -X POST repos/Venu005/unison/pages -f build_type=workflow`); `scripts/make-release.sh` to publish `v0.4.0`; then confirm `https://venu005.github.io/unison/` loads, `/llms.txt` and `/sitemap.xml` load, and the Download button returns the DMG (`curl -sIL <dmgUrl> | grep -i '^content-type'`). Record the live URL in STATUS and CHANGELOG.
