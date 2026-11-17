# Declaration videos (shot lists)

Record on the phone with Android's screen recorder. Where the Mac is involved, record the Mac too and edit the two side by side, or film the phone and the Mac together.
- Aim for 30–90 seconds each. Upload them as **unlisted** YouTube videos.
- Show the real app with a real Mac paired. Don't show real people's notifications or photos: use a test album and test messages.
- Before each recording, uninstall and reinstall the Play build so the first-run screens appear (that clears the pairing), or use "Show the tour again".

## 1. Accessibility (required: the disclosure, consent, non-consent and the feature)
Recorded 2026-10-23 for 0.5.1: `videos/unison-accessibility.mp4`. **Re-recorded for 0.5.2 on 2026-11-13:** `videos/0.5.2/unison-accessibility-0.5.2.mp4` (4:34, 720×1600). Play rejected 0.5.1 that day for a missing prominent disclosure. The video is the phone's own screen recording (`adb shell screenrecord`) in three parts, joined with ffmpeg. A WhatsApp pop-up, and the contacts and SMS previews in the phone's search, are blurred, and Android's battery settings are cut. The raw parts (`part1-…`, `part2-…`, `part3-…`) are unblurred: never upload them. `docs/play/videos/` is excluded from git in `.git/info/exclude`.
1. Start from a **fresh install** (uninstall Unison first, or Android Settings → Apps → Unison → Storage → Clear storage). Open Unison from the launcher.
2. The first screen is "Unison control uses the Accessibility service". Hold for 5 seconds so every line can be read, scrolling slowly to the end.
3. **Non-consent:** show that **Agree and open Accessibility** is greyed out until the box is ticked. Tap **Not now**: Unison moves on to "Connect to your Mac" and Unison control stays off.
4. Pair with the Mac and finish setup. Go to Settings → Remote control → **Unison control**: the same disclosure opens as a sheet.
5. **Consent:** tick "I understand and allow Unison control", then tap **Agree and open Accessibility**. Android's Accessibility settings open: choose Unison control → turn it on → Allow.
6. **Feature:** on the Mac, start mirroring (Unison → Phone → Mirror), then press Start on the phone. In the Mac window, click an app icon on the phone, scroll a list, tap into a search box and type "hello". The phone responds.
7. End by stopping mirroring.

## 2. Connected device (FGS `connectedDevice`)
Recorded 2026-10-23: `videos/unison-connected-device.mp4`.
1. Open Unison, paired. The status card says "Connected to ‹Mac›".
2. Press Home. Pull down the shade: Unison's ongoing notification "Connected to ‹Mac›" is there.
3. On the Mac, drop a file onto Unison in the menu bar. It arrives on the phone while Unison is in the background (show the notification).
4. Copy text on the Mac and paste it on the phone in another app.
5. Optional: in Unison Settings, turn off "Keep connected in background". The notification goes away.

## 3. Media projection (FGS `mediaProjection`)
Recorded 2026-10-23: `videos/unison-media-projection.mp4` (part 2 of the Accessibility video).
1. On the Mac: Unison → Phone → Mirror. The Mac says "Tap Start on your phone…".
2. On the phone, Android's screen-sharing prompt appears. The user presses **Start**.
3. The phone screen appears in the Mac window, with sound. The phone shows the system's screen-sharing indicator.
4. Stop from the Mac. Capture ends and the indicator disappears.

## 4. Photos and videos (only if Play asks for a video)
1. Settings → Photos on your Mac. The disclosure sheet appears; tap **Agree and choose access**. Android shows "Allow all" / "Select photos"; pick "Select photos" and choose 3.
2. On the Mac, open Unison → Photos: the album and day grid show the 3 items. Preview one and save it to the Mac.

## 5. End to end, for App access (`app-access.md`)
Download the Mac app from the website → open it (Open Anyway) → Pair a Phone → on a fresh phone install, the tour: Connect (Allow and Allow, scan) → Send a photo → Notifications (Agree) → Clipboard → Unison control (optional) → "You're all set". Then a short mirroring demo.
