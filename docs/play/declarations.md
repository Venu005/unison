# Play Console declarations (App content)

These are answers ready to paste. Each video's shot list is in `video-scripts.md`. Upload each video as an **unlisted** YouTube video and paste its link.

## Accessibility API (App content → Accessibility API)

- **Is your app an accessibility tool?** No. In the app, `res/xml/control_service.xml` declares `isAccessibilityTool="false"`.
- **Why does the app use the AccessibilityService API?** App functionality.
- **Describe the core functionality that uses it:**
  > Unison mirrors the user's own phone screen to their own paired Mac, over their local network. When the user turns on "Unison control", Unison uses the AccessibilityService API to replay the user's mouse clicks, scrolls and typing from the Mac window onto their phone (gestures with dispatchGesture, global actions such as Back and Home, and typing with ACTION_SET_TEXT into the focused field). It acts only while the user is mirroring and only in response to the user's own input on their Mac. It doesn't watch other apps, read screen content beyond the focused text field it types into, or act on its own.
- **Do you collect or share personal or sensitive data using the accessibility capabilities?** No. The text in the field being typed into is read on the phone only so it can be edited, and it never leaves the phone. Input comes from the user's own Mac, encrypted end to end, and nothing goes to the developer or any server.
- **Prominent disclosure:** in the app, Settings → Remote control → Unison control opens a bottom sheet titled "Control this phone from your Mac". It says what the service does and reads, needs the "I understand and allow Unison control" box ticked, and offers "Agree and open Accessibility" or "Not now". The guided tour shows it as its last step.
- **Video link:** `video-scripts.md`, "Accessibility".

## Foreground service permissions (App content → Foreground service permissions)

1. **`FOREGROUND_SERVICE_CONNECTED_DEVICE`**, used by `ConnectionService`.
   - **Task:** keeps the encrypted link to the user's paired Mac open while Unison is in the background, so files, notifications, clipboard and calls keep working. It's a user-visible ongoing notification ("Connected to ‹Mac›"), and it starts after pairing. The user can turn it off with Settings → "Keep connected in background".
   - **Impact if deferred:** files and messages sent from the Mac would be lost or delayed, and incoming calls wouldn't show on the Mac.
   - **Video:** `video-scripts.md`, "Connected device".
2. **`FOREGROUND_SERVICE_MEDIA_PROJECTION`**, used by `MirrorService`.
   - **Task:** captures the screen and the phone's sound only after the user starts mirroring from their Mac and accepts Android's screen-sharing prompt. It stops when the user stops mirroring.
   - **Impact if deferred:** mirroring isn't possible.
   - **Video:** `video-scripts.md`, "Media projection".

## Photos and videos permissions (App content → Photos and videos permissions)

- **Permissions:** `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_VISUAL_USER_SELECTED` (partial access is supported).
- **Core use:**
  > Unison's "Photos on your Mac" lets the user browse their phone's entire photo and video library from their Mac: albums, a day-by-day grid, previews, saving to the Mac, and dragging items out. This is a gallery-type feature on another screen, and it needs to list and read the library to show it on the Mac. The Android photo picker returns individual items chosen on the phone, so it can't present the library on the Mac for browsing. Users can grant full or partial access; with partial access, the Mac shows only what they picked.
- **Play's form (250 characters per field):**
  - **Read media images:**
    > Unison lets the user browse their phone's whole photo library from their own paired Mac: albums, a day-by-day grid, previews, saving to the Mac. The photo picker only returns items picked on the phone, so it can't show the library on the Mac.
  - **Read media video:**
    > Unison lets the user browse their phone's videos from their own paired Mac, alongside photos: albums, a day-by-day grid, previews, saving to the Mac. The photo picker only returns items picked on the phone, so it can't show the library on the Mac.
- **Disclosure:** a sheet explains what, where and why before Android's prompt (setup step and Settings → Photos).
- **If rejected:** apply `photos-fallback.md`, remove this declaration and resubmit.

## Other App content items
- **Ads:** no ads.
- **App access:** see `app-access.md`.
- **Content rating:** answer the questionnaire with:
  - category: Utility, Productivity, Communication or Other;
  - no violence, sexual content, profanity, drugs or gambling;
  - users can't interact with or share content with other users: Unison talks only to the user's own Mac;
  - shares the user's location: **No**;
  - purchases: **No**.
- **Target audience:** 18 and older. Not designed for children.
- **News app:** No. **COVID-19 contact tracing:** No. **Government app:** No. **Financial features:** none.
- **Data safety:** see `data-safety.md`.
