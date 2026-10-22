# Unison on Google Play: design

Date: 2026-10-22. Status: drafted after a brainstorm with the owner. The owner approved the scope (ship everything except auto-Start), the hands-on guided tour (prototype v2) and the paperwork list. Visual reference: `docs/superpowers/specs/assets/2026-10-22-guided-tour-prototype.html`, a copy of the brainstorm scratch file `.superpowers/brainstorm/14446-1792661295/content/guided-tour-v2.html` (gitignored). It is a clickable HTML prototype; open it in a browser.

## Why

Unison's Android app isn't available to anyone yet: the website says "Coming soon to Google Play". The owner has a personal Play Console account. Their first app, the Nothing Glyph app, went through the 12-tester closed test and is in review now. The goal is a Unison build that **passes Play review the first time**, then a closed test, then production.

A rejection costs more than time:
- Policy strikes count against the developer account, which also holds the Glyph app.
- A personal account must keep 12 testers opted in for 14 consecutive days before production unlocks, and a bounced review can waste that window.

Success:
- Play approves the first submission with no policy rejection.
- A new user who installs from Play can go from opening the app to "connected and sending a photo to the Mac" without help, guided by the app itself.

## Goals

1. **A Play build of the Android app** that ships every current feature: pairing, files, notifications with replies, clipboard, calls, photos, screen mirroring with phone audio, **remote control (Unison control)**, ring my phone, media controls and open-on-the-other-device. It differs from the owner's personal build in only these places:
   - auto-Start is off (the existing `STORE_BUILD` switch);
   - Unison control is declared honestly as not an accessibility tool;
   - Unison control's descriptions don't mention auto-Start;
   - the build is release-signed and packaged as an App Bundle.
2. **A hands-on guided tour on first launch** (see "The guided tour"). It starts with connecting to the Mac and teaches by doing: it highlights one real control, waits for the user to use it, then moves on.
3. **Prominent disclosure screens** that meet Google's rules for every sensitive access, shown inside the app before Android's own prompt. Where possible they double as tour steps.
4. **The Play Console paperwork, written out ready to paste.** The owner submits it.
   - Declarations: Accessibility, foreground services and Photos.
   - Data safety answers, the store listing, and content rating answers.
   - A script for each declaration video, and a closed-test checklist.

## Non-goals

- No Play Billing, ads, analytics or crash reporting, and no account. Unison collects nothing.
- No change to the protocol, the pairing or the trust model.
- No Mac App Store build. The Mac app stays a website DMG.
- No change to the owner's personal build beyond also getting the tour and the disclosure screens.
- Submitting to Play Console is not part of the code work. The owner creates the app entry, uploads the bundle, fills in the forms and records the videos. This work only prepares everything.

## Anti-goals (would make this a failure even if it works)

- **Anything that could read as deceptive to a reviewer.** That includes setting `isAccessibilityTool="true"` in the Play build, a disclosure that understates what a permission touches, data safety answers that don't match the code, and auto-Start (clicking through Android's screen-share consent) in the Play build.
- **A disclosure only in Settings, the store listing or the privacy policy.** Google requires it in the app's normal flow, before the permission request, with an affirmative Agree.
- **A tour that blocks the app.** Every step after connecting can be skipped, and so can the whole tour after step 1. It never comes back on its own once finished or ended.
- **Breaking the owner's setup.** The personal build, the gates and the existing pairing must keep working. The upload key must never be committed.

## Constraints

- **Repo rules (CLAUDE.md).**
  - Every commit updates `docs/handoff/`.
  - All three build gates pass with no warnings, including `./gradlew :core:test :app:testDebugUnitTest :app:assembleDebug`.
  - Logic lives in tested code, not in views.
  - User-visible text says "Unison"; internal ids keep their names. `dev.macdroid.app` is the permanent Play package name.
- **Android.**
  - minSdk 29, targetSdk 37.
  - Android 17 requires `ACCESS_LOCAL_NETWORK` at runtime, and the existing setup step already handles it.
  - Features must work without developer options, adb grants or Shizuku (owner's standing rule).
- **Policy facts this design relies on (checked 2026-10-22):**
  - `isAccessibilityTool` is only for apps designed for people with disabilities. Misuse can lead to suspension and triggers Play Protect warnings. A non-tool must complete the Accessibility declaration (form plus video) and show an in-app disclosure that:
    - is separate, in the normal flow, and not only in Settings;
    - says what data the service accesses and how it's used;
    - requires affirmative consent.
  - Autonomous, AI-like use of the API is prohibited. User-directed control is not autonomous.
  - Broad photo access (`READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO`) needs a declaration showing the system photo picker isn't sufficient. Browsing the whole gallery from the Mac is a gallery-type core use.
  - Each foreground service type needs a declaration with a description and video: `connectedDevice` (ConnectionService) and `mediaProjection` (MirrorService).
  - Data safety: data sent with end-to-end encryption where the developer holds no keys isn't "collected". Unison's link is mutual TLS between the user's own phone and Mac, with keys only on those devices and no developer server, so the answer is no data collected or shared.
  - Personal accounts need a closed test with at least 12 opted-in testers for 14 consecutive days before production. The owner already did this for the Glyph app; assume Unison needs its own.
  - Phones with Advanced Protection Mode on revoke accessibility access from non-tool apps, so Unison control won't work there. The disclosure and the Settings row should say so.

## What was decided (owner)

### Scope of the Play build
- Everything ships, including Unison control (the owner chose this over leaving it for a later update).
- Auto-Start (pressing "Start" on the screen-share prompt) stays **off** in the Play build, through the existing `BuildConfig.STORE_BUILD` and `ControlPrefs.autoStart`, with its Settings row hidden. Play users press Start themselves.
- Unison control in the Play build:
  - `android:isAccessibilityTool="false"`;
  - its `android:description` drops the "press Start on the screen-sharing prompt" sentence;
  - it gets the full disclosure below before the user is sent to Accessibility settings.

### The guided tour (prototype v2)
Hands-on coach marks on the real screens.
- **The coach mark:** everything is dimmed except one highlighted control with a pulsing ring, and a bubble shows "Step N of 5", a title, one instruction, *Skip this step* and *End tour*.
- **How it advances:** the step finishes when the user actually does the thing.
- **Inside sheets and system dialogs:** the bubble floats at the top without dimming.

The tour runs on **first launch** (it replaces the current welcome/pair wizard flow for the steps it covers; see "left to the builder") and has five steps.

1. **Connect to your Mac** (required, not skippable; it offers "Type the code instead").
   - The screen shows three numbered cards:
     1. Install Unison on your Mac (free, macOS 14 or later), with the plain URL `venu005.github.io/unison` and a Copy button;
     2. open it, and it shows a QR code;
     3. scan it with this phone, which you only do once.
   - Then: highlight **Scan the QR code** → Android's local-network prompt, with the bubble "Android asks before Unison can reach your Mac on Wi-Fi. Tap Allow." → the camera prompt, with the bubble "The camera is only used to read the QR code." → the scanner → "Paired with ‹Mac name› ✓" → Home.
2. **Send a photo to your Mac:** "You're connected! Now tap **Send**", then **Photos** → the photo shows in Recent activity with a confirmation.
3. **Turn on notifications:** the Notifications tab → **Turn on notification access** → the disclosure sheet → **Agree and open settings**. *Not now* skips the step.
4. **Send your clipboard:** the Clipboard tab → **Send this phone's clipboard to Mac**, plus "then paste on your Mac with ⌘V".
5. **Unison control (optional):** Settings → the **Unison control** switch → the disclosure sheet with a checkbox, where **Agree** is disabled until the box is ticked → Accessibility settings.

The tour ends on **"You're all set"** ("Unison runs quietly in the background. Your Mac shows a phone icon in its menu bar.") with **Start using Unison**. A progress state is kept, so a user who leaves mid-tour resumes at the same step. **Settings → About → "Show the tour again"** restarts it.

The tour uses the app's own theme (Material 3; dynamic colour on Android 12+, the peach fallback otherwise). The prototype's look is the reference, not pixel-exact.

### Disclosure screens (shown before Android's prompt, each with Agree / Not now)
The wording below is approved in substance; the builder may polish it but must not weaken it.
- **Notification access:**
  - What Unison reads: each notification's app, title, text and buttons.
  - Where it goes: only to your paired Mac, encrypted, over your Wi-Fi. Never to the internet, and never to us.
  - What for: reading, replying and clearing them from your Mac.
- **Unison control (Accessibility):**
  - Uses Android's Accessibility service to tap, scroll and type on this phone, only while you mirror it and only when your Mac asks.
  - To type, it reads the text box you're typing into so it can edit it. That text stays on the phone.
  - It watches the system screen-sharing prompt only to know when mirroring starts.
  - Nothing is collected or sent anywhere except your Mac's mirror window.
  - Then a line: "Phones with Advanced Protection turned on don't allow this."
  - Checkbox: "I understand and allow Unison control". **Agree and open Accessibility** stays disabled until it's ticked.
- **Photos:** what (your photos and videos, or just the ones you pick), where (only to your paired Mac), what for (browsing and saving them from your Mac). Android's own full-or-limited choice follows.
- **Microphone (phone audio while mirroring):** it records only the sound your phone is playing, only while mirroring, and sends it only to your Mac.
- **Calls ("Make calls from your Mac"):** your Mac can start calls through this phone; the call audio stays on the phone.
- **Camera:** covered by the step 1 bubble ("only used to read the QR code").

Each disclosure appears **every time** the user starts that permission flow until it's granted. Declining leaves the feature off, with a way to turn it on later in Settings, where the disclosure shows again. This is the "non-consent flow" Google's video must show.

### Release build and signing
- A Play build that is release-signed with an **upload key** the owner generates and keeps outside the repo, backed up. It uses Play App Signing and is packaged as an **Android App Bundle**.
- The keystore path and passwords come from a local, gitignored file or from environment variables, never from the repo.
- Version: continue from 0.4.1 (versionCode 5) upwards.

### Paperwork (written into the repo, ready to paste)
- Accessibility declaration answers:
  - why: App functionality, remote control of your own phone during mirroring;
  - personal data collected or shared: **No**;
  - plus a video script covering: opening the app, the flow to the disclosure, the full text, consent and granting the permission, the non-consent path and re-triggering the disclosure, and remote control working from the Mac.
- Foreground service declarations for `connectedDevice` (keeps the link to your Mac open in the background for files, notifications and clipboard) and `mediaProjection` (mirrors the screen to your Mac when you start it), each with a short video script.
- Photos and videos declaration: browsing and saving the whole gallery from the Mac is the core feature; a picker can't present an albums/day grid of the whole library to another device.
- App access: reviewer instructions and an end-to-end video (see above).
- Data safety: no data collected, no data shared; data encrypted in transit (end-to-end between your own devices). It must agree with `website/privacy/` (update the privacy page if it doesn't cover notifications, photos, audio, accessibility and calls explicitly).
- Store listing:
  - name: "Unison", or "Unison – Phone to Mac" if "Unison" is taken;
  - a short description of 80 characters or fewer, and a full description;
  - the privacy policy URL `https://venu005.github.io/unison/privacy/`;
  - the category is Tools or Productivity;
  - the listing includes no Google trademarks in the name or icon.
- Content rating answers (no user-generated content shared publicly, no ads).
- Target audience: adults (18+), not designed for children.
- A closed-test checklist: 12+ testers, 14 consecutive days, keeping the count above 12, plus what to ask testers to try.

### Decided after the builder check (owner, 2026-10-22)
- **How reviewers test it: Play Console "App access" instructions plus video, with no demo mode.**
  - The paperwork gains an App access section telling reviewers how to test with a real Mac: install the free Mac app from `venu005.github.io/unison` (with the Gatekeeper "Open Anyway" steps from the site), open it, scan its QR code, then try files, notifications, mirroring and Unison control.
  - It also links an end-to-end video of the app working.
  - Every declaration video shows the real Mac pairing too.
  - There is no "Explore without a Mac" mode, and step 1 stays required.
- **QR scanner: replace ML Kit with an on-device decoder that sends nothing anywhere.**
  - `com.google.mlkit:barcode-scanning` sends device and performance diagnostics to Google (through `datatransport`), which would make "no data collected" untrue.
  - Swap it for ZXing (core decoder on CameraX frames, or an equivalent open-source library with no network use). Pairing must work exactly as before.
  - The build must contain no ML Kit or `datatransport`. Verify with the release dependency tree, and keep a test or check that fails if they come back.
- **The personal build gets its own app id.**
  - The personal build, meaning every build type except the Play build, gets `applicationIdSuffix ".dev"`, so it installs next to the Play version. The Play build alone keeps `dev.macdroid.app`.
  - The owner re-pairs the `.dev` install with the Mac once.
  - Update the gates and docs that name the package: DEV-GUIDE's `adb` lines and anything that hard-codes `dev.macdroid.app` as an installed id. Kotlin package names don't change.
  - The Mac side is unaffected, because pairing is by certificate, not by package.

### My calls after the builder check
- **The Mac download page is in place**: the site, the DMG, the install steps and Gatekeeper help are live. The only website change is flipping `playUrl` once production is approved, which happens after this work.
- **A Photos fallback is ready from the start.**
  - The Play build's broad media permissions (`READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_VISUAL_USER_SELECTED`) can be removed by one switch in its own source set or build config, without breaking anything else. Removing them turns off "Photos on your Mac" in that build, hides its tour and setup step, and leaves sending photos through the system picker working.
  - The first submission ships with the permissions and the declaration. `docs/play/` keeps the alternative declaration and Data safety text for the fallback.

## What's left to the builder

- **How the Play build is produced.** My call: a `play` build type that inherits from release, sets `STORE_BUILD` to true, uses the upload signing config, and overrides `res/xml/control_service.xml` and `control_service_description` through its own source set (`src/play/`). A product flavor is also fine, but it renames tasks such as `assembleDebug`, and the CLAUDE.md gates, scripts and docs depend on those names. If a flavor is chosen, update all of them.
- **Whether the Play build's control service drops `com.android.systemui` events**, since auto-Start is off. If it does, the disclosure's screen-share sentence goes too. Keep the disclosure exactly true to whatever the build does.
- **Tour architecture.**
  - Keep the tour logic pure and tested in `android/app` (or `core` where it fits): the steps, what completes each one, skipping, resuming, and how it's chosen relative to the existing `SetupFlow`.
  - Keep the coach-mark overlay a thin Compose layer that targets real composables, for example through `onGloballyPositioned` bounds registered by key.
  - Decide how the existing setup steps that the tour doesn't cover (Files save location, Battery "Unrestricted") fit. My call: keep them as short steps after "Connect to your Mac" or as Settings hints; don't drop them silently.
- **Disclosure screen layout:** Material 3 bottom sheets, as in the prototype, or full screens. They must be in the normal flow and have an affirmative action.
- **R8/minify for the Play build.** My call: leave it off for the first submission unless the bundle is unreasonably large. Turning it on means checking reflection-heavy code (serialization, OkHttp) with keep rules and a full on-device test.
- **Where the paperwork lives.** My call: `docs/play/` (listing.md, declarations.md, data-safety.md, video-scripts.md, closed-test.md).
- **Store graphics:** screenshots and a feature graphic, or a list of exactly which screens the owner should capture. My call: the list, plus a 1024×500 feature graphic rendered from the site's art if it's practical.

## Verification

- Unit tests cover:
  - the tour state machine: order, completion per step, skip, end, resume, and that it never re-shows after finishing;
  - the Play build's flags: `STORE_BUILD`, auto-Start off, control service metadata;
  - the disclosure gating: no permission intent before Agree, and Agree disabled until the box is ticked for Unison control.
- A Play bundle builds, signs and verifies (`bundletool` or `jarsigner -verify`) on the owner's Mac.
- An on-device run of the Play build on the owner's phone covers:
  - the full tour from a fresh install: Connect → photo → notifications → clipboard → control;
  - every disclosure's Agree and Not now paths;
  - remote control working, and auto-Start not firing.

  It must not disturb the owner's paired personal install. The Play build has the same package name, so install it only when the owner agrees to replace their install, or use a test device or profile.
- All existing gates stay green.

## Open items the owner must supply

1. **The upload keystore:** the owner generates it, with guidance, and stores the backup. Until then, signing is wired but untested.
2. **Recording the declaration videos** and **submitting in Play Console**, after the build exists.
3. **Testers for the closed test.**
