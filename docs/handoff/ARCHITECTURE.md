# Architecture

## Topology
The **Mac is the server**; the **phone is always the client** (it never listens on a port, which keeps Android background rules simple).

```
Android (client)                                  Mac (server, advertised as _macdroid._tcp)
  NsdMacLocator finds the Mac (TXT fp=16 hex) ───▶ BonjourAdvertiser (dnssd)
  OkHttp, mTLS, pinned ──── WSS  /v1/ws ────────▶ ConnectionHub (one phone session; hello first)
                        ──── POST /v1/pair ──────▶ PairingManager (only while the pairing window is open)
                        ──── GET  /v1/info ──────▶ TrustedPeerMiddleware (global: everything but /v1/pair)
                        ──── HEAD/PUT/GET /v1/files/{id} ──▶ TransferManager (bytes; control over WS)
```
- Transport: HTTPS + WebSocket over **TLS 1.3, mutual authentication**.
- Messages: WebSocket text frames shaped `{"v":1,"type":…,"id":…,"body":{…}}`.
  - Current types: `hello` (both directions), `device.status` (phone → Mac: battery %, charging), `transfer.offer`, `transfer.accept`, `transfer.reject`, `transfer.finish`, `transfer.result`, `transfer.cancel` (Plan 2a); `notification.posted|removed|sync|icon|apps|reply|action|dismiss|mute|error` (Plan 3); `clipboard.set` and `transfer.offer.purpose` (Plan 4); `device.ring`, `device.ringState`, `link.open`, `media.state|art|command` (Plan 5).
  - Unknown types are ignored. Malformed frames are dropped, and the connection stays up.
- Liveness: pings every 15 s from both sides.
- Reconnect: backoff 1 s → 30 s cap. It resets on a network change, on NSD finding the Mac at a new address, or on "Retry now".

## Trust model
1. Each side has a long-lived P-256 key and a self-signed certificate.
   - Mac: Keychain (`KeychainIdentityStore`).
   - Phone: Android Keystore (`KeystoreIdentity`); the key never leaves it.
2. The Mac shows a QR code: `macdroid://pair?host&port&fp&code&name`. The code is 128-bit base32 (26 characters) and the window lasts 120 s.
3. The phone connects, pins the Mac's fingerprint from the QR code, and POSTs the code.
4. The Mac verifies the code in constant time. It stores the phone's fingerprint **taken from the TLS session**.
5. From then on each side trusts only the other's pinned fingerprint.
   - **TLS gate:** paired phone always; any certificate only while the window is open.
   - **App layer:** routes and WS upgrade re-check `isTrusted`. This matters because TLS 1.3 session resumption skips the verify callback.
6. Manual pairing fallback: the phone probes the Mac's certificate with no trust, and the user compares fingerprints visually.

## Mac components (`mac/MacDroidCore/Sources/MacDroidCore/`)
| Area | Files | Role |
|---|---|---|
| Protocol | `Protocol/Messages.swift`, `MessageCodec.swift` | Message types and JSON envelope |
| Security | `Security/Identity.swift`, `IdentityStore.swift` | Key/cert generation, fingerprints, Keychain store |
| Pairing | `Pairing/PairingManager.swift` (actor), `PairedDeviceStore.swift`, `PairingInvite.swift` | Pairing window, code, trust decisions, persistence, QR URI |
| Network | `Network/LocalAddress.swift`, `BonjourAdvertiser.swift` | LAN IPv4 for the QR code; DNS-SD advertising |
| Session | `Session/ConnectionHub.swift` (actor) | One live session, hello-first ordering, the newest session wins, status stream, and `events` (status changes and messages in one ordered stream) |
| Session | `Session/Broadcast.swift` | Multi-subscriber stream fan-out |
| Server | `Server/MacDroidServer.swift`, `Server/FileRoutes.swift` | Hummingbird 2 + mTLS callback, routes, WS bridge |
| Transfer | `Transfer/TransferManager.swift` (actor), `PartFileWriter.swift`, `SourceReader.swift`, `FileNaming.swift`, `TransferModel.swift`, `JSONFileStore.swift` | File transfers: handshake, part files, checksums, resume, history. Clipboard images (`purpose: clipboard`) use the same engine but go to a fixed clipboard folder, never ask, and are hidden from snapshots and history. Photos (`purpose: photo`) are accepted only for transfer ids the Mac registered with `expectPhoto` (others are rejected `invalid`); a cache fetch goes to `Caches/PhotoCache/` hidden (`hidden`/`isHidden`) and is cancelled on disconnect, a save goes to the received-files folder without asking and shows in history; outcomes are `photoReceived` / `photoFailed` events. `ReceiveLocationProvider.saveLocation(for: IncomingOffer)` runs in a cancellable task (the app shows a save panel there) |
| Notifications | `Notifications/NotificationStore.swift`, `FloodGate.swift`, `NotificationCategories.swift`, `IconCache.swift`, `PhoneNotifications.swift` (actor) | Mirrored notifications: the page's entries, the phone's app list, banners (flood gate), reply/action/dismiss/mute requests; icons cached by validated hash |
| Extras | `Extras/LinkRules.swift`, `Extras/PhoneExtras.swift` (actor) | Small wins: ring state, the phone's media state and art cache, links (validated both ways) |
| Photos | `Photos/ThumbnailCache.swift`, `Photos/PhotosClient.swift` (actor), `Presentation/PhotosPresentation.swift` | Browsing the phone's photos (Plan 6): albums and cursor pages matched by `requestId` (stale replies ignored, `photos.changed` merges the new first page), 256 px thumbnails cached in App Support/PhotoThumbs (digits-only ids, 200 MB LRU), originals fetched over the transfer engine three at a time (previews first) with a 30 s no-offer timeout and a 30 s no-progress timeout once the offer arrived. `PhotoSelection` is the click/⌘/⇧ logic |
| Calls | `Calls/CallCenter.swift` (actor), `Calls/PhoneNumbers.swift`, `Calls/DialInput.swift`, `Presentation/CallPresentation.swift` | Calls on the Mac (Plan 10): `CallCenter` reads the hub's ordered `events` stream, keeps the phone's calls from `call.state` (in memory only) and decides the panel (the newest ringing call, then a notice, then the newest active one; "Show incoming calls" off hides it); Answer/Decline/Hang up send `call.action`; `call.error` becomes a notice and drops the call; a disconnect clears everything; `dial` cleans the number and sends `call.dial` only when the phone lists `calls`. `PhoneNumbers` cleans numbers and parses `tel:` links |
| Mirror | `Mirror/MirrorFrame.swift`, `H264.swift`, `MirrorTiming.swift`, `VideoBacklog.swift`, `AudioJitter.swift`, `MirrorInput.swift`, `MirrorSession.swift` (actor), `Presentation/MirrorPresentation.swift`; route in `Server/MacDroidServer.swift` | Screen mirroring (Plan 7): `MirrorSession` starts/stops over the control WebSocket (`mirror.*`), shows a consent hint at 20 s and times out at 60 s, and gates `/v1/mirror` to the current session (`X-MacDroid-Session`). Frames (12-byte header) go straight to a `MirrorFrameSink`. `H264` packages Annex-B into CoreMedia sample buffers. `VideoBacklog` drops to the next key frame past 3 waiting; `AudioJitter` keeps a 40 ms cushion and skips over 100 ms; ping/pong gives the clock offset for the latency readout. Remote control (Plan 8): `MirrorInput` maps view points to 0–1 fractions of the aspect-fit picture (nil in the black bars), scroll deltas to view fractions, throttles drags to 120 Hz and maps keys (`MirrorKeys`); `MirrorSession.sendInput` is the input gate: `input.*` goes out only while streaming, the phone lists `control` and its `mirror.state` says `control: true`. `input.notice` sets `textFieldMissing` |
| Clipboard | `Clipboard/ClipboardRules.swift`, `ClipboardHistory.swift`, `ClipboardSync.swift` (actor) | What is sent (never concealed/transient/auto-generated items or file URLs; frame-size limit), the 10/20/50 history with image files, echo prevention by pasteboard change count |
| Presentation | `Presentation/StatusPresentation.swift`, `Presentation/TransferPresentation.swift`, `Presentation/NotificationPresentation.swift`, `Presentation/DownscaledImages.swift` | Pure status → icon/text mapping for the UI. `DownscaledImages` decodes image files (icons, art, clipboard images) at the drawn pixel size with ImageIO into a bounded `NSCache` (300 images, 32 MB) |
| Dev server | `Sources/MacDroidDevServer/main.swift` | Headless server for the cross-platform test |

Mac app (`mac/MacDroid/`):
- `AppModel` (`@MainActor @Observable`) is the single state owner: warnings vs transient errors, the pairing code lifecycle, re-pair, and window requests.
- `MenuBarLabel` owns opening the `Window("main")`. `AppDelegate` handles reopen and login-launch detection. `DockPolicy` sets the Dock icon only while the window is open.
- `Calls/CallPanelController` (a borderless, non-activating `NSPanel` at the top right, on all Spaces) shows `Views/Calls/CallPanelView` (ringing: name, number, Decline/Answer; active: "On a call with …", timer, Hang up; notices for 3 s). `Calls/DialerWindowController` + `Views/Calls/DialerView` are the dialer window (opened from the Phone page's "Call…" and the popover's phone icon); its typing rules are `DialInput` in core. The app declares the `tel` URL scheme; `AppDelegate` passes opened links to `AppModel.openPhoneLinks`, which asks "Call … on your phone?" before dialing. The popover shows the active call with Hang up; Settings → Calls has "Show incoming calls" and a line naming the app that opens phone links (the sandbox doesn't let Unison set itself as the handler).
- `Mirror/`: `MirrorRenderer` (an `AVSampleBufferDisplayLayer` fed on a serial queue, display immediately, resync on a new format, latency samples), `MirrorAudioPlayer` (`AVAudioEngine`, s16 → float), `MirrorWindowController` (its own aspect-locked window, Keep on top). `Views/Mirror/MirrorContentView` is the picture, status overlay, notices and bar (Back, Home, Recents, Volume −/+, Lock; disabled unless control is available). `Mirror/MirrorInputView` (an `NSView` over the picture) turns clicks/drags, right-click (Back), scroll (batched every 33 ms) and keys into `input.*`; `AppModel` sends all input through one ordered stream and batches typing every 30 ms (⌘V pastes the Mac clipboard). Settings → Mirroring holds quality, frame rate, audio and the latency readout.
- `Views/Photos/`: `PhotosView` (album column, day-grouped `LazyVGrid`, selection bar, `.quickLookPreview`, keyboard: Space/Escape/⌘A) and `PhotoCell` (drag-out via `NSItemProvider.registerFileRepresentation`, fetched into the cache on drop). `AppModel` empties the photo cache at launch and batches thumbnail requests (50 ms).
- `Extras/`: `ServicesProvider` answers right-click → Services → "Open on Phone". The popover has a ring button on the phone card and a `NowPlayingCard` (Views/Popover).
- `Clipboard/`: `PasteboardWatcher` (polls and writes `NSPasteboard`; returns the change count it produced for echo prevention), `ClipboardNotifier` ("Clipboard from <phone>").
- `Notifications/`: `NotificationRouter` is the only `UNUserNotificationCenter` delegate (macOS allows one); it owns the category set and routes responses. `PhoneNotifier` posts mirrored phone notifications. `ReceivedNotifier` posts received-file notifications through the router.
- `Files/`: `FilesSettings` (save folder bookmark, ask-each-time, cancellable save panel; `MacReceiveLocation`), `SecurityScopedSourceAccess` (read-only bookmarks for outgoing files), `ReceivedNotifier` (UserNotifications with Show in Finder / Open). `AppModel` owns the `TransferManager` and exposes `transfers` plus the file actions.
- Views live in `Views/`: the design-A popover (`MenuBarPopover` + `Popover/`: battery ring, tiles, whole-popover drop target), `MainWindow` (sidebar), Phone (pairing/paired), Files (`Files/FilesView`, `TransferRow`), Notifications (`Notifications/NotificationsView`, `NotificationCard`, `MutedAppsSheet`), Clipboard (`Clipboard/ClipboardView`), Settings (General with Received files, Notifications and Clipboard, Security, About), and Shared (incl. `AppIconView` and `DownscaledImageView`, which every row and card uses to draw an image file; never `NSImage(contentsOf:)` in `body`).

## Android components
`android/core` (pure JVM, tested):
| Area | Files | Role |
|---|---|---|
| protocol | `Messages.kt`, `MessageCodec.kt` | Same contract as Swift (shared fixtures) |
| calls | `CallTracker.kt` | Calls on the Mac (Plan 10): call notifications → `call.state` (changes only, `ended` on removal, re-sent after a reconnect); `call.action` → the notification's own Answer/Decline/Hang up or `call.error`; `call.dial` numbers checked by `CallNumbers`; `CallLabels` matches older notifications' buttons |
| control | `ControlRules.kt` | Remote control rules (Plan 8): `GestureTracker` (tap, long-press at 500 ms, drags as one continued stroke), `SegmentQueue` (merges waiting middle segments), `ScrollGesture` (120 ms swipe kept on screen), `ScrollBuffer` (adds scroll batches up while a swipe plays; never under 3 % of the screen, so never a tap), `TextEdit` (insert/backspace at the cursor, whole code points; Return submits single-line fields), `SecretShadow` (password fields are edited from what Unison typed). `ConsentMatcher` was removed with auto-Start (Plan 14) |
| tls | `Fingerprint.kt`, `TrustManagers.kt` (pinned/capturing), `TlsClientFactory.kt`, `TrustFailures.kt` | Pinned mTLS OkHttp, classifying "wrong Mac / rejected" errors |
| pairing | `PairingInvite.kt`, `PairingStore.kt`, `PairingClient.kt` | QR parse, pair POST, fingerprint probe |
| connection | `ConnectionManager.kt`, `Backoff.kt`, `MacLocator.kt` | WS loop, reconnect, nudges, generation-guarded state, `Waiting.retryAtNanos` deadline |
| extras | `LinkExtractor.kt`, `RingSession.kt`, `MediaTracker.kt` | Small wins: link rules, ring state, which media session the Mac shows and when to send |
| clipboard | `ClipboardHub.kt` | Explicit sends (always sent), frame-size and image limits, received items, the in-memory recent 10 |
| notifications | `NotificationModel.kt`, `NotificationRules.kt`, `NotificationForwarder.kt` | Which notifications go to the Mac (exclusions, de-dupe, mutes, apps seen, sync, icons); the phone owns these settings |
| transfer | `TransferClient.kt`, `FileEndpoint.kt`, `TransferEngine.kt`, `TransferModel.kt`, `TransferStore.kt`, `SaveTarget.kt`, `FolderSaveTarget.kt` | File bytes over pinned mTLS HTTPS (HTTP/1.1, resume headers, running SHA-256); `TransferEngine` is the confined-dispatcher state machine; `SaveTarget`/`PartFile`/`SourceOpener` are the platform seams Plan 2b implements |

`android/app`:
- **Glue:**
  - `MacDroidApp.kt`: `AppGraph` singletons; `UiPrefs` with `setupDone`, `keepConnected` (observable flow) and `notificationsSkipped`.
  - `platform/`: Keystore identity, prefs pairing store, NSD locator (IPv4 only), permissions.
  - `platform/` (files): `SaveTargets` picks a `SaveTarget`: MediaStore Download/Unison by default, a chosen SAF tree, or ask-each-time via `SavePrompter` → notification → `ui/files/SaveAsActivity` (CreateDocument). It reopens part files by handle prefix `media:`/`tree:`/`doc:`. Also `FilesPrefs` and `ContentSourceOpener`. `AppGraph.transferEngine` starts with the process.
  - `platform/extras/`: `Ringer` (ring my phone, driven by `ConnectionService`) `LinkNotifications` (tap-to-open links from the Mac) and `MediaWatcher` (media sessions → `MediaTracker`; refreshed when the notification listener connects). `ui/share/OpenOnMacActivity` is the "Open on Mac" share target.
  - `platform/mirror/`: `MirrorBridge` (answers `mirror.*`, pings answered on the collector thread; posts "Mirror to <Mac>? Tap to start" because Android blocks background activity starts), `MirrorConsentActivity` (wakes the screen, microphone permission, entire-screen-only capture consent), `MirrorService` (`mediaProjection` foreground service, screen wake lock because capture ends on lock, phone speaker muted while audio streams), `ScreenEncoder` (`VirtualDisplay` → MediaCodec H.264 surface, CBR, no B-frames, rebuilt on rotation), `AudioCapturer` (playback capture, 10 ms PCM chunks), `MediaStreamClient` (pinned `/v1/mirror` WebSocket, one reconnect). Core `mirror/`: `MirrorFrame`, `MirrorSize`, `SendPolicy` (drop video to a key frame past 300 ms queued, audio past 200 ms), `MirrorPhoneSession`.
  - `platform/calls/`: `CallReader` (a call-style notification → `CallNotification`: type, the caller's name, a `tel:` number, which of Answer/Decline/Hang up it offers; older notifications by button label) and `CallBridge` (`MacDroidNotificationListener` hands it every notification first; call notifications go to `CallTracker` instead of notification mirroring; `call.action` fires the notification's own intent; `call.dial` uses `TelecomManager.placeCall`, which needs `CALL_PHONE`). Settings → Calls asks for that permission.
  - `platform/control/`: `MacDroidControlService` (the "Unison control" accessibility service: plays `input.*` as gestures via `GesturePlayer`, global actions (Back/Home/Recents/lock), volume, and `ACTION_SET_TEXT` on the focused field, or sends `input.notice`. It is declared `isAccessibilityTool="false"`, watches no app, and reads only the field it types into; auto-Start was removed in Plan 14), `GesturePlayer` (continued strokes, one at a time, coalesced; scroll swipes from `ScrollBuffer` when idle), `reset()` lifts a finger when the session stops streaming (`MirrorPhoneSession.onInputEnd`), `MirrorBridge` forwards input only while the session is streaming and reports the service turning on/off with `controlChanged`. `platform/mirror/ScreenSize` is shared by capture and input. Settings → Remote control shows the service and the microphone permission. The Mac asks "Tap Start on your phone" as soon as a session starts (`MirrorSession` `consentHint` defaults to zero).
  - `platform/photos/`: `PhotoLibrary` (MediaStore `PhotoSource`: albums by bucket, pages by `date_added`/`_id`, `loadThumbnail` → 256 px JPEG q80) and `PhotosBridge` (photos requests queued to one IO worker running core `PhotoService`; fetches go through `TransferEngine.enqueueWithId(…, Photo)`; a `ContentObserver` and access changes send `photos.changed`, debounced 1 s). Core `photos/`: `PhotoQueries` (cursor, selection SQL, limits, access level), `PhotoService`, `PhotoLanes` (thumbnails apart from fetches/pages) and `PhotoAccessWatcher` (when access changes reload the Mac).
  - `platform/clipboard/`: `ClipboardBridge` (Mac items → `ClipboardManager`; phone sends → `ClipboardHub`), `ClipboardImages` (PNG conversion, FileProvider `${applicationId}.clipboard` over `cache/clipboard*`), `ClipboardPrefs`. `ui/clipboard/`: the invisible `ClipboardSendActivity` (reads the clipboard once focused), `CopyToMacActivity` (share target), `ClipboardTileService`.
  - `platform/notifications/`: the `MacDroidNotificationListener` service, `NotificationBridge` (listener ↔ connection ↔ `NotificationForwarder`, one ordered worker), `NotificationReader` (StatusBarNotification → `PhoneNotification`), `AppIcons` (96 px PNG + hash), `SharedPrefsNotificationSettings`.
  - `service/`: foreground `ConnectionService` (type connectedDevice), notifications, boot receiver, battery and network watchers. File transfers add `TransferNotifications` (progress with Cancel, received with Open, ask-where-to-save prompts) and the `SEND_FILES`/`CANCEL_TRANSFERS` actions; `platform/SendFiles` turns picked or shared URIs into queued transfers.
- **UI:**
  - `ui/navigation/AppNavHost.kt`: switches setup ⇄ main via `SetupFlow`.
  - `ui/setup/`: the first-run wizard (Plan 14). Step order: "Connect to your Mac" (`PairStep`, tour step 1; Scan asks for local network, then the camera) → Local network (only if still missing) → Files ("Where should files from your Mac go?", first run only) → Photos → Battery. Notification access is tour step 3 on the Notifications tab. "Post notifications" is asked once after the first connection (`AppNavHost`, `PromptRules`). Settings has a Files section (`FilesSettingsViewModel`).
  - `ui/main/`: 5-tab bottom navigation: Home, Notifications, Clipboard, Files, Settings. Clipboard is live (`ui/clipboard/ClipboardScreen`: Send now, "Get Mac clipboard", Recent). Notifications is live (`ui/notifications/`: a control panel with the "Show on your Mac" switch and per-app switches). Files is live (`ui/files/`: `FilesScreen`, `TransferRow`, `SendPickers`). Home has a Send FAB and the last 3 transfers.
  - `ui/presentation/`: pure status text shared by Home and the notification.
  - `ui/theme/`: Material You, with a fallback palette.
  - `ui/share/ShareActivity`: the "Send to Mac" share target (ACTION_SEND / SEND_MULTIPLE, `*/*`). It has no UI: it hands the URIs to `ConnectionService` with a read grant and shows a toast, or says "Connect to your Mac first" and opens the app.

## Website and releases (Plan 12)
Static site in `website/`, built with Vite and deployed to GitHub Pages at `https://venu005.github.io/unison/` by `.github/workflows/website.yml` (pushes to `main` touching `website/**`, or manual run).

| Part | Files | Notes |
|---|---|---|
| Identity | `site.config.js` | The only place for the name, site URL and base (`/unison/`), repo, DMG and release URLs, Play status (`playUrl: null` = "coming soon"), version, developer |
| SEO | `src/seo.js` (pure, tested), `src/seo-plugin.js` | Head tags (canonical, OG, Twitter, icons, manifest), JSON-LD `SoftwareApplication`, `sitemap.xml`, `robots.txt`, `llms.txt`, `site.webmanifest`; the plugin fills `%SEO_HEAD%`, `%JSON_LD%`, `%BASE_URL%`, `%DMG_URL%`, `%RELEASES_URL%`, `%REPO_URL%` in the pages |
| Pages | `index.html`, `privacy/index.html`, `404.html`, `src/styles/` | All copy is real HTML; canvases are `aria-hidden` |
| 3D | `src/capability.js`, `src/main.js`, `src/three/shared.js`, `src/scenes/{hero,features,game}.js`, `src/game/rules.js` | `chooseQuality` picks `full` / `lite` / `static` once per visit; each scene module loads only when its section is near and exposes `mount(section, quality) -> { stop }`; `run()` pauses rendering off-screen and in hidden tabs; the game's catch rule is `catchDecision` |
| Guard | `scripts/check-dist.mjs` (`npm run check`) | Fails the build on "MacDroid", links outside `/unison/`, a Play link before launch, wrong JSON-LD OS, or a hero headline that isn't HTML |
| Support (Plan 13) | `src/support.js` (tested), `src/support/story.js` (tested), `src/scenes/support.js`, `makeFullRobot()` in `src/three/shared.js`, `public/support-still.png` | `#support` (copy, GitHub Sponsors button, UPI QR) is cut out at build time while `sponsorUrl` is `null`, and its UPI block while `upiId` is `null`; the bean bag scene is driven by `storyAt`/`createIdle`, and its canvas sits in a `.stage` so phones get a band above the copy; `check-dist` requires the Android robot credit on every page and the right support state |
| Assets | `scripts/render-assets.sh`, `og/og-image.svg` | Icons and the 1200×630 preview image, rendered with `scripts/render-icon.swift` |

Guided tour (Plan 14, Android):
- `ui/tour/TourFlow` is a pure state machine with 5 groups and 13 targets.
- `TourController` saves progress through `TourPrefs` and is provided as `LocalTour` from `AppNavHost`.
- `CoachMarkHost` draws the spotlight and bubble over the tagged composables (`Modifier.tourTarget`).
- Step 1 is the setup "Connect to your Mac" screen (`PairStep`). The rest run on Home, Notifications, Clipboard and Settings.
- Disclosures: `ui/disclosure/Disclosures` and `DisclosureSheet`/`rememberDisclosed` come before every sensitive permission.

Tips in the apps (Plan 13):
- **Mac:** Settings → About has a "Support Unison" button that opens `…/unison/#support`.
- **Android:** Settings → About only has a "Unison website" row that opens the home page. Google Play's Payments policy rules out tip links, and `NoPaymentLinksTest` keeps payment wording out of `android/app/src/main`.

Mac downloads: `scripts/make-release.sh` builds the Release app, packages `Unison.dmg` (app + Applications shortcut), signs it with "MacDroid Self-Signed" and publishes a GitHub Release on `Venu005/unison`; the site links to `releases/latest/download/Unison.dmg`.

## Branding
- **App icon:** the peeking droid.
  - Source: `design/icon/`.
  - Mac: asset catalog, generated by `scripts/render-icons.sh`.
  - Android: adaptive vector icon with a monochrome layer, plus the droid silhouette as the notification icon.
- **Menu-bar icons:** SF Symbols, chosen by `StatusPresentation` according to connection state.

## Extension points for Plans 2–4
- **New message types:** add a fixture, then a case in both codecs and tests.
  - Mac: feature managers subscribe to `ConnectionHub.messages` and `statusUpdates` (each access is an independent subscription), or to `events` when they need the two in order (`CallCenter`).
  - Android: `ConnectionManager.incoming` is a `SharedFlow`.
- **New HTTP routes** (files): Routes registered after `router.add(middleware:)` in `makeRouter()` are automatically paired-phone-only.
- **UI:**
  - Mac: replace a `ComingSoonView` case in `MainWindow.detail(for:)`, and flip `SidebarSection.comingSoonDescription` to nil. Files is already live (`Views/Files/FilesView`).
  - Android: replace the `ComingSoonScreen` composable for that tab in `MainScreen`.

## Feature exchange (Plan 3)
- Both sides list their features in `hello` (`ProtocolInfo.features`, `Features.SUPPORTED`). Android exposes them as `ConnectionState.Connected(macName, features)` and `ConnectionState.macSupports(feature)`; the Mac as `PeerInfo.supports(feature)`.
- `ConnectionHub.messages` carries every feature message (everything except `hello`, `device.status` and unknown types).

## Reconnect discovery (Plan 11)
`MacLocator` is collected once per paired Mac for as long as `ConnectionManager` runs (restarted 30 s after it ends). Each emission is a fresh sighting (first seen, or found again after being lost), possibly at the same address, and it wakes the retry; a different address is also saved. Nudges and sightings from before a session are drained when the Mac's hello arrives. Android backup and device transfer exclude all app data, since pairing is tied to the Keystore key.

## Plan 11 additions
- **`media.state.speed`** (optional, playback rate): the Mac projects the seek bar at that rate; a released seek is held until the phone catches up (`MediaPresentation.PendingSeek`).
- **Mirror volume routing:** `MirrorVolume.route(audioOnMac:)` sends the window's Volume −/+ to the Mac player (16 steps, `mirror.volume`) while the phone's sound plays on the Mac, otherwise to the phone as `input.key`.
- **Mirror keyboard:** `MirrorInputNSView` is an `NSTextInputClient` (dead keys and IMEs compose on the Mac); `MirrorKeys` adds `.leaveFullScreen` and `.swallow`. `input.text` is capped at 4,096 UTF-16 units on both sides.
- **Links from the phone** pass `LinkThrottle` (3 per 10 s) in `PhoneExtras`; Now Playing art is pruned to 8 (`IconCache.prune`).
- **File routes:** a PUT's `Content-Range` total must equal the offered size (416 otherwise); a GET holds its security-scoped file in an `AccessLease` that releases even if the body never runs.

