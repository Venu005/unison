# Support Unison (Plan 13) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one-time tips to Unison:
- **Website:** a "Support Unison" section with GitHub Sponsors, UPI and a 3D scene of a robot drinking chai on a bean bag.
- **Mac:** a "Support Unison" button in About.
- **Android:** a plain "Unison website" link in About.

**Architecture:**
- **Built into the page at build time.** The website section is static HTML in `index.html` between marker comments. A tested pure module (`src/support.js`) handles it during the build:
  - it keeps the section only when `sponsorUrl` is set, and the UPI block only when `upiId` is set;
  - it fills in the links;
  - it inlines a UPI QR code as SVG.
- **The 3D scene** is a lazy-loaded scene module, `src/scenes/support.js`, ported from the approved spike. It uses a new shared full-body robot builder, and its timeline comes from a tested pure module, `src/support/story.js`.
- **The apps** only open URLs: `NSWorkspace` on the Mac, an `ACTION_VIEW` intent on Android.

**Tech Stack:**
- **Website:** Vite 8.3.5, three 0.160.0, Vitest 5.0.5, and the new dev dependency `qrcode` 1.5.4 (exact pin).
- **Mac:** SwiftUI.
- **Android:** Jetpack Compose with Material 3.

**Spec:** `docs/superpowers/specs/2026-10-22-unison-support-design.md`. Visual reference: `website/reference/support-beanbag-spike.html`. It is a standalone page using a CDN import map, and it copies the robot code; the port replaces both.

**Branch:** `feat/support` from `main`, after `docs/support-spec` is merged.

## Global Constraints

- **Payment links.**
  - Sponsors URL: `https://github.com/sponsors/Venu005`.
  - Config keys in `website/site.config.js`: `sponsorUrl: null` and `upiId: null`, both shipped as `null` (owner, 2026-10-22).
  - UPI link format: `upi://pay?pa=<upiId>&pn=Unison&cu=INR`.
- **Website copy (verbatim):**
  - eyebrow "Support Unison";
  - headline "Buy the robot a chai.";
  - body "Unison is free, with no ads and no account. It's made by one person in India. If it saves you time, a one-time tip keeps it going.";
  - button "♥ Sponsor on GitHub";
  - UPI label "In India? Scan to pay with UPI".
- **Robot credit, in the footer of every page (index, privacy, 404), verbatim:** "The Android robot is reproduced or modified from work created and shared by Google and used according to terms described in the Creative Commons 3.0 Attribution License." Link "Creative Commons 3.0 Attribution License" to `https://creativecommons.org/licenses/by/3.0/`.
- **Mac.** The button label is **"Support Unison"**, with no trailing "…". DECISIONS.md records the owner's rule that buttons don't carry "…"; this overrides the spec's "Support Unison…". The button opens `https://venu005.github.io/unison/#support`.
- **Android.**
  - The row reads headline "Unison website" and supporting text "venu005.github.io/unison", and opens `https://venu005.github.io/unison/`.
  - The Android app never contains "sponsor", "tip", "donate", "#support", `github.com/sponsors` or `upi:`.
- **Robot look.** Robot green is `#4CB873` (`GREEN`), with one antenna and a bulb. There are no Google or Android logos or wordmarks. The hero's and the game's robots must look unchanged.
- **Product name and old name.**
  - Every visible surface says "Unison".
  - `npm run check` already fails if "macdroid" appears in `dist`, so new website code must not contain that string, in comments either.
- **Repo rule.** Every commit also updates `docs/handoff/`. This plan keeps one CHANGELOG entry, "Plan 13: Support Unison (feat/support)", and adds a bullet to it per task.
- **Gates.**
  - Website tasks: `cd website && npm test && npm run build && npm run check`.
  - The Mac task: `cd mac/MacDroidCore && swift test` and the `xcodebuild` gate from CLAUDE.md.
  - The Android task: `cd android && ./gradlew :core:test :app:testDebugUnitTest :app:assembleDebug`.
  - Every gate passes with no warnings.

## Review Focus

1. **A malformed UPI ID.** A typo such as `name@` or a space would produce a QR code that sends money nowhere. The build must stop with a clear error. → `applySupport` test "rejects a malformed UPI ID" (Task 1).
2. **Sponsors not live yet.** While `sponsorUrl` is `null`, the built page must hold no `id="support"`, no "Support" footer or nav link and no `github.com/sponsors`, so nothing links to a dead page. → `applySupport` tests (Task 1) and the `check-dist` rule (Task 2).
3. **A `upi:` link in the built HTML.** `check-dist` currently fails any `href` that isn't under `/unison/`, which would break the build as soon as `upiId` is set. → `check-dist` skips `upi:` URLs; the Task 2 verification builds with `UNISON_UPI_ID` set.
4. **Clicking Sponsor while the robot is still walking in.** The click must still open the link, and the sip must not jump the robot before it sits. → `story.js` test "a sip requested before seated is ignored" (Task 3).
5. **Money wording creeping into the Android app.** A later edit could add "Support" next to the website row. → JVM unit test `NoPaymentLinksTest` scans `android/app/src/main` (Task 6).

---

## File map

```
website/
  site.config.js                  + sponsorUrl: null, upiId: null
  vite.config.js                  passes UNISON_SPONSOR_URL / UNISON_UPI_ID env overrides to seoPlugin (local preview)
  package.json                    + devDependency qrcode 1.5.4
  index.html                      + <section id="support"> between support markers, footer/nav links, robot credit
  privacy/index.html, 404.html    + robot credit in footer
  src/support.js                  pure-ish: upiLink(id), applySupport(html, site) -> Promise<string>
  src/seo-plugin.js               calls applySupport in transformIndexHtml
  src/support/story.js            pure: STORY timings, storyAt(t), idleSchedule
  src/three/shared.js             + makeFullRobot()
  src/scenes/support.js           mount(section, quality) -> { stop() }
  src/main.js                     + mountWhenNear(#support, …)
  src/styles/sections.css         + #support styles
  public/support-still.png        static-quality picture (seated cheers pose)
  test/support.test.js, test/story.test.js
  scripts/check-dist.mjs          + upi: skip, support/credit rules
mac/MacDroid/Views/Settings/AboutView.swift          + Support Unison button
android/app/src/main/java/dev/macdroid/app/ui/main/SettingsScreen.kt   + Unison website row
android/app/src/test/java/dev/macdroid/app/NoPaymentLinksTest.kt
docs/handoff/*
```

---

### Task 1: Support config and the build-time section filter

**Files:**
- Create: `website/src/support.js`, `website/test/support.test.js`.
- Modify: `website/site.config.js`, `website/package.json` and `package-lock.json` (`npm i -D qrcode@1.5.4 --save-exact`), and `docs/handoff/CHANGELOG.md`, where you create the Plan 13 entry.

**Interfaces:**
- Produces `upiLink(id: string) -> string`. It returns `upi://pay?pa=${id}&pn=Unison&cu=INR`. The ID is inserted raw, because UPI apps expect a literal `@`.
- Produces `applySupport(html: string, site) -> Promise<string>`. It acts on these markers:
  - **`<!-- support:start -->…<!-- support:end -->`** (any number of pairs: the section, the footer link, the nav link). If `site.sponsorUrl` is falsy, it removes every pair together with its content. Otherwise it removes only the marker comments.
  - **`<!-- upi:start -->…<!-- upi:end -->`**. If `site.upiId` is falsy, or the support block itself was removed, it removes the pair with its content. Otherwise it removes only the markers.
  - **Tokens** it replaces: `%SPONSOR_URL%`, then `%UPI_ID%`, `%UPI_LINK%` (the `upiLink` result, HTML-escaped as `&amp;`) and `%UPI_QR%`.
  - **The QR code:** `%UPI_QR%` becomes an inline SVG from `QRCode.toString(upiLink(id), { type: 'svg', margin: 1, color: { dark: '#08090b', light: '#eef0f2' } })`. Strip the XML prolog and add `role="img" aria-label="UPI QR code for <id>"`.
  - **Validation:** it throws `Error('upiId "<id>" is not a UPI ID (name@bank)')` unless the ID matches `/^[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9.-]{1,63}$/`.
- Produces two new config keys in `site.config.js`, both `null`: `sponsorUrl` and `upiId`. Give each a one-line comment in the style of `playUrl`'s.

- [ ] **Step 1: Write the failing tests** in `test/support.test.js`. Use this fixture:

```js
const page = `<a href="#x">a</a><!-- support:start --><section id="support"><a href="%SPONSOR_URL%">s</a><!-- upi:start --><a href="%UPI_LINK%">%UPI_QR%<b>%UPI_ID%</b></a><!-- upi:end --></section><!-- support:end --><footer><!-- support:start --><a href="#support">Support</a><!-- support:end --></footer>`;
const on = { sponsorUrl: 'https://github.com/sponsors/Venu005', upiId: 'unison.dev@okicici' };
```

  The tests and what each asserts:
  - **`hides every support block while sponsorUrl is null`:** the output for `{ sponsorUrl: null, upiId: 'a@b' }` contains no `support`, no `%` and no `sponsors`, and still contains `<a href="#x">a</a>`.
  - **`keeps the section and fills the Sponsors link`:** the output for `on` contains `id="support"`, `href="https://github.com/sponsors/Venu005"`, `href="#support"` and no `<!--`.
  - **`hides only the UPI block while upiId is null`:** the output for `{ ...on, upiId: null }` contains `id="support"` but not `upi:` or `%UPI`.
  - **`fills the UPI link, ID and an inline QR code`:** the output for `on` contains `href="upi://pay?pa=unison.dev@okicici&amp;pn=Unison&amp;cu=INR"`, `<b>unison.dev@okicici</b>`, `<svg` and `aria-label="UPI QR code for unison.dev@okicici"`, and does not contain `<?xml`.
  - **`upiLink builds the UPI pay URI`:** `upiLink('a.b@ybl')` returns `'upi://pay?pa=a.b@ybl&pn=Unison&cu=INR'`.
  - **`rejects a malformed UPI ID`:** `await expect(applySupport(page, { ...on, upiId: 'name@' })).rejects.toThrow('is not a UPI ID')`, and the same for `'my name@okicici'`.
  - **`ships with Sponsors and UPI off`:** the shipped `SITE.sponsorUrl` and `SITE.upiId` are both `null`.

- [ ] **Step 2:** Run `cd website && npx vitest run test/support.test.js`. Expected: FAIL, because `../src/support.js` doesn't exist.
- [ ] **Step 3:** Implement `src/support.js` and the two config keys as described in Interfaces.
- [ ] **Step 4:** Run `npm test`. Expected: all tests PASS, including the 21 existing ones.
- [ ] **Step 5:** Add the CHANGELOG entry header and a bullet for this task. Commit: `feat(website): support config and build-time section filter`.

---

### Task 2: Section markup, styles, credit line and dist checks

**Files:**
- Modify:
  - `website/index.html`;
  - `website/privacy/index.html`;
  - `website/404.html`;
  - `website/src/seo-plugin.js`;
  - `website/vite.config.js`;
  - `website/src/styles/sections.css` and `base.css` (footer credit);
  - `website/scripts/check-dist.mjs`;
  - `docs/handoff/CHANGELOG.md`.

**Interfaces:**
- Consumes `applySupport(html, site)` from Task 1.
- Produces this DOM, which Task 4 relies on:
  - `<section id="support" aria-labelledby="support-title">` containing `<canvas aria-hidden="true"></canvas>`;
  - `<img class="still" src="%BASE_URL%support-still.png" alt="" …>` (the file arrives in Task 5);
  - `.copy` holding `<h2 id="support-title">`;
  - the button `<a class="btn p" id="sponsor" href="%SPONSOR_URL%" target="_blank" rel="noopener">♥ Sponsor on GitHub</a>`;
  - `.upi`, inside the UPI markers.
- Produces two environment overrides, for local preview only. `vite.config.js` calls `seoPlugin({ ...SITE, sponsorUrl: process.env.UNISON_SPONSOR_URL || SITE.sponsorUrl, upiId: process.env.UNISON_UPI_ID || SITE.upiId })`.

- [ ] **Step 1: `index.html`.** Add the section after `#game` and before `</main>`, wrapped in support markers, using the copy from Global Constraints.
  - The UPI block is an `<a class="upi" href="%UPI_LINK%">%UPI_QR%<span>In India? Scan to pay with UPI<br><b class="mono">%UPI_ID%</b></span></a>` inside the UPI markers.
  - The headline's line break goes after "robot": `Buy the robot<br>a chai.`
  - Add `<a href="#support">Support</a>` to the footer's right-hand links, inside support markers.
  - The nav link: add `<a class="opt" href="#support">Support</a>` after Install, inside support markers. `.opt` is the class nav items already use to hide on narrow screens.
- [ ] **Step 2: The credit line.** Add it to the footer of all three pages as a third `<span class="credit">`, with the exact text and link from Global Constraints.
  - In `base.css`, it wraps to its own full-width line at 11 px in `#8b939b`.
  - Override `footer a`'s `margin-left` for the link inside it.
- [ ] **Step 3: Styles in `sections.css`.**
  - Port `#support` from the spike: the radial background `#23201c → #08090b`, `min-height: 660px; height: 88vh`, the copy block, `.btn`, `.upi` with a 64 px QR, and the same narrow-screen rule as the spike at `max-width: 900px`.
  - Add `#support .still`, positioned where the robot sits on wide screens and above the copy on narrow ones. It is visible only under `#support.static`. Mirror how `#game .still` / `#game.static` work.
  - The page must not scroll sideways at 375 px.
- [ ] **Step 4: The build plugin.** In `seo-plugin.js`, make the `transformIndexHtml` handler `async` and run `applySupport` before the existing replacements: `return (await applySupport(html, site)).replace('%SEO_HEAD%', …)…`. Add the env overrides in `vite.config.js`.
- [ ] **Step 5: `check-dist.mjs` rules.**
  - (a) Add `upi:` to the skipped-URL regex: `/^(https?:|mailto:|upi:|#|data:)/`.
  - (b) If `SITE.sponsorUrl` is `null`, the check fails when `index.html` contains `id="support"` or `github.com/sponsors`. If it is set, the check fails unless both `id="support"` and `href="${SITE.sponsorUrl}"` are present.
  - (c) The check fails on any page whose HTML lacks `Creative Commons 3.0 Attribution License`.
- [ ] **Step 6: Verify both states.**
  - Run `npm test && npm run build && npm run check`. Expected: PASS. `grep -c 'id="support"' dist/index.html` prints `0`.
  - Then run `UNISON_SPONSOR_URL=https://github.com/sponsors/Venu005 UNISON_UPI_ID=unison.dev@okicici npm run build && npx vite preview`. Expected: the section shows with the button and QR code. At this stage the section shows no scene yet, only the empty canvas area.
  - Restore with a plain `npm run build`.
- [ ] **Step 7:** Add a CHANGELOG bullet. Commit: `feat(website): Support section markup, credit line and checks`.

---

### Task 3: The story timeline (pure)

**Files:** Create `website/src/support/story.js` and `website/test/story.test.js`. Modify `docs/handoff/CHANGELOG.md`.

**Interfaces:**
- Produces `STORY = { delay: 0.6, walk: 3.0, turn: 0.7, hop: 0.9, cheers: 2.4, sip: 1.8, idleMin: 4.5, idleMax: 6.5 }`. These are seconds, frozen.
- Produces `storyAt(t: number) -> { phase: 'waiting' | 'walk' | 'turn' | 'hop' | 'seated', k: number, seatedFor: number }`.
  - `t` is the number of seconds since the section came into view.
  - `k` runs from 0 to 1 within the current phase.
  - `seatedFor` is the number of seconds since landing, or 0 if the robot isn't seated yet.
  - The phases run in this order: `waiting` until `delay`, then `walk`, `turn`, `hop`, and finally `seated`.
- Produces `createIdle(random = Math.random) -> { request(kind: 'sip' | 'cheers', now: number, seated: boolean): void, tick(now: number, seated: boolean): { action: 'sip' | 'cheers' | null, k: number } }`.
  - Before the robot is seated, `tick` returns `{ action: null }` and requests are dropped.
  - The first seated action is `cheers`. After that, idle actions alternate, scheduled `idleMin + random() * (idleMax - idleMin)` seconds after each one starts.
  - A request replaces the current action and restarts its `k` at 0.
  - `k` runs from 0 to 1 over `STORY.sip` or `STORY.cheers`. When it reaches 1, `action` becomes `null` until the next action.
  - Hovering over the button is not an action: the scene keeps a separate `raise` value of 0–1 for it.

- [ ] **Step 1: Write the failing tests:**
  - **`phases run waiting → walk → turn → hop → seated`:**
    - `storyAt(0).phase` is `'waiting'`;
    - `storyAt(0.6 + 1.5)` returns `{ phase: 'walk', k: 0.5 }`, with a k tolerance of 1e-9;
    - `storyAt(0.6 + 3.0 + 0.35).phase` is `'turn'`;
    - `storyAt(0.6 + 3.7 + 0.45).phase` is `'hop'`;
    - `storyAt(10)` returns `{ phase: 'seated', k: 1 }`, and its `seatedFor` is close to `10 - 5.2`.
  - **`the first seated action is cheers, then they alternate`:** with `random = () => 0`:
    - `tick(5.2, true).action` is `'cheers'`;
    - `tick(5.2 + 4.5, true).action` is `'sip'`;
    - `tick(5.2 + 9.0, true).action` is `'cheers'`.
  - **`a sip requested before seated is ignored`:** `request('sip', 1, false)`, then `tick(1.1, false).action` is `null`, and `tick(5.2, true).action` is still `'cheers'`.
  - **`a click restarts the sip`:** while seated, call `request('sip', 20, true)`. Then `tick(20.9, true)` returns `{ action: 'sip', k: 0.5 }`, and `tick(21.9, true).action` is `null`, assuming no idle action is due.
- [ ] **Step 2:** Run `npx vitest run test/story.test.js`. Expected: FAIL, because the module is missing.
- [ ] **Step 3:** Implement `story.js`.
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5:** Add a CHANGELOG bullet. Commit: `feat(website): support scene timeline`.

---

### Task 4: Full robot and the bean bag scene

**Files:**
- Modify: `website/src/three/shared.js`, `website/src/main.js`, `docs/handoff/CHANGELOG.md`.
- Create: `website/src/scenes/support.js`.

**Interfaces:**
- Consumes `STORY`, `storyAt` and `createIdle` from Task 3, and the `#support` DOM from Task 2.
- Produces `makeFullRobot() -> { root, body, head, eyes, bulb, arms: { left, right }, legs: { left, right } }` in `shared.js`.
  - It works in robot units: the head is radius 1 and the feet sit at `root` y = 0.
  - `head` is `makeRobot()`'s group with its hands removed, the same way `hero.js` removes them. It sits at `body` y 1.18.
  - `body` is a `Group` at y 0.74 holding the lathe torso: radius 1, height 1.1, with a 0.15 rounded bottom edge.
  - Each arm or leg is a pivot `Group` holding a `CapsuleGeometry(0.2, len)` hung below it: arms with `len` 0.6, pivots at (±1.25, 0.9, 0); legs with `len` 0.6, pivots at (±0.42, 0.08, 0).
  - Every part uses `clay(GREEN, 0.4)`.
  - `makeRobot()` itself is unchanged.
- Produces `mount(section, quality) -> { stop() }` in `scenes/support.js`.

- [ ] **Step 1:** Add `makeFullRobot()` to `shared.js`, using the spike's robot section as the source.
- [ ] **Step 2: Port the spike into `scenes/support.js`.** Base it on `setup(section, { quality })` and `run(s, tick)`, and use `s.pointer` and `s.smooth` in place of the spike's own listeners.
  - **Parts to keep:** the bean bag geometry exactly as in the spike (`BAG = 1.3`, `SEAT_Z = 0.22`, `FLOOR = -0.38`, the deformation loop, the seat-height sampling, the `#A9502E` fabric with sheen), the rug, the chai glass and steam, the lamp light, and the wide/narrow camera framing.
  - **Timing:** drive the timeline from `storyAt` and `createIdle`, with `t0` set when the section is first visible.
  - **Button:** `pointerenter`/`pointerleave` on `#sponsor` set the raise target. `click` calls `idle.request('sip', now, seated)` and doesn't prevent the default, so the link still opens.
  - **Poses:** keep the spike's numbers: `lean` −0.38, legs −0.95 with ±0.3 splay and z 0.55, the cheers wave `sin(now*7)*0.32`, and the glass counter-rotation.
- [ ] **Step 3: `lite` quality.**
  - No shadows, which `setup` already handles.
  - The bag uses `SphereGeometry(1, 96, 72)` in place of 160×120.
  - The story starts at `seated`: `t0` is set so that `storyAt` returns seated straight away.
  - There are no hover handlers on coarse pointers.
- [ ] **Step 4:** In `main.js`, add `mountWhenNear(document.getElementById('support'), () => import('./scenes/support.js'), quality)`. `mountWhenNear` already ignores a missing section, which matters while `sponsorUrl` is `null`.
- [ ] **Step 5: Verify.**
  - Run `npm test && npm run build && npm run check`. Expected: PASS, with no new chunk-size warning, since three stays in its shared chunk.
  - Start the dev server with `UNISON_SPONSOR_URL=https://github.com/sponsors/Venu005 UNISON_UPI_ID=unison.dev@okicici npx vite`.
    - **Expected:** an empty bag; the robot walks in, turns, hops, lands with a squash, cheers, then alternates cheers and sips. Hovering over Sponsor makes it cheer; clicking makes it sip and opens a new tab. Its legs are visible over the front of the bag. The hero's and the game's robots look the same as on `main`. The console is clean.
    - **Narrow and lite:** at a 390 px wide viewport with touch emulation, the robot is already seated and the page doesn't scroll sideways.
- [ ] **Step 6:** Add a CHANGELOG bullet. Commit: `feat(website): bean bag chai scene`.

---

### Task 5: The still picture for `static` quality

**Files:**
- Create: `website/public/support-still.png`.
- Modify: `website/src/scenes/support.js` (`?still` mode), `website/scripts/check-dist.mjs` (require the file when `sponsorUrl` is set), `docs/handoff/DEV-GUIDE.md`, `docs/handoff/CHANGELOG.md`.

**Interfaces:**
- Consumes `mount` from Task 4.
- Produces a still mode. When `location.search` contains `still`, the scene renders the seated pose at the peak of a cheers with no animation and a transparent background. The section's background is hidden in this mode; add `section.classList.add('still-render')` with matching CSS.

- [ ] **Step 1:** Add the still mode to `support.js`.
- [ ] **Step 2: Render the PNG.**
  - Use Playwright's headless shell, which is already in `~/Library/Caches/ms-playwright`, or any Chromium. Build with the env overrides from Task 2, then run `npx vite preview`. Run the shell with `--use-angle=metal --window-size=1400,900 --default-background-color=00000000 --timeout=7000 --screenshot=<out>` against `http://localhost:4173/unison/?still`.
  - Crop to the robot and bag with `sips`, about 900×700, and keep the file under 300 KB.
  - Document the exact command in DEV-GUIDE under "Website".
  - **Fallback if this can't be made to work:** point `.still`'s `src` at `%BASE_URL%favicon.svg`, as the game section does. Note the fallback in the CHANGELOG bullet.
- [ ] **Step 3:** In `check-dist`, when `SITE.sponsorUrl` is set, fail if `index.html` references `support-still.png` and the file isn't in dist. The existing local-file rule already covers this; just confirm that it fires.
- [ ] **Step 4: Verify.** Run `npm run build && npm run check`. Expected: PASS. Then load the preview with the env overrides and reduced motion emulated in DevTools. Expected: the still picture shows, no canvas runs, and the text and button work.
- [ ] **Step 5:** Commit: `feat(website): still picture for the support scene`.

---

### Task 6: Mac About button and Android website row

**Files:**
- Modify:
  - `mac/MacDroid/Views/Settings/AboutView.swift`;
  - `android/app/src/main/java/dev/macdroid/app/ui/main/SettingsScreen.kt`;
  - `docs/handoff/CHANGELOG.md`.
- Create: `android/app/src/test/java/dev/macdroid/app/NoPaymentLinksTest.kt`.

**Interfaces:** None shared. Each side hard-codes its URL in its view, as the only user.

- [ ] **Step 1: Android, failing test.** Write `NoPaymentLinksTest.noPaymentWordsOrLinksInTheApp`.
  - It walks `File("src/main")` recursively. Gradle runs JVM unit tests from the module directory.
  - It reads `.kt` and `.xml` files, and asserts that none of them matches `Regex("""github\.com/sponsors|upi:|#support|\b(sponsor|donat\w*|tip jar|buy me)\b""", RegexOption.IGNORE_CASE)`.
  - It also asserts that `SettingsScreen.kt` contains `"https://venu005.github.io/unison/"`.
- [ ] **Step 2:** Run `cd android && ./gradlew :app:testDebugUnitTest --tests '*NoPaymentLinksTest*'`. Expected: FAIL on the missing URL.
- [ ] **Step 3: Android, the row.** In the About section between "Version" and "Forget this Mac", add a `ListItem`:
  - headline `Text("Unison website")`, supporting `Text("venu005.github.io/unison")`;
  - leading icon `Icons.Rounded.Public`, trailing icon `Icons.Rounded.OpenInNew` (the extended icons are already a dependency);
  - `Modifier.clickable { context.openWebsite() }`.

  Add a private `Context.openWebsite()` next to the screen's other `Context` helpers. It calls `startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://venu005.github.io/unison/")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))`, catches `ActivityNotFoundException`, and shows `Toast` "No browser to open the website".
- [ ] **Step 4:** Run `./gradlew :core:test :app:testDebugUnitTest :app:assembleDebug`. Expected: PASS, with no warnings.
- [ ] **Step 5: Mac.** In `AboutView`, under the description `Text`, add `Button("Support Unison") { NSWorkspace.shared.open(URL(string: "https://venu005.github.io/unison/#support")!) }` with `.buttonStyle(.bordered)` and `.padding(.top, 6)`. Use a `private static let supportURL` to avoid force-unwrapping inline.
- [ ] **Step 6:** Run `cd mac/MacDroidCore && swift test`, then `cd mac && xcodegen generate && xcodebuild -project MacDroid.xcodeproj -scheme MacDroid -configuration Debug -derivedDataPath build build`. Expected: both succeed with no warnings. Launch the app, open Settings → About and click the button: the browser opens the site. The section shows only once `sponsorUrl` is set; until then it lands at the top of the page.
- [ ] **Step 7:** Add a CHANGELOG bullet. Commit: `feat: Support Unison button on Mac, website link on Android`.

---

### Task 7: Handoff, final gates, review and the owner's check

**Files:** `docs/handoff/` (STATUS, ARCHITECTURE, DEV-GUIDE, ROADMAP, README round table, CHANGELOG) and `docs/superpowers/specs/2026-10-22-unison-support-design.md`, where you change "Support Unison…" to "Support Unison" and note why.

- [ ] **Step 1: Update the handoff docs.**
  - **ARCHITECTURE:** the support section, `src/support.js` gating, `story.js`, `makeFullRobot`, the Mac and Android links, and the no-money-wording rule on Android.
  - **DEV-GUIDE:** the env overrides for previewing, the still render command, and how the owner turns the section on (set `sponsorUrl`, and optionally `upiId`, in `site.config.js`, then push).
  - **STATUS, ROADMAP and README:** Plan 13 is built and waiting on Sponsors approval.
- [ ] **Step 2: All gates.** Run the website gates, the Mac gates and the Android gates (see Global Constraints). Expected: everything passes with no warnings.
- [ ] **Step 3: Whole-branch review.** Invoke `superpowers:requesting-code-review`.
- [ ] **Step 4: The owner's hands-on check.**
  - The scene on a desktop, then on a phone using the preview build with env overrides.
  - The Mac button.
  - The Android row on the Nothing Phone (3).
  - Afterwards, merge to `main` with the owner's go-ahead.
- [ ] **Step 5: Once Sponsors is approved (owner).**
  - Set `sponsorUrl`, and `upiId` if wanted.
  - Run `npm run build && npm run check`.
  - Commit with a CHANGELOG entry, then push. The deploy makes the section live.
