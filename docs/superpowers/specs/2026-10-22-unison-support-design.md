# Support Unison (tips): design

Date: 2026-10-22. Status: drafted after a brainstorm with the owner, who approved the payment route, the per-platform placement and the 3D scene through a series of spikes. The last spike was the bean bag v5. Spike to build from: `website/reference/support-beanbag-spike.html`. It is a copy of the brainstorm scratch file `.superpowers/brainstorm/4054-1792653521/content/support-beanbag-v5.html`, which is gitignored.

## Why

Unison is free, with no ads and no account, and the owner wants to keep it that way (see the monetization stance in DECISIONS.md and the owner's notes). The owner lives in India and wants a way for people who like Unison to leave a **one-time tip**. The owner expects most tips to come from outside India, so international cards must work well. UPI is a small extra for the occasional Indian tipper.

Success means three things:
- A visitor who wants to tip can find out how within a few seconds, from the website or the Mac app.
- Paying takes no more than a couple of clicks.
- The section is a delight of its own, matching the site's 3D, so it reads as part of the product and not as a begging banner.

## Goals

- **One payment route: GitHub Sponsors** (`https://github.com/sponsors/Venu005`), with one-time amounts. There are no fees on tips from individuals, payouts go to an Indian bank account, and the repo already lives on GitHub.
- **UPI as an extra, on the website only.** Show a QR code and the UPI ID, labelled "In India? Scan to pay with UPI".
- **A "Support Unison" section on the website** with a 3D scene. The robot walks in with a glass of cutting chai, flops into a bean bag, raises the chai to the visitor and sips it.
- **Mac app:** a "Support Unison…" button that opens the website's Support section.
- **Android app:** a plain "Unison website" link that opens the home page and never mentions money.

## Non-goals

- No subscriptions or monthly tiers promoted by us. The Sponsors page may still offer monthly, since that is the owner's setup on GitHub.
- No Ko-fi, Buy Me a Coffee, PayPal, Stripe or Razorpay.
- No Google Play Billing tips.
- No backend, analytics, tip counter or "thank you, X" wall.
- Nothing is unlocked by tipping. Every feature stays free.

## Anti-goals (would make this a failure even if it works)

- **Anything in the Android app that asks for money or links to a payment or tip page.** That includes the words "support", "tip", "donate" or "sponsor", and links to `#support`, GitHub Sponsors or UPI. Google pulled WireGuard from Play in 2019 over an in-app donation link. Outside payments for the developer are against Play's Payments policy, which exempts only validated charities. Android gets the plain website link only.
- **A nag.** No pop-ups, no "you've used Unison N times" prompts, no banners in the apps. The links sit quietly in About screens and in the site's nav and footer.
- **A heavy page.** The new scene must not slow down the first paint of the page or make scrolling stutter. It follows the existing loading rules: it loads only when its section is near the screen, and it falls back to a still picture.
- **A changed feel.** The scene must read as the same world as the hero and the game: the same clay materials, the same green robot and the same lighting style.

## Constraints

- **Repo rules (CLAUDE.md).**
  - Every commit updates `docs/handoff/`: a CHANGELOG entry always, plus STATUS, ARCHITECTURE, DEV-GUIDE, DECISIONS, ROADMAP and README where relevant.
  - All three build gates must pass with no warnings. The website has its own tests in `website/test` (vitest) and a build check in `website/scripts/check-dist.mjs`. Both must pass too.
- **Naming.** User-visible text says "Unison". Code keeps its existing names (`dev.macdroid.*`, `MacDroid` target).
- **Website architecture (from the website spec, 2026-10-21).**
  - The site uses Vite with the three.js version pinned in `website/package.json`.
  - Scenes live in `website/src/scenes/` and are mounted with `mountWhenNear` from `src/main.js`.
  - The quality level (`static`, `lite` or `full`) comes from `src/capability.js`.
  - The shared helpers in `src/three/shared.js` include `setup`, `run`, `clay` and `makeRobot`.
  - Site URLs live in `website/site.config.js` and reach the HTML through `%TOKEN%` replacement in `src/seo-plugin.js`.
- **The Android robot licence.** The robot is based on Google's Android robot, which Google licenses under CC BY 3.0. Showing the full body makes the reference obvious, so the site must carry the attribution: *"The Android robot is reproduced or modified from work created and shared by Google and used according to terms described in the Creative Commons 3.0 Attribution License."* Put it in the footer of every page, small (owner, 2026-10-22). Keep our own green (`#4CB873`) and the single antenna with a bulb. No Google or Android logos and no "Android" wordmark in the scene.
- **The Mac app is sandboxed.** Opening a URL with `NSWorkspace.shared.open` is allowed and needs no new entitlement.
- **Android.** Use a plain `ACTION_VIEW` intent. It needs no permission and no new `<queries>` entry, because the app calls `startActivity` and doesn't call `resolveActivity`. Catch `ActivityNotFoundException` and do nothing visible beyond a short toast.
- **Payments are outside our code.** We only link out. No payment data touches Unison, the website or GitHub Pages beyond the link itself.

## What was decided (owner)

### Payment route
- The tip jar is GitHub Sponsors with one-time amounts. The owner will create the Sponsors profile with an Indian bank account and tax details. They will add one-time tiers, for example $3, $5 and $10, and allow custom amounts. Tippers need a GitHub account. The owner accepted that trade-off in exchange for zero fees.
- UPI appears on the website as a QR code plus the ID, as a small secondary block under the Sponsor button.

### Website: the "Support Unison" section
- **Placement.** It is a section of its own, `id="support"`, placed after the game section and before the footer. The footer gets a "Support" link to `#support`. This was option A in the brainstorm. The owner rejected a footer-only button (option B).
- **Copy.** The left side carries:
  - eyebrow: "Support Unison";
  - headline: "Buy the robot a chai.";
  - body: "Unison is free, with no ads and no account. It's made by one person in India. If it saves you time, a one-time tip keeps it going.";
  - a primary button: "♥ Sponsor on GitHub";
  - under the button, the UPI block: the QR code, then "In India? Scan to pay with UPI", then the ID in monospace.
- **The 3D scene sits on the right**, as in the spike. It plays as a story once, then idles:
  1. An empty bean bag sits on a dark rug in warm light. The bag is a wide, slouchy terracotta sack (`#A9502E`-ish fabric with a soft sheen) with a rounded backrest, a low front lip and fabric creases. The owner rejected the couch, the round "bun" shape and the cone-shaped back.
  2. When the section scrolls into view, the robot walks in from the right holding a cutting-chai glass with steam rising from it. This is the **full robot**: the site's dome head with eyes, antenna and bulb, plus a body, two arms and two legs, all in the same green clay. Its arms and legs swing as it walks.
  3. It turns to face the visitor, hops back and flops into the bag. The bag squashes, and the robot leans back.
  4. It sits with its **legs visible**, resting forward over the front lip and slightly splayed. The owner asked for this explicitly.
  5. Its first seated move is a **cheers**: it raises the chai toward the visitor and waves it side to side while its eyes squint happily. The owner asked for the chai to be "waved to the user".
  6. Idle: it alternates a cheers and a sip every 4.5–6.5 s. Its head follows the pointer, and its bulb pulses.
- **Interaction.**
  - Hovering over the Sponsor button makes it cheer, and it keeps cheering while the pointer stays there.
  - Clicking it plays a sip, and the button still opens GitHub Sponsors in a new tab.
  - On touch screens there is no hover. The idle loop carries the scene, and a tap opens the link as normal.
- **Layout.**
  - On wide screens the copy is on the left and the scene on the right, as in the spike: three-quarter view, world turned about −0.6 rad, camera low.
  - Below 900 px wide, the scene sits above the copy and the copy goes at the bottom, the same way the hero section handles narrow screens.
  - There's no horizontal scroll at phone width, and the page keeps a 16 px side gutter.

### Mac app
- Add a "Support Unison…" button to `mac/MacDroid/Views/Settings/AboutView.swift`, under the description line. It opens `https://venu005.github.io/unison/#support` in the default browser.
- There is nothing in the menu-bar popover, and no prompts anywhere.

### Android app
- In `android/app/.../ui/main/SettingsScreen.kt`, in the About section between "Version" and "Forget this Mac", add a `ListItem`:
  - headline "Unison website";
  - supporting text "venu005.github.io/unison";
  - a link or open-in-new icon.

  Tapping it opens `https://venu005.github.io/unison/`, the home page with no `#support`.
- There is no "support", "tip" or "sponsor" wording anywhere in the Android app, its strings or its Play listing text.

## What's left to the builder

- **Code structure.**
  - Whether the full-body robot becomes a new export in `shared.js` (for example a `makeRobot({ body: true })` option or `makeFullRobot()`) or a scene-local builder. Reuse should win if it's clean.
  - The hero's and the game's robots must look unchanged.
- **Porting the spike.** The spike is a throwaway standalone page that loads three.js from a CDN and copies the robot code. Port it into `src/scenes/support.js` using the site's `setup()` and `run()`, so it gets shared resize and visibility handling, pointer tracking and cleanup.
  - Keep the choreography numbers as a starting point: walk 3.0 s, turn 0.7 s, hop 0.9 s, cheers 2.4 s, sip 1.8 s.
  - Tune them freely as long as the story beats above stay.
- **`lite` quality.** Follow what the other scenes do: no shadows, a lower pixel ratio, and fewer segments on the bag sphere. The walk-in can be kept or skipped in favour of starting seated, whichever performs well.
- **The `static` picture.** When WebGL is missing or reduced motion is on, show a still image.
  - My call: a pre-rendered transparent PNG or WebP of the seated cheers pose, committed under `website/public/`. The builder decides how it gets rendered: headless Chromium against a `?still` mode of the scene is how the brainstorm screenshots were made.
  - A simpler fallback is acceptable if that turns out to be fiddly: the existing `favicon.svg` robot, as the game section does.
- **The UPI QR code.**
  - Generate it from `upi://pay?pa=<ID>&pn=Unison&cu=INR`, either at build time with a small dev dependency or once as a committed SVG.
  - On touch devices, also make the block a `upi://pay?...` link so tapping it opens the phone's UPI apps. My call; drop it if it misbehaves on desktop.
- **Config.**
  - Add `sponsorUrl` and `upiId` to `website/site.config.js`, following the `playUrl: null` pattern, and expose them as `%SPONSOR_URL%`-style tokens or set them in `main.js`.
  - When `upiId` is `null`, hide the UPI block.
- **Top nav.** Whether to add "Support" there. My call: add it if it fits at phone width; otherwise footer only.
- **SEO.** Optionally add a `funding` entry or a `"Support"` link in `llms.txt`. Not required.
- **Tests.**
  - Add unit tests where there is logic: config tokens, hiding the UPI block, and the choreography's phase function if it's factored out as pure code.
  - Add a `check-dist` assertion that `#support` and the Sponsors link exist in the built page.
  - Mac and Android changes are view-only. They don't need new unit tests beyond keeping the existing suites green.

## Shipping before Sponsors is approved (owner, 2026-10-22)

Build and ship everything now. `site.config.js` gets `sponsorUrl: null` and `upiId: null`:
- **While `sponsorUrl` is `null`:**
  - the whole `#support` section is left out of the page, along with its footer and nav links;
  - the Mac button still ships and opens `…/unison/#support`, which lands at the top of the home page until the section exists.
- **When the owner sets `sponsorUrl`**, the section appears after the next site deploy. No Mac or Android release is needed.
- **When `upiId` is `null`**, only the UPI block is hidden.

The builder chooses how the hiding works: removed at build time in `seo-plugin.js`, or a `hidden` attribute toggled in `main.js`. Removing it at build time is preferred, so crawlers and `llms.txt` don't see a dead section.

The robot credit (CC BY 3.0, see Constraints) goes in the footer of every page. It is free, requires attribution only, and is added whether or not `sponsorUrl` is set.

## Open items the owner must supply

1. **GitHub Sponsors approval**, then set `sponsorUrl` to `https://github.com/sponsors/Venu005`. Until the profile is live, that page doesn't exist.
2. **The UPI ID**, then set `upiId`.
