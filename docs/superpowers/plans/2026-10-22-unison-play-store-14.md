# Unison on Google Play (Plan 14) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the single Android build ready for Google Play review:
- auto-Start removed;
- Unison control declared honestly;
- ML Kit replaced by an on-device QR decoder;
- explanation screens before every sensitive permission;
- a hands-on guided tour on first launch;
- a release-signed App Bundle;
- the Play Console paperwork written out.

Install it on the owner's phone.

**Architecture:**
- **Policy-sensitive behaviour** lives in small tested units: the control service config test, the QR decoder, the disclosure rules and the tour state machine.
- **Compose views stay thin.** The tour is a pure state machine (`TourFlow`) plus a coach-mark overlay that highlights composables registered with `Modifier.tourTarget(key)`.
- **Disclosures** are data (`Disclosures`) plus one bottom-sheet composable, shown before each permission intent.
- **Release signing** reads a gitignored `android/keystore.properties`.

**Tech Stack:** Kotlin, Jetpack Compose (Material 3), CameraX 1.6.2, ZXing `com.google.zxing:core:3.5.3` (exact), JUnit 4, AGP App Bundle, Swift/SwiftUI (one Mac change).

**Spec:** `docs/superpowers/specs/2026-10-22-unison-play-store-design.md`. Visual reference: `docs/superpowers/specs/assets/2026-10-22-guided-tour-prototype.html`.

**Branch:** `feat/play-store`, cut from `docs/play-store-spec` (which carries the spec).

## Global Constraints

- **One build for everyone.** There is no `STORE_BUILD`, no flavor, no second app id. `applicationId` stays `dev.macdroid.app`.
- **No auto-Start code** may remain: nothing clicks the screen-share consent. `control_service.xml` has `android:isAccessibilityTool="false"` and no `android:packageNames`.
- **No `com.google.mlkit` or `com.google.android.datatransport`** classes in the app.
- **Disclosure copy (verbatim substance from the spec; it may be polished but not weakened):**
  - Notifications: "What Unison reads: each notification's app, title, text and buttons." / "Where it goes: only to your paired Mac, encrypted, over your Wi-Fi. Never to the internet, and never to us." / "What for: reading, replying and clearing them from your Mac."
  - Unison control: "Uses Android's Accessibility service to tap, scroll and type on this phone, only while you mirror it and only when your Mac asks." / "To type, it reads the text box you're typing into so it can edit it. That text stays on the phone." / "Nothing is collected or sent anywhere except your Mac's mirror window." / "Phones with Advanced Protection turned on don't allow this." Checkbox: "I understand and allow Unison control". The button is "Agree and open Accessibility" and is disabled until the box is ticked.
  - Photos: your photos and videos, or just the ones you pick; only to your paired Mac; for browsing and saving them from your Mac.
  - Microphone: records only the sound your phone is playing, only while mirroring, and sends it only to your Mac.
  - Calls: your Mac can start calls through this phone; the call audio stays on the phone.
  - Every sheet has an affirmative primary button and **Not now**.
- **Tour copy:** five steps, titled "Connect to your Mac", "Send a photo to your Mac", "Turn on notifications", "Send your clipboard" and "Unison control (optional)". The finish screen says "You're all set" with the body "Unison runs quietly in the background. Your Mac shows a phone icon in its menu bar." and the button "Start using Unison". Settings → About gets "Show the tour again". Step 1 can't be skipped.
- **Repo rules.** Every commit updates `docs/handoff/`: one CHANGELOG entry, "Plan 14: Unison on Google Play (feat/play-store)", gets a bullet per task.
- **Gates for an Android task:** `cd android && ./gradlew :core:test :app:testDebugUnitTest :app:assembleDebug`, with no warnings.
- **Gates for a Mac task:** `cd mac/MacDroidCore && swift test`, plus the `xcodebuild` gate.
- **The upload keystore and its passwords are never committed.** `android/keystore.properties` and `*.jks` are gitignored.

## Review Focus

1. **A permission prompt that appears without its disclosure first.** Every path into notification access, Accessibility, photos, the microphone and calls must go through the sheet, including Settings rows, setup steps and the tour. → `DisclosureRulesTest` "every gated permission has a disclosure"; a code-path checklist in Task 3 step 6.
2. **Leaving the tour mid-way.** The user kills the app, rotates the screen or answers a system dialog with "Don't allow". On the next launch the tour must resume at the same step, never re-show after it has finished or been ended, and never strand the user on a dimmed screen. → `TourFlowTest` "resumes at the saved step", "denied system prompt keeps the step open with a retry", "finished never re-shows" (Task 4).
3. **QR codes from a real Mac screen.** The scanner sees glare, a skewed angle, a dark-mode QR code and the camera's frame format. → `QrDecodeTest` decodes rotated, inverted and padded-stride frames generated by ZXing's writer (Task 2), plus pairing on the owner's phone (Task 7).
4. **Building release without the keystore.** A fresh clone or the CI website workflow must still pass the debug gates, and release must fail with a clear message instead of producing an unsigned bundle. → Task 6 verification runs `bundleRelease` without `keystore.properties` and expects the message.
5. **Remote control after the System UI watch is removed.** Tapping, scrolling and typing must still work. Without the window-state events the service may never get `windows` filled, so typing that relies on `findFocus` must still find the field. → Task 1 keeps `canRetrieveWindowContent`, checked on the device in Task 7.

---

## File map

```
android/app/build.gradle.kts                          - STORE_BUILD, - mlkit, + zxing, + signingConfigs/upload, version 0.5.0 (6)
android/app/src/main/res/xml/control_service.xml      isAccessibilityTool=false, no packageNames/window events
android/app/src/main/res/values/strings.xml           control_service_description without auto-Start
android/app/src/main/java/dev/macdroid/app/
  platform/control/MacDroidControlService.kt          - auto-Start (onAccessibilityEvent becomes a no-op)
  platform/control/ControlPrefs.kt                    deleted
  platform/control/NodeAdapter.kt                     trimmed if ConsentMatcher was its only user
  ui/QrScanner.kt                                     ZXing via QrDecode
  ui/qr/QrDecode.kt                                   pure: decode(y, width, height, rowStride) -> String?
  ui/disclosure/Disclosures.kt                        pure: Disclosure data + rules
  ui/disclosure/DisclosureSheet.kt                    Compose sheet
  ui/tour/TourFlow.kt                                 pure state machine
  ui/tour/TourPrefs.kt                                persistence
  ui/tour/CoachMark.kt                                overlay + Modifier.tourTarget
  ui/setup/*, ui/main/* (Home, Notifications, Clipboard, Settings)   targets, disclosures, Show the tour again
android/core/src/main/kotlin/dev/macdroid/core/control/ControlRules.kt   - ConsentMatcher, UiNode
android/core/src/main/kotlin/dev/macdroid/core/mirror/MirrorRules.kt     - awaitingConsent
android/app/src/test/java/dev/macdroid/app/{ControlServiceConfigTest,NoTelemetryTest,QrDecodeTest,DisclosureRulesTest,TourFlowTest}.kt
mac/MacDroidCore/Sources/MacDroidCore/Mirror/MirrorSession.swift   consent hint at once
android/keystore.properties (gitignored), .gitignore
docs/play/{listing,declarations,data-safety,app-access,video-scripts,closed-test,photos-fallback,screenshots}.md
website/privacy/index.html                            covers notifications, photos, audio, accessibility, calls
docs/handoff/*
```

---

### Task 1: Remove auto-Start and declare Unison control honestly

**Files:**
- Modify:
  - `MacDroidControlService.kt`;
  - `ui/main/SettingsScreen.kt`, `ui/main/SettingsViewModel.kt`;
  - `res/xml/control_service.xml`, `res/values/strings.xml`;
  - `app/build.gradle.kts` (drop `STORE_BUILD`);
  - `core/.../control/ControlRules.kt`, `ControlRulesTest.kt`;
  - `core/.../mirror/MirrorRules.kt`, `MirrorRulesTest.kt`;
  - `mac/MacDroidCore/Sources/MacDroidCore/Mirror/MirrorSession.swift` and `MirrorSessionTests.swift`;
  - `docs/handoff/{CHANGELOG,DECISIONS,ARCHITECTURE}.md`.
- Delete: `platform/control/ControlPrefs.kt`.
- Create: `app/src/test/java/dev/macdroid/app/ControlServiceConfigTest.kt`.

**Interfaces:**
- Produces: no `ControlPrefs`, `ConsentMatcher`, `UiNode`, `MirrorSession.awaitingConsent` or `BuildConfig.STORE_BUILD`.
- On the Mac, `MirrorSession`'s consent hint becomes due immediately: the default `consentHint` is `.zero`, so the phase goes straight to `.starting(waitingForTap: true)`.

- [ ] **Step 1: Write the failing tests.**
  - `ControlServiceConfigTest.declaresNotAnAccessibilityToolAndWatchesNoApp` parses `src/main/res/xml/control_service.xml` and asserts that:
    - `isAccessibilityTool="false"`;
    - there is no `packageNames` attribute;
    - `canPerformGestures="true"` and `canRetrieveWindowContent="true"` are still set.
  - `ControlServiceConfigTest.descriptionNeverMentionsPressingStart` reads `strings.xml` and asserts that `control_service_description` doesn't match `/press(es)? Start|screen-sharing prompt/i`.
  - `ControlServiceConfigTest.noAutoStartCodeLeft` asserts that no `.kt` file under `src/main` contains `ConsentMatcher`, `autoStart` or `STORE_BUILD`.
  - Mac: `MirrorSessionTests.consentHintShowsAtOnceByDefault`. A session built with the default `consentHint` reaches `.starting(waitingForTap: true)` straight after `start`.
- [ ] **Step 2:** Run `./gradlew :app:testDebugUnitTest --tests '*ControlServiceConfigTest*'`. Expected: 3 FAIL. Run `swift test --filter consentHintShowsAtOnceByDefault`. Expected: FAIL.
- [ ] **Step 3: Remove the code.**
  - Delete the auto-press body of `onAccessibilityEvent` (leave `override fun onAccessibilityEvent(event: AccessibilityEvent) {}`), `ControlPrefs`, `ConsentMatcher`, `UiNode` and `awaitingConsent`, together with their tests.
  - Delete the Settings row "Start mirroring without touching the phone" and `autoStart`/`setAutoStart` in the view model.
  - In `control_service.xml`:
    - set `isAccessibilityTool="false"`;
    - remove `packageNames`;
    - set `accessibilityEventTypes` to `typeViewFocused` (the smallest set that keeps the service bound);
    - keep `flagRetrieveInteractiveWindows`, `canRetrieveWindowContent` and `canPerformGestures`.
  - Reword `control_service_description` to the Unison control disclosure's first sentence plus "Nothing leaves this phone except to your Mac's mirror window."
  - Mac: change the default `consentHint` to `.zero`, and drop the Mac's copy that implies the phone presses Start, if there is any.
- [ ] **Step 4:** Run the Android gates, `swift test` and `xcodebuild`. Expected: all pass, with no warnings.
- [ ] **Step 5:** Handoff: CHANGELOG entry header and bullet. In DECISIONS, the auto-Start rows (arming, `STORE_BUILD`) get "removed 2026-10-22 (Plan 14)". ARCHITECTURE's control service text changes to match. Commit: `feat: remove auto-Start; Unison control declared as not an accessibility tool`.

---

### Task 2: On-device QR decoding with ZXing (no ML Kit)

**Files:**
- Create: `ui/qr/QrDecode.kt`, `app/src/test/java/dev/macdroid/app/QrDecodeTest.kt`, `app/src/test/java/dev/macdroid/app/NoTelemetryTest.kt`.
- Modify: `ui/QrScanner.kt`, `app/build.gradle.kts`, `docs/handoff/CHANGELOG.md`.

**Interfaces:**
- Produces `object QrDecode { fun decode(luma: ByteArray, width: Int, height: Int, rowStride: Int): String? }`. It uses `PlanarYUVLuminanceSource` over the Y plane, then `QRCodeReader` with `TRY_HARDER`, retrying on `.invert()` for dark-mode codes. Not-found, checksum and format errors become `null`.
- `QrScanner` keeps its existing composable signature and callback; only its analyzer changes, so callers are untouched.

- [ ] **Step 1: Write the failing tests.**
  - `QrDecodeTest`: generate a frame with `QRCodeWriter().encode("unison://pair?x=1", QR_CODE, 300, 300)`, turned into luma bytes (black = 0, white = 255, inside a quiet border), then check:
    - `decodesAPlainFrame`: the result equals the string;
    - `decodesWithRowPadding`: rowStride = width + 64 with padded rows gives the same string;
    - `decodesInvertedDarkModeCode`: bytes `255 - v` give the same string;
    - `returnsNullForNoCode`: an all-grey frame gives `null`.
  - `NoTelemetryTest.mlKitAndDatatransportAreAbsent`: `Class.forName("com.google.mlkit.vision.barcode.BarcodeScanning")` and `Class.forName("com.google.android.datatransport.TransportFactory")` each throw `ClassNotFoundException`.
- [ ] **Step 2:** Run the two tests. Expected: `QrDecodeTest` fails because `QrDecode` doesn't exist yet. `NoTelemetryTest` fails because ML Kit is still on the classpath.
- [ ] **Step 3:** Implement `QrDecode`. In `build.gradle.kts`, swap `com.google.mlkit:barcode-scanning:17.3.0` for `com.google.zxing:core:3.5.3`. Change `QrScanner`'s analyzer to `QrDecode.decode(plane[0].buffer → bytes, width, height, plane[0].rowStride)`, keeping its existing throttling and "first hit wins" behaviour.
- [ ] **Step 4:** Run `./gradlew :app:dependencies --configuration releaseRuntimeClasspath | grep -iE "mlkit|datatransport"`. Expected: no output. Then run the gates. Expected: pass, with no warnings.
- [ ] **Step 5:** CHANGELOG bullet. Commit: `feat(android): on-device QR decoding with ZXing; drop ML Kit`.

---

### Task 3: Explanation screens before every sensitive permission

**Files:**
- Create: `ui/disclosure/Disclosures.kt`, `ui/disclosure/DisclosureSheet.kt`, `app/src/test/java/dev/macdroid/app/DisclosureRulesTest.kt`.
- Modify: every entry point that launches the five permission flows:
  - Notifications: `SetupScreen` NotificationsStep, the Notifications tab's turn-on button, and Settings;
  - Accessibility: the Settings Unison control switch;
  - Photos: the `SetupScreen` PhotosStep and the Settings "Photos on your Mac" row;
  - Microphone: the Settings row and `MirrorConsentActivity`, if it requests `RECORD_AUDIO`;
  - Calls: the Settings "Make calls from your Mac" row.
- Also: `docs/handoff/CHANGELOG.md`.

**Interfaces:**
- Produces:
  - `enum class Gated { Notifications, Accessibility, Photos, Microphone, Calls }`;
  - `data class Disclosure(val title: String, val bullets: List<String>, val agreeLabel: String, val checkbox: String?)`;
  - `object Disclosures { fun of(g: Gated): Disclosure; fun canAgree(g: Gated, checked: Boolean): Boolean }`.
- Produces `@Composable fun DisclosureSheet(gated: Gated, onAgree: () -> Unit, onNotNow: () -> Unit)`, a Material 3 `ModalBottomSheet` that renders `Disclosures.of(gated)`. The primary button's enabled state is `canAgree`.
- Task 4 consumes `Gated` and `DisclosureSheet`.

- [ ] **Step 1: Write the failing tests** in `DisclosureRulesTest`:
  - `everyGatedPermissionHasADisclosure`: every `Gated` value has a non-empty title and at least 2 bullets.
  - `notificationsDisclosureSaysWhatWhereAndWhy`: the bullets contain "app, title, text and buttons", "only to your paired Mac" and "Never to the internet".
  - `accessibilityNeedsTheBoxTicked`: `canAgree(Accessibility, false)` is false and `canAgree(Accessibility, true)` is true, while `canAgree(Notifications, false)` is true.
  - `accessibilityDisclosureIsExactlyTrue`: the bullets mention "text box you're typing into", "stays on the phone" and "Advanced Protection", and none of them matches `/Start|screen-sharing/`.
  - `agreeLabelsAreAffirmative`: Notifications gives "Agree and open settings" and Accessibility gives "Agree and open Accessibility".
- [ ] **Step 2:** Run `--tests '*DisclosureRulesTest*'`. Expected: FAIL, because the class is missing.
- [ ] **Step 3:** Implement `Disclosures` with the copy from Global Constraints, then `DisclosureSheet`.
- [ ] **Step 4:** At each entry point, put the sheet in front of the existing intent or permission launcher. The existing intent runs only from `onAgree`. `onNotNow` leaves the feature off. The sheet shows every time until the permission is granted.
- [ ] **Step 5:** Run the gates. Expected: pass, with no warnings.
- [ ] **Step 6:** Go through `grep -rn "ACTION_NOTIFICATION_LISTENER_SETTINGS\|ACTION_ACCESSIBILITY_SETTINGS\|READ_MEDIA_IMAGES\|RECORD_AUDIO\|CALL_PHONE" android/app/src/main/java` and confirm that every launcher hit sits behind an `onAgree`. Record each hit and its gate in the CHANGELOG bullet. Commit: `feat(android): disclosures before every sensitive permission`.

---

### Task 4: The guided tour as a tested state machine

**Files:**
- Create: `ui/tour/TourFlow.kt`, `ui/tour/TourPrefs.kt`, `app/src/test/java/dev/macdroid/app/TourFlowTest.kt`.
- Also: `docs/handoff/CHANGELOG.md`.

**Interfaces:**
- Produces:
  - `enum class TourTarget { ScanQr, AllowLocalNetwork, AllowCamera, Send, SendPhotos, NotificationsTab, TurnOnNotifications, NotificationsAgree, ClipboardTab, SendClipboard, SettingsTab, ControlSwitch, ControlAgree }`;
  - `data class TourStep(val group: Int, val target: TourTarget, val title: String, val tip: String, val skippable: Boolean)`.
- Produces `class TourFlow(saved: TourPrefs.State)` with:
  - `val current: TourStep?` and `val groups: List<String>`;
  - `fun done(target: TourTarget): Boolean`, which advances only if `target == current?.target`;
  - `fun denied(target: TourTarget)`, which keeps the step open and sets `retry = true`;
  - `fun skipStep()`, which skips the current group; on group 0 it is a no-op;
  - `fun end()`, which is allowed only after group 0;
  - `fun restart()`;
  - `val finished: Boolean`;
  - `fun state(): TourPrefs.State` (`data class State(val index: Int, val finished: Boolean)`).
- Produces `TourPrefs` (SharedPreferences `tour`, with `load()` and `save(State)`).
- The groups, in order, are the five titles from Global Constraints. Group 0 holds ScanQr, AllowLocalNetwork and AllowCamera; group 1 holds Send and SendPhotos; and so on, matching the prototype.

- [ ] **Step 1: Write the failing tests** in `TourFlowTest`:
  - `startsAtConnectAndCannotSkipIt`: `current.target == ScanQr`; `skipStep()` leaves it there; `end()` leaves `finished == false`.
  - `advancesOnlyOnTheHighlightedAction`: `done(Send)` while on ScanQr returns false; `done(ScanQr)` returns true and moves to AllowLocalNetwork.
  - `skipsAWholeGroupAfterConnect`: after group 0, `skipStep()` on Send jumps to NotificationsTab.
  - `deniedSystemPromptKeepsTheStepWithRetry`: `denied(AllowLocalNetwork)` keeps it current with `retry == true`.
  - `resumesAtTheSavedStep`: `TourFlow(State(index = 4, finished = false)).current.target == SendPhotos`.
  - `finishedNeverReShows`: after `end()` (past group 0), `TourFlow(state()).current == null` and `finished == true`; `restart()` brings back ScanQr.
  - `copyMatchesTheSpec`: the group titles equal the five titles from Global Constraints.
- [ ] **Step 2:** Run. Expected: FAIL, because the class is missing.
- [ ] **Step 3:** Implement `TourFlow` and `TourPrefs`.
- [ ] **Step 4:** Run the gates. Expected: pass.
- [ ] **Step 5:** CHANGELOG bullet. Commit: `feat(android): guided tour state machine`.

---

### Task 5: Guided tour UI on the real screens

**Files:**
- Create: `ui/tour/CoachMark.kt`.
- Modify:
  - `ui/setup/SetupFlow.kt`, `SetupScreen.kt`, `PairStep.kt`, `SetupViewModel.kt`;
  - `ui/main/HomeScreen.kt`, `MainScreen.kt`;
  - `notifications/NotificationsScreen.kt`, `clipboard/ClipboardScreen.kt`;
  - `ui/main/SettingsScreen.kt`;
  - `docs/handoff/{CHANGELOG,ARCHITECTURE}.md`.

**Interfaces:**
- Consumes `TourFlow`/`TourPrefs` (Task 4) and `DisclosureSheet`/`Gated` (Task 3).
- Produces `Modifier.tourTarget(target: TourTarget)` (it records bounds through `onGloballyPositioned` into a `CompositionLocal` registry) and `@Composable fun CoachMarkHost(flow: TourFlow, content: @Composable () -> Unit)`. The host:
  - dims everything except the current target's bounds with a pulsing ring;
  - shows the bubble ("Step N of 5", title, tip, *Skip this step* unless group 0, *End tour* unless group 0);
  - doesn't dim while a sheet or system dialog step is current.

- [ ] **Step 1: Setup flow changes.**
  - `SetupFlow` no longer shows `Welcome`. The first screen is the redesigned **Connect to your Mac** (`PairStep`), with three numbered cards: the `venu005.github.io/unison` URL with Copy, "Open Unison on the Mac. It shows a QR code.", and "Scan it with this phone. You only do this once."
  - Then come **Scan the QR code** and the "Type the code instead" link.
  - The local-network and camera permission requests run from the Scan button, in that order, each reporting `done`/`denied` to the tour.
  - Files and Battery stay as steps after pairing.
  - Update `SetupFlowTest` for the removed Welcome step, with a test first: `welcomeIsGoneConnectComesFirst`.
- [ ] **Step 2:** Tag the targets with `Modifier.tourTarget(...)`: the Send button and its Photos item, the Notifications, Clipboard and Settings tabs, the turn-on and send buttons, the control switch, and the sheet buttons. Wrap the main scaffold and the setup screen in `CoachMarkHost`. Call `flow.done(target)` from each real action's success path (a photo sent, the permission granted, the clipboard sent).
- [ ] **Step 3:** Add the finish screen with the spec copy, and **Settings → About → "Show the tour again"** (`flow.restart()`, which navigates to Home and resumes at group 1 if already paired; it never forces re-pairing).
- [ ] **Step 4:** Run the gates. Expected: pass, with no warnings. Install the debug build on the owner's phone with `adb -s 192.168.1.3:<port> install -r` (debug-signed, so it updates in place and the pairing is kept). Run Settings → "Show the tour again" and walk groups 1–4 on the device. Screenshot each with `adb exec-out screencap` only while the tour is on screen. Expected: each highlight sits on its control, steps advance only on the real action, and skip and end both work.
- [ ] **Step 5:** CHANGELOG and ARCHITECTURE (the tour section). Commit: `feat(android): hands-on guided tour`.

---

### Task 6: Release signing, App Bundle, version, Photos fallback switch

**Files:**
- Modify: `android/app/build.gradle.kts`, `.gitignore`, `docs/handoff/{CHANGELOG,DEV-GUIDE}.md`.
- Create: `docs/play/photos-fallback.md`.

**Interfaces:**
- Produces signing. When `android/keystore.properties` exists (`storeFile`, `storePassword`, `keyAlias`, `keyPassword`), `signingConfigs.create("upload")` is used by `release`.
- When the file is missing, every `*Release` packaging or bundling task fails at execution with `GradleException("Release signing needs android/keystore.properties (see DEV-GUIDE: Releasing on Google Play)")`. Debug and the gates are unaffected.
- Version `versionName = "0.5.0"`, `versionCode = 6`.
- `buildConfigField("boolean", "PHOTOS_GALLERY", "true")`. The Photos-on-Mac browse feature, its setup step and its Settings row check it. `photos-fallback.md` gives the exact edits to set it false, plus the `tools:node="remove"` manifest lines for the three media permissions.

- [ ] **Step 1:** Add the `.gitignore` lines `android/keystore.properties` and `*.jks`, and check them with `git check-ignore`.
- [ ] **Step 2:** Implement the signing config and its failure message. Run `./gradlew :app:bundleRelease` without the properties file. Expected: FAIL with that message. Run the gates. Expected: pass.
- [ ] **Step 3:** **Stop and ask the owner** before creating the upload key, because it's security-sensitive. With their go-ahead:
  - Run `keytool -genkeypair -v -keystore ~/Keystores/unison-upload.jks -alias upload -keyalg RSA -keysize 4096 -validity 10000 -dname "CN=Venusai, C=IN"`, with a generated strong password.
  - Write `android/keystore.properties`, which is gitignored.
  - Tell the owner to back up the `.jks` and the password in their password manager. Losing them means asking Google for an upload-key reset.
- [ ] **Step 4:** Run `./gradlew :app:bundleRelease`. Expected: it builds `app/build/outputs/bundle/release/app-release.aab`. Then run `jarsigner -verify -verbose app-release.aab | tail -3`. Expected: "jar verified".
- [ ] **Step 5:** Add `PHOTOS_GALLERY` with a test first: `PhotosGalleryFlagTest.galleryOnByDefault` (`BuildConfig.PHOTOS_GALLERY == true`). Write `photos-fallback.md`.
- [ ] **Step 6:** DEV-GUIDE gets a "Releasing on Google Play" section covering the keystore, `bundleRelease`, the phone's one-time switch from the debug install, and that later updates come through Play's internal or closed track. CHANGELOG bullet. Commit: `chore(android): release signing, App Bundle, 0.5.0, photos fallback switch`.

---

### Task 7: The owner's phone on the signed build, on-device verification

**Files:** `docs/handoff/{CHANGELOG,STATUS}.md`.

- [ ] **Step 1: Stop and ask the owner** before uninstalling. It deletes the app's data, including the pairing. With their go-ahead:
  - `adb -s <phone> uninstall dev.macdroid.app`.
  - `bundletool build-apks --bundle app-release.aab --output u.apks --ks ~/Keystores/unison-upload.jks --ks-key-alias upload --connected-device` (passwords from `keystore.properties`), then `bundletool install-apks`.
  - If `bundletool` is missing, fetch the jar to the scratchpad.
- [ ] **Step 2: Verify on the device.** The owner taps where Android requires a person: permission dialogs and the scan.
  - The tour from a clean install: Connect (local network, camera, scan) → photo → notifications → clipboard → control.
  - The Not now path on notifications and on control, then turning each on later from Settings, which shows the sheet again.
  - Mirroring: the Mac shows "Tap Start on your phone…" at once, and pressing Start streams the screen.
  - Remote control: tap, scroll, and type into a text field.
  - Expected: every step behaves as the spec says. Write down anything that doesn't.
- [ ] **Step 3:** STATUS: the signed 0.5.0 build is on the owner's phone and the on-device results are recorded. CHANGELOG bullet. Commit.

---

### Task 8: Play paperwork, privacy page, handoff and final review

**Files:**
- Create: `docs/play/{listing,declarations,data-safety,app-access,video-scripts,closed-test,screenshots}.md`.
- Modify: `website/privacy/index.html`, `website/test` if it asserts privacy copy, `docs/handoff/*`.

- [ ] **Step 1:** Write the paperwork from the spec's "Paperwork" and "Decided after the builder check" sections:
  - **listing.md:** the name, a short description of 80 characters or fewer (check the count), the full description, the category, and the privacy URL.
  - **declarations.md:** the answers for Accessibility, both foreground service types, and Photos and videos.
  - **data-safety.md:** each form question with its answer, plus the fallback variant.
  - **app-access.md:** reviewer steps, including Gatekeeper.
  - **video-scripts.md:** one shot list per declaration, plus an end-to-end video.
  - **closed-test.md:** at least 12 testers for 14 days, keep the count above 12, and what to ask testers to try.
  - **screenshots.md:** the screens to capture, and the 1024×500 feature graphic if it's practical.
- [ ] **Step 2:** Privacy page. Make sure it states plainly what's accessed and that it goes only to the user's paired Mac: notifications, photos, phone audio while mirroring, the accessibility service for remote control, calls, and the camera only for the QR code. Run `cd website && npm test && npm run build && npm run check`. Expected: pass.
- [ ] **Step 3:** Handoff: STATUS, ROADMAP, README round table, ARCHITECTURE and DEV-GUIDE are final. Run all gates. Expected: everything passes.
- [ ] **Step 4:** Whole-branch review with `superpowers:requesting-code-review`, then the owner's go-ahead to merge.
