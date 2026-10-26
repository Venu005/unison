# Developer guide

## Toolchains (owner's machine)
- macOS 26, Xcode 27 (Swift 6.4), XcodeGen (`brew install xcodegen`)
- JDK 21, Gradle 9.8 (wrapper committed), AGP 9.4.1 (built-in Kotlin), Kotlin 2.4.21
- Android SDK: `/opt/homebrew/share/android-commandlinetools` (platform 37). `android/local.properties` holds `sdk.dir` and is gitignored.

## Build and test
```bash
# Mac core (59 tests)
cd mac/MacDroidCore && swift test

# Mac app (generates MacDroid.xcodeproj, which is not committed)
cd mac && xcodegen generate && xcodebuild -project MacDroid.xcodeproj -scheme MacDroid -configuration Debug -derivedDataPath build build
open mac/build/Build/Products/Debug/Unison.app

# Android
cd android && ./gradlew :core:test :app:testDebugUnitTest :app:assembleDebug
ANDROID_SERIAL=<serial> ./gradlew :app:installDebug

# Swift server ↔ Kotlin client end to end (pairing, battery, a notification with a reply, clipboard text both ways and an image, ring, links both ways, media state and a command, photos (page, thumbnail, save, gone), a mirroring session (session gate, H.264 fixture decoded, audio, key-frame request, remote control input and `input.notice`, stop), a call (ring, answer, dial, end), and 24 MiB files both ways with a mid-file disconnect; ~1 min)
./scripts/cross-platform-test.sh
# The dev server alone: --receive-dir <dir> saves files from the phone there; --send-on-connect <file> sends that file when a phone connects
#   mac/MacDroidCore/.build/debug/macdroid-devserver --host 127.0.0.1 --port 47999 --receive-dir /tmp/in --send-on-connect /tmp/out.bin

# App icon: edit design/icon/*.svg, then regenerate the Mac PNGs (Android uses vector drawables directly)
./scripts/render-icons.sh
```

## Phone (wireless debugging)
1. On the phone: Settings → System → Developer options → Wireless debugging → *Pair device with pairing code*.
2. On the Mac: run `adb pair <ip>:<pairing-port>` and type the code yourself. Then run `adb connect <ip>:<port>`, using the port from the main screen.
3. `adb devices` may list the phone twice (IP and an `_adb-tls-connect` mDNS alias). Pick one with `ANDROID_SERIAL`.
4. On-device test: `./gradlew :app:connectedDebugAndroidTest` (KeystoreTlsTest). Gradle installs and then **uninstalls** a temporary build, so the app icon appears and disappears. The task may exit 1 even with 0 failures because of the duplicate adb entry; confirm with `adb shell am instrument`.
5. Don't `pm clear`, grant permissions or tap on the owner's phone from automation.

## Gotchas
- **Mirroring (Plan 7):**
  - **Starting:** Mac → Phone page or the popover → Mirror. The Mac says "Tap Start on your phone" at once. The user presses Start on Android's screen-sharing prompt, opened from the phone's "Mirror to <Mac>? Tap to start" notification when Unison is in the background (Android blocks background activity starts). Auto-Start was removed in Plan 14.
  - **Locking:** Android ends screen capture when the phone locks, and shows no consent over the lock screen. Mirroring keeps the phone awake; start it on an unlocked phone.
- **Calls (Plan 10):** grant "Make calls from your Mac" on the phone (Settings → Calls) to dial from the Mac. To make Unison open phone links, choose it as the default calling app in the handler app's settings (Settings → Calls says which app that is). The sandboxed app can't set this itself; from a terminal, a small Swift script calling `NSWorkspace.shared.setDefaultApplication(at:toOpenURLsWithScheme: "tel")` with the app's path also works. Call audio stays on the phone. Incoming calls need notification access, as for notification mirroring.
- **Remote control (Plan 8):**
  - **Turning it on:** phone → Unison → Settings → Remote control → Unison control → Accessibility → turn on "Unison control". Don't toggle it from adb on the owner's phone.
  - **Testing input:** `scripts/cross-platform-test.sh` covers the messages and the gate; gestures and typing are checked by hand (owner checklist in `docs/superpowers/plans/2026-10-14-macdroid-mirroring-followups.md`).
  - **Probe results:** `docs/superpowers/plans/2026-10-14-macdroid-mirroring-followups.md` (the consent dialog is System UI's "Share your screen with Unison?", button `android:id/button1` "Share screen").
  - **The H.264 test fixture** is regenerated with `scripts/make-h264-fixture.sh` (needs ffmpeg with libx264).
- **Photos access (Plan 6):** Android 14+ asks for `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO` and `READ_MEDIA_VISUAL_USER_SELECTED` together ("Allow all" or "Select photos"); Android 13 has images/video only; 10–12 use `READ_EXTERNAL_STORAGE`. To test limited access: phone Settings → Apps → Unison → Permissions → Photos and videos → "Allow limited access". Mac thumbnails live in `~/Library/Containers/dev.macdroid.mac/Data/Library/Application Support/PhotoThumbs/`; previews and drags in `…/Data/Library/Caches/PhotoCache/` (emptied at launch).
- **App icon sources:** the source art is `design/icon/`.
  - Mac PNGs are generated, so don't hand-edit `AppIcon.appiconset`.
  - The Android vectors in `res/drawable/ic_launcher_*.xml` mirror the SVG paths (100-unit frame, scaled 0.72 and offset 18 into the 108dp canvas). Update both when the art changes.
  - AppKit's SVG renderer ignores filters such as drop shadows, so keep the art flat.
- **Hummingbird + tracing pin:** Hummingbird 2.27 imports `ServiceContextModule`, which swift-distributed-tracing 1.6 removed. `Package.swift` pins tracing `"1.3.0"..<"1.6.0"` and links the `Tracing` product to silence an unused-dependency warning. Keep both.
- **HTTPTypes:** `Package.swift` declares `swift-http-types` (≥ 1.8.0) for the mirroring session header. It was already resolved through Hummingbird, so `Package.resolved` didn't change.
- **Shutdown log noise:** Hummingbird logs `Server shutdown error: Already closed` when its task is cancelled (tests, quit). It's harmless.
- **No client certs with macOS `curl`:** `/usr/bin/curl` (SecureTransport) can't present PEM client certificates. Use `openssl s_client -cert … -key …` or the Swift/Kotlin tests.
- **WS client SNI:** Swift `WebSocketClient` needs a hostname (`localhost`), not an IP literal.
- **Window not opened automatically:** in an `LSUIElement` app a SwiftUI `Window` scene is not opened at launch. `MenuBarLabel` (always alive) opens it via `WindowRequest`. `SceneBuilder` rejects `if #available`.
- **Hidden menu-bar icon:** on a MacBook with a notch it can be hidden. Launching the app again opens the window (`applicationShouldHandleReopen`).
- **Signing identity (once per Mac):** run `scripts/make-signing-cert.sh` before the first Mac build. It puts the self-signed "MacDroid Self-Signed" code-signing identity in the login keychain, and `project.yml` signs every build with it (Manual style). Without it the build fails with a missing-identity error. `security find-identity -p codesigning` shows it as `CSSMERR_TP_NOT_TRUSTED`; that's expected, and codesign still uses it. Back it up (Keychain Access → My Certificates → Export .p12) and ship every release with the same one.
- **Keychain prompt:** macOS knows the app by `identifier "dev.macdroid.mac" and certificate leaf = H"…"` (check with `codesign -dr - Unison.app`), so after one "Always Allow" (two prompts: key and certificate items) rebuilds and updates don't ask again. Ad-hoc builds were known by their cdhash, which changes every build, so they asked every time (fixed 2026-10-21). A new certificate means one more round of prompts.
- **Running the Release build:** `xcodebuild -project MacDroid.xcodeproj -scheme MacDroid -configuration Release -destination 'generic/platform=macOS' -derivedDataPath build build`, then `ditto build/Build/Products/Release/Unison.app /Applications/Unison.app` and `open /Applications/Unison.app` (delete an old `/Applications/MacDroid.app` first: same bundle id). Quit any Debug copy first, so two copies don't fight over the server port.
- **Android 17 local network:** apps targeting API 37 need runtime `ACCESS_LOCAL_NETWORK` before LAN sockets or NSD. Setup requests it first, and the service and boot receiver refuse to run without it.
- **NSD addresses:** `getHost()` on API 34+ is `hostAddresses[0]`. The locator scans every address for IPv4. `stopServiceResolution` exists only on 34+.
- **Gradle wrapper:** `gradle-wrapper.properties` has `validateDistributionUrl=false` (environment workaround). Restore validation and add `distributionSha256Sum` before publishing.
- **Scratch folder:** `.superpowers/` is gitignored scratch for agent workflows (ledgers, review packages, screenshots, brainstorm mockups).

- **Sandbox file access:** received files go to `~/Downloads/Unison` (Downloads entitlement) or a folder chosen in Settings (a security-scoped bookmark, kept open while the app runs). Outgoing files are remembered as read-only security-scoped bookmarks, so a resume survives a relaunch.
- **xcodebuild noise:** lines about CoreSimulator being out of date, `DVTCoreDeviceCore`, and `appintentsmetadataprocessor` are environment logs, not compiler output. Judge a build by `** BUILD SUCCEEDED **` and by `.swift:line:col: warning|error` lines.

- **Share target and URI grants:** shared URIs are handed to `ConnectionService` in an intent with `FLAG_GRANT_READ_URI_PERMISSION`. Files without a persistable grant are copied to `cache/outgoing/` only up to 100 MB, and the copies are deleted when the transfer finishes.

- **Services → "Open on Phone":** a fresh dev build may need `/System/Library/CoreServices/pbs -update`, or a log-out and back in, before the item appears in right-click → Services.
- **Ring my phone:** use the bell in the Mac popover. It plays even on silent when Do Not Disturb allows alarms (the default). The alarm volume is set to full while ringing and restored after.
- **Clipboard:** the owner adds the "Send clipboard" tile from the Quick Settings edit screen. Android shows its own "copied" preview when the Mac's clipboard arrives; that's expected. Android only lets the focused app read the clipboard, hence the invisible `ClipboardSendActivity`.
- **Notification access:** the owner grants it in the setup step or in Android Settings → Notifications → Device & app notifications. Never grant it from adb automation. The listener only runs once access is granted; app names and icons come through the launcher `<queries>` entry (no `QUERY_ALL_PACKAGES`).
- **MediaStore part files:** a newly inserted MediaStore item has no file until it's opened for writing, so reading it first fails with `ENOENT`. `MediaStoreSaveTarget.createPart` opens it once with `"w"`. This broke every Mac → phone transfer until 2026-10-13. The on-device test `MediaStoreSaveTargetTest` covers it.
- **Running on-device tests without uninstalling the app:** don't use `connectedDebugAndroidTest`, which uninstalls the app (and its pairing) afterwards. Instead run:
  ```bash
  ANDROID_SERIAL=<serial> ./gradlew :app:installDebugAndroidTest
  adb shell am instrument -w -e class dev.macdroid.app.<TestClass> dev.macdroid.app.test/androidx.test.runner.AndroidJUnitRunner
  ```

- **Mac app logs:** MacDroidCore's logs go to the unified log under subsystem `dev.macdroid.mac` (`OSLogHandler`). Watch them with `log stream --predicate 'subsystem == "dev.macdroid.mac"' --style compact`.
- **Security-scoped bookmarks and signing:** bookmarks are tied to the app's signature too. They broke across ad-hoc rebuilds ("The original file is no longer available"); with the stable self-signed identity they should survive rebuilds.

## Website (`website/`, Plan 12)
- Node 24 + npm. `cd website && npm ci` once.
- `npm run dev`: local server with live reload at `http://localhost:5173/unison/` (the site always lives under the base path from `site.config.js`).
- `npm test`: Vitest unit tests (`test/`). `npm run build`: static site into `website/dist`. `npm run check`: post-build assertions on `dist` (no "MacDroid", links under the base path, SEO files present). `npm run preview`: serve `dist` at `http://localhost:4173/unison/`.
- Site identity and every URL (site, repo, DMG, Play) live only in `website/site.config.js`.

## Support section (`#support`, Plan 13)
- **Now live** (`sponsorUrl` set 2026-10-22). Setting it back to `null` hides the section again.
- **Hidden by default.** The section and its nav and footer links are left out of the build while `sponsorUrl` is `null` in `website/site.config.js`. The UPI block is left out while `upiId` is `null`.
  - **To go live:** set `sponsorUrl: 'https://github.com/sponsors/Venu005'`, and optionally `upiId: 'name@bank'`, which is checked at build time. Then run `npm test && npm run build && npm run check` and push.
- **Preview it locally without editing the config:**
  - Run `UNISON_SPONSOR_URL=https://github.com/sponsors/Venu005 UNISON_UPI_ID=name@bank npm run build && npm run preview`, or prefix `npx vite` with the same variables.
  - Don't run `npm run check` on such a build: it checks against the real config and will fail on purpose.
- **Re-rendering the motion-off picture (`public/support-still.png`, 820×520, transparent):**
  1. Build with `UNISON_SPONSOR_URL` set, run `npm run preview`, and open `http://localhost:4173/unison/?still` at a 1400×900 window. That URL renders one frozen, mid-cheers frame on a transparent page.
  2. Screenshot `#support .stage` with a transparent background. On 2026-10-22 this used Playwright `locator.screenshot({ omitBackground: true })`, with `playwright-core` installed outside the repo and pointed at a local Chromium.
  3. Crop it: `sips -c 520 820 --cropOffset 100 580 raw.png --out public/support-still.png`.
  4. Keep the file under 300 KB.

## Deploying the website (Plan 12)
- `.github/workflows/website.yml` runs `npm ci`, `npm test`, `npm run build`, `npm run check` and deploys `website/dist` to GitHub Pages on every push to `main` that touches `website/**` (or from the Actions tab, "Run workflow").
- One-time setup: repo Settings → Pages → Source "GitHub Actions" (or `gh api -X POST repos/Venu005/unison/pages -f build_type=workflow`).
- Action versions are pinned to major tags (checkout v7, setup-node v7, upload-pages-artifact v5, deploy-pages v5).

## Search engines (Plan 12)
- Google Search Console property: URL prefix `https://venu005.github.io/unison/`, verified by `website/public/google5e78a886f56186ac.html` (keep that file; deleting it unverifies the site). Submit `sitemap.xml` there by hand: `/unison/robots.txt` isn't read by crawlers, because robots.txt only counts at the host root. Bing Webmaster Tools: property `https://venu005.github.io/unison/`, verified by `website/public/BingSiteAuth.xml` and the `msvalidate.01` meta tag (`verification.bing` in `site.config.js`); submit the full sitemap URL there.

## Releasing the Mac app (Plan 12)
- Prerequisites: the "MacDroid Self-Signed" identity in the login keychain (`scripts/make-signing-cert.sh`, or import the backed-up .p12), a clean git tree, and `gh` logged in with push rights to `Venu005/unison` (`venusai-glitch` is a collaborator).
- Bump `CFBundleShortVersionString` (and `CFBundleVersion`) in `mac/project.yml` first; the tag is `v<version>`.
- `scripts/make-release.sh --dry-run` builds universal Release (`arm64` + `x86_64`, generic macOS), validates both executable slices before staging, packages `mac/build/release/Unison.dmg` (`Unison.app` + an `Applications` shortcut) and prints the SHA-256. The DMG is deliberately **unsigned**: macOS refuses a disk image signed with a self-signed certificate ("Apple could not verify Unison.dmg") before the user sees the app. The app inside is signed (check: `codesign -dr - /Volumes/Unison/Unison.app`).
- `scripts/make-release.sh` (no flag) does the same, then `gh release create` with the DMG and notes containing the SHA-256. It's public: run it only on the owner's word. The website's Download button always points at the latest release's `Unison.dmg`.

## Intel Mac verification (2026-10-26)
- Release-only XcodeGen settings are `ARCHS="arm64 x86_64"` and `ONLY_ACTIVE_ARCH=NO`; Debug keeps native development defaults. Deployment floor remains macOS 14.0. Regenerate with `cd mac && xcodegen generate`; inspect with `xcodebuild -project MacDroid.xcodeproj -scheme MacDroid -configuration Release -destination 'generic/platform=macOS' -showBuildSettings`.
- Run the normal build gates, then from the repo root run `scripts/make-release.sh --dry-run`. This creates only a local candidate; do not install or publish it during this round. The version remains 0.4.2 (build 6).
- Inspect `mac/build/Build/Products/Release/Unison.app/Contents/MacOS/Unison` with `lipo -archs` and verify each architecture separately: `lipo "<executable>" -verify_arch arm64` and `lipo "<executable>" -verify_arch x86_64`. Some installed `lipo` versions reject two architecture arguments; separate checks preserve the same gate. Both must succeed. The previous Release binary was arm64-only and failed the Intel check.
- Check `codesign --verify --deep --strict --verbose=2 mac/build/Build/Products/Release/Unison.app`. Mount `mac/build/release/Unison.dmg` read-only with `hdiutil attach -readonly -nobrowse`, inspect the packaged app's slices and signature with the same commands, compare the packaged executable with the validated build, then detach the volume.
- If Rosetta is already installed, try `cd mac/MacDroidCore && arch -x86_64 /usr/bin/swift test --arch x86_64`; do not install Rosetta automatically. **Toolchain limitation on this Mac:** Intel test compilation succeeds, but Xcode's `swiftpm-testing-helper` contains only arm64 and cannot load the x86_64 test bundle. `--build-system native --arch x86_64` also compiles successfully but uses the same helper (and that build-system flag is deprecated). Neither attempt executed the Intel Swift Testing suite. Run the core tests on an Intel Mac with a compatible toolchain to close this gap. Successful compilation does not establish physical Intel behavior.
- **Physical Intel checklist (pending):** on an Intel Mac running macOS 14+, install the candidate, pair, reconnect, send a file each way, sync clipboard and notifications, browse photos, and exercise mirroring/audio/control and calls. Record OS, hardware and results before claiming Intel runtime verification. Publication requires the owner's instruction.

## Releasing on Google Play (Plan 14)
- **The upload key** is `~/Keystores/unison-upload.jks` (PKCS12, alias `upload`, created 2026-10-22). Its SHA-256 certificate fingerprint starts `1A:78:2E:A4:A2:36:80:04`.
  - The password is only in the gitignored `android/keystore.properties` (`storeFile`, `storePassword`, `keyAlias`, `keyPassword`).
  - **The owner keeps a backup** of the `.jks` and the password in their password manager. Losing them means asking Google for an upload-key reset.
- **Build:** run `cd android && ./gradlew :app:bundleRelease`. The output is `app/build/outputs/bundle/release/app-release.aab`. Check it with `jarsigner -verify …aab`, which should say "jar verified". Without `keystore.properties`, release tasks stop with a clear message; debug and the gates are unaffected.
- **Play App Signing:** Google re-signs the bundle for users. So an APK built here can't update a copy installed from Play, and the reverse is also true.
- **The owner's phone moves over once:**
  1. uninstall the debug copy, which loses its pairing;
  2. install the signed build (`bundletool build-apks --connected-device` plus `install-apks`, or join the closed test);
  3. scan the Mac's QR code.

  After that, test on that phone through Play's internal or closed track, or uninstall and reinstall.
- Bump `versionCode` and `versionName` in `android/app/build.gradle.kts` for every upload.
- The paperwork for Play Console is in `docs/play/`.

## Conventions
- Swift Testing (`@Test`, `#expect`) on the Mac and JUnit4 on Android; TDD for logic.
- Pure presentation and state logic lives in testable types; views stay thin.
- Commit messages are conventional style (`feat(mac): …`, `fix(android): …`).

## Gradle wrapper checksum
`android/gradle/wrapper/gradle-wrapper.properties` pins `distributionSha256Sum` (Plan 11). When you bump Gradle, also replace the sum with the one Gradle publishes at `https://services.gradle.org/distributions/gradle-<version>-bin.zip.sha256`, or the wrapper refuses the download.
