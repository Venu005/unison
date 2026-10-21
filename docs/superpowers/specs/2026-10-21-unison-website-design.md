# Unison website: design

The product was renamed from MacDroid to Unison on 2026-10-21 (see DECISIONS.md). Every visible "MacDroid" in the mockup becomes "Unison", including the giant wordmark the robot sits on: the robot sits on the "U" or another letter that works, builder's choice.

Date: 2026-10-21. Status: approved by the owner (visual mockups v1–v7, then this document). Mockup to build from: `.superpowers/brainstorm/20406-1792597896/content/page-v7.html` (gitignored scratch, copied into the repo as the starting point, see "Starting point").

## Why

Unison ships two ways: the Android app on Google Play, and the Mac app as a DMG downloaded from Unison's own website. The owner can't pay for an Apple Developer account, so the Mac app is self-signed ("MacDroid Self-Signed", `scripts/make-signing-cert.sh`) and Gatekeeper blocks it on first open. The website has three jobs:

1. Show what Unison is and make people want it (it should feel like the app: the robot from the icon, the peach/green palette).
2. Get people through the Mac install, including Gatekeeper's "Open Anyway" step, without them giving up or thinking it's malware.
3. Host what the stores need: a privacy policy at a public URL (Google Play requires one) and the download itself.

Success: someone who lands on the page understands Unison in a few seconds, can install it on a Mac without help, and the page ranks and gets summarised correctly (search engines and AI assistants).

## Goals

- One long landing page (plus a privacy page and a 404), modern, with real 3D and motion. The owner explicitly asked for "cool effects" and 3D, and rejected flat, generic layouts as "AI slop".
- Clear, illustrated install steps for the self-signed Mac app.
- Strong SEO and metadata: title/description, canonical URL, Open Graph + Twitter cards with a preview image, JSON-LD structured data (`SoftwareApplication`, free, `operatingSystem` macOS; Android added when the Play listing is live), `sitemap.xml`, `robots.txt`, `llms.txt`, favicon set and web manifest.
- A placeholder for a demo video the owner will add later.
- Hosted on GitHub Pages from this repo, free.

## Non-goals

- No blog, docs site, accounts, newsletter, analytics or cookies. (No analytics keeps the privacy policy honest and simple.)
- No backend. Static files only.
- No download counter or auto-update feed yet (Sparkle appcast is a later piece of work).
- No Android download yet: the Play listing isn't live, and there's no APK on the site (owner, 2026-10-21).
- Not the Mac App Store page or Play Store listing copy.

## Anti-goals (would make it a failure even if it works)

- Looking like a template or "AI slop": generic gradients, stock icon grids, emoji feature lists.
- Using Apple's or Nothing's logos, wordmarks or copyrighted product renders/models. The devices are our own procedural 3D models, "Nothing Phone (3)-style" and "MacBook-style" only; no Apple logo, no "NOTHING" wordmark. (Owner asked for the Apple logo; declined because Apple's trademark guidelines don't allow it on third-party marketing.)
- Hiding or downplaying the Gatekeeper warning. The page says plainly why it appears.
- Heavy pages that stutter on an ordinary laptop or drain a phone.
- Text that only exists inside WebGL canvases (invisible to search engines, screen readers and AI crawlers).

## Constraints

- **Hosting:** GitHub Pages, repo `Venu005/unison` (public). Default URL `https://venu005.github.io/unison/` (the owner renamed the repo from `macdorid` to `unison` on 2026-10-21; a custom domain may come later). The base URL and path must be one config value, used everywhere a full URL is needed (canonical, OG, sitemap, JSON-LD, llms.txt).
- **Downloads (in scope, owner 2026-10-21):** this work also produces the first downloadable Mac release. A script (`scripts/make-release.sh`; local, not CI, because the "MacDroid Self-Signed" identity only exists in the owner's login keychain) builds the Release app, packages `Unison.dmg` (the app plus an Applications shortcut, signed with the same identity), computes its SHA-256, and publishes a GitHub Release with `gh release create` whose notes include the SHA-256. Version and tag come from `CFBundleShortVersionString` (`v0.4.0` first). The site doesn't commit binaries.
- **Android (owner 2026-10-21):** "coming soon". The Google Play button becomes a non-clickable "Coming soon to Google Play" badge (one config switch turns it into the real link later). Install step 05 says the Android app is coming soon to Google Play, and pairing is done once it's out. Copy and `llms.txt` say the Android app is coming soon rather than implying it's available.
- **Repo rules (`/CLAUDE.md`):** every change also updates `docs/handoff/` in the same commit. The website is a new component, so ARCHITECTURE (new `website/` component), DEV-GUIDE (build, preview, deploy), STATUS, ROADMAP and CHANGELOG all change.
- **Brand facts the copy must keep true:** free; no account; no cloud (direct over local Wi-Fi); paired by QR code; mutual TLS with certificate pinning ("encrypted end to end" is the plain-language phrasing used on the page); Mac app is sandboxed. Features: send files both ways (resumable), notifications with replies, shared clipboard (text, links, images), calls on the Mac (answer/decline/dial), browse phone photos (preview, save, drag out), screen mirroring with remote control, ring my phone, media controls. Android 17 needs the local-network permission.

## The page, top to bottom (as decided)

Order and content are the owner's decisions; the mockup shows each.

1. **Floating nav (pill, glass):** Unison · Demo · Features · Install · Download button.
2. **Hero, "The Peek":** peach radial background, huge headline "Your phone lives here now.", subline, Download for Mac + the "Coming soon to Google Play" badge. 3D: a MacBook-style laptop whose screen cycles feature slides; the full-colour robot head peeks over the lid from behind, hands hooked over the top edge (like the app icon). Eyes follow the cursor and blink; it bobs and occasionally pops up higher; on scroll away the camera swings and the robot ducks behind the lid.
3. **Video:** "See it in action." 16:9 player placeholder with a slowly rotating glow border. Replaced later by the owner's video (assume a self-hosted MP4/WebM with a poster, or a YouTube embed; see "Left to the builder").
4. **Features, "Phone. Mac. One link.":** dark section. Headline and copy above the 3D stage; the six feature cards below it (never overlapped by 3D). 3D stage: a Nothing Phone (3)-style phone (flat frame, thin even bezels, centred punch-hole; screen with a dot-matrix clock showing the live time, date, widgets, a glow in the colour of the last arrival; back with see-through-style panels, three camera rings and a circular dot-matrix light that flashes when something arrives; it flips to show its back every few seconds) and a MacBook-style laptop (keyboard, trackpad, notch; a vivid desktop with menu bar, dock, a Unison window listing received items, macOS-style notification banners sliding in). Two glowing lanes: green phone→Mac above, peach Mac→phone below, with pulses of light, twinkling sparks, and item cards (photo, file, WhatsApp message, copied link, call, screen mirroring) that tilt along the lane, shrink into the destination screen and trigger its arrival UI. The matching feature card lights up in its colour. The stage can be dragged to spin all the way round with momentum; the camera pushes in as the section scrolls into view.
5. **Install:** "One minute, once." Five step cards with a screenshot slot each: Download (drag to Applications) → Open it once (click Done, not Move to Trash) → System Settings → Privacy & Security → Open Anyway → enter password, Open Anyway again → Allow local network, then pair: install the Android app (coming soon to Google Play) and scan the QR code. Then two cards: the Terminal shortcut (`xattr -dr com.apple.quarantine /Applications/Unison.app`) and "Check your download" (`shasum -a 256 ~/Downloads/Unison.dmg` against the published SHA-256). Then a "Why the warning?" note: Apple charges $99/year to register an app, Unison is a free side project, the code is open source (MIT) on GitHub.
6. **The game, "Throw something at it.":** warm off-white section, Download for Mac + the Play badge, giant "Unison" wordmark at the bottom. The full robot (head, body, arms, legs) sits on top of one of its letters (the mockup used the "D" of the old name; pick the letter that looks best). Seven clay objects that are things Unison handles: photo, PDF, clipboard with a copied link, a message bubble, a music note, a phone handset, a pairing QR cube. Objects drop in when the section scrolls into view, can be grabbed and thrown, collide, and rest on the letters. Throwing one at the robot's head: it gulps it (bounce, antenna flash, short happy squint, arms cheer), a toast says what happened ("IMG_2041.heic sent to your phone", "Answered the call on your Mac", "Paired with your phone 🎉"), a "sent to phone" counter goes up, and the object falls back in. Objects that merely fall on its head bounce off. Robot idles with legs crossed (top foot bobbing), uncrosses and kicks when you grab something or after a catch, reaches up for a held object, waves now and then, and looks at the cursor or the held object.
7. **Footer:** © line, links to Privacy, GitHub, llms.txt.

Plus:
- **Privacy page** (`/privacy/`): plain-language policy for both apps and the site. Facts: no accounts, no analytics, no ads, no data sent to the developer or any server; everything moves directly between your devices over your local network, encrypted; data stays on your devices (pairing keys in the Mac keychain / Android Keystore; caches on device); permissions and why each is needed (local network, camera only to scan the pairing QR code, notifications access, photos, phone/calls, microphone for mirroring audio capture, accessibility for remote control, starting at boot to reconnect after a restart); the website collects nothing and sets no cookies (GitHub Pages may keep standard server logs, link to GitHub's privacy statement); developer: **Venusai**, contact **venusaiyalamanchili@gmail.com** (owner, 2026-10-21; also used as `author`/`publisher` in JSON-LD and in `llms.txt`), plus GitHub issues. The builder must cross-check the Android permission list against `android/app/src/main/AndroidManifest.xml` and the Mac entitlements.
- **404 page** in the same style (the robot, a link home).

## How it's built (decided)

- **Location:** `website/` in this repo. Node tooling is fine (Node 24 is installed).
- **Stack:** Vite (static multi-page build) + plain HTML/CSS + Three.js from npm (pinned exact version), no UI framework. All page text is real HTML in the document, never only in canvas textures. Each 3D section is its own ES module, lazy-loaded when the section approaches the viewport, and paused when off-screen.
- **Deploy:** a GitHub Actions workflow builds `website/` and publishes to GitHub Pages on pushes to `main` that touch `website/**` (plus manual dispatch). Base path comes from the single config value.
- **SEO/metadata:** everything listed under Goals. The preview image (1200×630) shows the hero: robot peeking over the laptop with the headline; generate it once (e.g. a headless render or a hand-made export) and commit the PNG. `llms.txt` at the site root follows the llmstxt.org format: H1 name, a one-paragraph summary, then sections linking the page, the privacy page, the install steps and the GitHub repo, with the key facts (free, no account, local Wi-Fi, platforms, features, the Gatekeeper note).
- **Accessibility and fallbacks:** every canvas is decorative (`aria-hidden`) with the meaning carried by HTML text. `prefers-reduced-motion`: 3D scenes render a still frame (no auto-motion, no scroll-driven camera). Small screens and devices without WebGL: lighter versions (fewer particles, no bloom, lower pixel ratio) or a static image; the game becomes non-interactive or is replaced by a static illustration (builder's choice). Buttons and links are keyboard-reachable; contrast passes WCAG AA for text.
- **Download button:** links to `https://github.com/Venu005/unison/releases/latest/download/Unison.dmg`; the release script names the asset `Unison.dmg`. The published SHA-256 lives in the release notes; the "Check your download" card links to the latest release page rather than hard-coding a hash.
- **Licence:** the repo is MIT-licensed, so the page may say "open source".

## Starting point

Copy `page-v7.html` from the brainstorm folder into the repo as the visual reference before refactoring it (it's gitignored scratch and will be lost otherwise). Its scenes are working prototypes: the build restructures them into modules, removes the "review" note, swaps the CDN import map for npm imports, and adds the fallbacks. Keep the look and behaviour; polish is welcome, redesign is not.

## Left to the builder

- File and module layout inside `website/`, CSS approach, and how the three scenes share helpers (robot, MacBook, phone).
- Exact performance budgets and how fallbacks are detected (aim: no long main-thread stalls; total JS small enough to load fast on a phone).
- The video embed mechanism, as long as the placeholder can be swapped by editing one place.
- Fonts: the mockup uses system fonts (SF Pro on Apple devices); a self-hosted variable font such as Inter is fine for consistency elsewhere.
- Screenshot placeholders stay placeholders; the owner supplies real screenshots later.
- Wording polish of copy, keeping the facts above true.
